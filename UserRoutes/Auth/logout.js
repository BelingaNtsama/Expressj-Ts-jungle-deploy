const express = require('express');
const router = express.Router();
const authenticateToken = require('../../Middlewares/authentificateToken')
require('dotenv').config();


// 🔒 Route pour se déconnecter
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.clearCookie('access_token'); // Effacer le cookie d'authentification 
    res.status(200).json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.log(error)
  }
});

module.exports = router;