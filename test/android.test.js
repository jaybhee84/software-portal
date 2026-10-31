import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { apps } from '../config.js';
import { normalizeReleases, releaseStats } from '../lib/releases.js';

test('Zee-ing Bee includes APK downloads and counts them', () => {
  const app = apps.find(a => a.id === 'zee-ing-bee');
  const assets = ['Zee-ing-Bee-arm64.APK', 'setup.exe', 'mac.dmg', 'latest.yml'].map(name => ({
    name, state: 'uploaded', download_count: 2,
    browser_download_url: `https://github.com/${app.repo}/releases/download/v1/${name}`
  }));
  const releases = [{ tag_name: 'v1', assets }];
  assert.deepEqual(normalizeReleases(releases, app.assetPattern)[0].assets.map(a => a.name), assets.slice(0, 3).map(a => a.name));
  assert.equal(releaseStats(releases, app.assetPattern).downloads, 6);
});

test('APK installers show Android before checking CPU architecture', () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const classify = runInNewContext(source.slice(source.indexOf('const platforms ='), source.indexOf('function download(')) + '\nplatformOf;', { appleMark: '' });
  assert.equal(classify({ name: 'Zee-ing-Bee-arm64.APK' }).label, 'Android');
  assert.equal(classify({ name: 'setup.exe' }).label, 'Windows');
  assert.equal(classify({ name: 'app-arm64.dmg' }).label, 'macOS · Apple Silicon');
});
