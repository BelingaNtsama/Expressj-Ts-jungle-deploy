const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');
const { notifyOrderCreated } = require('../Services/websocketService'); // Importer le service WebSocket

// 🌿 Route pour récupérer les paiements
router.post('/payment', authenticateToken, async (req, res) => {
    const { amount, plantes, user_id } = req.body;

    if (!amount || !plantes || !user_id) {
        return res.status(400).json({ error: 'Données manquantes dans la requête' });
    }

    try {
        // Insérer la commande dans la table Orders
        const { data: orderData, error: orderError } = await supabase
            .from('Orders')
            .insert([{ user_id, amount }])
            .select();

        if (orderError) {
            console.error('Erreur lors de l\'insertion dans Orders:', orderError);
            return res.status(500).json({ error: 'Erreur lors de la création de la commande' });
        }

        const order_id = orderData[0]?.id;
        if (!order_id) {
            return res.status(500).json({ error: 'Impossible de récupérer l\'ID de la commande' });
        }

        console.log('Commande insérée dans la base de données:', orderData);

        // Insérer les items de la commande dans la table OrderItems
        for (const plante of plantes) {
            try {
                const { data: itemData, error: itemError } = await supabase
                    .from('OrderItems')
                    .insert([{
                        order_id,
                        plante_id: plante.plante_id,
                        price_at_time_of_order: plante.price_at_time_of_order,
                        quantite: plante.quantity
                    }])
                    .select();

                if (itemError) {
                    console.error('Erreur lors de l\'insertion dans OrderItems:', itemError);
                    return res.status(500).json({ error: 'Erreur lors de l\'ajout des items de la commande' });
                }

            } catch (error) {
                console.error('Erreur inattendue lors de l\'insertion d\'un item:', error);
                return res.status(500).json({ error: 'Erreur serveur lors de l\'ajout des items' });
            }
        }

        res.status(200).json({ message: 'Paiement traité avec succès' });
        notifyOrderCreated(user_id, orderData); // Notifier l'utilisateur via WebSocket  notifyOrderCreated(user_id, orderData); // Notifier l'utilisateur via WebSocket
    } catch (error) {
        console.error('Erreur lors du traitement du paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
  
});

module.exports = router;