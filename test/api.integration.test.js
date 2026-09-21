const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const Database = require('better-sqlite3');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const erstelleApp = require('../src/app');

const ohneRateLimit = () => (_req, _res, next) => next();
const gueltigerBenutzer = {
  benutzername: 'Anna Test',
  email: 'anna@example.com',
  passwort: 'SehrSicher123!',
};

let tempVerzeichnis;
let prisma;
let api;

before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
  tempVerzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'aufgaben-api-'));
  const datenbankPfad = path.join(tempVerzeichnis, 'integration.db');
  const sqlite = new Database(datenbankPfad);
  const migrationsVerzeichnis = path.join(__dirname, '..', 'prisma', 'migrations');
  const migrationen = fs.readdirSync(migrationsVerzeichnis, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const migration of migrationen) {
    sqlite.exec(fs.readFileSync(
      path.join(migrationsVerzeichnis, migration.name, 'migration.sql'),
      'utf8',
    ));
  }
  sqlite.close();

  prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${datenbankPfad}` }),
  });
  api = erstelleApp({ prisma, rateLimit: ohneRateLimit });
  await prisma.$connect();
});

after(async () => {
  await prisma?.$disconnect();
  fs.rmSync(tempVerzeichnis, { recursive: true, force: true });
});

describe('Benutzer-API', () => {
  test('registriert, speichert ein Passwort-Hash und meldet den Benutzer an', async () => {
    const registrierung = await request(api)
      .post('/api/benutzer/registrieren')
      .send(gueltigerBenutzer)
      .expect(201);

    assert.equal(registrierung.body.email, gueltigerBenutzer.email);
    assert.equal(registrierung.body.passwort, undefined);

    const gespeichert = await prisma.benutzer.findUnique({
      where: { email: gueltigerBenutzer.email },
    });
    assert.notEqual(gespeichert.passwort, gueltigerBenutzer.passwort);

    const login = await request(api)
      .post('/api/benutzer/login')
      .send({ email: gueltigerBenutzer.email, passwort: gueltigerBenutzer.passwort })
      .expect(200);

    assert.equal(typeof login.body.token, 'string');

    const profil = await request(api)
      .get('/api/benutzer/profil')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);

    assert.equal(profil.body.id, registrierung.body.id);
    assert.equal(profil.body.passwort, undefined);
  });

  test('weist ungültige E-Mails, Typen und Feldlängen zurück', async () => {
    await request(api)
      .post('/api/benutzer/registrieren')
      .send({ ...gueltigerBenutzer, email: 'keine-email' })
      .expect(400);

    await request(api)
      .post('/api/benutzer/registrieren')
      .send({ ...gueltigerBenutzer, benutzername: 42 })
      .expect(400);

    await request(api)
      .post('/api/benutzer/registrieren')
      .send({ ...gueltigerBenutzer, email: 'x'.repeat(245) + '@example.com' })
      .expect(400);

    await request(api)
      .post('/api/benutzer/login')
      .send({ email: gueltigerBenutzer.email, passwort: ['kein', 'text'] })
      .expect(400);
  });
});

describe('Aufgaben-API', () => {
  let token;
  let fremdesToken;

  before(async () => {
    const login = await request(api)
      .post('/api/benutzer/login')
      .send({ email: gueltigerBenutzer.email, passwort: gueltigerBenutzer.passwort });
    token = login.body.token;

    await request(api)
      .post('/api/benutzer/registrieren')
      .send({ benutzername: 'Berta Test', email: 'berta@example.com', passwort: 'NochSicherer123!' })
      .expect(201);
    const fremderLogin = await request(api)
      .post('/api/benutzer/login')
      .send({ email: 'berta@example.com', passwort: 'NochSicherer123!' })
      .expect(200);
    fremdesToken = fremderLogin.body.token;
  });

  test('schützt Endpunkte und führt CRUD nur für eigene Aufgaben aus', async () => {
    await request(api).get('/api/aufgaben').expect(401);

    const erstellt = await request(api)
      .post('/api/aufgaben')
      .set('Authorization', `Bearer ${token}`)
      .send({ titel: 'Integration testen', beschreibung: 'Mit echter SQLite-DB' })
      .expect(201);

    assert.equal(erstellt.body.status, 'OFFEN');

    await request(api)
      .get(`/api/aufgaben/${erstellt.body.id}`)
      .set('Authorization', `Bearer ${fremdesToken}`)
      .expect(404);

    const aktualisiert = await request(api)
      .put(`/api/aufgaben/${erstellt.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titel: 'Integration getestet', beschreibung: null, status: 'ERLEDIGT' })
      .expect(200);
    assert.equal(aktualisiert.body.status, 'ERLEDIGT');

    const liste = await request(api)
      .get('/api/aufgaben')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.equal(liste.body.length, 1);

    await request(api)
      .delete(`/api/aufgaben/${erstellt.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });

  test('validiert Typen und maximale Feldlängen', async () => {
    await request(api)
      .post('/api/aufgaben')
      .set('Authorization', `Bearer ${token}`)
      .send({ titel: 123, status: 'OFFEN' })
      .expect(400);

    await request(api)
      .post('/api/aufgaben')
      .set('Authorization', `Bearer ${token}`)
      .send({ titel: 'x'.repeat(201), beschreibung: 'ok' })
      .expect(400);

    await request(api)
      .post('/api/aufgaben')
      .set('Authorization', `Bearer ${token}`)
      .send({ titel: 'ok', beschreibung: 'x'.repeat(2001) })
      .expect(400);
  });
});

describe('Rate Limiting', () => {
  test('begrenzt Login und Registrierung unabhängig auf je fünf Versuche', async () => {
    const begrenzteApi = erstelleApp({ prisma });

    for (let versuch = 0; versuch < 5; versuch += 1) {
      await request(begrenzteApi)
        .post('/api/benutzer/login')
        .send({ email: `unbekannt${versuch}@example.com`, passwort: 'FalschesPasswort' })
        .expect(401);
    }
    await request(begrenzteApi)
      .post('/api/benutzer/login')
      .send({ email: 'nochmal@example.com', passwort: 'FalschesPasswort' })
      .expect(429);

    for (let versuch = 0; versuch < 5; versuch += 1) {
      await request(begrenzteApi)
        .post('/api/benutzer/registrieren')
        .send({})
        .expect(400);
    }
    await request(begrenzteApi)
      .post('/api/benutzer/registrieren')
      .send({})
      .expect(429);
  });
});
