// routes/customers.js
const express = require('express');
const router = express.Router();
const supabase = require('../Config/supabase');
const authenticateToken = require('../Middlewares/authentificateToken');

// Get all customers with stats
router.get('/admin/customers', authenticateToken, async (req, res) => {
  try {
    // Fetch customers with their order stats
    const { data: customers, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email, 
        phone,
        picture,
        member_since,
        total_orders,
        orders:orders(
          id,
          amount,
          created_at,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the data for frontend
    const formattedCustomers = customers.map(customer => {
      const lastOrder = customer.orders.length > 0 
        ? customer.orders.reduce((latest, order) => 
            new Date(order.created_at) > new Date(latest.created_at) ? order : latest
          ) 
        : null;

      return {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone,
        address: '', // You might want to add address to users table
        orders: customer.orders.length,
        totalSpent: customer.total_orders || 0,
        lastOrder: lastOrder?.created_at || null,
        joinDate: customer.member_since,
        status: "VIP",
        rating: 4.5, // Default rating, could be calculated from reviews
        avatar: customer.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
        order_count: customer.orders.length,
      };
    });

    res.status(200).json(formattedCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Update customer status
router.put('/admin/customers/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating customer status:', error.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Export customers to CSV
router.get('/admin/customers/export', authenticateToken, async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        created_at,
        total_orders
      `);

    if (error) throw error;

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');

    // Create CSV data
    const csvData = [
      ['ID', 'Name', 'Email', 'Phone', 'Status', 'Join Date', 'Total Spent'],
      ...customers.map(customer => [
        customer.id,
        `${customer.first_name} ${customer.last_name}`,
        customer.email,
        customer.phone,
        customer.status,
        new Date(customer.created_at).toISOString().split('T')[0],
        customer.total_orders
      ])
    ].join('\n');

    res.status(200).send(csvData);
  } catch (error) {
    console.error('Error exporting customers:', error.message);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

module.exports = router;