// po-gen/src/cypress/registerPoTasks.js
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { renderPO } = require('../renderPO');

function registerPoTasks(on, config) {
  on('task', {
    'po:writeYaml'({ name, data, outDir, alsoGenerate, lang, codeOutDir }) {
      try {
        const safeName = String(name || 'GeneratedPage').replace(/[^a-zA-Z0-9_-]+/g, '');
        const yamlDir  = path.join(process.cwd(), outDir || 'po_out');
        fs.mkdirSync(yamlDir, { recursive: true });
        const yamlPath = path.join(yamlDir, `${safeName}.yaml`);
        const yamlText = YAML.stringify(data, { lineWidth: 0 });
        fs.writeFileSync(yamlPath, yamlText, 'utf8');

        const gen = (alsoGenerate ?? (String(process.env.PO_GEN_CODE || 'true') === 'true'));
        if (gen) {
          const outLang  = (lang || process.env.PO_LANG || 'js').toLowerCase();
          const poDir    = path.join(process.cwd(), codeOutDir || process.env.PO_CODE_OUT || 'cypress/support/PageObjects');
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
  });

  return config;
}

module.exports = registerPoTasks;
