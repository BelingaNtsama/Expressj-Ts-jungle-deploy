const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../Config/supabase');
const router = express.Router();
require('dotenv').config();
const multer = require('multer');

// Configuration de Multer pour gérer les fichiers uploadés
const upload = multer({ storage: multer.memoryStorage() });

// Route pour l'inscription complète
router.post('/auth/register', upload.single('picture'), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password, 
      phone,
      newsletter,
      offers,
      street,
      country,
      city,
      postal_code,
      address_name
    } = req.body;

    // Validation des champs obligatoires
    if (!first_name || !last_name || !email || !password || !phone) {
      return res.status(400).json({ error: "Les champs obligatoires sont manquants" });
    }

    // 1. Hashage du mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);


    // 3. Upload de l'image de profil si elle existe
    let pictureUrl = null;
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const filePath = `profiles/${email}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);
        pictureUrl = publicUrlData.publicUrl;
      }
    }

    // 4. Insertion dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone,
        newsletter: newsletter === 'true',
        offers: offers === 'true',
        picture: pictureUrl,
        password: hashedPassword // Stockage du hash en supplément (optionnel)
      })
      .select()
      .single();
 
    if (userError) throw new Error(userError.message);

    // 5. Insertion de l'adresse si les champs sont fournis
    if (street && country && postal_code) {
      const { error: addressError } = await supabase
        .from('addresses')
        .insert({
          user_id: userData.id,
          street,
          city,
          country,
          postal_code,
          address_name,
          is_default: true 
        });

      if (addressError) {
        console.error("Erreur lors de l'ajout de l'adresse:", addressError);
        // On ne renvoie pas d'erreur car l'utilisateur est déjà créé
      }
    }

    // 6. Génération du token JWT
    const token = jwt.sign(
      { userId: userData.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Définition du cookie HTTP-only
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 3600000 // 1 heure
    });

    // Réponse avec les données de l'utilisateur
    res.status(200).json({
      message: "Inscription réussie",
    });
    
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ 
      error: "Erreur lors de l'inscription",
      details: error.message 
    });
  }
});

module.exports = router;