const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const plante = require('./PlanteRoute');
const profileRoute = require('./profileRoute');
const protectedRoute = require('./protectedRoute');
const paymentRoute = require('./paymentRoute');
const Orders = require('./Orders')
// 🚀 Route principale
router.get('/', (req, res) => {
  res.status(200).send('API opérationnelle 🚀');
});

// 🔑 Routes d'authentification
router.use(authRoutes);

// 🌿 Routes des plantes
router.use(plante);
router.use(profileRoute);
router.use(protectedRoute);
router.use(paymentRoute);
router.use(Orders)
module.exports = router;