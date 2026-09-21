const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const benutzerRouten = require('./routes/benutzerRouten');
const aufgabenRouten = require('./routes/aufgabenRouten');

const app = express();

// Sicherheits-Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routen
app.use('/api/benutzer', benutzerRouten);
app.use('/api/aufgaben', aufgabenRouten);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});