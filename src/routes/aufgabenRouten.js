const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authentifizierung = require('../middleware/authentifizierung');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/aufgaben - Neue Aufgabe erstellen (geschützt)
router.post('/', authentifizierung, async (req, res) => {
  try {
    const { titel, beschreibung } = req.body;

    if (!titel) {
      return res.status(400).json({ nachricht: 'Titel ist erforderlich.' });
    }

    const neueAufgabe = await prisma.aufgabe.create({
      data: {
        titel,
        beschreibung,
        benutzerId: req.benutzer.id,
      },
    });

    res.status(201).json(neueAufgabe);
  } catch (fehler) {
    res.status(500).json({ nachricht: 'Fehler beim Erstellen der Aufgabe.' });
  }
});

// GET /api/aufgaben - Alle Aufgaben des aktuellen Benutzers abrufen (geschützt)
router.get('/', authentifizierung, async (req, res) => {
  try {
    const aufgaben = await prisma.aufgabe.findMany({
      where: { benutzerId: req.benutzer.id },
    });

    res.json(aufgaben);
  } catch (fehler) {
    res.status(500).json({ nachricht: 'Fehler beim Abrufen der Aufgaben.' });
  }
});

module.exports = router;