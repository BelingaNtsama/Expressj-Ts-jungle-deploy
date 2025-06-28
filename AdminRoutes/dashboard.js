// routes/dashboard.js
const express = require('express')
const router = express.Router()
const supabase = require('../Config/supabase')
const authenticateToken  = require('../Middlewares/authentificateToken')

// Helper function to get current and previous period data
const getPeriodData = async (table, dateField, groupField = null) => {
  const now = new Date()
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  let query = supabase
    .from(table)
    .select('*', { count: 'exact' })
    .gte(dateField, currentPeriodStart.toISOString())

  if (groupField) {
    query = query.select(groupField)
  }

  const { data: currentData, count: currentCount } = await query

  const { count: previousCount } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .gte(dateField, previousPeriodStart.toISOString())
    .lt(dateField, currentPeriodStart.toISOString())

  return {
    current: groupField ? currentData : currentCount,
    previous: previousCount,
    growth: currentCount && previousCount 
      ? Math.round(((currentCount - previousCount) / previousCount) * 100)
      : 0
  }
}

// Metrics endpoint
router.get('/admin/dashboard/metrics', authenticateToken, async (req, res) => {
  try {
    const [
      revenueData,
      ordersData,
      customersData,
      productsData
    ] = await Promise.all([
      // Total revenue
      supabase
        .from('orders')
        .select('amount')
        .then(({ data }) => ({
          total: data.reduce((sum, order) => sum + order.amount, 0),
          current: data.filter(o => new Date(o.created_at) >= new Date(new Date().setMonth(new Date().getMonth() - 1)))
            .reduce((sum, order) => sum + order.amount, 0),
          previous: data.filter(o => new Date(o.created_at) >= new Date(new Date().setMonth(new Date().getMonth() - 2)) && 
                   new Date(o.created_at) < new Date(new Date().setMonth(new Date().getMonth() - 1)))
            .reduce((sum, order) => sum + order.amount, 0)
        })),
      // Orders data
      getPeriodData('orders', 'created_at'),
      // Active customers
      getPeriodData('users', 'created_at'),
      // Products sold 
      supabase
        .from('order_items')
        .select('quantity')
        .then(({ data }) => ({
          total: data.reduce((sum, item) => sum + item.quantity, 0),
          ...getPeriodData('order_items', 'created_at')
        }))
    ])

    res.json({
      totalRevenue: revenueData.total,
      revenueGrowth: revenueData.previous 
        ? Math.round(((revenueData.current - revenueData.previous) / revenueData.previous) * 100)
        : 0,
      totalOrders: ordersData.current,
      ordersGrowth: ordersData.growth,
      activeCustomers: customersData.current,
      customersGrowth: customersData.growth,
      productsSold: productsData.total,
      productsGrowth: productsData.growth
    })
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    res.status(500).json({ error: 'Failed to load dashboard metrics' })
  }
})

// Sales data endpoint
router.get('/admin/dashboard/sales', authenticateToken, async (req, res) => {
  try {
    const { data } = await supabase
      .from('orders')
      .select('amount, created_at')
      .order('created_at', { ascending: true })

    // Group by month
    const monthlySales = data.reduce((acc, order) => {
      const date = new Date(order.created_at)
      const month = date.toLocaleString('fr-FR', { month: 'short' })
      acc[month] = (acc[month] || 0) + order.amount
      return acc
    }, {})

    res.json({
      labels: Object.keys(monthlySales),
      data: Object.values(monthlySales)
    })
  } catch (error) {
    console.error('Dashboard sales error:', error)
    res.status(500).json({ error: 'Failed to load sales data' })
  }
})

// Orders data endpoint
router.get('/admin/dashboard/orders', authenticateToken, async (req, res) => {
  try {
    // Last 7 days orders
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })
    // Group by day
    const dailyOrders = data.reduce((acc, order) => {
      const date = new Date(order.created_at)
      const day = date.toLocaleString('fr-FR', { weekday: 'short' })
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})
    // Ensure all days are present
    const days = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
    const filledData = days.map(day => dailyOrders[day] || 0)

    res.json({
      labels: days,
      data: filledData
    })
  } catch (error) {
    console.error('Dashboard orders error:', error)
    res.status(500).json({ error: 'Failed to load orders data' })
  }
})

// Categories data endpoint
router.get('/admin/dashboard/categories', authenticateToken, async (req, res) => {
  try {
    const { data } = await supabase
      .from('order_items')
      .select('quantity, plant_id (category)')

    // Group by category
    const categoriesData = data.reduce((acc, item) => {
      const category = item.plant_id?.category || 'Autre'
      acc[category] = (acc[category] || 0) + item.quantity
      return acc
    }, {})

    // Sort by quantity and take top 5
    const sortedCategories = Object.entries(categoriesData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    res.json({
      labels: sortedCategories.map(([name]) => name),
      data: sortedCategories.map(([_, count]) => count)
    })
  } catch (error) {
    console.error('Dashboard categories error:', error)
    res.status(500).json({ error: 'Failed to load categories data' })
  }
})

module.exports = router