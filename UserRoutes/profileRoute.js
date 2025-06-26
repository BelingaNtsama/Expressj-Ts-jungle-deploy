const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const authenticate = require('../Middlewares/authentificateToken');
const upload = multer({ storage: multer.memoryStorage() });

// GET user data with related info
router.get('/profile/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        orders:orders(
          id,
          created_at,
          status,
          amount,
          items:order_items(
            quantity,
            plantes:plantes(
              name,
              image
            )
          )
        ),
        addresses:addresses(
          id,
          street,
          city,
          postal_code,
          country,
          is_default
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Formatage des données
    const responseData = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      newsletter: user.newsletter,
      offers: user.offers,
      twoFA: user.twoFA,
      picture: user.picture,
      member_since: user.member_since,
      total_orders: user.orders?.length || 0,
    };

    res.json(responseData);

  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    res.status(500).json({ 
      error: "Erreur serveur",
      details: error.message 
    });
  }
});

// PUT update user data with transaction
router.put('/profile/:id', authenticate, async (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone, newsletter, offers } = req.body;

  if (!userId) {
    return res.status(403).json({ error: "Non autorisé" });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        first_name,
        last_name,
        email,
        phone,
        newsletter,
        offers,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select(`
        *,
        addresses:addresses(
          id,
          is_default
        )
      `)
      .single();

    if (error) throw error;

    res.json({
      user: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email
      },
      addresses: data.addresses
    });

  } catch (error) {
    console.error("Erreur de mise à jour:", error);
    res.status(500).json({ 
      error: "Erreur de mise à jour",
      details: error.message 
    });
  }
});

// POST upload profile picture with error handling
router.post('/profile/:id/picture', authenticate, upload.single('picture'), async (req, res) => {
  const userId = req.params.id;
  
  if (userId !== req.user.id || !req.file) {
    return res.status(!req.file ? 400 : 403).json({ 
      error: !req.file ? "Aucun fichier fourni" : "Non autorisé" 
    });
  }

  try {
    // Upload vers Supabase Storage
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `profile_${Date.now()}.${fileExt}`;
    const filePath = `users/${userId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-profile')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Récupération de l'URL signée
    const { data: signedUrl } = await supabase.storage
      .from('user-profile')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 an

    // Mise à jour du profil utilisateur
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({ 
        picture: signedUrl.signedUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, first_name, last_name, picture')
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      user: userData,
      image_url: signedUrl.signedUrl
    });

  } catch (error) {
    console.error("Erreur d'upload:", error);
    res.status(500).json({ 
      error: "Erreur lors de l'upload",
      details: error.message 
    });
  }
});

module.exports = router;