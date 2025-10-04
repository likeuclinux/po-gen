// po-gen/src/cypress/registerPoTask.js
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { renderPO } = require('../renderPO');

/**
 * Factory that returns a tasks object to spread into on('task', { ... })
 * Usage:
 *   on('task', { ...makePoTasks({ defaultOutDir: 'po_out' }) })
 */
function makePoTasks(options = {}) {
  const defaults = {
    defaultOutDir: 'po_out',
    defaultCodeOutDir: 'cypress/support/PageObjects',
  };
  const opts = { ...defaults, ...options };

  return {
    'po:writeYaml'({ name, data, outDir, alsoGenerate, lang, codeOutDir }) {
      try {
        const safeName = String(name || 'GeneratedPage').replace(/[^a-zA-Z0-9_-]+/g, '');
        const yamlDir  = path.join(process.cwd(), outDir || opts.defaultOutDir);
        fs.mkdirSync(yamlDir, { recursive: true });

        const yamlPath = path.join(yamlDir, `${safeName}.yaml`);
        const yamlText = YAML.stringify(data, { lineWidth: 0 });
        fs.writeFileSync(yamlPath, yamlText, 'utf8');

        const gen = (alsoGenerate ?? (String(process.env.PO_GEN_CODE || 'true') === 'true'));
        if (gen) {
          const outLang = (lang || process.env.PO_LANG || 'js').toLowerCase();
          const poDir   = path.join(process.cwd(), codeOutDir || opts.defaultCodeOutDir);
          fs.mkdirSync(poDir, { recursive: true });

          const generated = renderPO(data, { lang: outLang, codeOutDir: poDir });
          const codePath  = path.join(poDir, generated.fileName);
          fs.writeFileSync(codePath, generated.code, 'utf8');

          return { yamlPath, codePath, className: generated.className, lang: outLang };
        }

        return { yamlPath, codePath: null, className: null, lang: null };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    },
  };
}

/**
 * Convenience: directly register the tasks on Cypress.
 * Usage in cypress.config.js:
 *   registerPoTasks(on, config, { defaultOutDir: 'po_out' });
 */
function registerPoTasks(on, config, options) {
  on('task', makePoTasks(options));
  return config;
}

module.exports = { makePoTasks, registerPoTasks };
