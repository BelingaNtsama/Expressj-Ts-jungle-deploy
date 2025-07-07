const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const CORS_OPTIONS = require('./Config/cors');
const errorHandler = require('./Middlewares/errorHandler');
const UserRoutes = require('./UserRoutes');   
const AdminRoutes = require('./AdminRoutes');
const chatbotRoutes = require('./Chatbot');


const app = express(); 

// Middleware
app.use(cors({
  origin: 'https://ts-jungle.vercel.app', // autorise uniquement ton frontend
  credentials: true // si tu utilises des cookies ou sessions
}));
app.use(express.json());
app.use(cookieParser()); 

// Routes
app.use(UserRoutes); 
app.use(AdminRoutes);
app.use(chatbotRoutes);




// Gestion des erreurs
app.use(errorHandler);

module.exports = app;