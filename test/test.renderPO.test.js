// po-gen/test/test.renderPO.test.js
const { renderPO } = require('../src/renderPO');

describe('renderPO', () => {
  test('emits a class with buttons + reports and run convenience', () => {
    const po = {
      page: {
        name: 'AutoPOAnalytics',
        title: 'ACME | Analytics - Search All',
        url: 'NavPage/Index/Analytics',
        adminOnly: false,
        pathLabel: ['Analytics', 'Search All']
      },
      breadcrumbs: [{ description: 'Home', expectedURL: '/', expectedTitle: null }],
      buttons: [
        { description: 'Analytics', dataTestId: 'mnumain-mnianalytics', id: null, expectedURL: 'NavPage/Index/Analytics', expectedTitle: null }
      ],
      reports: [
        { linkId: 'tempProfiles', title: 'Temporal Allocation Profiles', interceptedURL: 'aLinkId=tempProfiles', expectedIframe: '#lkDialogFrame' }
      ]
    };

    const out = renderPO(po, { lang: 'js', codeOutDir: 'cypress/support/PageObjects' });
    // pascalCase keeps inner capitals if the original had them as one token
    expect(out.className).toBe('AutoPOAnalytics');
    expect(out.fileName).toBe('AutoPOAnalytics.js');
    expect(out.code).toContain('static Reports = Object.freeze');
    expect(out.code).toContain('runTempprofiles'); // convenience method
    expect(out.code).toContain('[data-testid="mnumain-mnianalytics"]');
    expect(out.code).toContain('static PageTitle = "Analytics - Search All"');
  });
});
