const { buildPOFromDOM } = require('../src/buildPOFromDOM');
const { createDocument } = require('./dom');

describe('buildPOFromDOM - breadcrumbs', () => {
  test('collects breadcrumb links and strips base path', () => {
    const html = `
      <nav aria-label="Breadcrumb">
        <ol class="breadcrumb">
          <li><a href="/MOEIL/">Home</a></li>
          <li><a href="/MOEIL/Analytics">Analytics</a></li>
        </ol>
      </nav>
    `;
    const doc = createDocument(html);
    const po = buildPOFromDOM(doc, {
      baseUrl: 'https://fat.ei.weblakes.com/MOEIL',
      currentURL: 'https://fat.ei.weblakes.com/MOEIL/NavPage/Index/Analytics'
    });

    expect(po.breadcrumbs.length).toBe(2);
    expect(po.breadcrumbs[0]).toEqual({
      description: 'Home',
      expectedURL: '/',
      expectedTitle: null
    });
    expect(po.breadcrumbs[1].expectedURL).toBe('Analytics');
  });
});
