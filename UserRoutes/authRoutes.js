const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const cookieParser = require('cookie-parser');
const authenticateToken = require('../Middlewares/authentificateToken'); // Middleware d'authentification
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const jwt = require('jsonwebtoken');

// Middleware pour parser les cookies
router.use(cookieParser());

// Service pour centraliser les appels Supabase
const supabaseService = {
  signInWithOAuth: async (provider, redirectTo) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    }); 
    if (error) throw new Error(error.message); 
    return data.url;
  },

  getUserByAccessToken: async (accessToken) => {
    const { data: userData, error } = await supabase.auth.getUser(accessToken);
    if (error) throw new Error(error.message);
    return userData.user;
  },

  signUpUser: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email : email
      , password : password });
    if (error) throw new Error(error.message);
    return data|| null; // Renvoie le token si disponible
  },

  signOutUser: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
};

// Gestionnaire d'erreurs centralisé
const handleError = (res, error) => {
  console.error(error.message);
  res.status(500).json({ error: "Une erreur est survenue." });
};

// 🔑 Route pour démarrer l'authentification Google
router.get('/auth/google', async (req, res) => {
  try {
    const url = await supabaseService.signInWithOAuth('google', 'http://localhost:5173/redirect');
    res.redirect(url);
  } catch (error) {
    handleError(res, error);
  }
});

// 🔐 Route pour récupérer les infos utilisateur après authentification
router.post('/auth/token', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: "Token d'accès manquant" });

    // Récupérer les informations de l'utilisateur via Supabase
    const user = await supabaseService.getUserByAccessToken(access_token);

    // Interroger la table `users` pour obtenir les informations complémentaires
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (dbError) throw new Error(dbError.message);
    if (!dbUser) return res.status(404).json({ error: "Utilisateur non trouvé dans la base de données" });

    // Définir un cookie HTTP-only contenant le jeton d'accès
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Activer en production
      sameSite: 'Lax',
      maxAge: 3600000, // Durée de vie du cookie en ms (1 heure ici)
    });

    // Renvoyer les données de l'utilisateur
    res.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      adresse: dbUser.adresse,
      phone: dbUser.phone,
      picture: dbUser.picture,
      auth: true,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 🔑 Route pour la connexion avec email/mot de passe
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "L'email et le mot de passe sont requis" 
      });
    }

    // Vérifier si l'utilisateur existe avec cet email et mot de passe
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

      console.log(user, error)
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: "Email ou mot de passe incorrect" 
      });
    }

    // Générer un token pour la session
    const token = jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '24h' } // Durée de vie du token
    );

    // Définir le cookie HTTP-only avec le token
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });

    // Renvoyer les informations de l'utilisateur et le token
    res.status(200).json({
      success: true,
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        adresse: user.adresse,
        picture: user.picture,
        auth: true
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: "Une erreur est survenue lors de la connexion" 
    });
  }
});

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

// 📝 Route pour ajouter un utilisateur
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, lastName, email, password, phone, neighborhood } = req.body;
    const fullName = `${name} ${lastName}`;
    console.log(password)

    // 1. Créer l'utilisateur via Supabase Auth
    const token = await supabase.auth.signUp({email, password : password}); 
    console.log(token)
    if (!token) {
      return res.status(400).json({ error: "Échec de la création de l'utilisateur" });
    }

    // 2. Insérer l'utilisateur dans la table "users"
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        name: fullName,
        email,
        phone,
        adresse: neighborhood,
      })
      .select('id')
      .single();

    if (dbError) throw new Error(dbError.message);
    const userId = userData.id;

    // 3. Si une image est uploadée, l'insérer dans le bucket "profiles"
    let imageUrl = null;
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const filePath = `${userId}.${fileExt}`;
      await supabase.storage.from('profiles').upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype, 
      });

      // Récupérer l'URL publique de l'image
      const { data: publicUrlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;

      // Mettre à jour l'utilisateur avec l'URL de l'image
      await supabase
        .from('users')
        .update({ picture: imageUrl })
        .eq('id', userId);
    }

    // Définir un cookie HTTP-only contenant le jeton d'accès
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Activer en production
      sameSite: 'Lax',
      maxAge: 3600000, // Durée de vie du cookie en ms (1 heure ici)
    });

    res.status(201).json({ message: 'Utilisateur enregistré avec succès', token });
  } catch (error) {
    handleError(res, error);
  }
});

// 🔒 Route pour se déconnecter
router.get('/logout', authenticateToken, async (req, res) => {
  try {
    await supabaseService.signOutUser();
    res.clearCookie('access_token'); // Effacer le cookie d'authentification
    res.status(200).json({ message: "Déconnexion réussie" });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;