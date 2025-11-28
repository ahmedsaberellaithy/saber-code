const fs = require('fs').promises;
const path = require('path');

async function readFile(filePath, encoding = 'utf8') {
  return await fs.readFile(filePath, encoding);
}

async function writeFile(filePath, content, encoding = 'utf8') {
  return await fs.writeFile(filePath, content, encoding);
}

async function unlink(filePath) {
  return await fs.unlink(filePath);
}

async function access(filePath) {
  return await fs.access(filePath);
}

async function mkdir(dirPath, options = { recursive: true }) {
  return await fs.mkdir(dirPath, options);
}

async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readdir(dirPath, options = {}) {
  return await fs.readdir(dirPath, options);
}

module.exports = {
  readFile,
  writeFile,
  unlink,
  access,
  mkdir,
  ensureDir,
  fileExists,
  readdir
};