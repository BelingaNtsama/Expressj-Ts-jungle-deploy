const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const login = require('./Auth/loginWithPassword')
const magic_link = require('./Auth/loginWithMagicLink')
const register = require('./Auth/register')
const logout = require ('./Auth/logout')
const googleOauth = require('./Auth/googleOauth');
const plante = require('./PlanteRoute');
const profileRoute = require('./profileRoute');
const protectedRoute = require('./protectedRoute');
const paymentRoute = require('./paymentRoute');
const Orders = require('./Orders')
const addresses = require('./Addresses');
const favorites = require('./Favorites');

// 🔑 Routes d'authentification
router.use(authRoutes);

// 🌿 Routes des plantes
router.use(plante);
router.use(profileRoute);
router.use(protectedRoute);
router.use(paymentRoute);
router.use(Orders)
router.use(login)
router.use(logout)
router.use(register)
router.use(magic_link)
router.use(googleOauth);
router.use(addresses);
router.use(favorites);
module.exports = router;