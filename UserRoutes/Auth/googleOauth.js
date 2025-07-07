const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../../Config/supabase'); // Assurez-vous que cette configuration est correcte
const router = express.Router();
require('dotenv').config();

// 🔑 Route pour démarrer l'authentification Google
router.get('/auth/google', async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `https://ts-jungle.vercel.app/redirect`, // URL de redirection après l'authentification
    },
      }); 
      if (error) throw new Error(error.message);
      console.log(data.url) 
      res.clearCookie()
     res.json({ url: data.url });
});

// 🔐 Route pour récupérer les infos utilisateur après authentification
router.post('/auth/token', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "Token d'accès manquant" });

    // Récupérer les informations de l'utilisateur via Supabase
    const user = await supabase.auth.getUser(access_token);
    if (user.error) throw new Error(user.error.message);
    if (!user.data.user) return res.status(401).json({ error: "Utilisateur non authentifié" });

    // Interroger la table `users` pour obtenir les informations complémentaires
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, picture, member_since, newsletter, twoFA, offers, total_orders')
      .eq('email', user.data.user.email)
      
    if (dbError) throw new Error(dbError.message);
    if (!dbUser) return res.status(404).json({ error: "Utilisateur non trouvé dans la base de données" });

    const token = jwt.sign(
      { id: user.id, email: user.email }, // Payload
      process.env.JWT_SECRET, // Clé secrète
      { expiresIn: '1h' } // Durée de vie du token
    );

    // Définir un cookie HTTP-only contenant le jeton d'accès
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Activer en production
      sameSite: 'Lax',
      maxAge: 3600000, // Durée de vie du cookie en ms (1 heure ici)
    });
   res.status(200).json({
        id: dbUser[0].id,
        name: `${dbUser[0].first_name} ${dbUser[0].last_name}`,
        email: dbUser[0].email,
        phone: dbUser[0].phone, 
        picture: dbUser[0].picture,
        member_since: dbUser[0].member_since,
        newsletter: dbUser[0].newsletter,
        twoFA: dbUser[0].twoFA,
        offers: dbUser[0].offers,
        total_orders: dbUser[0].total_orders,
        auth: true,
    });

  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur", details: error.message });
  }
});


module.exports = router;