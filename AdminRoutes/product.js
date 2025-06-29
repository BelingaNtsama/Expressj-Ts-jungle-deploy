const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

router.get('/api/products', authenticateToken, async (req, res) => {
  try {
    // Récupérer les produits
    const { data: products, error: productsError } = await supabase
      .from('plantes')
      .select(`
        id,
        name,
        price,
        stock,
        category,
        image,
        description
      `);

    if (productsError) {
      throw new Error(productsError.message);
    }

    // Récupérer les ventes totales
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id');

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    const orderIds = orders.map(order => order.id);

    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('quantity, plant_id')
      .in('order_id', orderIds);

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    // Calculer les ventes pour chaque produit
    const salesData = orderItems.reduce((acc, item) => {
      acc[item.plant_id] = (acc[item.plant_id] || 0) + item.quantity;
      return acc;
    }, {});

    // Enrichir les produits avec les données de ventes
    const enrichedProducts = products.map((product) => {
      let status;
      if (product.stock === 0) {
        status = 'Out of Stock';
      } else if (product.stock <= 5) {
        status = 'Low Stock';
      } else {
        status = 'In Stock';
      }

      return {
        ...product,
        status,
        sales: salesData[product.id] || 0, // Utiliser les données de ventes réelles
      };
    });

    res.status(200).json(enrichedProducts);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

module.exports = router;

