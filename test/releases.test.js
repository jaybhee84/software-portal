import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReleases, loadApp } from '../lib/releases.js';
const app = { id: 'test', repo: 'owner/releases', assetPattern: '\\.(exe|zip)$' };
const fixture = { tag_name: 'v2', name: 'Release 2', published_at: '2026-01-10', body: '<script>alert(1)</script>', html_url: 'https://github.com/owner/releases/releases/tag/v2', assets: [{ name: 'setup.exe', state: 'uploaded', size: 2048, browser_download_url: 'https://github.com/owner/releases/releases/download/v2/setup.exe' }, { name: 'bad.zip', state: 'uploaded', browser_download_url: 'javascript:alert(1)' }, { name: 'source.tar', state: 'uploaded', browser_download_url: 'https://github.com/owner/releases/a' }] };
test('only stable releases and safe matching assets are returned', () => {
  const result = normalizeReleases([fixture, { ...fixture, draft: true }, { ...fixture, prerelease: true }], app.assetPattern);
  assert.equal(result.length, 1); assert.equal(result[0].assets.length, 1); assert.equal(result[0].assets[0].name, 'setup.exe');
  assert.equal(result[0].notes, fixture.body);
});
test('sample mode never fetches or invents downloads', async () => {
  const result = await loadApp({ ...app, repo: null }, () => { throw Error('Must not fetch'); });
  assert.equal(result.status, 'demo'); assert.deepEqual(result.releases[0].assets, []);
});
test('private repositories are rejected before releases are requested', async () => {
  let calls = 0;
  const result = await loadApp(app, async () => { calls++; return { ok: true, json: async () => ({ private: true }) }; });
  assert.equal(calls, 1); assert.equal(result.status, 'error'); assert.deepEqual(result.releases, []);
});
test('upstream errors do not become sample data', async () => {
  const result = await loadApp(app, async () => ({ ok: false }));
  assert.equal(result.status, 'error'); assert.deepEqual(result.releases, []);
});
test('live public releases are mapped', async () => {
  const result = await loadApp(app, async url => ({ ok: true, json: async () => url.endsWith('/releases/latest') ? fixture : { private: false } }));
  assert.equal(result.status, 'live'); assert.equal(result.releases[0].tag, 'v2');
});

test('fetches only the latest release without caching or falling back to old installers', async () => {
  const calls = [];
  const result = await loadApp(app, async (url, options) => {
    calls.push(url);
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => url.endsWith('/releases/latest') ? { ...fixture, tag_name: 'v3', assets: [] } : { private: false } };
  });
  assert.deepEqual(calls, ['https://api.github.com/repos/owner/releases', 'https://api.github.com/repos/owner/releases/releases/latest']);
  assert.equal(result.releases.length, 1);
  assert.equal(result.releases[0].tag, 'v3');
  assert.deepEqual(result.releases[0].assets, []);
});

test('no published latest release gives an empty catalog entry', async () => {
  const result = await loadApp(app, async url => url.endsWith('/releases/latest')
    ? { ok: false, status: 404 }
    : { ok: true, json: async () => ({ private: false }) });
  assert.equal(result.status, 'live');
  assert.deepEqual(result.releases, []);
});

test('latest release errors do not fall back to old data', async () => {
  const result = await loadApp(app, async url => url.endsWith('/releases/latest')
    ? { ok: false, status: 403 }
    : { ok: true, json: async () => ({ private: false }) });
  assert.equal(result.status, 'error');
  assert.deepEqual(result.releases, []);
});
