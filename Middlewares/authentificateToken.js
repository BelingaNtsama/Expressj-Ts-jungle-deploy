const jwt = require('jsonwebtoken');
const supabase = require('../Config/supabase');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis les cookies
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: 'Token d\'accès manquant' });
    }

    // Vérifier la validité du token avec JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Erreur de vérification du token :', err.message);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
      }

      // Ajouter les informations décodées du token à l'objet `req`
      req.user = decoded; // Contient les données encodées dans le token (ex: { id, email })
      next(); // Passer au middleware ou à la route suivante
    });
  } catch (error) {
    console.error('Erreur inattendue dans le middleware :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = authenticateToken;