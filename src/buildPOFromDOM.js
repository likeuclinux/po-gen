// po-gen/src/buildPOFromDOM.js
// Library functions to extract a Page Object (PO) shape from a DOM

function stripBasePath(u, baseUrl = '') {
  if (!u) return '';
  let url = String(u).trim();

  // normalize to pathname?search#hash if absolute
  try {
    const parsed = new URL(url, 'http://_dummy');
    url = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // relative: keep as-is
  }

  // remove configured base path from the front (e.g., /MOEIL)
  let basePath = '/';
  try {
    basePath = new URL(baseUrl || 'http://_dummy').pathname || '/';
  } catch {
    basePath = String(baseUrl || '/');
  }
  basePath = basePath.replace(/\/+$/, '');
  if (basePath && basePath !== '/') {
    const rx = new RegExp('^' + basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?', 'i');
    url = url.replace(rx, '');
  }

  // drop a single leading slash to keep it relative to baseUrl
  url = url.replace(/^\//, '');
  return url || '';
}

// In Node/jsdom visibility is not computed; default to true unless explicitly hidden
function visible(el) {
  if (!el) return false;
  const style = (el.getAttribute && el.getAttribute('style')) || '';
  if (/\bdisplay\s*:\s*none\b/i.test(style)) return false;
  if (/\bvisibility\s*:\s*hidden\b/i.test(style)) return false;
  return true;
}

function toKey(s, fallback = 'ITEM') {
  const base = String(s || fallback)
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return base || fallback;
}

function pascalCase(s = '') {
  return String(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function collectBreadcrumbs(doc, { baseUrl } = {}) {
  const out = [];
  const containers = doc.querySelectorAll(`
    nav.breadcrumb,
    nav[aria-label*="breadcrumb" i],
    ol.breadcrumb,
    [data-testid*="breadcrumb" i]
  `);

  containers.forEach((c) => {
    c.querySelectorAll('a[href]').forEach((a) => {
      if (!visible(a)) return;
      const desc = (a.textContent || '').replace(/\s+/g, ' ').trim();
      const href = a.getAttribute('href') || '';
      if (!desc) return;
      const stripped = stripBasePath(href, baseUrl);
      const isHome = desc.toLowerCase() === 'home';
      out.push({
        description: desc,
        // ✅ ensure Home defaults to "/" if link is empty/anchor
        expectedURL: stripped || (isHome ? '/' : null),
        expectedTitle: null,
      });
    });
  });

  // de-dup by description+URL
  const dedup = [];
  const seen = new Set();
  out.forEach((b) => {
    const k = `${b.description}::${b.expectedURL || ''}`;
    if (!seen.has(k)) {
      seen.add(k);
      dedup.push(b);
    }
  });
  return dedup;
}

function collectButtons(doc, { baseUrl } = {}) {
  const out = [];
  const q = (sel) => Array.from(doc.querySelectorAll(sel));

  const candidates = [
    // main menu buttons you use
    '[data-testid^="mnumain-"]',
    // analytics left rail
    '[data-testid="npsearch"]',
    '[data-testid="npfavorite"]',
    '[data-testid="general"]',
    '[data-testid="nonpointemissions"]',
    '[data-testid="eipointemissions"]',
    '[data-testid="onroademissions"]',
    // generic data-testid role=button
    '[data-testid][role="button"]',
    // anything that looks like a button
    'button, a.button, a.btn, [class*="btn"]',
  ].join(',');

  q(candidates).forEach((el) => {
    if (!visible(el)) return;

    const dataTestId = el.getAttribute('data-testid') || null;
    const id = el.getAttribute('id') || null;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim() || null;

    let expectedURL = null;
    if (el.tagName && el.tagName.toLowerCase() === 'a') {
      const href = el.getAttribute('href') || '';
      if (href) expectedURL = stripBasePath(href, baseUrl);
    }

    if (dataTestId || id) {
      out.push({
        description: name || dataTestId || id,
        name,
        dataTestId,
        id,
        expectedURL: expectedURL || null,
        expectedTitle: null,
        // selector to be filled by renderer from data-testid/id
      });
    }
  });

  // de-dup primarily by dataTestId or id
  const dedup = [];
  const seen = new Set();
  out.forEach((b) => {
    const k = b.dataTestId ? `dt:${b.dataTestId}` : (b.id ? `id:${b.id}` : `n:${b.description}`);
    if (!seen.has(k)) {
      seen.add(k);
      dedup.push(b);
    }
  });
  return dedup;
}

function collectForms(doc) {
  const out = [];
  const fields = doc.querySelectorAll('input, select, textarea');

  fields.forEach((el) => {
    if (!visible(el)) return;
    const id = el.getAttribute('id') || null;
    const dataTestId = el.getAttribute('data-testid') || null;
    if (!id && !dataTestId) return;

    const name = el.getAttribute('name') || null;
    const placeholder = el.getAttribute('placeholder') || null;
    const type = (el.getAttribute('type') || el.tagName || '').toLowerCase();

    out.push({
      description: name || placeholder || id || dataTestId,
      id,
      dataTestId,
      name,
      placeholder,
      type,
      fallbackSelector: null,
    });
  });

  return out;
}

function collectReports(doc) {
  const out = [];
  doc.querySelectorAll('a.nav-page-favorite-control[data-linkid]').forEach((a) => {
    if (!visible(a)) return;
    const linkId = a.getAttribute('data-linkid') || '';
    const container = a.closest('.ibox, .ibox-title, .panel, .card') || a.parentElement;
    let title = null;

    if (container) {
      const t1 = container.querySelector('p.lkPanelHeaderText');
      const t2 = container.querySelector('[data-testid^="pnl-panel-title_"]');
      title = (t2?.textContent || t1?.textContent || '').replace(/\s+/g, ' ').trim() || null;
    }

    if (linkId) {
      out.push({
        linkId,
        title,
        description: null,
        interceptedURL: `aLinkId=${linkId}`,
        expectedIframe: '#lkDialogFrame',
      });
    }
  });

  // de-dup by linkId
  const dedup = [];
  const seen = new Set();
  out.forEach((r) => {
    if (!seen.has(r.linkId)) {
      seen.add(r.linkId);
      dedup.push(r);
    }
  });
  return dedup;
}

function buildPOFromDOM(doc, {
  name = 'GeneratedPage',
  url = '',
  pathLabel = '',
  adminOnly = false,
  baseUrl = '',
  title = null,
} = {}) {
  const po = {
    page: {
      name,
      title: title,
      url: stripBasePath(url, baseUrl),
      pathLabel,
      adminOnly: !!adminOnly,
    },
    breadcrumbs: collectBreadcrumbs(doc, { baseUrl }),
    buttons: collectButtons(doc, { baseUrl }),
    formFields: collectForms(doc),
    reports: collectReports(doc),
  };

  // if page.url not provided, attempt from the current location (jsdom-safe)
  if (!po.page.url) {
    try {
      const loc = doc.defaultView && doc.defaultView.location;
      if (loc) {
        po.page.url = stripBasePath(loc.pathname + loc.search + loc.hash, baseUrl);
      }
    } catch {
      // ignore
    }
  }
  return po;
}

module.exports = {
  stripBasePath,
  visible,
  toKey,
  pascalCase,
  collectBreadcrumbs,
  collectButtons,
  collectForms,
  collectReports,
  buildPOFromDOM,
};
