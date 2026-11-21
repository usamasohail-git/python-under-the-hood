// CodeMirror 6 setup themed entirely through CSS variables (works in light and dark).
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword], color: 'var(--syn-keyword)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--syn-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--syn-number)' },
  { tag: [t.comment, t.lineComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syn-function)' },
  { tag: [t.definition(t.variableName), t.className, t.definition(t.className)], color: 'var(--syn-def)' },
  { tag: [t.self, t.standard(t.variableName)], color: 'var(--syn-builtin)' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--code-fg)', fontSize: '0.92rem' },
  '.cm-content': { fontFamily: 'var(--font-mono)', caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  '.cm-activeLine': { backgroundColor: 'var(--code-active)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--code-selection) !important' },
  '.cm-matchingBracket': { backgroundColor: 'var(--code-selection)', outline: 'none' },
});

export function createEditor(parent: HTMLElement, doc: string, onRun: () => void): EditorView {
  const runKeys = Prec.highest(keymap.of([
    { key: 'Shift-Enter', run: () => { onRun(); return true; } },
    { key: 'Mod-Enter', run: () => { onRun(); return true; } },
  ]));
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        runKeys,
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        python(),
        syntaxHighlighting(highlight),
        theme,
        EditorView.contentAttributes.of({ 'aria-label': 'Python code editor' }),
      ],
    }),
  });
}
