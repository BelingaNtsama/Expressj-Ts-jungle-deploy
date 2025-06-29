const express = require('express');
const router = express.Router();
const AjoutPlantes = require('./ajoutPlantes');
const deletePlantes = require('./deletePlantes');
const chatbot = require('./chatbot');
const orders = require('./orders');
const customer = require('./customer')
const dashboard = require('./dashboard')
const product = require('./product')

// 🔑 Routes d'authentification


// 🌿 Routes des plantes
router.use(AjoutPlantes);
router.use(deletePlantes);
router.use(chatbot);
router.use(orders);
router.use(customer)
router.use(dashboard)
router.use(product)

module.exports = router;