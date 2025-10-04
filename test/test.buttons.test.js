// po-gen/test/test.buttons.test.js
const { buildPOFromDOM } = require('../src/buildPOFromDOM');
const { createDocument } = require('./dom');

describe('buildPOFromDOM - buttons', () => {
  test('detects buttons with data-testid and id', () => {
    const html = `
      <button id="saveBtn" title="Save">Save</button>
      <a data-testid="mnumain-mnianalytics" href="/MOEIL/NavPage/Index/Analytics">Analytics</a>
      <div data-testid="npsearch" role="button">Search All</div>
      <a class="btn" href="/MOEIL/Nav/Module/EI">EI</a>
    `;
    const doc = createDocument(html);
    const po = buildPOFromDOM(doc, {
      baseUrl: 'https://fat.ei.weblakes.com/MOEIL',
      currentURL: 'https://fat.ei.weblakes.com/MOEIL'
    });

    const keys = po.buttons.map(b => b.dataTestId || b.id);
    expect(keys).toContain('mnumain-mnianalytics');
    expect(keys).toContain('npsearch');
    expect(keys).toContain('saveBtn');

    // The generic ".btn" anchor has neither id nor data-testid -> excluded
    expect(keys).not.toContain(undefined);
  });
});
