# AppShelf — Software download portal

A complete responsive portal for Vercel, with installers served directly from public GitHub Releases. No frontend dependencies, database, or build tooling to install. Includes search, category filters, app detail links, latest release notes, file sizes, release dates, and release notes.

## 1. Run locally

Install Node.js 24 LTS from https://nodejs.org. Extract this folder, open a terminal in it, then run:

```sh
npm run dev
```

Open the URL printed in the terminal (normally http://localhost:3000). If the port is occupied, the server tries up to 10 subsequent ports. You can set a preferred starting port with the `PORT` environment variable. Do not open index.html directly: the app needs its local API server. The starter works immediately with four explicitly labeled sample apps. These descriptions and version numbers are examples, and sample downloads are disabled.

On Windows you can also double-click **START-WINDOWS.cmd**. If your npm installation is unavailable, run `node --env-file-if-exists=.env scripts/dev.mjs` directly. Leave that terminal open while using the portal.

## 2. Connect your apps

Edit **config.js** at the project root. Change the site name, tagline, and description. For each app, replace `repo: null` with your PUBLIC releases repository:

```js
repo: 'YOUR-GITHUB-USERNAME/tax-e-releases',
assetPattern: '\\.(exe|msi|zip)$',
```

Copy an existing app object to add an app. Give it a unique, lowercase `id` (letters, numbers, hyphens), name, initials, category, platform, description, and system requirements. Supported icon colors: blue, violet, teal, orange. Categories are built automatically. The first app receives the wide catalog card on desktop. Remove unused sample entries before publishing.

The first matching uploaded asset becomes the card's Download button. Every matching asset appears on the detail page, so users can choose an installer or ZIP. Narrow `assetPattern` if a repository has multiple platforms, for example `Windows.*\\.(exe|zip)$`. It is a JavaScript regular expression string; double backslashes as shown. Upload your intended primary installer first, or narrow the pattern. Use descriptive filenames including platform and architecture.

### GitHub release setup

1. Create a public repository for compiled downloads, such as `tax-e-releases`. Your application source repository can remain private.
2. In the public repository, open **Releases → Draft a new release**.
3. Create a version tag such as `v1.0.0`, add release notes, and upload the compiled `.exe`, `.msi`, or `.zip` as release assets.
4. Publish a stable release. Drafts and prereleases are excluded by the portal.
5. Set the repository's `owner/name` in config.js. Restart the local server after configuration changes.

GitHub's automatically generated source archives are deliberately not offered as installers. A release without matching uploaded assets displays “No installer yet.” When the API fails, the portal shows an unavailable state; it never substitutes sample versions for a connected app.

Existing GitHub Actions builds can publish their compiled artifacts into this public release repository. Configure the publishing workflow in your private source repo with a separate secret authorized to write to the public release repo. The website only reads releases and needs no write access.

## 3. Deploy on Vercel

1. Push this entire project to a GitHub repository. This website repository may be private. Never commit `.env` or tokens.
2. In Vercel, select **Add New → Project** and import the website repository.
3. Select **Other** as the framework preset. Set the Root Directory to the folder containing package.json if it is inside a larger repository.
4. The included vercel.json sets **Build Command** to `npm run build` and **Output Directory** to `dist`. Use Node.js **24.x**. There are no packages to install; leave the install setting at its default.
5. Select **Deploy**. The `/api/catalog` endpoint runs as a Node.js Vercel Function; `dist` contains only public frontend files.
6. Open the deployed URL. Verify each app's Details page and download link. Add a custom domain in Vercel's project settings if desired.

Do not deploy only the dist folder: Vercel also needs api/, lib/, config.js, package.json, and vercel.json from the full project.

### Optional API token

Public repositories work without authentication, subject to GitHub's unauthenticated rate limits. For more capacity, add `GITHUB_TOKEN` in Vercel's project environment variables, then redeploy. Use a fine-grained token with only the public repository read permissions needed for metadata and releases. Never use a browser-visible variable or paste the token into config.js. Locally, copy `.env.example` to `.env` and set the value there.

The token is used only on the server. The API rejects private repositories even if the token can access them. All download URLs go directly to github.com, where public release assets require no website token.

## Automatic updates and limits

- The portal fetches the release marked Latest on GitHub for each app on every page load. Browser and CDN catalog caching are disabled. New releases need no website rebuild.
- Only the latest stable release and its assets are shown. Older releases and prereleases are excluded; missing installers never fall back to an older version.
- Release notes are displayed as safe plain text. Markdown formatting is preserved as text, not rendered as HTML. Asset SHA digests appear when GitHub supplies them.
- App detail URLs use hashes, for example `/#/app/ape-suite`, and support direct linking and browser back/forward. This starter does not provide per-app server-rendered SEO pages.
- There is no upload/admin dashboard. Edit config.js to change the catalog; publish release assets on GitHub to update downloads.

## Check the project

```sh
npm test
npm run build
```

Tests cover filtering draft/prerelease entries, safe asset URLs, sample mode, private-repository rejection, upstream failure, and successful live response mapping. No dependencies or lockfile are required.

## Project map

| File | Purpose |
| --- | --- |
| config.js | Branding and app catalog |
| public/ | Responsive browser UI and favicon |
| api/catalog.js | Vercel catalog API and caching |
| lib/releases.js | GitHub read requests and release normalization |
| scripts/dev.mjs | Local static/API server |
| scripts/build.mjs | Copies frontend into dist |
| test/releases.test.js | Release integration tests with mocked GitHub responses |

## Troubleshooting

- **App unavailable:** check spelling, public repository visibility, token expiration, GitHub rate limits, and whether GitHub is reachable.
- **No installer:** publish a stable release with uploaded assets matching assetPattern; tags alone are not releases.
- **Old version:** mark the intended stable release as Latest on GitHub, then reload the portal.
- **Blank catalog on another static host:** this project requires its server API. Deploy the full project to Vercel or run the included local server.
- **Browser download warning:** operating system trust and signing depend on your installer. The portal does not sign binaries; sign and test your published builds separately.

Official references: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [GitHub release API](https://docs.github.com/en/rest/releases/releases).
