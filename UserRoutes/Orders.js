const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

// Route pour récupérer les commandes avec les détails des plantes inclus
router.get('/Orders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
 
        // Étape 1 : Récupérer toutes les commandes de l'utilisateur
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId);

        if (ordersError) {
            console.error('Erreur lors de la récupération des commandes :', ordersError);
            return res.status(500).send({ message: 'Erreur serveur lors de la récupération des commandes.' });
        }

        if (!orders || orders.length === 0) {
            return res.status(404).send({ message: 'Aucune commande trouvée pour cet utilisateur.' });
        }

        // Étape 2 : Pour chaque commande, récupérer les items associés ainsi que les détails des plantes
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                // Récupérer les items liés à cette commande avec les détails des plantes
                const { data: orderItems, error: itemsError } = await supabase
                    .from('order_items')
                    .select(` 
                        *,
                        plantes(name, image)
                    `)
                    .eq('order_id', order.id);

                if (itemsError) {
                    console.error('Erreur lors de la récupération des items de commande :', itemsError);
                    throw new Error('Erreur serveur lors de la récupération des items de commande.');
                }

                // Retourner la commande avec ses items enrichis des détails des plantes
                return {
                    ...order, 
                    items: orderItems.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                         price_at_time_of_order: item.price_at_time_of_order,
                            name: item.plantes.name,
                            image: item.plantes.image
                    
                    }))
                };
            })
        );

        // Réponse finale
        res.status(200).send(ordersWithItems);
    } catch (error) {
        console.error('Erreur globale :', error.message);
        res.status(500).send({ message: 'Une erreur inattendue est survenue.' });
    }
});

module.exports = router;