const jwt = require('jsonwebtoken');

function authentifizierung(req, res, next) {
  const [typ, token] = (req.headers.authorization || '').split(' ');

  if (typ !== 'Bearer' || !token) {
    return res.status(401).json({ nachricht: 'Authentifizierung erforderlich.' });
  }

  try {
    const nutzlast = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof nutzlast !== 'object' || typeof nutzlast.benutzerId !== 'string') {
      throw new Error('Token enthält keine gültige Benutzer-ID.');
    }
    req.benutzerId = nutzlast.benutzerId;
    return next();
  } catch {
    return res.status(401).json({ nachricht: 'Ungültiges oder abgelaufenes Token.' });
  }
}

module.exports = authentifizierung;
