const CORS_OPTIONS = {
    origin: 'https://ts-jungle.vercel.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  
  module.exports = CORS_OPTIONS;