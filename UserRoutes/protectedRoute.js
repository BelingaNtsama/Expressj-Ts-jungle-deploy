// src/routes/protectedRoute.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../Middlewares/authentificateToken'); // Importer le middleware

// Route protégée
router.get('/protected', authenticateToken, (req, res) => {
  // Si le middleware passe, l'utilisateur est authentifié
  res.json({ message: 'Accès autorisé', user: req.user });
});

module.exports = router;