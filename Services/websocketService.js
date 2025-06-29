// websocket.js
const { Server } = require('socket.io');
const supabase = require('../Config/supabase');

const FIXED_RECEIVER_ID = '2c48bc11-fbfa-418f-8e6f-dbe03fba1e95';

let io;
const connectedUsers = new Map();
const pendingNotifications = new Map();

function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connecté ✅');
    socket.userId = FIXED_RECEIVER_ID;
    connectedUsers.set(socket.userId, socket);

    // Envoyer les notifications en attente
    if (pendingNotifications.has(socket.userId)) {
      const notifications = pendingNotifications.get(socket.userId);
      if (notifications.length > 0) {
        socket.emit('order_created', notifications);
        pendingNotifications.delete(socket.userId);
      }
    }

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      console.log(`Client déconnecté ❌`);
    });
  });

  // Écoute Supabase
  
const channels = supabase.channel('custom-insert-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        const order = payload.new;
        const notification = {
          id: order.id,
          title: 'Nouvelle commande',
          message: `Commande de ${order.amount}€ à ${new Date().toLocaleTimeString()}`,
          created_at: order.created_at,
          type: 'order',
          status: 'unread'
        };

        const userId = FIXED_RECEIVER_ID;
        const socket = connectedUsers.get(userId);

        if (socket) {
          socket.emit('order_created', [notification]);
        } else {
          if (!pendingNotifications.has(userId)) {
            pendingNotifications.set(userId, []);
          }
          pendingNotifications.get(userId).push(notification);
        }
      }
    )
    .subscribe();

  return io;
}

module.exports = { initializeWebSocket };