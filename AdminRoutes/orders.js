const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

router.get('/admin/orders', authenticateToken, async (req, res) => {
  try {
    // Fetch orders with related data
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        status,
        created_at,
        priority,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        items:order_items (
          quantity,
          price_at_time_of_order,
          plantes:plant_id (
            id,
            name,
            price,
            image
          )
        ),
        payment:payment_methods (
          type,
          cardNumber
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format data for frontend
    const formattedOrders = orders.map(order => {
      const products = order.items.map(item => item.plant.name);
      const mainProduct = products[0] || 'Unknown Product';
      
      return {
        id: `#ORD-${order.id.toString().padStart(6, '0')}`,
        customer: `${order.user.first_name} ${order.user.last_name}`,
        customerEmail: order.user.email,
        product: mainProduct,
        products,
        total: order.amount,
        status: order.status,
        priority: order.priority || 'Normal',
        date: order.created_at,
        shippingAddress: `${order.user.phone || 'No address'}`,
        paymentMethod: order.payment?.type || 'Unknown',
        trackingNumber: order.tracking_number || null,
        rawData: order // Keep raw data for details view
      };
    });

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;