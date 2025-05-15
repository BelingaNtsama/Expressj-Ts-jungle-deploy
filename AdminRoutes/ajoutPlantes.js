const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');
const mime = require('mime-types');

// Configurer Multer pour gérer les fichiers en mémoire
const upload = multer({ storage: multer.memoryStorage() });

// Service pour centraliser les appels Supabase
const supabaseService = {
  uploadImage: async (fileName, fileBuffer, mimeType) => {
    const { data, error } = await supabase.storage
      .from('plantes')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });
    if (error) throw new Error(error.message);
    return `https://lsgzmliqvfdkcqgiijeo.supabase.co/storage/v1/object/public/plantes/${fileName}`;
  },

  addOrUpdatePlant: async (plantData, plantId) => {
    if (plantId === "0") {
      const { data, error } = await supabase.from('plantes').insert(plantData);
      if (error) throw new Error(error.message);
      return { message: 'Plante ajoutée avec succès.' };
    } else {
      const { data, error } = await supabase.from('plantes').update(plantData).eq('id', plantId);
      if (error) throw new Error(error.message);
      return { message: 'Plante modifiée avec succès.' };
    }
  },
};

// Gestionnaire d'erreurs centralisé
const handleError = (res, message, statusCode = 500) => {
  console.error(message);
  res.status(statusCode).send({ error: message });
};

// Route pour ajouter ou modifier une plante
router.post('/admin/ajoutPlantes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Parser les données de la plante
    const plante = req.body;
    const file = req.file;

    // Validation des champs obligatoires
    if (!plante.nom || !plante.description || !plante.prix || !plante.stock || !plante.categorie) {
      return handleError(res, "Tous les champs sont requis.", 400);
    }

    // Déterminer l'URL de l'image
    let imageUrl = plante.image || null;
    if (file) {
      try {
        const fileExtension = mime.extension(file.mimetype) || 'bin';
        const sanitizedNom = plante.nom.trim().replace(/\s+/g, '_'); // Remplace les espaces par des _
        const fileName = `${sanitizedNom}.${fileExtension}`;
        imageUrl = await supabaseService.uploadImage(fileName, file.buffer, file.mimetype);
      } catch (error) {
        return handleError(res, "Erreur lors de l'upload de l'image.");
      }
    }

    // Préparer les données de la plante
    const planteData = {
      nom: plante.nom,
      description: plante.description,
      prix: parseInt(plante.prix, 10),
      stock: parseInt(plante.stock, 10),
      image: imageUrl,
      categorie: plante.categorie,
    };

    // Ajouter ou mettre à jour la plante dans la base de données
    try {
      const response = await supabaseService.addOrUpdatePlant(planteData, plante.id);
      res.status(200).send(response);
    } catch (error) {
      return handleError(res, "Erreur lors de l'ajout ou de la modification de la plante.");
    }
  } catch (error) {
    handleError(res, "Erreur serveur.");
  }
});

module.exports = router;