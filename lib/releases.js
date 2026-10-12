export function normalizeReleases(data, pattern) {
  const filter = new RegExp(pattern, 'i');
  return data.filter(r => !r.draft && !r.prerelease).map(r => ({
    tag: r.tag_name, name: r.name || r.tag_name, date: r.published_at,
    notes: (r.body || '').trim(), url: safeURL(r.html_url),
    assets: (r.assets || []).filter(a => a.state === 'uploaded' && filter.test(a.name)).map(a => ({ name: a.name, size: a.size, url: safeURL(a.browser_download_url), digest: a.digest || null })).filter(a => a.url)
  })).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
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
export async function loadApp(app, fetcher = fetch) {
  // Apps hosted on Google Drive or MediaFire list their links in config.js; nothing is fetched.
  if (app.downloads) {
    const local = value => /^\/[\w./-]+\.(png|jpe?g|webp)$/i.test(value || '') ? value : null;
    const assets = app.downloads.map(d => ({ name: String(d.name || ''), label: d.label || '', note: d.note || '', image: local(d.image), images: (d.images || []).map(i => ({ src: local(i.src), label: String(i.label || '') })).filter(i => i.src), size: d.size || null, digest: null, ...hostedLink(d.url) })).filter(a => a.url && a.name);
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
    const response = await fetcher(`${base}/releases/latest`, { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return { ...app, status: 'live', releases: [] };
    if (!response.ok) throw new Error('Releases unavailable');
    return { ...app, status: 'live', releases: normalizeReleases([await response.json()], app.assetPattern) };
  } catch {
    return { ...app, status: 'error', releases: [], message: 'Release information is temporarily unavailable. Please try again later.' };
  }
}
