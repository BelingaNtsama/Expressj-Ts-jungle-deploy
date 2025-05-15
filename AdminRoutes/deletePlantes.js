const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

// Service pour centraliser les appels Supabase
const plantService = {
  // Vérifier si une plante existe
  checkPlantExists: async (id) => {
    const { data, error } = await supabase
      .from('plantes')
      .select()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return data && data.length > 0 ? data[0] : null;
  },

  // Supprimer une plante de la base de données
  deletePlantFromDB: async (id) => {
    const { error } = await supabase
      .from('plantes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Supprimer une image du stockage
  deletePlantImage: async (imageUrl) => {
    const fileName = imageUrl.split('/plantes/')[1]; // Extraire le nom du fichier
    const { error } = await supabase.storage.from('plantes').remove([fileName]);
    if (error) throw new Error(error.message);
  },
};

// Gestionnaire d'erreurs centralisé
const handleError = (res, message, statusCode = 500) => {
  console.error(message);
  res.status(statusCode).json({ error: message });
};

// Route pour supprimer une plante
router.delete('/admin/deletePlantes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;

    // Validation des données
    if (!id) {
      return handleError(res, "Identifiant de plante manquant", 400);
    }

    // Vérifier que la plante existe
    const plant = await plantService.checkPlantExists(id);
    if (!plant) {
      return handleError(res, "Plante non trouvée", 404);
    }

    // Supprimer l'image de la plante du stockage
    if (plant.image) {
      try {
        await plantService.deletePlantImage(plant.image);
      } catch (error) {
        return handleError(res, "Erreur lors de la suppression de l'image");
      }
    }

    // Supprimer la plante de la base de données
    try {
      await plantService.deletePlantFromDB(id);
    } catch (error) {
      return handleError(res, "Erreur lors de la suppression de la plante");
    }

    // Réponse finale
    res.status(200).json({ message: "Plante supprimée avec succès" });
  } catch (error) {
    handleError(res, "Erreur serveur");
  }
});

module.exports = router;