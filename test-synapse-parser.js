'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseSynapseNotebook, serializeSynapseNotebook } = require('./synapse-parser');

const fixture = process.argv[2] || path.resolve(__dirname, 'test/sample-synapse-notebook.json');
const original = fs.readFileSync(fixture, 'utf8');
const parsed = parseSynapseNotebook(original);

assert.ok(parsed.cells.length > 0, 'expected at least one Synapse cell');
assert.equal(serializeSynapseNotebook(parsed), original, 'no-edit serialization must be byte-for-byte identical');

const markdownIndex = parsed.cells.findIndex((cell) => cell.kind === 'markdown');
assert.ok(markdownIndex >= 0, 'expected a Markdown cell in the fixture');
assert.equal(parsed.cells[markdownIndex].language, 'markdown');

const sqlCell = parsed.cells.find((cell) => cell.value.trim().startsWith('%%sql'));
if (sqlCell) assert.equal(sqlCell.language, 'sql', '%%sql cells should highlight as SQL');

const crlf = original.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
assert.equal(serializeSynapseNotebook(parseSynapseNotebook(crlf)), crlf, 'CRLF documents must round-trip');

const edited = structuredClone(parsed);
edited.cells[markdownIndex].value = `${edited.cells[markdownIndex].value}\nNotebook viewer test.`;
const reparsed = parseSynapseNotebook(serializeSynapseNotebook(edited));
assert.match(reparsed.cells[markdownIndex].value, /Notebook viewer test\.$/);
assert.equal(reparsed.cells.length, parsed.cells.length, 'cell count must survive an edit round-trip');
assert.deepEqual(
    reparsed.cells.map((cell) => cell.metadata.synapseCell.cell_type),
    parsed.cells.map((cell) => cell.metadata.synapseCell.cell_type),
);

console.log(`PASS: ${parsed.cells.length} Synapse cells parsed; exact round-trip and Markdown edit verified.`);
