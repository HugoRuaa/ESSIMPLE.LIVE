import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// In-memory data store for live link sharing between screens
const sharedLocationTokens: Record<string, {
  contactName: string;
  active: boolean;
  lat: number;
  lng: number;
  address: string;
  accuracy: number;
  expiresAt: number;
  updatedAt: number;
}> = {
  'demo-laura': {
    contactName: 'Laura',
    active: true,
    lat: 6.2088,
    lng: -75.5684,
    address: 'Calle 10 # 43A-25, El Poblado, Medellín',
    accuracy: 25,
    expiresAt: Date.now() + 3600 * 1000,
    updatedAt: Date.now(),
  }
};

const sharedVoiceMessages: Record<string, {
  senderName: string;
  recipientName: string;
  audioBase64?: string;
  durationSeconds: number;
  createdAt: number;
  active: boolean;
}> = {
  'demo-audio-laura': {
    senderName: 'Álvaro',
    recipientName: 'Laura',
    durationSeconds: 14,
    createdAt: Date.now() - 60000,
    active: true,
  }
};

const installTokens: Record<string, {
  familyEmail: string;
  used: boolean;
  expiresAt: number;
}> = {
  'k7Qp2x9a': {
    familyEmail: 'laura@correo.com',
    used: false,
    expiresAt: Date.now() + 72 * 3600 * 1000,
  }
};

// --- API Endpoints ---

// Shared location APIs
app.get('/api/share/location/:token', (req, res) => {
  const token = req.params.token;
  const data = sharedLocationTokens[token];
  if (!data || !data.active || Date.now() > data.expiresAt) {
    return res.status(404).json({ active: false, message: 'Esta persona dejó de compartir su ubicación o el enlace venció.' });
  }
  res.json(data);
});

app.post('/api/share/location', (req, res) => {
  const { token, contactName, lat, lng, address, durationHours } = req.body;
  const key = token || `loc-${Math.random().toString(36).substring(2, 9)}`;
  const hours = durationHours || 1;
  sharedLocationTokens[key] = {
    contactName: contactName || 'Laura',
    active: true,
    lat: lat || 6.2088,
    lng: lng || -75.5684,
    address: address || 'Calle 10 # 43A-25, El Poblado, Medellín',
    accuracy: 20,
    expiresAt: Date.now() + hours * 3600 * 1000,
    updatedAt: Date.now(),
  };
  res.json({ token: key, expiresAt: sharedLocationTokens[key].expiresAt });
});

app.post('/api/share/location/:token/stop', (req, res) => {
  const token = req.params.token;
  if (sharedLocationTokens[token]) {
    sharedLocationTokens[token].active = false;
  }
  res.json({ success: true });
});

// Shared audio message APIs
app.get('/api/share/audio/:token', (req, res) => {
  const token = req.params.token;
  const data = sharedVoiceMessages[token];
  if (!data || !data.active) {
    return res.status(404).json({ active: false, message: 'Este mensaje ya no está disponible.' });
  }
  res.json(data);
});

app.post('/api/share/audio', (req, res) => {
  const { senderName, recipientName, audioBase64, durationSeconds } = req.body;
  const token = `aud-${Math.random().toString(36).substring(2, 9)}`;
  sharedVoiceMessages[token] = {
    senderName: senderName || 'Álvaro',
    recipientName: recipientName || 'Laura',
    audioBase64,
    durationSeconds: durationSeconds || 12,
    createdAt: Date.now(),
    active: true,
  };
  res.json({ token });
});

// Installation link APIs
app.get('/api/install/:token', (req, res) => {
  const token = req.params.token;
  const data = installTokens[token];
  if (!data || data.used || Date.now() > data.expiresAt) {
    return res.status(404).json({ valid: false, message: 'Este enlace ya no sirve. Ya se usó o venció.' });
  }
  res.json({ valid: true, data });
});

app.post('/api/install/create', (req, res) => {
  const { familyEmail } = req.body;
  const token = Math.random().toString(36).substring(2, 10);
  installTokens[token] = {
    familyEmail: familyEmail || 'laura@correo.com',
    used: false,
    expiresAt: Date.now() + 72 * 3600 * 1000,
  };
  res.json({ token, expiresAt: installTokens[token].expiresAt });
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[essimple.live] Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
