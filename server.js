const app = require('./app');
const PORT = process.env.PORT 
const http = require('http');
const server = http.createServer(app);
const { initializeWebSocket } = require('./Services/websocketService');

// Initialisation du WebSocket
initializeWebSocket(server);

app.get("/",(req,res)=>{
  res.send("Bienvenu sur Ts-jungle")
})

// Utilisation de server.listen au lieu de app.listen
server.listen(PORT, () => {
  console.log(`✅ Serveur en cours d'exécution sur le port ${PORT}`);
});