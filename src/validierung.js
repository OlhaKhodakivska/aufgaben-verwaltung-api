const GRENZEN = Object.freeze({
  benutzername: 50,
  email: 254,
  passwort: 128,
  titel: 200,
  beschreibung: 2000,
});

function istObjekt(wert) {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert);
}

function istText(wert, { min = 0, max, trimmen = true } = {}) {
  if (typeof wert !== 'string') return false;
  const text = trimmen ? wert.trim() : wert;
  return text.length >= min && text.length <= max;
}

function istGueltigeEmail(wert) {
  if (!istText(wert, { min: 3, max: GRENZEN.email })) return false;

  const email = wert.trim();
  const teile = email.split('@');
  if (teile.length !== 2) return false;

  const [lokalerTeil, domain] = teile;
  if (
    lokalerTeil.length > 64
    || lokalerTeil.startsWith('.')
    || lokalerTeil.endsWith('.')
    || lokalerTeil.includes('..')
    || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(lokalerTeil)
  ) {
    return false;
  }

  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => (
    label.length >= 1
    && label.length <= 63
    && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
  ));
}

module.exports = { GRENZEN, istGueltigeEmail, istObjekt, istText };
