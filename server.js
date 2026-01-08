// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Server } = require('socket.io');
const { setupApiRoutes } = require('./api-routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware (simple in-memory sessions for now)
app.use(session({
  secret: process.env.SESSION_SECRET || 'iowa-dot-tracker-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup API routes (pass io for real-time updates)
setupApiRoutes(app, io);

// Mount authentication routes
app.use('/api/auth', require('./auth-routes'));

// ============================================
// WEBSOCKET REAL-TIME COLLABORATION
// ============================================

// Track connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins
    socket.on('user_join', (userData) => {
        connectedUsers.set(socket.id, {
            id: socket.id,
            name: userData.name || 'Anonymous User',
            joinedAt: new Date()
        });

        // Broadcast user list to all clients
        io.emit('users_update', Array.from(connectedUsers.values()));

        console.log(`User ${userData.name} joined. Total users: ${connectedUsers.size}`);
    });

    // Project update broadcast
    socket.on('project_update', (projectData) => {
        // Broadcast to all OTHER clients
        socket.broadcast.emit('project_updated', projectData);
        console.log('Broadcasting project update:', projectData.id);
    });

    // User activity broadcast (typing, viewing, etc.)
    socket.on('user_activity', (activityData) => {
        socket.broadcast.emit('activity_notification', {
            user: connectedUsers.get(socket.id),
            activity: activityData
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        connectedUsers.delete(socket.id);

        // Broadcast updated user list
        io.emit('users_update', Array.from(connectedUsers.values()));

        console.log(`User disconnected: ${user?.name || socket.id}. Remaining: ${connectedUsers.size}`);
    });
});

// Make io available globally for API routes
global.io = io;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Default route - serve the modern tracker
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'iowa_dot_tracker_modern.html'));
});

// Legacy route - serve the enhanced tracker
app.get('/legacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'iowa_dot_enhanced_tracker.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Iowa DOT Tracker Server is running on port ${PORT}`);
  console.log(`- Web Interface: http://localhost:${PORT}`);
  console.log(`- API Endpoints: http://localhost:${PORT}/api/...`);
  console.log(`- WebSocket: Real-time collaboration enabled`);
});
