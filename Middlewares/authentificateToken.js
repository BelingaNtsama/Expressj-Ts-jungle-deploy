// src/middlewares/authenticateToken.js
const supabase = require('../Config/supabase');

const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis les cookies
    const token = req.cookies.access_token;
    if (!token) { 
      return res.status(401).json({ error: 'Token d\'accès manquant' });
    }

    // Vérifier la validité du token avec Supabase
    const { data: user, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Erreur de vérification du token :', error);
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    // Ajouter les informations de l'utilisateur à l'objet `req` pour les routes suivantes
    req.user = user;
    next(); // Passer au middleware ou à la route suivante
  } catch (error) {
    console.error('Erreur inattendue dans le middleware :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = authenticateToken;