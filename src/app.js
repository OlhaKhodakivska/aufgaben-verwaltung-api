const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authentifizierung = require('./middleware/authentifizierung');
const benutzerRouten = require('./routes/benutzerRouten');
const aufgabenRouten = require('./routes/aufgabenRouten');

function erstelleApp({ prisma, corsOrigin, rateLimit } = {}) {
  if (!prisma) throw new Error('Eine Prisma-Instanz ist erforderlich.');

  const app = express();
  const erlaubterOrigin = corsOrigin || 'http://localhost:5173';

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === erlaubterOrigin) return callback(null, true);
      return callback(new Error('Dieser Origin ist durch CORS nicht erlaubt.'));
    },
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => {
    res.json({ nachricht: 'Aufgaben-Verwaltungs-API läuft.' });
  });
  app.use('/api/benutzer', benutzerRouten(prisma, authentifizierung, rateLimit));
  app.use('/api/aufgaben', aufgabenRouten(prisma, authentifizierung));

  app.use((_req, res) => {
    res.status(404).json({ nachricht: 'Route nicht gefunden.' });
  });

  app.use((fehler, _req, res, _next) => {
    if (fehler.type === 'entity.parse.failed') {
      return res.status(400).json({ nachricht: 'Ungültiges JSON.' });
    }
    if (fehler.type === 'entity.too.large') {
      return res.status(413).json({ nachricht: 'Anfrage ist zu groß.' });
    }
    if (fehler.message === 'Dieser Origin ist durch CORS nicht erlaubt.') {
      return res.status(403).json({ nachricht: fehler.message });
    }

    console.error(fehler);
    return res.status(500).json({ nachricht: 'Interner Serverfehler.' });
  });

  return app;
}

module.exports = erstelleApp;
