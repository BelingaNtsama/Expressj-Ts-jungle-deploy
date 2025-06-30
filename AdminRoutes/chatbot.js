const express = require('express');
const axios = require('axios');
const router = express.Router();

 
// Route pour déclencher l'envoi au webhook
router.post('/Agent', async (req, res) => {
  const webhookUrl = 'https://12fe-102-244-200-98.ngrok-free.app/webhook/test';

  try {
    const message = req.body; // Utilisez les données reçues dans la requête
    const response = await axios.post(webhookUrl, message);

    // Répondre au client avec la réponse du webhook 
    res.status(200).json({ success: true, reply: response.data });
  } catch (error) {
    console.error('Erreur lors de l\'envoi au webhook :', error.message); 
    res.status(500).json({ success: false, error: error.message });  
  }
});

module.exports = router;