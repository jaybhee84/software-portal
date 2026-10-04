export function normalizeReleases(data, pattern) {
  const filter = new RegExp(pattern, 'i');
  return data.filter(r => !r.draft && !r.prerelease).map(r => ({
    tag: r.tag_name, name: r.name || r.tag_name, date: r.published_at,
    notes: r.body || 'No release notes provided.', url: safeURL(r.html_url),
    assets: (r.assets || []).filter(a => a.state === 'uploaded' && filter.test(a.name)).map(a => ({ name: a.name, size: a.size, url: safeURL(a.browser_download_url), digest: a.digest || null })).filter(a => a.url)
  })).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
function safeURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'github.com' ? u.href : null; } catch { return null; }
}
export async function loadApp(app, fetcher = fetch) {
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
