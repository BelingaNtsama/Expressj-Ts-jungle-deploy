const express = require('express');
const supabase = require('../../Config/supabase'); // Assurez-vous que cette configuration est correcte
const router = express.Router();
require('dotenv').config();

// ✉️ Route pour envoyer un Magic Link
router.post('/auth/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "L'adresse email est requise" });

    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'http://localhost:5173/redirect' },
    });

    res.status(200).json({ message: "Un lien de connexion a été envoyé à votre adresse email" });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;