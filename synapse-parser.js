'use strict';

const MAGIC_LANGUAGES = {
    sql: 'sql',
    spark: 'scala',
    scala: 'scala',
    csharp: 'csharp',
    sparkr: 'r',
    r: 'r',
    pyspark: 'python',
    python: 'python',
    html: 'html',
    markdown: 'markdown',
    configure: 'python',
};

function detectEol(text) {
    const firstBreak = text.indexOf('\n');
    return firstBreak > 0 && text[firstBreak - 1] === '\r' ? '\r\n' : '\n';
}

function detectIndent(text) {
    const secondLine = text.split(/\r?\n/)[1];
    const match = secondLine && secondLine.match(/^[\t ]+/);
    return match ? match[0] : '\t';
}

function detectLanguage(kind, value) {
    if (kind === 'markdown') return 'markdown';
    const firstLine = value.split(/\r?\n/, 1)[0].trim();
    const magic = firstLine.match(/^%%([a-z]+)/i);
    return (magic && MAGIC_LANGUAGES[magic[1].toLowerCase()]) || 'python';
}

function encodeSource(cell) {
    const metadata = cell.metadata || {};
    if (cell.value === metadata.synapseOriginalValue && Array.isArray(metadata.synapseOriginalSource)) {
        return metadata.synapseOriginalSource;
    }
    if (cell.value === '') return [];
    const lines = cell.value.split(/\r?\n/);
    return lines.map((line, index) => (index === lines.length - 1 ? line : `${line}\n`));
}

function parseSynapseNotebook(text) {
    let document;
    try {
        document = JSON.parse(text);
    } catch (error) {
        throw new Error(`Not a valid Synapse notebook: ${error.message}`);
    }

    const properties = document && document.properties;
    if (!properties || !Array.isArray(properties.cells)) {
        throw new Error('Not a Synapse notebook: expected a "properties.cells" array.');
    }

    const cells = properties.cells.map((sourceCell) => {
        const kind = sourceCell.cell_type === 'markdown' ? 'markdown' : 'code';
        const rawSource = sourceCell.source;
        const value = Array.isArray(rawSource) ? rawSource.join('') : rawSource || '';

        return {
            kind,
            language: detectLanguage(kind, value),
            value,
            metadata: {
                synapseCell: sourceCell,
                synapseOriginalValue: value,
                synapseOriginalSource: rawSource,
            },
        };
    });

    const documentTemplate = { ...document, properties: { ...properties } };
    documentTemplate.properties.cells = [];

    return {
        cells,
        metadata: {
            synapseOriginalText: text,
            synapseDocument: documentTemplate,
            synapseEol: detectEol(text),
            synapseIndent: detectIndent(text),
            synapseTrailingNewline: text.endsWith('\n'),
        },
    };
}

function isUnchanged(notebook) {
    return notebook.cells.every((cell) => {
        const metadata = cell.metadata || {};
        return cell.value === metadata.synapseOriginalValue;
    });
}

function serializeSynapseNotebook(notebook) {
    const documentMetadata = notebook.metadata || {};
    if (documentMetadata.synapseOriginalText && isUnchanged(notebook)) {
        return documentMetadata.synapseOriginalText;
    }

    const eol = documentMetadata.synapseEol || '\r\n';
    const indent = documentMetadata.synapseIndent || '\t';
    const template = documentMetadata.synapseDocument;
    const document = template
        ? { ...template, properties: { ...template.properties } }
        : { name: 'notebook', properties: { nbformat: 4, nbformat_minor: 2, cells: [] } };

    document.properties.cells = notebook.cells.map((cell) => {
        const metadata = cell.metadata || {};
        const isMarkdown = cell.kind === 'markdown';
        const base = metadata.synapseCell
            ? { ...metadata.synapseCell }
            : isMarkdown
              ? { cell_type: 'markdown', metadata: {} }
              : { cell_type: 'code', metadata: {}, execution_count: null };
        base.cell_type = isMarkdown ? 'markdown' : 'code';
        base.source = encodeSource(cell);
        return base;
    });

    let text = JSON.stringify(document, null, indent);
    if (eol === '\r\n') text = text.replace(/\n/g, '\r\n');
    return documentMetadata.synapseTrailingNewline ? `${text}${eol}` : text;
}

module.exports = { parseSynapseNotebook, serializeSynapseNotebook };
