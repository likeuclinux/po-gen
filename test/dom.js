// po-gen/test/dom.js
const { JSDOM } = require('jsdom');

function createDocument(html = '<!doctype html><html><head></head><body></body></html>') {
  const dom = new JSDOM(html);
  return dom.window.document;
}

module.exports = { createDocument };
