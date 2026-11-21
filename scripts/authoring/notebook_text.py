"""Print the markdown + code (+ short outputs) of notebooks as plain text. Usage: python3 -I notebook_text.py <nb.ipynb>..."""
import json, sys, pathlib
for p in sys.argv[1:]:
    nb = json.loads(pathlib.Path(p).read_text())
    print(f"\n######## {pathlib.Path(p).name}")
    for c in nb["cells"]:
        src = "".join(c["source"]).strip()
        if not src: continue
        tag = "MD" if c["cell_type"]=="markdown" else "PY"
        out = ""
        if c["cell_type"]=="code":
            for o in c.get("outputs", []):
                t = o.get("text") or o.get("data",{}).get("text/plain") or ""
                out += "".join(t) if isinstance(t,list) else t
        print(f"--[{tag}]\n{src}")
        if out.strip(): print(f"  => {out.strip()[:300]}")
