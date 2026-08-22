# Fabric Notebook Viewer

View and edit two source-controlled notebook formats in VS Code's native notebook editor:

- Microsoft Fabric `*.Notebook/notebook-content.py`
- Azure Synapse `**/Synapse/notebook/*.json` (the ARM/workspace export shape, `properties.cells`)

It renders code and Markdown cells in the native notebook editor while preserving the on-disk
source exactly. Fabric files keep their `# MAGIC`, `# METADATA`, and `# META` syntax, and a
`# PARAMETERS CELL` block is surfaced as its own code cell rather than being folded into the
cell above it. Synapse files keep their JSON key order, indentation, line endings, and every
property the viewer does not understand (`bigDataPool`, `sessionProperties`, cell `metadata`,
`execution_count`). Synapse cells starting with a magic such as `%%sql` are highlighted in that
language. Neither format gets a local Spark execution kernel.

## Install

Install **Fabric Notebook Viewer** from the VS Code Marketplace, or run this command from VS Code:

```powershell
code --install-extension lerxst.fabric-notebook-viewer
```

To render Fabric notebooks automatically in a workspace, add to its `.vscode/settings.json`:

```json
"workbench.editorAssociations": { "**/*.Notebook/notebook-content.py": "fabric-notebook" }
```

Synapse `.json` notebooks open in the notebook editor by default. To see the raw JSON instead,
use **Reopen Editor With… > Text Editor**, or pin it per workspace:

```json
"workbench.editorAssociations": { "**/Synapse/notebook/*.json": "default" }
```

## Build from source

Clone the repository, then build and install the VS Code extension package:

```powershell
git clone https://github.com/purduepete/fabric-notebook-viewer-vscode-extension.git `
  C:\Files\Dev\main\fabric-notebook-viewer-vscode-extension
Set-Location C:\Files\Dev\main\fabric-notebook-viewer-vscode-extension
.\scripts\Build-Extension.ps1
.\scripts\Install-Extension.ps1
```

The build creates `dist/fabric-notebook-viewer.vsix`. The install script force-updates the matching
extension on that computer. Reload VS Code after installation.

To update an existing install:

```powershell
git pull
.\scripts\Build-Extension.ps1
.\scripts\Install-Extension.ps1
```

A packaged `.vsix` is the normal install path for local builds.

## Test

Round-trip checks against the bundled fixtures (pass a path to test another notebook):

```powershell
npm test
node test-parser.js "path\to\notebook-content.py"
node test-synapse-parser.js "path\to\SynapseNotebook.json"
```
