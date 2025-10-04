// po-gen/src/normalize.js
function stripBasePath(u, baseUrl = '') {
  if (!u) return '';
  let url = String(u).trim();

  try {
    const parsed = new URL(url, 'http://_dummy');
    url = parsed.pathname + parsed.search + parsed.hash;
  } catch { /* relative already */ }

  let basePath = '/';
  try { basePath = new URL(baseUrl).pathname || '/'; } catch {}
  basePath = basePath.replace(/\/+$/, '');

  if (basePath && basePath !== '/') {
    const rx = new RegExp('^' + basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?', 'i');
    url = url.replace(rx, '');
  }
  return url.replace(/^\//, '');
}

const pascalCase = (s = '') =>
  String(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

const toKey = (s, fallback = 'ITEM') => {
  const base = String(s || fallback)
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return base || fallback;
};

module.exports = { stripBasePath, pascalCase, toKey };
