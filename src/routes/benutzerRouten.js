const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/benutzer/registrieren - Registrierung eines neuen Benutzers
router.post('/registrieren', async (req, res) => {
  try {
    const { benutzername, email, passwort } = req.body;

    if (!benutzername || !email || !passwort) {
      return res.status(400).json({ nachricht: 'Bitte alle Felder ausfüllen.' });
    }

    const existierenderBenutzer = await prisma.benutzer.findUnique({ where: { email } });
    if (existierenderBenutzer) {
      return res.status(400).json({ nachricht: 'Benutzer mit dieser E-Mail existiert bereits.' });
    }

    const salt = await bcrypt.genSalt(10);
    const gehachtesPasswort = await bcrypt.hash(passwort, salt);

    const neuerBenutzer = await prisma.benutzer.create({
      data: {
        benutzername,
        email,
        passwort: gehachtesPasswort,
      },
      select: { id: true, benutzername: true, email: true, erstelltAm: true },
    });

    res.status(201).json(neuerBenutzer);
  } catch (fehler) {
    res.status(500).json({ nachricht: 'Serverfehler bei der Registrierung.' });
  }
});

// POST /api/benutzer/login - Benutzer-Anmeldung
router.post('/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;

    const benutzer = await prisma.benutzer.findUnique({ where: { email } });
    if (!benutzer) {
      return res.status(400).json({ nachricht: 'Ungültige E-Mail oder Passwort.' });
    }

    const gueltigesPasswort = await bcrypt.compare(passwort, benutzer.passwort);
    if (!gueltigesPasswort) {
      return res.status(400).json({ nachricht: 'Ungültige E-Mail oder Passwort.' });
    }

    const token = jwt.sign(
      { id: benutzer.id, email: benutzer.email },
      process.env.JWT_GEHEIMNIS || 'standard_geheimnis',
      { expiresIn: '2h' }
    );

    res.json({ token, nachricht: 'Erfolgreich angemeldet.' });
  } catch (fehler) {
    res.status(500).json({ nachricht: 'Serverfehler beim Login.' });
  }
});

module.exports = router;