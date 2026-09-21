const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ nachricht: 'Zugriff verweigert. Kein Token bereitgestellt.' });
  }

  try {
    const dekodiert = jwt.verify(token, process.env.JWT_GEHEIMNIS || 'standard_geheimnis');
    req.benutzer = dekodiert;
    next();
  } catch (ex) {
    res.status(400).json({ nachricht: 'Ungültiges Token.' });
  }
};