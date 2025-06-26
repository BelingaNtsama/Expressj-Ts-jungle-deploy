const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticate = require('../Middlewares/authentificateToken');

// Middleware pour valider les données d'adresse
const validateAddress = (req, res, next) => {
  const { street, city, postal_code, country } = req.body;
  const userId = req.params.id;
    if (!userId) {
    return res.status(400).json({ error: "L'ID de l'utilisateur est requis" });
  }
  
  if (!street || !city || !postal_code || !country) {
    return res.status(400).json({ 
      error: "Tous les champs (street, city, postal_code, country) sont requis" 
    });
  }
  
  next();
};

// GET toutes les adresses de l'utilisateur
router.get('/addresses/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Récupération des adresses pour l'utilisateur:", userId);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error;
  console.log("Adresses récupérées:", data);
    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des adresses:", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de la récupération des adresses",
      details: error.message 
    });
  }
});

// POST créer une nouvelle adresse
router.post('/addresses/:id', authenticate, validateAddress, async (req, res) => {
  try {
    const userId = req.params.id;
    const { street, city, postal_code, country, address_name } = req.body;

    // Vérifier si c'est la première adresse (devient par défaut)
    const { count } = await supabase
      .from('addresses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    const is_default = count === 0;

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        street,
        city,
        postal_code,
        country,
        address_name: address_name || 'Principale',
        is_default
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur lors de la création de l'adresse:", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de la création de l'adresse",
      details: error.message 
    });
  }
});

// PUT mettre à jour une adresse
router.put('/:id', authenticate, validateAddress, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const { street, city, postal_code, country, address_name } = req.body;

    // Vérifier que l'adresse appartient bien à l'utilisateur
    const { data: existingAddress, error: checkError } = await supabase
      .from('addresses')
      .select('user_id')
      .eq('id', addressId)
      .single();

    if (checkError) throw checkError;
    if (existingAddress.user_id !== userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const { data, error } = await supabase
      .from('addresses')
      .update({
        street,
        city,
        postal_code,
        country,
        address_name,
        updated_at: new Date()
      })
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'adresse:", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de la mise à jour de l'adresse",
      details: error.message 
    });
  }
});

// DELETE supprimer une adresse
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    // Vérifier que l'adresse appartient bien à l'utilisateur
    const { data: existingAddress, error: checkError } = await supabase
      .from('addresses')
      .select('user_id, is_default')
      .eq('id', addressId)
      .single();

    if (checkError) throw checkError;
    if (existingAddress.user_id !== userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // Empêcher la suppression de l'adresse par défaut s'il en existe d'autres
    if (existingAddress.is_default) {
      const { count } = await supabase
        .from('addresses')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (count > 1) {
        return res.status(400).json({ 
          error: "Vous ne pouvez pas supprimer votre adresse par défaut. Définissez d'abord une autre adresse comme par défaut." 
        });
      }
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Erreur lors de la suppression de l'adresse:", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de la suppression de l'adresse",
      details: error.message 
    });
  }
});

// PATCH définir une adresse comme par défaut
router.patch('/:id/set-default', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    // Vérifier que l'adresse appartient bien à l'utilisateur
    const { data: existingAddress, error: checkError } = await supabase
      .from('addresses')
      .select('user_id')
      .eq('id', addressId)
      .single();

    if (checkError) throw checkError;
    if (existingAddress.user_id !== userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // D'abord, réinitialiser toutes les adresses par défaut
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Ensuite, définir l'adresse sélectionnée comme par défaut
    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la définition de l'adresse par défaut:", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de la définition de l'adresse par défaut",
      details: error.message 
    });
  }
});

module.exports = router;