const { Server } = require('socket.io');
const supabase = require('../Config/supabase')

const Orders = supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'Orders' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

let io;
const pendingNotifications = new Map();
const FIXED_RECEIVER_ID = '5368eefb-52c5-4d51-ba2e-7f931a10cb80';

function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${FIXED_RECEIVER_ID}`);
    socket.userId = FIXED_RECEIVER_ID;
    
    // Envoyer les notifications en attente
    if (pendingNotifications.has(FIXED_RECEIVER_ID)) {
      const notifications = pendingNotifications.get(FIXED_RECEIVER_ID);
      if (notifications.length > 0) {
        socket.emit('order_created', notifications);
        pendingNotifications.delete(FIXED_RECEIVER_ID);
      }
    }

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${FIXED_RECEIVER_ID}`);
    });
  });

  return io;
}

function notifyOrderCreated(userId, orderData) {
  const notification = {
    type: 'order',
    title: 'Nouvelle commande',
    message: `Une commande a ete effectuee le ${new Date().toLocaleString()} avec le montant de ${orderData[0].amount}$`,
    time: orderData[0].created_at,
    id: orderData[0].id,
    status: 'unread'
  };

  if (!io) {
    console.warn('WebSocket non initialisé, notification non envoyée');
    return;
  }

  const socket = Array.from(io.sockets.sockets.values())[0];
  if (socket) {
    socket.emit('order_created', [notification]);
    console.log(`Notification envoyée au récepteur fixe`);
  } else {
    if (!pendingNotifications.has(FIXED_RECEIVER_ID)) {
      pendingNotifications.set(FIXED_RECEIVER_ID, []);
    }
    pendingNotifications.get(FIXED_RECEIVER_ID).push(notification);
    console.log(`Notification mise en attente`);
  }
}

module.exports = {
  initializeWebSocket,
  notifyOrderCreated
};
