import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReleases, releaseStats, loadApp } from '../lib/releases.js';
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
  assert.deepEqual(calls.sort(), ['https://api.github.com/repos/owner/releases', 'https://api.github.com/repos/owner/releases/releases/latest', 'https://api.github.com/repos/owner/releases/releases?per_page=100']);
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

test('Google Drive downloads are listed without fetching and unsafe links are dropped', async () => {
  const result = await loadApp({ id: 'drive', name: 'Drive app', downloads: [
    { name: 'Folder', url: 'https://drive.google.com/drive/u/0/folders/abc_123?usp=sharing' },
    { name: 'tool.rar', url: 'https://drive.google.com/file/d/xyz-9/view?usp=sharing', size: 1024 },
    { name: 'other.rar', url: 'https://www.mediafire.com/file/abc123/other.rar/file?x=1' },
    { name: 'evil.rar', url: 'https://drive.google.com.example.org/file/d/xyz/view' },
    { name: 'fake.rar', url: 'https://mediafire.com.example.org/file/abc123/fake.rar/file' },
    { name: 'script.rar', url: 'javascript:alert(1)' }
  ] }, () => { throw Error('Must not fetch'); });
  assert.equal(result.status, 'live'); assert.equal(result.source, 'drive');
  assert.deepEqual(result.releases[0].assets.map(a => [a.url, a.host, a.page]), [
    ['https://drive.google.com/drive/folders/abc_123', 'Google Drive', true],
    ['https://drive.google.com/uc?export=download&id=xyz-9', 'Google Drive', false],
    ['https://www.mediafire.com/file/abc123/other.rar/file', 'MediaFire', true]
  ]);
});

test('latest release errors do not fall back to old data', async () => {
  const result = await loadApp(app, async url => url.endsWith('/releases/latest')
    ? { ok: false, status: 403 }
    : { ok: true, json: async () => ({ private: false }) });
  assert.equal(result.status, 'error');
  assert.deepEqual(result.releases, []);
});

test('download totals count installer assets across stable releases only', () => {
  const asset = (name, n, state = 'uploaded') => ({ name, state, download_count: n });
  const stats = releaseStats([
    { assets: [asset('setup.exe', 10), asset('latest.yml', 500), asset('app.zip', 5, 'new')] },
    { assets: [asset('setup.exe', 7)] },
    { draft: true, assets: [asset('setup.exe', 99)] },
    { prerelease: true, assets: [asset('setup.exe', 99)] }
  ], app.assetPattern);
  assert.deepEqual(stats, { downloads: 17, releaseCount: 2 });
});

test('download totals failing never hides the latest release', async () => {
  const result = await loadApp(app, async url => url.includes('per_page')
    ? { ok: false, status: 403 }
    : { ok: true, json: async () => url.endsWith('/releases/latest') ? fixture : { private: false } });
  assert.equal(result.status, 'live'); assert.equal(result.releases[0].tag, 'v2');
  assert.equal(result.downloadCount, null);
});

test('download totals are attached to live apps', async () => {
  const result = await loadApp(app, async url => ({ ok: true, json: async () => url.includes('per_page')
    ? [{ ...fixture, assets: [{ ...fixture.assets[0], download_count: 42 }] }]
    : url.endsWith('/releases/latest') ? fixture : { private: false } }));
  assert.equal(result.downloadCount, 42); assert.equal(result.releaseCount, 1);
});
