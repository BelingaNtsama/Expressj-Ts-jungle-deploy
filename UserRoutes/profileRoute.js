const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

// Configuration de Multer pour gérer les fichiers uploadés
const upload = multer({ storage: multer.memoryStorage() });

router.put('/users/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { id: userId } = req.params; // Récupérer l'ID de l'utilisateur depuis les paramètres
  const { name, email, phone, adresse } = JSON.parse(req.body.user); // Extraire les données utilisateur

  try {
    // Étape 1 : Gérer l'upload ou la mise à jour de l'image
    let pictureUrl = null;

    if (req.file) {
      const filePath = `${userId}.${req.file.originalname.split('.').pop()}`; // Construire le chemin du fichier

      // Vérifier si une image existe déjà dans le bucket
      const { data: existingFile, error: checkError } = await supabase.storage
        .from('profiles')
        .list('', { search: filePath }); // Rechercher le fichier par son nom

      if (checkError) {
        return res.status(400).json({ error: 'Erreur lors de la vérification de l\'image existante', details: checkError.message });
      }

      // Si une image existe, remplacer son contenu
      if (existingFile && existingFile.length > 0) {
        const { error: updateError } = await supabase.storage
          .from('profiles')
          .update(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (updateError) {
          return res.status(400).json({ error: 'Erreur lors de la mise à jour de l\'image existante', details: updateError.message });
        }
      } else {
        // Sinon, télécharger une nouvelle image
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          return res.status(400).json({ error: 'Erreur lors de l\'upload de l\'image', details: uploadError.message });
        }
      }

      // Obtenir l'URL publique de l'image
      const { data: publicUrlData, error: urlError } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      if (urlError) {
        return res.status(400).json({ error: 'Erreur lors de la récupération de l\'URL de l\'image', details: urlError.message });
      }

      pictureUrl = publicUrlData.publicUrl;
    }

    // Étape 2 : Mettre à jour les informations utilisateur dans la table `users`
    const updateData = {
      name,
      email,
      phone,
      adresse,
      picture: pictureUrl || undefined, // Mettre à jour l'URL de l'image si disponible
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*'); // Récupérer les données mises à jour

    if (updateError) {
      return res.status(400).json({ error: 'Erreur lors de la mise à jour des informations utilisateur', details: updateError.message });
    }

    // Étape 3 : Construire l'objet utilisateur mis à jour
    const user = {
      id: updatedUser[0].id,
      name: updatedUser[0].name,
      email: updatedUser[0].email,
      phone: updatedUser[0].phone,
      adresse: updatedUser[0].adresse,
      picture: updatedUser[0].picture, // Utiliser l'URL de l'image mise à jour ou existante
      auth: true, // Ajouter le champ `auth` comme demandé
    };

    // Répondre avec succès
    res.status(200).json({ message: 'Profil mis à jour avec succès', user });
  } catch (error) {
    console.error('Erreur inattendue :', error.message);
    res.status(500).json({ error: 'Erreur interne du serveur', details: error.message });
  }
});

module.exports = router;