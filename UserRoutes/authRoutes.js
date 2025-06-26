const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const cookieParser = require('cookie-parser');
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



module.exports = router;