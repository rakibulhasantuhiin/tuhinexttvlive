const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  app.all('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url');

    try {
      const fetchRes = await fetch(targetUrl, {`;

const replacement = `  app.all('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url');

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      return res.status(200).end();
    }

    try {
      const fetchRes = await fetch(targetUrl, {`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
