const test = require('node:test');
const assert = require('node:assert/strict');

const multer = require('multer');

const {
  decodeOriginalName,
  formatSiebridgeUploadError,
  isAllowedSiebridgeUploadFile,
  isValidFileDeleteConfirmation,
  normalizeRelativePath
} = require('./siebridge');

test('SIEBridge folder uploads accept mixed ordinary file types', () => {
  const files = [
    { originalname: 'lecture.pdf' },
    { originalname: 'assets/diagram.png' },
    { originalname: 'notes/readme.md' },
    { originalname: 'code/example.js' },
    { originalname: 'data/result.csv' },
    { originalname: 'plain-text-without-extension' }
  ];

  assert.equal(files.every(file => isAllowedSiebridgeUploadFile(file)), true);
});

test('SIEBridge uploads reject unnamed files', () => {
  assert.equal(isAllowedSiebridgeUploadFile({ originalname: '' }), false);
});

test('SIEBridge upload limit errors become friendly 413 responses', () => {
  const error = new multer.MulterError('LIMIT_FILE_SIZE', 'files');
  const result = formatSiebridgeUploadError(error);

  assert.equal(result.status, 413);
  assert.match(result.message, /200MB/);
});

test('SIEBridge preserves readable Chinese file and folder names', () => {
  assert.equal(decodeOriginalName('课程资料.md'), '课程资料.md');
  assert.equal(normalizeRelativePath('课程/资料.md', '资料.md'), '课程/资料.md');
});

test('SIEBridge repairs latin1 mojibake Chinese file names', () => {
  const mojibake = Buffer.from('课程/资料.md', 'utf8').toString('latin1');

  assert.equal(decodeOriginalName(mojibake), '课程/资料.md');
  assert.equal(normalizeRelativePath(mojibake, '资料.md'), '课程/资料.md');
});

test('SIEBridge resource file deletion requires file-specific confirmation', () => {
  const file = { originalName: '资料.md', relativePath: '课程/资料.md' };

  assert.equal(isValidFileDeleteConfirmation(file, '资料.md'), true);
  assert.equal(isValidFileDeleteConfirmation(file, '课程/资料.md'), true);
  assert.equal(isValidFileDeleteConfirmation(file, '确认删除'), true);
  assert.equal(isValidFileDeleteConfirmation(file, '其他资料.md'), false);
});
