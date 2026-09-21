require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const erstelleApp = require('./app');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  throw new Error('DATABASE_URL und JWT_SECRET müssen in .env gesetzt sein.');
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
});
const app = erstelleApp({ prisma, corsOrigin: process.env.CORS_ORIGIN });

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});

function herunterfahren() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', herunterfahren);
process.on('SIGTERM', herunterfahren);

module.exports = app;
