/* Python runner: loads Pyodide in a Web Worker and executes code cells.
 *
 * Messages in:  {id, type: 'run', code, ns}        run code in namespace `ns` (notebook-style)
 *               {id, type: 'test', code, tests}     run code + tests in a fresh namespace
 *               {id, type: 'reset', ns}             drop a namespace
 * Messages out: {type: 'ready'} | {id, type: 'out', stream, text} | {id, type: 'done', ok, result?}
 */
const PYODIDE_VERSION = '0.29.3';
importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);

let currentId = null;
const decoder = new TextDecoder();
const send = (msg) => self.postMessage(msg);
const stream = (name) => ({
  write(buf) {
    send({ id: currentId, type: 'out', stream: name, text: decoder.decode(buf, { stream: true }) });
    return buf.length;
  },
});

// The same harness is used by scripts/check-content.mjs so the site and the tests agree.
const HARNESS = String.raw`
import ast, sys, traceback, json, pydoc, types, linecache, itertools
pydoc.pager = pydoc.plainpager

_namespaces = {}
_real_main = sys.modules["__main__"]
_cell_counter = itertools.count(1)

def _register_source(code, prefix="cell"):
    """Give each cell a unique filename and put its source in linecache, so
    tracebacks show the offending line with ^ markers (like a notebook)."""
    name = f"<{prefix}-{next(_cell_counter)}>"
    linecache.cache[name] = (len(code), None, code.splitlines(True), name)
    return name

def _fresh():
    """Each page gets a real module named __main__, so pickle, enum.global_enum,
    dataclasses etc. find cell-defined names via sys.modules['__main__']."""
    mod = types.ModuleType("__main__")
    mod.__dict__["__builtins__"] = __builtins__
    return mod

class _as_main:
    def __init__(self, mod): self.mod = mod
    def __enter__(self): sys.modules["__main__"] = self.mod
    def __exit__(self, *exc): sys.modules["__main__"] = _real_main

def _print_exc():
    etype, exc, tb = sys.exc_info()
    # Drop harness frames so learners only see their own code.
    while tb is not None and not tb.tb_frame.f_code.co_filename.startswith("<cell"):
        tb = tb.tb_next
    traceback.print_exception(etype, exc, tb)

def _exec_cell(code, mod):
    """Run like a notebook cell: show the value of a trailing expression."""
    ns = mod.__dict__
    sys.modules["__main__"] = mod
    filename = _register_source(code)
    try:
        tree = ast.parse(code, filename, "exec")
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)
        exec(compile(tree, filename, "exec"), ns)
        if last is not None:
            value = eval(compile(last, filename, "eval"), ns)
            if value is not None:
                print(repr(value))
        return True
    except SystemExit:
        return True
    except BaseException:
        _print_exc()
        return False
    finally:
        # Flush text printed without a trailing newline (print(x, end=' ')) so it
        # lands in this cell's output instead of the next one.
        sys.stdout.flush()
        sys.stderr.flush()
        sys.modules["__main__"] = _real_main

def run_cell(code, ns_key):
    ns = _namespaces.setdefault(ns_key, _fresh())
    return _exec_cell(code, ns)

def reset(ns_key):
    _namespaces.pop(ns_key, None)

def run_tests(code, tests):
    mod = _fresh()
    with _as_main(mod):
        return _run_tests(code, tests, mod)

def _run_tests(code, tests, mod):
    ns = mod.__dict__
    results = []
    if not _exec_cell(code, mod):
        return json.dumps({"loaded": False, "results": []})
    sys.modules["__main__"] = mod  # _exec_cell restored the real one
    try:
        exec(compile(tests, "<tests>", "exec"), ns)
    except BaseException as e:
        return json.dumps({"loaded": False, "results": [{"name": "loading tests", "ok": False, "msg": repr(e)}]})
    for name, fn in list(ns.items()):
        if name.startswith("test_") and callable(fn):
            label = (fn.__doc__ or name).strip()
            try:
                fn()
                results.append({"name": label, "ok": True, "msg": ""})
            except AssertionError as e:
                results.append({"name": label, "ok": False, "msg": str(e) or "assertion failed"})
            except BaseException as e:
                results.append({"name": label, "ok": False, "msg": f"{type(e).__name__}: {e}"})
    return json.dumps({"loaded": True, "results": results})
`;

const ready = (async () => {
  const py = await loadPyodide();
  py.setStdout(stream('stdout'));
  py.setStderr(stream('stderr'));
  py.runPython(HARNESS);
  send({ type: 'ready' });
  return py;
})();

self.onmessage = async (event) => {
  const msg = event.data;
  const py = await ready;
  currentId = msg.id;
  const g = py.globals;
  try {
    if (msg.type === 'run') {
      const ok = g.get('run_cell')(msg.code, msg.ns);
      send({ id: msg.id, type: 'done', ok });
    } else if (msg.type === 'test') {
      const result = JSON.parse(g.get('run_tests')(msg.code, msg.tests));
      send({ id: msg.id, type: 'done', ok: true, result });
    } else if (msg.type === 'files') {
      if (msg.packages && msg.packages.length) await py.loadPackage(msg.packages, { messageCallback: () => {} });
      // Data files for the page: fetched once and written into the virtual file system
      // relative to the working directory, so `open('data/x.csv')` just works.
      for (const f of msg.files) {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`Could not load data file ${f.path} (${res.status})`);
        const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
        if (dir) py.FS.mkdirTree(dir);
        py.FS.writeFile(f.path, new Uint8Array(await res.arrayBuffer()));
      }
      send({ id: msg.id, type: 'done', ok: true });
    } else if (msg.type === 'reset') {
      g.get('reset')(msg.ns);
      send({ id: msg.id, type: 'done', ok: true });
    }
  } catch (err) {
    if (err && err.pyodide_fatal_error) {
      // Usually a JavaScript stack overflow from very deep recursion through C code
      // (e.g. an lru_cache'd recursive function). This interpreter is unusable now;
      // the page restarts Python in a fresh worker.
      const reason = /call stack/i.test(String(err))
        ? 'Python ran out of stack space (the recursion went too deep for the browser).'
        : `Python crashed: ${err}`;
      send({ id: msg.id, type: 'out', stream: 'stderr', text: `\n${reason}\nPython was restarted, so earlier cells will run again.` });
      send({ id: msg.id, type: 'done', ok: false, fatal: true });
      return;
    }
    send({ id: msg.id, type: 'out', stream: 'stderr', text: String(err) });
    send({ id: msg.id, type: 'done', ok: false });
  }
};
