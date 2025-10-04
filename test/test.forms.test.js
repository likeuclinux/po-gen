// po-gen/test/test.forms.test.js
const { buildPOFromDOM } = require('../src/buildPOFromDOM');
const { createDocument } = require('./dom');

describe('buildPOFromDOM - form fields', () => {
  test('collects input/select/textarea that have id or data-testid', () => {
    const html = `
      <form>
        <input id="username" />
        <input data-testid="password" type="password"/>
        <select data-testid="country"></select>
        <textarea id="notes"></textarea>
        <input type="checkbox"/> <!-- ignored (no id/testid) -->
      </form>
    `;
    const doc = createDocument(html);
    const po = buildPOFromDOM(doc, { currentURL: '/' });

    const ids = po.formFields.map(f => f.id || f.dataTestId);
    expect(ids).toEqual(expect.arrayContaining(['username', 'password', 'country', 'notes']));
  });
});
