// po-gen/index.js
const { buildPOFromDOM } = require('./src/buildPOFromDOM');
const { stripBasePath, pascalCase, toKey } = require('./src/normalize');
const { renderPO } = require('./src/renderPO');
//const registerPoTasks = require('./src/cypress/registerPoTasks');
const { makePoTasks, registerPoTasks } = require('./src/cypress/registerPoTask'); // singular

module.exports = {
  // core
  buildPOFromDOM,
  stripBasePath,
  pascalCase,
  toKey,

  // codegen
  renderPO,

  // Cypress integration
  makePoTasks,
  registerPoTasks,
};
