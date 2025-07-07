const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');


router.get('/favorites/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;

        // Vérification que l'utilisateur accède à ses propres données
        if (!userId) {
            return res.status(403).json({
                success: false,
                message: "Non autorisé à accéder à ces favoris"
            });
        }

        // Étape 1 : Récupérer tous les favoris de l'utilisateur
        const { data: favorites, error: favoritesError } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId);

        if (favoritesError) {
            console.error('Erreur lors de la récupération des favoris :', favoritesError);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur lors de la récupération des favoris.'
            });
        }

        if (!favorites || favorites.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun favori trouvé pour cet utilisateur.'
            });
        }

        // Étape 2 : Pour chaque favori, récupérer les détails de la plante associée
        const favoritesWithDetails = await Promise.all(
            favorites.map(async (favorite) => {
                // Récupérer les détails de la plante liée à ce favori
                const { data: plantDetails, error: plantError } = await supabase
                    .from('plantes')
                    .select('*') // Vous pouvez ajuster les champs sélectionnés selon vos besoins
                    .eq('id', favorite.plant_id)
                    .single(); // Utiliser `single()` car une seule plante est attendue

                if (plantError) {
                    console.error('Erreur lors de la récupération des détails de la plante :', plantError);
                    throw new Error('Erreur serveur lors de la récupération des détails de la plante.');
                }

                // Retourner le favori avec les détails de la plante
                return {
                    id: favorite.id,
                    user_id: favorite.user_id,
                    plant_id: favorite.plant_id,
                    name : plantDetails.name,
                    image: plantDetails.image,
                    price: plantDetails.price,
                    description: plantDetails.description,
                    category: plantDetails.category,
                };
            })
        );

        // Réponse finale
        res.status(200).json({data:favoritesWithDetails});

    } catch (error) {
        console.error('Erreur globale :', error.message);
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue est survenue.'
        });
    }
});

module.exports = router;  