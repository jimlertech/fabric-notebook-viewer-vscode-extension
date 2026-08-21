# Build prompt: Fabric Notebook Viewer

A self-contained prompt for recreating this extension from scratch with an AI coding
agent. Share this file with a teammate who wants their own copy.

---

Build me a lightweight VS Code extension called "Fabric Notebook Viewer" that opens
Microsoft Fabric `notebook-content.py` files as native VS Code notebooks.

## Problem

Fabric notebooks are stored in git as a folder named `<name>.Notebook/` containing a
flat Python file, `notebook-content.py`. VS Code shows it as one long .py file, so
cell structure is invisible and Markdown documentation renders as commented-out noise.
I want to read and review these files as real notebooks, in the editor, with no Fabric
or Jupyter round-trip.

## The file format

`notebook-content.py` is plain text with a preamble followed by repeating cell blocks:

- A preamble before the first cell marker (`# Fabric notebook source` plus a
  `# METADATA` block). Must be preserved verbatim.
- Cells begin with `# CELL ********************` or `# MARKDOWN ********************`
  (the asterisk run is padding — match `^# (CELL|MARKDOWN) \*+\s*$`).
- Each cell body may be followed by a `# METADATA ********************` footer block
  with `# META ...` lines.
- Markdown cell bodies are comment-escaped: every line is prefixed `# `, and a blank
  line is stored as a bare `#`.
- Some code cells are "magic" cells where every line is prefixed `# MAGIC ` (these hold
  `%%configure`, `%run`, etc.). Detect and decode these so the content is readable,
  and re-encode on save.

## Requirements

1. Register a **NotebookSerializer** for notebook type `fabric-notebook`, with selector
   `**/*.Notebook/notebook-content.py`. Use VS Code's built-in notebook editor — do NOT
   depend on the Jupyter extension or any `ms-toolsai.*` extension.
2. Markdown cells render as Markdown; code cells get language `python`.
3. Also register a command "Open as Fabric Notebook" so a file can be opened on demand.
4. Keep it dependency-free: plain JavaScript, no build step, no bundler, no npm runtime
   dependencies. Two source files is the target — a parser and the extension entry point.
5. Put the parser in its own module with no `vscode` import, so it can be unit tested by
   running plain `node`.

## Round-trip fidelity — the hard requirement

Saving an unmodified notebook MUST produce a byte-identical file. Diff noise on these
files is unacceptable because they're reviewed in PRs. To achieve that, capture per cell
in cell metadata and restore on serialize:

- the exact marker line as written
- the exact footer (`# METADATA` / `# META`) lines
- the count of leading and trailing blank lines around the body
- whether the cell was a MAGIC cell
- the original decoded value AND original raw body lines

On serialize, if a cell's value is unchanged from the original, re-emit the original raw
body lines verbatim rather than re-encoding. Only re-encode cells the user actually edited.
Also preserve document-level state: detected EOL (`\r\n` vs `\n`) and whether the file
ended with a trailing newline.

Throw a clear error if the file contains no cell markers.

## Tests

Include a runnable test script (`node test-parser.js`) with a representative sample file
that exercises: preamble, a MAGIC `%%configure` cell, a Markdown cell with blank lines,
normal code cells, and CRLF handling. Assert byte-identical round-trip, correct cell
count, correct kinds, and that decoded Markdown/MAGIC content has the prefixes stripped.

## Install

Explain how to install it locally by copying the folder into `~/.vscode/extensions/` and
reloading the window (no marketplace publish, no VSIX required).

---

## Notes for whoever runs this prompt

**The editor association is a required follow-up step.** After installing, VS Code may
still open the file with the plain text/Python editor. Add this to **User** settings
(not workspace settings, so it applies in every repo):

```jsonc
"workbench.editorAssociations": {
    "**/*.Notebook/notebook-content.py": "fabric-notebook"
}
```

**Round-trip fidelity is the whole difficulty.** A naive implementation that decodes to
cells and re-encodes on save will normalize blank lines and metadata blocks, producing a
diff on every save even when nothing changed. The "unchanged cells re-emit their original
raw bytes" rule is what makes the extension safe to use against a real repo.

**Do not enable `notebook.formatOnSave.enabled`.** It defaults to `false`; turning it on
would reformat Fabric source on save and defeat the byte-exact round-trip.

**Optional readability tweak.** Rendered Markdown cells are sized by
`notebook.markup.fontSize` (default `0`, meaning 120% of the output font). Bump it if the
header cells read too small.
