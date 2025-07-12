const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../Config/supabase'); // Assurez-vous que cette configuration est correcte
const router = express.Router();
require('dotenv').config();

// 🔑 Route pour la connexion avec email/mot de passe
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des champs requis
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "L'email et le mot de passe sont requis",
      });
    }

    // Vérifier si l'utilisateur existe dans la base de données
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Comparer le mot de passe haché
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email }, // Payload
      process.env.JWT_SECRET, // Clé secrète
      { expiresIn: '24h' } // Durée de vie du token
    );

    // Définir le cookie HTTP-only avec le token
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true, // Activer Secure uniquement en production
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 60 // 24 heures
    });

    // Renvoyer les informations de l'utilisateur
    res.status(200).json({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        address: user.address, 
        picture: user.picture,
        auth: true,
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion",
    });
  }
});

module.exports = router;