// ═══ Agrivision Backend API Server ═══
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const readingsRoutes = require('./routes/readings');
const alertRoutes = require('./routes/alerts');
const companyRoutes = require('./routes/companies');
const farmerRoutes = require('./routes/farmers');
const chatRoutes = require('./routes/chat');
const newsRoutes = require('./routes/news');
const adRoutes = require('./routes/ads');
const { initDB } = require('./models/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/readings', readingsRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/farmers', farmerRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/ads', adRoutes);

// WebSocket for real-time device updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('subscribe-device', (deviceId) => socket.join(`device-${deviceId}`));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Make io accessible to routes
app.set('io', io);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  server.listen(PORT, () => console.log(`Agrivision API running on port ${PORT}`));
}
start();

module.exports = { app, io };
