const supabase = require('../Config/supabase');
const authService = require('../services/authService');

const signInWithGoogle = async (req, res) => {
  try {
    const data = await authService.signInWithGoogle();
    res.redirect(data.url);
  } catch (error) {
    console.error('Erreur lors de la connexion avec Google :', error);
    res.status(500).send('Erreur lors de la connexion avec Google');
  }
};

const getUserInfo = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).send("Token d'accès manquant");
    }

    const userInfo = await authService.getUserInfo(access_token);
    res.json(userInfo);
  } catch (error) {
    console.error("Erreur lors de la récupération des informations utilisateur :", error);
    res.status(500).send("Erreur lors de l'authentification");
  }
};

module.exports = {
  signInWithGoogle,
  getUserInfo,
};
