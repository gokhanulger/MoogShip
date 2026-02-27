/**
 * Patches buffer-equal-constant-time for Node.js v25+ compatibility.
 * SlowBuffer was removed in Node.js v25, causing runtime errors.
 * This script removes SlowBuffer references from the module.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'buffer-equal-constant-time', 'index.js');

if (!fs.existsSync(filePath)) {
  console.log('[patch] buffer-equal-constant-time not found, skipping patch');
  process.exit(0);
}

const content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('SlowBuffer')) {
  console.log('[patch] buffer-equal-constant-time already patched');
  process.exit(0);
}

const patched = content
  .replace(/var SlowBuffer = require\('buffer'\)\.SlowBuffer;\n?/, '')
  .replace(/Buffer\.prototype\.equal = SlowBuffer\.prototype\.equal = function/, 'Buffer.prototype.equal = function')
  .replace(/var origSlowBufEqual = SlowBuffer\.prototype\.equal;\n?/, '')
  .replace(/SlowBuffer\.prototype\.equal = origSlowBufEqual;\n?/, '');

fs.writeFileSync(filePath, patched, 'utf8');
console.log('[patch] buffer-equal-constant-time patched for Node.js v25+ compatibility');
