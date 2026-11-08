import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const { download, installers } = runInNewContext(
  source.slice(source.indexOf('function download('), source.indexOf('function card(')) +
  source.slice(source.indexOf('function installers('), source.indexOf('function screenshots(')) +
  '\n({ download, installers });',
  { escape: String, platformLabel: () => 'Windows', platformOf: () => ({ label: 'Windows', fits: 'For Windows computers.', examples: 'PC brands', mark: 'windows', tone: 'windows' }), appleMark: 'apple', downloadIcon: '', detailURL: a => '#/app/' + a.id }
);

test('one installer downloads directly without a chooser', () => {
  const app = { id: 'ieces-portal', name: 'IECES Portal', releases: [{ tag: 'v1', assets: [{ url: 'https://example.com/setup.exe' }] }] };
  assert.match(download(app, app.releases[0]), /href="https:\/\/example.com\/setup.exe"/);
  assert.match(installers(app), /Download Windows/);
  assert.doesNotMatch(installers(app), /Choose your download|installer-grid/);
  app.releases[0].assets[0].page = true;
  assert.match(installers(app), /target="_blank" rel="noopener"/);
});

test('multiple installers still open the app details to choose', () => {
  const app = { id: 'ieces-portal', name: 'IECES Portal' };
  assert.match(download(app, { assets: [{}, {}] }), /href="#\/app\/ieces-portal"/);
  assert.match(download(app, { assets: [] }), /No installer yet/);
});


test('multiple installers use compact cards without brand examples', () => {
  const html = installers({ releases: [{ assets: [
    { name: 'setup.exe', url: 'https://example.com/setup.exe' },
    { name: 'app.apk', url: 'https://example.com/app.apk' }
  ] }] });
  assert.match(html, /installer-section compact/);
  assert.match(html, /setup.exe/);
  assert.match(html, /app.apk/);
  assert.doesNotMatch(html, /installer-examples/);
});
