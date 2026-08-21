'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseFabricNotebook, serializeFabricNotebook } = require('./parser');

const fixture = process.argv[2] || path.resolve(__dirname, 'test/sample-notebook-content.py');
const original = fs.readFileSync(fixture, 'utf8');
const parsed = parseFabricNotebook(original);

assert.equal(parsed.cells.length, 7, 'expected seven Fabric cells');
assert.equal(parsed.cells[0].metadata.fabricMagic, true, 'configure cell should decode MAGIC lines');
assert.match(parsed.cells[0].value, /^%%configure/);
assert.equal(parsed.cells[1].kind, 'markdown');
assert.match(parsed.cells[1].value, /^- \*\*Purpose:\*\*/);
assert.equal(serializeFabricNotebook(parsed), original, 'no-edit serialization must be byte-for-byte identical');

const edited = structuredClone(parsed);
edited.cells[1].value = `${edited.cells[1].value}\n\nNotebook viewer test.`;
const reparsed = parseFabricNotebook(serializeFabricNotebook(edited));
assert.match(reparsed.cells[1].value, /Notebook viewer test\.$/);

console.log(`PASS: ${parsed.cells.length} cells parsed; exact round-trip and Markdown edit verified.`);
