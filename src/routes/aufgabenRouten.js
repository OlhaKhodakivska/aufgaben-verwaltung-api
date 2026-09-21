const express = require('express');
const { GRENZEN, istObjekt, istText } = require('../validierung');

const ERLAUBTE_STATUS = new Set(['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT']);

function aufgabenRouten(prisma, authentifizierung) {
  const router = express.Router();
  router.use(authentifizierung);

  router.get('/', async (req, res, next) => {
    try {
      const aufgaben = await prisma.aufgabe.findMany({
        where: { benutzerId: req.benutzerId },
        orderBy: { erstelltAm: 'desc' },
      });
      return res.json(aufgaben);
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const aufgabe = await prisma.aufgabe.findFirst({
        where: { id: req.params.id, benutzerId: req.benutzerId },
      });
      return aufgabe
        ? res.json(aufgabe)
        : res.status(404).json({ nachricht: 'Aufgabe nicht gefunden.' });
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      if (!istObjekt(req.body)) {
        return res.status(400).json({ nachricht: 'Der Request-Body muss ein JSON-Objekt sein.' });
      }

      const status = req.body.status === undefined ? 'OFFEN' : req.body.status;
      const beschreibungVorhanden = req.body.beschreibung !== undefined && req.body.beschreibung !== null;

      if (
        !istText(req.body.titel, { min: 1, max: GRENZEN.titel })
        || typeof status !== 'string'
        || !ERLAUBTE_STATUS.has(status)
        || (beschreibungVorhanden
          && !istText(req.body.beschreibung, { max: GRENZEN.beschreibung }))
      ) {
        return res.status(400).json({ nachricht: 'Titel oder Status ist ungültig.' });
      }

      const titel = req.body.titel.trim();
      const beschreibung = beschreibungVorhanden ? req.body.beschreibung.trim() || null : null;

      const aufgabe = await prisma.aufgabe.create({
        data: { titel, beschreibung, status, benutzerId: req.benutzerId },
      });
      return res.status(201).json(aufgabe);
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      if (!istObjekt(req.body)) {
        return res.status(400).json({ nachricht: 'Der Request-Body muss ein JSON-Objekt sein.' });
      }

      const status = req.body.status;
      const beschreibungVorhanden = req.body.beschreibung !== undefined && req.body.beschreibung !== null;

      if (
        !istText(req.body.titel, { min: 1, max: GRENZEN.titel })
        || typeof status !== 'string'
        || !ERLAUBTE_STATUS.has(status)
        || (beschreibungVorhanden
          && !istText(req.body.beschreibung, { max: GRENZEN.beschreibung }))
      ) {
        return res.status(400).json({ nachricht: 'Titel und ein gültiger Status sind erforderlich.' });
      }

      const titel = req.body.titel.trim();
      const beschreibung = beschreibungVorhanden ? req.body.beschreibung.trim() || null : null;

      const vorhanden = await prisma.aufgabe.findFirst({
        where: { id: req.params.id, benutzerId: req.benutzerId },
        select: { id: true },
      });
      if (!vorhanden) {
        return res.status(404).json({ nachricht: 'Aufgabe nicht gefunden.' });
      }

      const aufgabe = await prisma.aufgabe.update({
        where: { id: vorhanden.id },
        data: { titel, beschreibung, status },
      });
      return res.json(aufgabe);
    } catch (fehler) {
      return next(fehler);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const ergebnis = await prisma.aufgabe.deleteMany({
        where: { id: req.params.id, benutzerId: req.benutzerId },
      });
      return ergebnis.count
        ? res.status(204).send()
        : res.status(404).json({ nachricht: 'Aufgabe nicht gefunden.' });
    } catch (fehler) {
      return next(fehler);
    }
  });

  return router;
}

module.exports = aufgabenRouten;
