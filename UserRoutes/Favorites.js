const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');


router.get('/favorites/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(403).json({ success: false, message: "Non autorisé à accéder à ces favoris" });
        }

        // Récupérer tous les favoris de l'utilisateur
        const { data: favorites, error: favoritesError } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: true });

        if (favoritesError) {
            console.error('Erreur lors de la récupération des favoris :', favoritesError);
            return res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des favoris.' });
        }

        if (!favorites || favorites.length === 0) {
            return res.status(404).json({ success: false, message: 'Aucun favori trouvé pour cet utilisateur.' });
        }

        // Si plus de deux favoris, supprimer les autres
        if (favorites.length > 2) {
            const toDelete = favorites.slice(2);
            const idsToDelete = toDelete.map(fav => fav.id);
            const { error: deleteError } = await supabase
                .from('favorites')
                .delete()
                .in('id', idsToDelete);
            if (deleteError) {
                console.error('Erreur lors de la suppression des favoris excédentaires :', deleteError);
            }
        }

        // Toujours garder les deux premiers favoris
        const twoFavorites = favorites.slice(0, 2);

        // Récupérer les détails des plantes associées
        const favoritesWithDetails = await Promise.all(
            twoFavorites.map(async (favorite) => {
                const { data: plantDetails, error: plantError } = await supabase
                    .from('plantes')
                    .select('*')
                    .eq('id', favorite.plant_id)
                    .single();
                if (plantError) {
                    console.error('Erreur lors de la récupération des détails de la plante :', plantError);
                    throw new Error('Erreur serveur lors de la récupération des détails de la plante.');
                }
                return {
                    id: favorite.id,
                    user_id: favorite.user_id,
                    plant_id: favorite.plant_id,
                    name: plantDetails.name,
                    image: plantDetails.image,
                    price: plantDetails.price,
                    description: plantDetails.description,
                    category: plantDetails.category,
                };
            })
        );

        res.status(200).json({ data: favoritesWithDetails });
    } catch (error) {
        console.error('Erreur globale :', error.message);
        res.status(500).json({ success: false, message: 'Une erreur inattendue est survenue.' });
    }
});

module.exports = router;