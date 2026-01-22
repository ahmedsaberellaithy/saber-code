/**
 * Tool layer - read, write, edit, search, glob, shell, list
 */

const { ToolRegistry } = require('./registry');
const read = require('./read');
const write = require('./write');
const edit = require('./edit');
const list = require('./list');
const search = require('./search');
const globTool = require('./globTool');
const shell = require('./shell');

const BUILTINS = [read, write, edit, list, search, globTool, shell];

function createRegistry() {
  const r = new ToolRegistry();
  r.registerAll(BUILTINS);
  return r;
}

module.exports = {
  ToolRegistry,
  createRegistry,
  read,
  write,
  edit,
  list,
  search,
  glob: globTool,
  shell,
  BUILTINS
};
