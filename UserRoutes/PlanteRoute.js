const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

// 🌿 Route pour récupérer les plantes
router.get('/plantes', async (req, res) => {
  try {
    const { data: plantes, error } = await supabase
      .from('plantes')
      .select('*');

    if (error) throw error;
    res.status(200).json(plantes);
  } catch (err) {
    console.error("Erreur lors de la récupération des données :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;