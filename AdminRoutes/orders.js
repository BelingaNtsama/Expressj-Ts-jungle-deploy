const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

router.get('/admin/Orders', authenticateToken, async (req, res) => {
  try {
    // Étape 1 : Récupérer toutes les commandes (Orders) avec les informations utilisateur (Users)
    const { data: orders, error: ordersError } = await supabase
      .from('Orders')
      .select(`
        id,
        amount,
        created_at,
        user_id (
          name
        )
      `);

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    // Étape 2 : Pour chaque commande, récupérer les détails des articles (OrderItems) et les informations sur les plantes (Plantes)
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        // Récupérer les items associés à cette commande
        const { data: orderItems, error: itemsError } = await supabase
          .from('OrderItems')
          .select(`
            id,
            quantite,
            price_at_time_of_order,
            plante_id (
              nom,
              image
            )
          `)
          .eq('order_id', order.id);

        if (itemsError) {
          throw new Error(itemsError.message);
        }

        // Retourner la commande enrichie avec les items et les informations utilisateur
        return {
          id: order.id,
          name_users: order.user_id.name, // Nom de l'utilisateur depuis la table Users
          amount: order.amount,
          date: order.created_at,
          items: orderItems.map((item) => ({
            id: item.id,
            name_plante: item.plante_id.nom, // Nom de la plante depuis la table Plantes
            image_plante: item.plante_id.image, // Image de la plante depuis la table Plantes
            quantity: item.quantite,
            price_at_time_of_order: item.price_at_time_of_order,
          })),
        };
      })
    );

    // Répondre avec les commandes enrichies
    res.status(200).json(enrichedOrders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes :', error.message);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
  }
});

module.exports = router;