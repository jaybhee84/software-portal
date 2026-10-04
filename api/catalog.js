import { apps, site } from '../config.js';
import { loadApp } from '../lib/releases.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const catalog = await Promise.all(apps.map(app => loadApp(app)));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ site, apps: catalog });
}
