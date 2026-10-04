const main = document.querySelector('main');
let catalog, query = '', category = 'All apps';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date unavailable';
const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
const icon = a => a.logo ? `<img class="app-icon app-logo" src="${escape(a.logo)}" alt="" width="56" height="56">` : `<span class="app-icon">${escape(a.initials)}</span>`;
const detailURL = a => `#/app/${encodeURIComponent(a.id)}`;
function platformLabel(asset) {
  if (/\.(exe|msi)$/i.test(asset.name)) return 'Windows';
  if (/arm64/i.test(asset.name)) return 'macOS \u00b7 Apple Silicon';
  if (/\.dmg$|mac/i.test(asset.name)) return 'macOS \u00b7 Intel';
  return 'Archive';
}
function download(a, r) {
  const assets = r?.assets || [];
  if (!assets.length) return '<span class="button disabled">' + (a.status === 'demo' ? 'Sample \u00b7 no download' : a.status === 'error' ? 'Temporarily unavailable' : 'No installer yet') + '</span>';
  return '<a class="button primary" href="' + detailURL(a) + '" aria-label="Choose a download for ' + escape(a.name) + '">Get the app <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></a>';
}
function card(a) {
  const r = a.releases[0];
  const platforms = [...new Set((r?.assets || []).map(platformLabel).map(p => p.startsWith('macOS') ? 'macOS' : p))].join(' / ') || a.platform;
  return '<article class="app-card' + (a.featured ? ' featured' : '') + '"><div class="card-top">' + icon(a) + '<span class="pill">' + escape(a.category) + '</span></div><h2><a href="' + detailURL(a) + '">' + escape(a.name) + '</a></h2><p>' + escape(a.summary) + '</p><div class="metadata"><span>' + escape(platforms) + '</span><span class="version">' + escape(r?.tag || 'No release') + '</span></div><div class="card-bottom">' + download(a,r) + '<a class="detail-link" href="' + detailURL(a) + '">View details <span aria-hidden="true">&rarr;</span><span class="sr-only"> for ' + escape(a.name) + '</span></a></div></article>';
}
function installers(a) {
  const r = a.releases[0];
  if (!r?.assets.length) return '';
  return '<section class="installer-section" aria-label="Latest downloads"><div class="section-label"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Choose your download</h2></div><span>' + escape(r.tag) + '</span></div><div class="installer-grid">' + r.assets.map(asset => '<a class="installer" href="' + escape(asset.url) + '"><span class="installer-platform">' + escape(platformLabel(asset)) + '<span aria-hidden="true">&rarr;</span></span><span class="installer-name">' + escape(asset.name) + '</span><span class="muted">' + size(asset.size) + ' &middot; ' + escape(asset.name.split('.').pop().toUpperCase()) + '</span></a>').join('') + '</div></section>';
}
function list() {
  const apps = catalog.apps.filter(a => (category === 'All apps' || a.category === category) && `${a.name} ${a.summary} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#results').innerHTML = apps.length ? apps.map(card).join('') : '<div class="empty"><h2>No apps found</h2><p>Try another name or choose a different category.</p><button id="clear" class="button">Clear filters</button></div>';
  document.querySelector('#count').textContent = `${apps.length} app${apps.length === 1 ? '' : 's'}`;
  document.querySelector('#clear')?.addEventListener('click', () => { query = ''; category = 'All apps'; render(); });
}
function release(a,r,notesOnly=false) {
  return `<article class="release"><div class="release-heading"><div><span class="eyebrow">${escape(a.name)}</span><h3>${escape(r.name)} <span class="pill">${escape(r.tag)}</span></h3></div><span class="muted">${date(r.date)}${a.status === 'demo' ? ' · Sample' : ''}</span></div>${r.notes ? `<pre class="notes">${escape(r.notes)}</pre>` : '<p class="muted">No release notes provided.</p>'}${notesOnly ? '' : `<div class="assets">${r.assets.map(asset => `<a class="asset" href="${escape(asset.url)}"><span>↓ ${escape(asset.name)}</span><span>${size(asset.size)}</span></a>${asset.digest ? `<p class="digest">${escape(asset.digest)}</p>` : ''}`).join('') || '<p class="muted">No downloadable files in this release.</p>'}</div>`}${r.url ? `<a class="detail-link" href="${escape(r.url)}" target="_blank" rel="noopener noreferrer">View release on GitHub ↗</a>` : ''}</article>`;
}
function render() {
  const hash = location.hash || '#/';
  document.querySelector('#apps-nav').setAttribute('aria-current', hash === '#/' ? 'page' : 'false');
  document.querySelector('#releases-nav').setAttribute('aria-current', hash === '#/releases' ? 'page' : 'false');
  document.title = `${catalog.site.name} — Software downloads`;
  if (hash.startsWith('#/app/')) {
    const a = catalog.apps.find(a => detailURL(a) === hash);
    if (!a) { main.innerHTML = '<div class="empty"><h1>App not found</h1><a href="#/">Back to all apps</a></div>'; return; }
    document.title = `${a.name} — ${catalog.site.name}`;
    main.innerHTML = `<a class="back" href="#/">← All apps</a><section class="app-hero">${icon(a)}<div><span class="eyebrow">${escape(a.category)}</span><h1>${escape(a.name)}</h1><p>${escape(a.summary)}</p></div></section>${installers(a)}${a.status === 'demo' ? '<div class="notice">Sample app. Connect your release repository to enable real downloads.</div>' : ''}<div class="detail-grid"><section><h2>About this app</h2><p class="description">${escape(a.description)}</p><h2>Latest release</h2>${a.status === 'error' ? `<div class="notice">${escape(a.message)}</div>` : a.releases.map(r => release(a,r)).join('') || '<p>No stable releases published yet.</p>'}</section><aside><h3>App information</h3><dl><dt>Platform</dt><dd>${escape(a.platform)}</dd><dt>Requirements</dt><dd>${escape(a.requirements)}</dd><dt>Latest version</dt><dd>${escape(a.releases[0]?.tag || 'Not available')}</dd><dt>Released</dt><dd>${date(a.releases[0]?.date)}</dd></dl><p class="muted">Downloads are served directly by GitHub Releases.</p></aside></div>`;
  } else if (hash === '#/releases') {
    // Only real GitHub releases that include written notes.
    const releases = catalog.apps.filter(a => a.status === 'live').flatMap(a => a.releases.filter(r => r.notes && !/^\*\*Full Changelog\*\*: \S+$/.test(r.notes)).map(r => ({a,r}))).sort((x,y) => Date.parse(y.r.date)-Date.parse(x.r.date));
    main.innerHTML = `<section class="page-heading"><span class="eyebrow">LATEST RELEASES</span><h1>What&#8217;s new.</h1><p>The latest versions and what changed.</p></section>${catalog.apps.some(a=>a.status==='error') ? '<div class="notice">Some apps could not be refreshed. Their releases are temporarily unavailable.</div>' : ''}<div class="release-feed">${releases.map(({a,r}) => release(a,r,true)).join('') || '<div class="empty">No release notes published yet.</div>'}</div>`;
  } else {
    main.innerHTML = `<section class="hero"><div><span class="eyebrow">BUILT FOR YOUR EVERYDAY</span><h1>${escape(catalog.site.tagline)}</h1><p>${escape(catalog.site.description)}</p></div><div class="collection-mark"><span class="collection-status">THE DESKTOP COLLECTION</span><strong>${String(catalog.apps.length).padStart(2,'0')}</strong><span>apps. Less busywork.</span></div></section>${catalog.apps.some(a=>a.status==='demo') ? '<div class="notice"><strong>Starter preview</strong><span>Sample apps and versions. Add your GitHub release repositories to enable downloads.</span></div>' : ''}<section aria-label="App catalog"><div class="toolbar"><div class="tabs" role="group" aria-label="App categories">${['All apps', ...new Set(catalog.apps.map(a=>a.category))].map(c=>`<button class="tab ${c===category?'selected':''}" data-category="${escape(c)}" aria-pressed="${c===category}">${escape(c)}</button>`).join('')}</div><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search apps…" aria-label="Search apps" value="${escape(query)}"></label></div><div class="section-label"><h2>Explore the collection</h2><span id="count" aria-live="polite"></span></div><div id="results" class="cards"></div></section>`;
    list();
    document.querySelector('#search').addEventListener('input', e => { query = e.target.value; list(); });
    document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { category=b.dataset.category; document.querySelectorAll('[data-category]').forEach(x=>{ x.classList.toggle('selected',x===b); x.setAttribute('aria-pressed', String(x===b)); }); list(); }));
  }
}
async function boot() {
  try {
    const response = await fetch('/api/catalog', { cache: 'no-store' }); if (!response.ok) throw new Error(); catalog = await response.json();
    render();
  } catch { main.innerHTML = '<div class="empty"><h1>The collection could not load</h1><p>Please check your connection and try again.</p><button class="button primary" id="retry">Try again</button></div>'; document.querySelector('#retry').onclick = boot; }
}
document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); main.focus(); main.scrollIntoView(); });
window.addEventListener('hashchange', () => { if(catalog) render(); window.scrollTo(0,0); main.focus({preventScroll:true}); });
boot();
