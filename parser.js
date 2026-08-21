'use strict';

const CELL_MARKER = /^# (CELL|MARKDOWN) \*+\s*$/;
const METADATA_MARKER = /^# METADATA \*+\s*$/;
const DEFAULT_CODE_MARKER = '# CELL ********************';
const DEFAULT_MARKDOWN_MARKER = '# MARKDOWN ********************';
const DEFAULT_FOOTER = [
    '# METADATA ********************',
    '',
    '# META {',
    '# META   "language": "python",',
    '# META   "language_group": "synapse_pyspark"',
    '# META }',
];

function splitBoundaryBlanks(lines) {
    let start = 0;
    let end = lines.length;
    while (start < end && lines[start] === '') start += 1;
    while (end > start && lines[end - 1] === '') end -= 1;
    return {
        leadingBlankCount: start,
        bodyLines: lines.slice(start, end),
        trailingBlankCount: lines.length - end,
    };
}

function decodeMarkdown(lines) {
    return lines.map((line) => {
        if (line === '#') return '';
        return line.startsWith('# ') ? line.slice(2) : line;
    });
}

function isMagicCell(lines) {
    const nonblank = lines.filter((line) => line !== '');
    return nonblank.length > 0 && nonblank.every((line) => line === '# MAGIC' || line.startsWith('# MAGIC '));
}

function decodeMagic(lines) {
    return lines.map((line) => {
        if (line === '# MAGIC') return '';
        return line.startsWith('# MAGIC ') ? line.slice(8) : line;
    });
}

function parseFabricNotebook(text) {
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const trailingNewline = text.endsWith(eol);
    const lines = text.split(/\r?\n/);
    if (trailingNewline) lines.pop();

    const markerIndexes = [];
    for (let index = 0; index < lines.length; index += 1) {
        if (CELL_MARKER.test(lines[index])) markerIndexes.push(index);
    }

    if (markerIndexes.length === 0) {
        throw new Error('No Fabric # CELL or # MARKDOWN markers were found.');
    }

    const cells = markerIndexes.map((markerIndex, cellIndex) => {
        const marker = lines[markerIndex];
        const nextMarker = markerIndexes[cellIndex + 1] ?? lines.length;
        const segment = lines.slice(markerIndex + 1, nextMarker);
        const footerIndex = segment.findIndex((line) => METADATA_MARKER.test(line));
        const bodyRegion = footerIndex >= 0 ? segment.slice(0, footerIndex) : segment;
        const footerLines = footerIndex >= 0 ? segment.slice(footerIndex) : [];
        const boundary = splitBoundaryBlanks(bodyRegion);
        const kind = marker.startsWith('# MARKDOWN') ? 'markdown' : 'code';
        const magic = kind === 'code' && isMagicCell(boundary.bodyLines);
        const decodedLines =
            kind === 'markdown'
                ? decodeMarkdown(boundary.bodyLines)
                : magic
                  ? decodeMagic(boundary.bodyLines)
                  : boundary.bodyLines;
        const value = decodedLines.join('\n');

        return {
            kind,
            language: kind === 'markdown' ? 'markdown' : 'python',
            value,
            metadata: {
                fabricMarker: marker,
                fabricFooterLines: footerLines,
                fabricLeadingBlankCount: boundary.leadingBlankCount,
                fabricTrailingBlankCount: boundary.trailingBlankCount,
                fabricMagic: magic,
                fabricOriginalValue: value,
                fabricOriginalBodyLines: boundary.bodyLines,
            },
        };
    });

    return {
        cells,
        metadata: {
            fabricPreambleLines: lines.slice(0, markerIndexes[0]),
            fabricEol: eol,
            fabricTrailingNewline: trailingNewline,
        },
    };
}

function encodeBody(cell) {
    const metadata = cell.metadata || {};
    if (cell.value === metadata.fabricOriginalValue && Array.isArray(metadata.fabricOriginalBodyLines)) {
        return metadata.fabricOriginalBodyLines;
    }

    const lines = cell.value === '' ? [] : cell.value.split('\n');
    if (cell.kind === 'markdown') {
        return lines.map((line) => (line === '' ? '#' : `# ${line}`));
    }
    if (metadata.fabricMagic) {
        return lines.map((line) => `# MAGIC ${line}`);
    }
    return lines;
}

function serializeFabricNotebook(notebook) {
    const documentMetadata = notebook.metadata || {};
    const eol = documentMetadata.fabricEol || '\n';
    const output = Array.isArray(documentMetadata.fabricPreambleLines)
        ? [...documentMetadata.fabricPreambleLines]
        : [
              '# Fabric notebook source',
              '',
              '# METADATA ********************',
              '',
              '# META {',
              '# META   "kernel_info": { "name": "synapse_pyspark" }',
              '# META }',
              '',
          ];

    notebook.cells.forEach((cell) => {
        const metadata = cell.metadata || {};
        output.push(
            metadata.fabricMarker || (cell.kind === 'markdown' ? DEFAULT_MARKDOWN_MARKER : DEFAULT_CODE_MARKER),
        );
        output.push(...Array(metadata.fabricLeadingBlankCount ?? 1).fill(''));
        output.push(...encodeBody(cell));
        output.push(...Array(metadata.fabricTrailingBlankCount ?? 1).fill(''));

        if (Array.isArray(metadata.fabricFooterLines) && metadata.fabricFooterLines.length > 0) {
            output.push(...metadata.fabricFooterLines);
        } else if (cell.kind !== 'markdown') {
            output.push(...DEFAULT_FOOTER);
        }
    });

    const text = output.join(eol);
    return documentMetadata.fabricTrailingNewline === false ? text : `${text}${eol}`;
}

module.exports = { parseFabricNotebook, serializeFabricNotebook };
