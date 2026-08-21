'use strict';

const vscode = require('vscode');
const { parseFabricNotebook, serializeFabricNotebook } = require('./parser');
const { parseSynapseNotebook, serializeSynapseNotebook } = require('./synapse-parser');

const FABRIC_TYPE = 'fabric-notebook';
const SYNAPSE_TYPE = 'synapse-notebook';

class DelegatingNotebookSerializer {
    constructor(parse, serialize) {
        this.parse = parse;
        this.serialize = serialize;
    }

    deserializeNotebook(content) {
        const parsed = this.parse(new TextDecoder().decode(content));
        const cells = parsed.cells.map((parsedCell) => {
            const kind = parsedCell.kind === 'markdown' ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code;
            const cell = new vscode.NotebookCellData(kind, parsedCell.value, parsedCell.language);
            cell.metadata = parsedCell.metadata;
            return cell;
        });
        const notebook = new vscode.NotebookData(cells);
        notebook.metadata = parsed.metadata;
        return notebook;
    }

    serializeNotebook(notebook) {
        const plainNotebook = {
            metadata: notebook.metadata,
            cells: notebook.cells.map((cell) => ({
                kind: cell.kind === vscode.NotebookCellKind.Markup ? 'markdown' : 'code',
                value: cell.value,
                metadata: cell.metadata,
            })),
        };
        return new TextEncoder().encode(this.serialize(plainNotebook));
    }
}

function registerOpenCommand(commandId, notebookType, hint) {
    return vscode.commands.registerCommand(commandId, async (uri) => {
        const target = uri || vscode.window.activeTextEditor?.document.uri;
        if (!target) {
            void vscode.window.showInformationMessage(hint);
            return;
        }
        await vscode.commands.executeCommand('vscode.openWith', target, notebookType);
    });
}

function activate(context) {
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer(
            FABRIC_TYPE,
            new DelegatingNotebookSerializer(parseFabricNotebook, serializeFabricNotebook),
            { transientOutputs: true },
        ),
        vscode.workspace.registerNotebookSerializer(
            SYNAPSE_TYPE,
            new DelegatingNotebookSerializer(parseSynapseNotebook, serializeSynapseNotebook),
            { transientOutputs: true },
        ),
        registerOpenCommand('fabricNotebook.open', FABRIC_TYPE, 'Open a Fabric notebook-content.py file first.'),
        registerOpenCommand('synapseNotebook.open', SYNAPSE_TYPE, 'Open a Synapse notebook .json file first.'),
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
