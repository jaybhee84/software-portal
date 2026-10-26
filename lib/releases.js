export function normalizeReleases(data, pattern) {
  const filter = new RegExp(pattern, 'i');
  return data.filter(r => !r.draft && !r.prerelease).map(r => ({
    tag: r.tag_name, name: r.name || r.tag_name, date: r.published_at,
    notes: (r.body || '').trim(), url: safeURL(r.html_url),
    assets: (r.assets || []).filter(a => a.state === 'uploaded' && filter.test(a.name)).map(a => ({ name: a.name, size: a.size, downloads: a.download_count ?? null, url: safeURL(a.browser_download_url), digest: a.digest || null })).filter(a => a.url)
  })).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
// All-time downloads of installer assets across every stable release, plus how many releases exist.
export function releaseStats(data, pattern) {
  const filter = new RegExp(pattern, 'i');
  const stable = data.filter(r => !r.draft && !r.prerelease);
  const downloads = stable.flatMap(r => r.assets || []).filter(a => a.state === 'uploaded' && filter.test(a.name)).reduce((sum, a) => sum + (Number(a.download_count) || 0), 0);
  return { downloads, releaseCount: stable.length };
}
// Optional per-installer label and note for GitHub releases that ship more than one installer per platform.
// The first rule whose pattern matches the asset name applies.
export function labelAssets(releases, rules = []) {
  if (!rules.length) return releases;
  const compiled = rules.map(r => ({ ...r, test: new RegExp(r.match, 'i') }));
  return releases.map(r => ({ ...r, assets: r.assets.map(a => {
    const rule = compiled.find(c => c.test.test(a.name));
    return rule ? { ...a, label: rule.label || '', note: rule.note || '' } : a;
  }) }));
}
function safeURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'github.com' ? u.href : null; } catch { return null; }
}
// Google Drive and MediaFire links only. Drive file links become direct downloads;
// Drive folders and MediaFire files open the host's own page (page: true).
function hostedLink(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    if (u.hostname === 'ftp.epson.com' && /^\/latin\/drivers\/inkjet\/[\w.-]+\.exe$/.test(u.pathname)) return { url: u.href, host: 'Epson', folder: false, page: false };
    if (u.hostname === 'www.mediafire.com') {
      const file = u.pathname.match(/^\/file\/(\w+)(?:\/([^/]+))?/);
      return file ? { url: `https://www.mediafire.com/file/${file[1]}${file[2] ? `/${file[2]}` : ''}/file`, host: 'MediaFire', folder: false, page: true } : null;
    }
    if (u.hostname !== 'drive.google.com') return null;
    const folder = u.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/);
    if (folder) return { url: `https://drive.google.com/drive/folders/${folder[1]}`, host: 'Google Drive', folder: true, page: true };
    const query = u.searchParams.get('id') || '';
    const id = u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] || (/^[\w-]+$/.test(query) ? query : null);
    return id ? { url: `https://drive.google.com/uc?export=download&id=${id}`, host: 'Google Drive', folder: false, page: false } : null;
  } catch { return null; }
}
// Download totals change slowly, so they are cached briefly to spare the GitHub rate limit.
// The latest release itself is always fetched fresh.
const STATS_TTL = 5 * 60 * 1000, statsCache = new Map();
async function cachedStats(app, fetcher, url, options) {
  const key = app.repo + ' ' + app.assetPattern, hit = statsCache.get(key);
  if (hit && fetcher === fetch && Date.now() - hit.at < STATS_TTL) return hit.stats;
  const stats = await fetcher(url, options).then(async r => r.ok ? releaseStats(await r.json(), app.assetPattern) : null).catch(() => null);
  if (stats) statsCache.set(key, { at: Date.now(), stats });
  return stats;
}
function hostedAssets(downloads = []) {
  const local = value => /^\/[\w./-]+\.(png|jpe?g|webp)$/i.test(value || '') ? value : null;
  return downloads.map(d => ({ name: String(d.name || ''), label: d.label || '', note: d.note || '', image: local(d.image), images: (d.images || []).map(i => ({ src: local(i.src), label: String(i.label || '') })).filter(i => i.src), size: d.size || null, digest: null, ...hostedLink(d.url) })).filter(a => a.url && a.name);
}
// Installers too large for GitHub Releases (extraDownloads) are listed first beside the latest release's assets.
function withExtras(releases, extras) {
  const assets = hostedAssets(extras);
  return assets.length && releases.length ? [{ ...releases[0], assets: [...assets, ...releases[0].assets] }, ...releases.slice(1)] : releases;
}
export async function loadApp(app, fetcher = fetch) {
  // Apps hosted on Google Drive or MediaFire list their links in config.js; nothing is fetched.
  if (app.downloads) {
    const assets = hostedAssets(app.downloads);
    return { ...app, status: 'live', source: 'drive', releases: assets.length ? [{ tag: '', name: app.name, date: null, notes: '', url: null, assets }] : [] };
  }
  if (!app.repo) return { ...app, status: 'demo', releases: [{ tag: 'v1.0.0', name: 'First release', date: '2026-01-15T00:00:00Z', notes: 'Sample release notes\n\n• Initial desktop release.\n• Connect a public GitHub release repository to display real versions and downloads.', assets: [] }] };
  try {
    if (!/^[\w.-]+\/[\w.-]+$/.test(app.repo)) throw new Error('Invalid repository configuration');
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'AppShelf-Portal', 'X-GitHub-Api-Version': '2022-11-28' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const base = `https://api.github.com/repos/${app.repo}`;
    // Never expose releases from a private repository even if the token can read it.
    const meta = await fetcher(base, { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!meta.ok) throw new Error('Repository unavailable');
    if ((await meta.json()).private !== false) throw new Error('Public repository required');
    const options = { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) };
    const [response, stats] = await Promise.all([
      fetcher(`${base}/releases/latest`, options),
      // Download totals are informational; a failure here never hides the latest release.
      cachedStats(app, fetcher, `${base}/releases?per_page=100`, options)
    ]);
    const extra = { downloadCount: stats?.downloads ?? null, releaseCount: stats?.releaseCount ?? null };
    if (response.status === 404) return { ...app, status: 'live', ...extra, releases: [] };
    if (!response.ok) throw new Error('Releases unavailable');
    return { ...app, status: 'live', ...extra, releases: withExtras(labelAssets(normalizeReleases([await response.json()], app.assetPattern), app.assetLabels), app.extraDownloads) };
  } catch {
    return { ...app, status: 'error', releases: [], message: 'Release information is temporarily unavailable. Please try again later.' };
  }
}
