import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import * as admin from 'firebase-admin';

const DB_FILE = path.join(process.cwd(), 'channels.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

// Initialize Firebase Admin if credentials exist
let db: admin.firestore.Firestore | null = null;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    db = admin.firestore();
    console.log("Firebase initialized successfully");
  } catch (err) {
    console.error("Firebase initialization error:", err);
  }
}

interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  isHidden: boolean;
  order: number;
}

interface AppSettings {
  appName: string;
  appLogo: string;
}

let settings: AppSettings = {
  appName: "StreamBox",
  appLogo: ""
};

let channels: Channel[] = [];

// Load locally first as fallback
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  }
  if (fs.existsSync(DB_FILE)) {
    channels = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } else {
    channels = [
      { id: uuidv4(), name: "Test HLS Stream", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Broadcasting-icon.svg/512px-Broadcasting-icon.svg.png", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", isHidden: false, order: 0 },
      { id: uuidv4(), name: "Test DASH Stream", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Broadcasting-icon.svg/512px-Broadcasting-icon.svg.png", url: "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd", isHidden: false, order: 1 }
    ];
  }
} catch (e) {
  console.error("Error loading local data:", e);
}

// Sync with Firebase on startup if available
async function syncFromFirebase() {
  if (!db) return;
  try {
    const settingsDoc = await db.collection('config').doc('settings').get();
    if (settingsDoc.exists) {
      settings = settingsDoc.data() as AppSettings;
    } else {
      await db.collection('config').doc('settings').set(settings);
    }

    const channelsSnapshot = await db.collection('channels').get();
    if (!channelsSnapshot.empty) {
      channels = channelsSnapshot.docs.map(doc => doc.data() as Channel);
    } else {
      for (const channel of channels) {
        await db.collection('channels').doc(channel.id).set(channel);
      }
    }
  } catch (err) {
    console.error("Error syncing from Firebase:", err);
  }
}

async function saveSettings(newSettings: AppSettings) {
  settings = newSettings;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  if (db) {
    try {
      await db.collection('config').doc('settings').set(settings);
    } catch (e) { console.error("Firebase save error:", e); }
  }
}

async function saveChannel(channel: Channel) {
  const index = channels.findIndex(c => c.id === channel.id);
  if (index !== -1) {
    channels[index] = channel;
  } else {
    channels.push(channel);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(channels, null, 2));
  if (db) {
    try {
      await db.collection('channels').doc(channel.id).set(channel);
    } catch (e) { console.error("Firebase save error:", e); }
  }
}

async function deleteChannelFromDB(id: string) {
  channels = channels.filter(c => c.id !== id);
  fs.writeFileSync(DB_FILE, JSON.stringify(channels, null, 2));
  if (db) {
    try {
      await db.collection('channels').doc(id).delete();
    } catch (e) { console.error("Firebase delete error:", e); }
  }
}

async function startServer() {
  await syncFromFirebase();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/settings', (req, res) => {
    res.json(settings);
  });

  app.post('/api/settings', async (req, res) => {
    const { appName, appLogo } = req.body;
    const newSettings = { ...settings };
    if (appName !== undefined) newSettings.appName = appName;
    if (appLogo !== undefined) newSettings.appLogo = appLogo;
    await saveSettings(newSettings);
    res.json(settings);
  });

  app.get('/api/channels', (req, res) => {
    const sorted = [...channels].sort((a, b) => a.order - b.order);
    res.json(sorted);
  });

  app.post('/api/channels', async (req, res) => {
    const { name, logo, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
    
    const maxOrder = channels.reduce((max, c) => Math.max(max, c.order), -1);
    const newChannel: Channel = {
      id: uuidv4(),
      name,
      logo: logo || 'https://via.placeholder.com/150?text=No+Logo',
      url,
      isHidden: false,
      order: maxOrder + 1,
    };
    await saveChannel(newChannel);
    res.status(201).json(newChannel);
  });

  app.put('/api/channels/:id', async (req, res) => {
    const { id } = req.params;
    const channel = channels.find(c => c.id === id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    const updatedChannel = { ...channel, ...req.body, id };
    await saveChannel(updatedChannel);
    res.json(updatedChannel);
  });

  app.delete('/api/channels/:id', async (req, res) => {
    const { id } = req.params;
    if (!channels.find(c => c.id === id)) return res.status(404).json({ error: 'Channel not found' });
    await deleteChannelFromDB(id);
    res.status(204).send();
  });

  app.post('/api/channels/reorder', async (req, res) => {
    const { id, direction } = req.body;
    const index = channels.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Channel not found' });
    
    channels.sort((a, b) => a.order - b.order);
    const currentIdx = channels.findIndex(c => c.id === id);

    if (direction === 'up' && currentIdx > 0) {
      const tempOrder = channels[currentIdx].order;
      channels[currentIdx].order = channels[currentIdx - 1].order;
      channels[currentIdx - 1].order = tempOrder;
    } else if (direction === 'down' && currentIdx < channels.length - 1) {
      const tempOrder = channels[currentIdx].order;
      channels[currentIdx].order = channels[currentIdx + 1].order;
      channels[currentIdx + 1].order = tempOrder;
    } else if (direction === 'top' && currentIdx > 0) {
      const target = channels.splice(currentIdx, 1)[0];
      channels.unshift(target);
    } else if (direction === 'bottom' && currentIdx < channels.length - 1) {
      const target = channels.splice(currentIdx, 1)[0];
      channels.push(target);
    }

    channels.forEach((c, idx) => c.order = idx);
    
    // Save all to DB
    fs.writeFileSync(DB_FILE, JSON.stringify(channels, null, 2));
    if (db) {
      try {
        const batch = db.batch();
        channels.forEach(c => {
          const docRef = db!.collection('channels').doc(c.id);
          batch.set(docRef, c);
        });
        await batch.commit();
      } catch (e) { console.error("Firebase batch save error:", e); }
    }
    
    res.json(channels);
  });

  const clients = new Map<string, express.Response>();

  function broadcastViewerCount() {
    const data = `data: ${JSON.stringify({ count: clients.size })}\n\n`;
    clients.forEach(client => {
      try {
        client.write(data);
      } catch (e) {}
    });
  }

  app.get('/api/live-viewers', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const clientId = uuidv4();
    clients.set(clientId, res);
    broadcastViewerCount();

    req.on('close', () => {
      clients.delete(clientId);
      broadcastViewerCount();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

