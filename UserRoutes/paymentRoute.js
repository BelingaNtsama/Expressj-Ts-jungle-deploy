const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticate = require('../Middlewares/authentificateToken');

// GET payment methods for user
router.get('/payment/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;

    // Vérification des permissions
    if (!userId) { 
      return res.status(403).json({ error: "Non autorisé" });
    }

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;

    res.json(paymentMethods);
  } catch (error) {
    console.error("Erreur lors de la récupération:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
});

// POST add new payment method
router.post('/add-payment/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, brand, cvv, exp_month, exp_year, email, cardNumber } = req.body;

    // Validation des champs obligatoires
    if (!type || !['card', 'paypal'].includes(type)) {
      return res.status(400).json({ error: "Type de paiement invalide" });
    }

    if (type === 'card') {
      if (!brand || !['visa', 'mastercard'].includes(brand)) {
        return res.status(400).json({ error: "Marque de carte invalide" });
      }
      if (!cvv) {
        return res.status(400).json({ error: "Derniers 4 chiffres invalides" });
      }
      if (!exp_month || !/^(0[1-9]|1[0-2])$/.test(exp_month)) {
        return res.status(400).json({ error: "Mois d'expiration invalide" });
      }
      if (!exp_year || !/^\d{4}$/.test(exp_year) || parseInt(exp_year) < new Date().getFullYear()) {
        return res.status(400).json({ error: "Année d'expiration invalide" });
      }
    }

    if (type === 'paypal' && !email) {
      return res.status(400).json({ error: "Email PayPal requis" });
    }

    // Vérifier si c'est la première méthode (devient par défaut)
    const { count } = await supabase
      .from('payment_methods')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    const is_default = count === 0;

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        type : 
        brand,
        cvv,
        exp_month,
        exp_year,
        email, 
        cardNumber
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur lors de l'ajout:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
});

// DELETE payment method
router.delete('/delete-payment/:userId/:methodId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    const methodId = req.params.methodId;

    // Vérification des permissions
    if (!userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // Vérifier si c'est la méthode par défaut
    const { data: method, error: methodError } = await supabase
      .from('payment_methods')
      .select('is_default')
      .eq('id', methodId)
      .single();

    if (methodError) throw methodError;

    // Vérifier s'il reste d'autres méthodes
    const { count } = await supabase
      .from('payment_methods')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (method.is_default && count > 1) {
      return res.status(400).json({
        error: "Impossible de supprimer la méthode par défaut"
      });
    }

    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', userId);

    if (error) throw error;

    res.status(204).end();
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
});

// PATCH set default payment method
router.patch('/default-payment/:userId/:methodId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    const methodId = req.params.methodId;

    // Vérification des permissions
    if (!userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // D'abord, réinitialiser toutes les méthodes par défaut
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Ensuite, définir la nouvelle méthode par défaut
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message
    });
  }
});

// POST process payment
// POST process payment
router.post('/processPayment/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { payment_method_id, amount, items } = req.body;

    // Vérification des permissions
    if (!userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // Vérifier la méthode de paiement
    const { data: paymentMethod, error: methodError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('user_id', userId)
      .single();

    if (methodError) throw methodError;

    // Simuler un paiement (dans un vrai projet, intégrer Stripe/autre)
    const paymentResult = {
      id: `pay_${Date.now()}`,
      amount,
      status: 'succeeded',
      payment_method: paymentMethod.type,
      created_at: new Date().toISOString()
    };

    // Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        amount: amount,
        status: 'In processing'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Ajouter les articles de la commande
    for (const item of items) {
      await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          plant_id: item.plant_id,
          quantity: item.quantity,
          price_at_time_of_order: item.unit_price
        });
    }

    // Étape 1 : Récupérer toutes les commandes de l'utilisateur
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId);

    if (ordersError) throw ordersError;

    // Étape 2 : Récupérer tous les articles des commandes
    const orderItems = [];
    for (const order of orders) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      orderItems.push(...items);
    }

    // Étape 3 : Calculer les deux plantes les plus achetées
    const plantFrequency = [{
      user_id: "",
      plant_id: "",
      quantity: 0
    }];
    orderItems.forEach(item => {
      const existing = plantFrequency.find(p => p.plant_id === item.plant_id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        plantFrequency.push({
          user_id: userId,
          plant_id: item.plant_id,
          quantity: item.quantity
        });
      }
    });
    plantFrequency.sort((a, b) => b.quantity - a.quantity);

    const topPlants = plantFrequency.slice(0, 2)

    // Étape 4 : Ajouter les deux plantes les plus achetées aux favoris
    for (const plant of topPlants) {
      if (plant.quantity === 0) continue; // Ignorer si la quantité est 0
      const { data: favorite, error: favoriteError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          plant_id: plant.plant_id
        })
      if (favoriteError) throw favoriteError;
    }

    res.status(200).json({
      payment: paymentResult,
      order: order,
      message: "Paiement traité avec succès"
    });
  } catch (error) {
    console.error("Erreur lors du paiement:", error);
    res.status(500).json({
      error: "Erreur lors du traitement du paiement",
      details: error.message
    });
  }
});

module.exports = router;