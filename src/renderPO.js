// po-gen/src/renderPO.js
// Renders a Page Object class file from the extracted PO shape

const path = require('path');

function pascalCase(s = '') {
  return String(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toKey(s, fallback = 'ITEM') {
  const base = String(s || fallback)
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return (base || fallback).toUpperCase();
}

function jsStr(v) {
  return v == null ? 'null' : JSON.stringify(v);
}

// single-quoted string literal (for selectors), escaping \' and backslashes
function sQuote(v) {
  if (v == null) return 'null';
  const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${s}'`;
}

function selectorFor(x) {
  if (x?.dataTestId) return `[data-testid="${x.dataTestId}"]`;
  if (x?.id) return x.id.startsWith('#') || x.id.startsWith('.') ? x.id : `#${x.id}`;
  if (x?.fallbackSelector) return x.fallbackSelector;
  return null;
}

// "AQMIS | Analytics - Search All" => "Analytics - Search All"
function normalizeTitle(t) {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const parts = s.split('|');
  return parts.length > 1 ? parts[parts.length - 1].trim() : s;
}

// Normalize "pathLabel" values into your "Analytics , Search All" shape
function normalizePathLabel(val) {
  if (val == null) return '';
  if (Array.isArray(val)) {
    const flat = val.flat(Infinity).filter(Boolean).map(x => String(x));
    const joined = flat.length && flat.every(s => s.length === 1) ? flat.join('') : flat.join(' | ');
    return joined.replace(/\s*\|\s*/g, ' , ');
  }
  return String(val).replace(/\s*\|\s*/g, ' , ');
}

function renderPO(po, { lang = 'js', codeOutDir = 'cypress/support/PageObjects' } = {}) {
  const page = po?.page || {};
  const breadcrumbs = Array.isArray(po?.breadcrumbs) ? po.breadcrumbs : [];
  const buttons     = Array.isArray(po?.buttons) ? po.buttons : [];
  const reports     = Array.isArray(po?.reports) ? po.reports : [];

  const className = pascalCase(page.name || 'GeneratedPage');
  const fileName  = `${className}.${lang === 'ts' ? 'ts' : 'js'}`;

  const pageTitle = normalizeTitle(page.title);
  const pagePath  = normalizePathLabel(page.pathLabel);

  // BreadCrumbs (default Home to "/"; null out empty URLs)
  const bcEntries = breadcrumbs.map(b => {
    const key = toKey(b.description || b.expectedURL || 'BREADCRUMB');
    const isHome = String(b.description || '').trim().toLowerCase() === 'home';
    const expURL = (b.expectedURL && b.expectedURL !== '') ? b.expectedURL : (isHome ? '/' : null);
    return `    ${key}: { description: ${jsStr(b.description)}, expectedURL: ${jsStr(expURL)}, expectedTitle: ${jsStr(b.expectedTitle)} },`;
  }).join('\n');

  // Buttons (selector emitted as single-quoted literal to avoid JSON escaping)
  const btnEntries = buttons.map(b => {
    const key = toKey(b.description || b.dataTestId || b.id || 'Button');
    const sel = selectorFor(b);
    const expURL = (b.expectedURL && b.expectedURL !== '') ? b.expectedURL : null;
    return `    ${key}: { description: ${jsStr(b.description)}, name: ${jsStr(b.name)}, dataTestId: ${jsStr(b.dataTestId)}, id: ${jsStr(b.id)}, expectedURL: ${jsStr(expURL)}, expectedTitle: ${jsStr(b.expectedTitle)}, selector: ${sQuote(sel)} },`;
  }).join('\n');

  const rptEntries = reports.map(r => {
    const key = toKey(r.linkId || r.title || 'Report');
    return `    ${key}: { linkId: ${jsStr(r.linkId)}, title: ${jsStr(r.title)}, interceptedURL: ${jsStr(r.interceptedURL)}, expectedIframe: ${jsStr(r.expectedIframe || '#lkDialogFrame')} },`;
  }).join('\n');

  // Convenience run methods (e.g., runTempprofiles)
  const runConvenience = reports.map(r => {
    const key = toKey(r.linkId || r.title || 'Report'); // e.g., TEMPPROFILES
    const pretty = key.toLowerCase();                    // tempprofiles
    const method = 'run' + pretty.charAt(0).toUpperCase() + pretty.slice(1);
    return `  static ${method}(opts = {}) { return this.runReportKey('${key}', opts); }`;
  }).join('\n');

  const code = `// cypress/support/PageObjects/${className}.js
export class ${className} {
  static PageTitle = ${jsStr(pageTitle)};${pageTitle ? '' : ' // null means skip title check'}
  static PageURL   = ${jsStr(page.url || '/')}; // relative to baseUrl
  static PagePath  = ${jsStr(pagePath)};
  static AdminOnly = ${page.adminOnly === true ? 'true' : 'false'};

  static IFRAME_SEL = '#lkDialogFrame';

  static BreadCrumbs = Object.freeze({
${bcEntries}
  });

  static Buttons = Object.freeze({
${btnEntries}
  });

  static Reports = Object.freeze({
${rptEntries}
  });

  // ---- navigation ----
  static visit() {
    cy.allure().step(\`👉 Visit \${this.PagePath || this.PageURL}\`);
    cy.visitWithA11y(this.PageURL);
    this.ensureOnPage();
    cy.allure().endStep();
  }

  static ensureOnPage() {
    const sel = this.Buttons?.SEARCH_ALL?.selector
      || Object.values(this.Buttons || {})?.[0]?.selector
      || 'body';
    cy.get(sel, { timeout: 60000 }).should('be.visible');
  }

  // ---- old-style helpers you already use ----
  static verifyAnalyticNavIcon(analyticID, analyticalTitle) {
    cy.allure().step(\`👉 Verify \${analyticalTitle} analytic NavIcon visible\`);
    cy.getID(\`pnl-pnl\${analyticID}\`).should('be.visible');
    cy.getID(\`pnl-panel-title_pnl\${analyticID}\`).should('contain', analyticalTitle).and('be.visible');
    cy.allure().endStep();
  }

  static clickOnRun(analyticID, analyticalTitle) {
    cy.allure().step(\`Click [Run] \${analyticalTitle}\`);
    cy.getID(\`pnl-panel-title_pnl\${analyticID}\`)
      .siblings('.ibox-tools')
      .find('button.lk-analytics-run-link-btn')
      .should('be.visible')
      .click({ force: true });
    cy.allure().endStep();
  }

  static verifyIfAnalyticIsOpenAndTitleIsVisible(analyticalTitle) {
    cy.allure().step(\`👉 Verify "\${analyticalTitle}" tool opened & title visible\`);
    const iframe = this.IFRAME_SEL;
    cy.get(iframe, { timeout: 60000 }).should('be.visible');
    cy.frameLoaded(iframe);
    cy.iframe(iframe).within(() => {
      cy.getID('pnl-reportitempnl').should('exist').and('be.visible');
      cy.getID('pnl-panel-title_reportitempnl')
        .should('be.visible')
        .invoke('text')
        .then(t => (t || '').replace(/\\s+/g, ' ').trim())
        .should('contain', analyticalTitle);
    });
    cy.allure().endStep();
  }

  static tryClosePopup(opts = {}) {
    const iframe = opts.expectedIframe || this.IFRAME_SEL;
    const CLOSE_SEL = 'a#lkBlockDialogClose.blockUI-close, a#lkBlockDialogClose';
    cy.iframe(iframe).then(($b) => {
      const $close = $b.find(CLOSE_SEL);
      if ($close.length) {
        cy.wrap($close[0]).scrollIntoView().click({ force: true });
        cy.iframe(iframe).find(CLOSE_SEL, { timeout: 2000 }).should('not.exist');
        cy.log('tryClosePopup: popup closed');
      }
    });
  }

  static closeReportDialog() {
    cy.get('body').then($b => {
      const $x = $b.find('button.close, .ui-dialog-titlebar-close, [data-testid="btnClose"], a.lk-close-dialog');
      if ($x.length) cy.wrap($x[0]).click({ force: true });
    });
    this.ensureOnPage();
  }

  // ---- run helpers ----
  static runByLinkId(linkId, { expectedUrl, expectedTitle } = {}) {
    cy.allure().step(\`Run by linkId: \${linkId}\`);
    const alias = \`run_\${linkId}\`;
    if (expectedUrl) cy.intercept(\`**\${expectedUrl}**\`).as(alias);

    cy.get(\`a.nav-page-favorite-control[data-linkid="\${linkId}"]\`)
      .closest('.ibox-title')
      .find('button.lk-analytics-run-link-btn')
      .scrollIntoView()
      .click({ force: true });

    if (expectedUrl) cy.wait('@' + alias);
    if (expectedTitle) this.verifyIfAnalyticIsOpenAndTitleIsVisible(expectedTitle);

    this.tryClosePopup({ expectedIframe: this.IFRAME_SEL });
    this.closeReportDialog();
    cy.allure().endStep();
  }

  static runReportKey(key, opts = {}) {
    const r = this.Reports?.[key];
    if (!r) throw new Error(\`Unknown report key: \${key}\`);
    return this.runByLinkId(r.linkId, { expectedUrl: r.interceptedURL, expectedTitle: r.title, ...opts });
  }

${runConvenience}

  static clickButton(btn)   { cy.clickOnButton(btn); }
  static clickBreadcrumb(b) { cy.clickOnBreadcrumbLink(b); }
  static type(field, value) {
    const sel = field?.selector;
    if (!sel) throw new Error('No selector for field');
    cy.get(sel).should('be.visible').clear().type(String(value));
  }
}
`;

  return {
    className,
    fileName,
    code,
    absPath: path.join(codeOutDir, fileName),
  };
}

module.exports = { renderPO };
