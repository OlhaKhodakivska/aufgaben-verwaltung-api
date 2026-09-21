const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit: erstelleRateLimit } = require('express-rate-limit');
const { GRENZEN, istGueltigeEmail, istObjekt, istText } = require('../validierung');

function standardRateLimit() {
  return erstelleRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      nachricht: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.',
    }),
  });
}

function benutzerRouten(prisma, authentifizierung, rateLimitFactory = standardRateLimit) {
  const router = express.Router();
  const registrierungLimit = rateLimitFactory();
  const loginLimit = rateLimitFactory();

  router.post('/registrieren', registrierungLimit, async (req, res, next) => {
    try {
      if (!istObjekt(req.body)) {
        return res.status(400).json({ nachricht: 'Der Request-Body muss ein JSON-Objekt sein.' });
      }

      const { benutzername: roherName, email: roheEmail } = req.body;
      const passwort = req.body.passwort;

      if (
        !istText(roherName, { min: 2, max: GRENZEN.benutzername })
        || !istGueltigeEmail(roheEmail)
        || !istText(passwort, { min: 8, max: GRENZEN.passwort, trimmen: false })
      ) {
        return res.status(400).json({
          nachricht: 'Ungültige Eingabe: Benutzername 2–50, gültige E-Mail und Passwort 8–128 Zeichen.',
        });
      }

      const benutzername = roherName.trim();
      const email = roheEmail.trim().toLowerCase();

      const vorhanden = await prisma.benutzer.findUnique({ where: { email } });
      if (vorhanden) {
        return res.status(409).json({ nachricht: 'Diese E-Mail ist bereits registriert.' });
      }

      const benutzer = await prisma.benutzer.create({
        data: {
          benutzername,
          email,
          passwort: await bcrypt.hash(passwort, 12),
        },
        select: { id: true, benutzername: true, email: true, erstelltAm: true },
      });

      return res.status(201).json(benutzer);
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.post('/login', loginLimit, async (req, res, next) => {
    try {
      if (!istObjekt(req.body)) {
        return res.status(400).json({ nachricht: 'Der Request-Body muss ein JSON-Objekt sein.' });
      }

      const roheEmail = req.body.email;
      const passwort = req.body.passwort;

      if (
        !istGueltigeEmail(roheEmail)
        || !istText(passwort, { min: 1, max: GRENZEN.passwort, trimmen: false })
      ) {
        return res.status(400).json({ nachricht: 'E-Mail oder Passwort hat ein ungültiges Format.' });
      }

      const email = roheEmail.trim().toLowerCase();
      const benutzer = await prisma.benutzer.findUnique({ where: { email } });

      if (!benutzer || !(await bcrypt.compare(passwort, benutzer.passwort))) {
        return res.status(401).json({ nachricht: 'E-Mail oder Passwort ist falsch.' });
      }

      const token = jwt.sign(
        { benutzerId: benutzer.id, email: benutzer.email },
        process.env.JWT_SECRET,
        { expiresIn: '2h' },
      );

      return res.json({ token, nachricht: 'Erfolgreich angemeldet.' });
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.get('/profil', authentifizierung, async (req, res, next) => {
    try {
      const benutzer = await prisma.benutzer.findUnique({
        where: { id: req.benutzerId },
        select: { id: true, benutzername: true, email: true, erstelltAm: true },
      });

      if (!benutzer) {
        return res.status(404).json({ nachricht: 'Benutzer nicht gefunden.' });
      }
      return res.json(benutzer);
    } catch (fehler) {
      return next(fehler);
    }
  });

  return router;
}

module.exports = benutzerRouten;
