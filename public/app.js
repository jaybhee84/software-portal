const main = document.querySelector('main');
let catalog, query = '', category = 'All apps';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date unavailable';
const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
const icon = a => a.logo ? `<img class="app-icon app-logo" src="${escape(a.logo)}" alt="" width="56" height="56">` : `<span class="app-icon">${escape(a.initials)}</span>`;
const detailURL = a => `#/app/${encodeURIComponent(a.id)}`;
const count = n => Number(n).toLocaleString();
const shortCount = n => n >= 10000 ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n) : count(n);
const ago = value => { const days = Math.floor((Date.now() - Date.parse(value)) / 864e5); return days < 1 ? 'today' : days === 1 ? 'yesterday' : days < 14 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`; };
// Versions this browser has downloaded, so returning users see when a newer one is out.
const seenKey = 'downloaded-versions';
const seen = () => { try { return JSON.parse(localStorage.getItem(seenKey)) || {}; } catch { return {}; } };
function remember(id, tag) { try { localStorage.setItem(seenKey, JSON.stringify({ ...seen(), [id]: tag })); } catch {} }
const RECENT_DAYS = 30;
// 'available' when this browser downloaded an older version; otherwise a 'recent' badge for releases in the last 30 days.
function freshness(a) {
  const r = a.releases[0];
  if (a.source === 'drive' || a.status !== 'live' || !r?.tag || !r.assets.length) return null;
  const mine = seen()[a.id];
  if (mine && mine !== r.tag) return { kind: 'available', text: 'Update available', title: `You downloaded ${mine}. ${r.tag} is now available.` };
  if (r.date && Date.now() - Date.parse(r.date) < RECENT_DAYS * 864e5) return { kind: 'recent', text: a.releaseCount === 1 ? 'New' : 'Updated ' + ago(r.date), title: `${r.tag} released ${date(r.date)}` };
  return null;
}
const freshBadge = f => f ? '<span class="fresh fresh-' + f.kind + '" title="' + escape(f.title) + '"><i aria-hidden="true"></i>' + escape(f.text) + '</span>' : '';
const downloadIcon = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>';
const appleMark = '<svg viewBox="0 0 384 512" width="17" height="20" fill="currentColor" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>';
// What each installer runs on. Model lists are examples, not a full compatibility list.
const platforms = {
  windows: { tone: 'windows', label: 'Windows', mark: '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M3 3h8.5v8.5H3zM12.5 3H21v8.5h-8.5zM3 12.5h8.5V21H3zM12.5 12.5H21V21h-8.5z"/></svg>', fits: 'For Windows 10 and Windows 11 computers.', examples: 'Desktops and laptops from any brand \u2014 Acer, ASUS, Dell, HP, Lenovo, MSI.' },
  macArm: { tone: 'macarm', label: 'macOS \u00b7 Apple Silicon', mark: appleMark, fits: 'For Macs with an Apple chip (M1, M2, M3, M4) \u2014 late 2020 and newer.', examples: 'MacBook Air M1 and newer, MacBook Pro 14-inch and 16-inch (2021 and newer), iMac 24-inch, Mac mini M1 and newer, Mac Studio.' },
  macIntel: { tone: 'macintel', label: 'macOS \u00b7 Intel', mark: appleMark, fits: 'For older Macs with an Intel processor \u2014 2020 and earlier.', examples: 'MacBook Air 2018\u20132020, MacBook Pro 2016\u20132019 and the 2020 13-inch Intel model, iMac 21.5-inch and 27-inch up to 2020, Mac mini 2018.' },
  drive: { tone: 'drive', label: 'Google Drive', mark: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.5h8.4A1.5 1.5 0 0 1 21 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>', fits: '', examples: '' },
  archive: { tone: 'archive', label: 'Archive', mark: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h16v11H4zM3 4h18v4H3zM10 12h4"/></svg>', fits: '', examples: '' }
};
function platformOf(asset) {
  if (asset.folder) return platforms.drive;
  if (/\.(exe|msi)$/i.test(asset.name)) return platforms.windows;
  if (/arm64/i.test(asset.name)) return platforms.macArm;
  if (/\.dmg$|mac/i.test(asset.name)) return platforms.macIntel;
  return platforms.archive;
}
const platformLabel = asset => platformOf(asset).label;
function download(a, r) {
  const assets = r?.assets || [];
  if (!assets.length) return '<span class="button disabled">' + (a.status === 'demo' ? 'Sample \u00b7 no download' : a.status === 'error' ? 'Temporarily unavailable' : 'No installer yet') + '</span>';
  return '<a class="button primary" href="' + detailURL(a) + '" aria-label="Choose a download for ' + escape(a.name) + '">Get the app <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></a>';
}
function card(a) {
  const r = a.releases[0];
  const found = a.source === 'drive' ? [] : [...new Set((r?.assets || []).map(platformLabel).map(p => p.startsWith('macOS') ? 'macOS' : p))];
  const os = (found.length ? found : String(a.platform || '').split('/').map(p => p.trim()).filter(Boolean)).map(p => '<span class="os">' + (p === 'macOS' ? appleMark : p === 'Windows' ? platforms.windows.mark : '') + escape(p) + '</span>').join('');
  return '<article class="app-card tint-' + escape(a.color) + (a.featured ? ' featured' : '') + '"><div class="card-top">' + icon(a) + '<span class="card-tags">' + freshBadge(freshness(a)) + '<span class="pill">' + escape(a.category) + '</span></span></div><h2><a href="' + detailURL(a) + '">' + escape(a.name) + '</a></h2><p>' + escape(a.summary) + '</p><div class="metadata"><span class="os-list">' + os + '</span><span class="version">' + escape(a.source === 'drive' ? 'Google Drive' : r?.tag || 'No release') + '</span>' + (a.downloadCount != null ? '<span class="downloads" title="' + count(a.downloadCount) + ' downloads across all versions">' + downloadIcon + shortCount(a.downloadCount) + ' download' + (a.downloadCount === 1 ? '' : 's') + '</span>' : '') + '</div><div class="card-bottom">' + download(a,r) + '<a class="detail-link" href="' + detailURL(a) + '">View details <span aria-hidden="true">&rarr;</span><span class="sr-only"> for ' + escape(a.name) + '</span></a></div></article>';
}
// GitHub linguist colors.
const languageColors = { JavaScript: '#f1e05a', TypeScript: '#3178c6', CSS: '#663399', HTML: '#e34c26', SCSS: '#c6538c', Python: '#3572a5', SQL: '#e38c00', PLpgSQL: '#336790', Shell: '#89e051', PowerShell: '#012456', 'C#': '#178600', Java: '#b07219', PHP: '#4f5d95', Vue: '#41b883', Svelte: '#ff3e00', Other: '#ededed' };
function builtWith(a) {
  const stack = a.stack || [], languages = a.languages || [];
  const color = name => languageColors[name] || languageColors.Other;
  return (stack.length ? '<dt>Built with</dt><dd class="stack">' + stack.map(s => '<span>' + escape(s) + '</span>').join('') + '</dd>' : '') +
    (languages.length ? '<dt>Code by language</dt><dd><div class="lang-bar" role="img" aria-label="' + escape(languages.map(([n, p]) => n + ' ' + p + '%').join(', ')) + '">' + languages.map(([n, p]) => '<span data-color="' + color(n) + '" data-width="' + Number(p) + '"></span>').join('') + '</div><ul class="lang-list">' + languages.map(([n, p]) => '<li><i data-color="' + color(n) + '"></i>' + escape(n) + '<b>' + Number(p).toFixed(1) + '%</b></li>').join('') + '</ul></dd>' : '');
}
// The CSP forbids inline style attributes, so bar widths and colors are set through the CSSOM.
function paintLanguages() {
  main.querySelectorAll('[data-color]').forEach(el => { el.style.background = el.dataset.color; if (el.dataset.width) el.style.width = el.dataset.width + '%'; });
}
function installers(a) {
  const r = a.releases[0];
  if (!r?.assets.length) return '';
  // Tiles show a product photo when any download has one; the rest get a placeholder so the grid stays aligned.
  const photos = r.assets.some(asset => asset.image || asset.images?.length);
  const photo = asset => !photos ? '' : asset.images?.length ? '<span class="installer-photo gallery' + (asset.images.length > 3 ? ' expanded' : '') + '">' + asset.images.map(i => '<span><img src="' + escape(i.src) + '" alt="" loading="lazy"><b>' + escape(i.label) + '</b></span>').join('') + '</span>' : asset.image ? '<img class="installer-photo" src="' + escape(asset.image) + '" alt="" loading="lazy">' : '<span class="installer-photo placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M7 8V4h10v4M6 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H18M7 14h10v6H7z"/></svg></span>';
  return '<section class="installer-section" aria-label="Latest downloads"><div class="section-label"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Choose your download</h2></div>' + (r.tag ? '<span>' + escape(r.tag) + '</span>' : '') + '</div><div class="installer-grid">' + r.assets.map(asset => {
    const p = platformOf(asset);
    const fits = asset.note || p.fits;
    const meta = asset.page ? 'Opens in ' + escape(asset.host) : (asset.size ? size(asset.size) + ' &middot; ' : '') + escape(asset.name.split('.').pop().toUpperCase());
    return '<a class="installer tone-' + p.tone + '" href="' + escape(asset.url) + '"' + (r.tag ? ' data-version="' + escape(r.tag) + '"' : '') + (asset.page ? ' target="_blank" rel="noopener"' : '') + '>' + photo(asset) + '<span class="installer-platform"><span class="installer-mark">' + p.mark + '</span>' + escape(asset.label || p.label) + '<span class="installer-arrow" aria-hidden="true">&rarr;</span></span>' + (fits ? '<span class="installer-fits">' + escape(fits) + '</span>' : '') + (p.examples ? '<span class="installer-examples"><b>Examples:</b> ' + escape(p.examples) + '</span>' : '') + '<span class="installer-file"><span class="installer-name">' + escape(asset.name) + '</span><span class="muted">' + meta + (asset.downloads != null ? ' &middot; ' + count(asset.downloads) + ' download' + (asset.downloads === 1 ? '' : 's') : '') + '</span></span></a>';
  }).join('') + '</div>' + (r.assets.some(asset => platformOf(asset).mark === appleMark) ? '<p class="installer-hint"><b>Not sure which Mac you have?</b> Open the Apple menu and choose About This Mac. &ldquo;Chip: Apple M1&rdquo; (or M2, M3, M4) means Apple Silicon. &ldquo;Processor: Intel&rdquo; means Intel.</p>' : '') + '</section>';
}
function screenshots(a) {
  if (!a.screenshots?.length) return '';
  return '<section class="screenshots" aria-label="App screenshots"><h2>Sample screens</h2><p class="muted">Open an image to view full size.</p><div class="screenshot-grid">' + a.screenshots.map(shot => '<figure><button class="screenshot-open" type="button" aria-label="View ' + escape(shot.label) + ' full size"><img src="' + escape(shot.src) + '" alt="' + escape(shot.alt) + '" loading="lazy"></button><figcaption>' + escape(shot.label) + '</figcaption></figure>').join('') + '</div></section>';
}
let screenshotViewer;
function openScreenshot(img) {
  if (!screenshotViewer) {
    screenshotViewer = document.createElement('dialog');
    screenshotViewer.className = 'screenshot-viewer';
    screenshotViewer.setAttribute('aria-label', 'Screenshot preview');
    screenshotViewer.innerHTML = '<button class="screenshot-close" type="button" aria-label="Close screenshot" autofocus>&times;</button><figure><img alt=""><figcaption></figcaption></figure>';
    document.body.append(screenshotViewer);
    screenshotViewer.querySelector('button').addEventListener('click', () => screenshotViewer.close());
    screenshotViewer.addEventListener('click', e => { if (e.target === screenshotViewer) screenshotViewer.close(); });
    screenshotViewer.addEventListener('close', () => document.documentElement.classList.remove('screenshot-viewing'));
  }
  const full = screenshotViewer.querySelector('img');
  full.src = img.src;
  full.alt = img.alt;
  screenshotViewer.querySelector('figcaption').textContent = img.closest('figure').querySelector('figcaption').textContent;
  screenshotViewer.showModal();
  document.documentElement.classList.add('screenshot-viewing');
}
function prepareScreenshots() {
  main.querySelectorAll('.screenshot-open').forEach(button => {
    button.addEventListener('click', () => openScreenshot(button.querySelector('img')));
  });
  main.querySelectorAll('.screenshots img').forEach(img => {
    const hideMissing = () => {
      const section = img.closest('.screenshots');
      img.closest('figure').remove();
      if (!section.querySelector('figure')) section.remove();
    };
    img.addEventListener('error', hideMissing, { once: true });
    if (img.complete && !img.naturalWidth) hideMissing();
  });
}
function list() {
  const apps = catalog.apps.filter(a => (category === 'All apps' || a.category === category) && `${a.name} ${a.summary} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#results').innerHTML = apps.length ? apps.map(card).join('') : '<div class="empty"><h2>No apps found</h2><p>Try another name or choose a different category.</p><button id="clear" class="button">Clear filters</button></div>';
  document.querySelector('#count').textContent = `${apps.length} app${apps.length === 1 ? '' : 's'}`;
  document.querySelector('#clear')?.addEventListener('click', () => { query = ''; category = 'All apps'; render(); });
}
// Release notes arrive as GitHub markdown. Render the common subset (headings, bullets, bold, code) from escaped text. URLs stay plain text; the changelog link line is dropped.
const inline = text => escape(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
function notes(text) {
  let html = '', inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\*\*Full Changelog\*\*:/i.test(line)) continue;
    const heading = line.match(/^(#{1,6})\s+(.*)$/), bullet = line.match(/^(?:[-*+•]|\d+[.)])\s+(.*)$/);
    if (bullet) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(bullet[1])}</li>`; continue; }
    closeList();
    if (heading) html += heading[1].length < 3 ? `<h4>${inline(heading[2])}</h4>` : `<h5>${inline(heading[2])}</h5>`;
    else if (line) html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html;
}
function release(a,r) {
  return `<article class="release"><div class="release-heading"><div><span class="eyebrow">${escape(a.name)}</span><h3>${escape(r.name)} <span class="pill">${escape(r.tag)}</span></h3></div><span class="muted">${date(r.date)}${a.status === 'demo' ? ' · Sample' : ''}</span></div>${r.notes ? `<div class="notes">${notes(r.notes)}</div>` : '<p class="muted">No release notes provided.</p>'}</article>`;
}
function render() {
  if (screenshotViewer?.open) screenshotViewer.close();
  const hash = location.hash || '#/';
  document.querySelector('#apps-nav').setAttribute('aria-current', hash === '#/' ? 'page' : 'false');
  document.querySelector('#releases-nav').setAttribute('aria-current', hash === '#/releases' ? 'page' : 'false');
  document.title = `${catalog.site.name} — Software downloads`;
  if (hash.startsWith('#/app/')) {
    const a = catalog.apps.find(a => detailURL(a) === hash);
    if (!a) { main.innerHTML = '<div class="empty"><h1>App not found</h1><a href="#/">Back to all apps</a></div>'; return; }
    document.title = `${a.name} — ${catalog.site.name}`;
    main.innerHTML = `<a class="back" href="#/">← All apps</a><section class="app-hero">${icon(a)}<div><span class="eyebrow">${escape(a.category)}</span><h1>${escape(a.name)}</h1><p>${escape(a.summary)}</p>${freshBadge(freshness(a))}</div></section>${installers(a)}${screenshots(a)}${a.status === 'demo' ? '<div class="notice">Sample app. Connect your release repository to enable real downloads.</div>' : ''}<div class="detail-grid"><section><h2>About this app</h2><p class="description">${escape(a.description)}</p>${a.audience ? `<p class="audience"><b>Who it&#8217;s for</b>${escape(a.audience)}</p>` : ''}${a.usage ? `<h3 class="features-title">How it&#8217;s used</h3><p class="usage">${escape(a.usage)}</p>` : ''}${[[a.featuresTitle || 'What it does', a.features], ['Advantages in the office', a.benefits]].map(([title, items]) => items?.length ? `<h3 class="features-title">${escape(title)}</h3><ul class="features">${items.map(f => `<li>${escape(f)}</li>`).join('')}</ul>` : '').join('')}${a.source === 'drive' ? '' : `<h2>Latest release</h2>${a.status === 'error' ? `<div class="notice">${escape(a.message)}</div>` : a.releases.map(r => release(a,r)).join('') || '<p>No stable releases published yet.</p>'}`}</section><aside><h3>App information</h3><dl><dt>Platform</dt><dd>${escape(a.platform)}</dd><dt>Requirements</dt><dd>${escape(a.requirements)}</dd>${a.source === 'drive' ? '' : `<dt>Latest version</dt><dd>${escape(a.releases[0]?.tag || 'Not available')}</dd><dt>Released</dt><dd>${date(a.releases[0]?.date)}</dd>${a.downloadCount != null ? `<dt>Downloads</dt><dd>${count(a.downloadCount)} across all versions</dd>` : ''}`}${builtWith(a)}${a.credits?.length ? `<dt>Credits</dt>${a.credits.map(c => `<dd class="credit"><b>${escape(c.name)}</b><span>${escape(c.role)}</span></dd>`).join('')}` : ''}</dl><p class="muted">${a.source === 'drive' ? 'Downloads are served by ' + escape([...new Set(a.releases[0]?.assets.map(x => x.host))].join(' and ') || 'Google Drive') + '.' : (a.releases[0]?.assets.some(x => x.host) ? 'Downloads are served by GitHub Releases and ' + escape(a.releases[0].assets.find(x => x.host).host) + '.' : 'Downloads are served directly by GitHub Releases.')}</p></aside></div>`;
    paintLanguages();
    prepareScreenshots();
    main.querySelectorAll('[data-version]').forEach(link => link.addEventListener('click', () => remember(a.id, link.dataset.version)));
  } else if (hash === '#/releases') {
    // Only real GitHub releases that include written notes.
    const releases = catalog.apps.filter(a => a.status === 'live').flatMap(a => a.releases.filter(r => r.notes && !/^\*\*Full Changelog\*\*: \S+$/.test(r.notes)).map(r => ({a,r}))).sort((x,y) => Date.parse(y.r.date)-Date.parse(x.r.date));
    main.innerHTML = `<section class="page-heading"><span class="eyebrow">LATEST RELEASES</span><h1>What&#8217;s new.</h1><p>The latest versions and what changed.</p></section>${catalog.apps.some(a=>a.status==='error') ? '<div class="notice">Some apps could not be refreshed. Their releases are temporarily unavailable.</div>' : ''}<div class="release-feed">${releases.map(({a,r}) => release(a,r)).join('') || '<div class="empty">No release notes published yet.</div>'}</div>`;
  } else {
    main.innerHTML = `<section class="hero"><div><span class="eyebrow">BUILT FOR YOUR EVERYDAY</span><h1>${escape(catalog.site.tagline)}</h1><p>${escape(catalog.site.description)}</p></div><div class="collection-mark"><span class="collection-status">THE DESKTOP COLLECTION</span><strong>${String(catalog.apps.length).padStart(2,'0')}</strong><span>apps. Less busywork.</span></div></section>${catalog.apps.some(a=>a.status==='demo') ? '<div class="notice"><strong>Starter preview</strong><span>Sample apps and versions. Add your GitHub release repositories to enable downloads.</span></div>' : ''}<section aria-label="App catalog"><div class="toolbar"><div class="tabs" role="group" aria-label="App categories">${['All apps', ...new Set(catalog.apps.map(a=>a.category))].map(c=>`<button class="tab ${c===category?'selected':''}" data-category="${escape(c)}" aria-pressed="${c===category}">${escape(c)}</button>`).join('')}</div><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search apps…" aria-label="Search apps" value="${escape(query)}"></label></div><div class="section-label"><h2>Explore the collection</h2><span id="count" aria-live="polite"></span></div><div id="results" class="cards"></div></section><section class="developer-note" aria-labelledby="developer-note-title"><div class="disclaimer"><span class="eyebrow">ABOUT THE DEVELOPER</span><h2 id="developer-note-title">Built by a vibe coder who knows the work</h2><p>These apps are made by someone who does this kind of office work, not by a software company. The developer is a vibe coder: not a professional programmer by training, but someone who builds working software with AI coding assistants, then tests and refines it until it does the job.</p><p>Every app is built around real office forms and workflows, and keeps improving with each release. As with any office tool, review important figures before you sign or submit them, and send feedback if something can be better. That feedback is how these apps grow.</p></div><div class="vibe-roles"><h3>What a vibe coder can do for the community</h3><ul><li><b>Solve everyday office problems.</b> Turn tasks people struggle with daily into simple tools, built by someone who knows the work.</li><li><b>Cut repetitive work.</b> Automate manual computing, retyping and form preparation so staff can focus on service.</li><li><b>Build quickly and affordably.</b> Deliver useful tools in days, without waiting for a budget or a software vendor.</li><li><b>Bridge staff and IT.</b> Translate what an office needs into a working prototype that professionals can review and strengthen.</li><li><b>Listen and improve.</b> Take feedback from the people who use the apps and release fixes fast.</li><li><b>Share the know-how.</b> Show colleagues how AI tools can help them build and solve problems themselves.</li></ul></div></section>`;
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
