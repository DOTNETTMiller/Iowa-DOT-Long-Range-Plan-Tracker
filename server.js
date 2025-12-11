// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { setupApiRoutes } = require('./api-routes');

const app = express();
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

// Setup API routes
setupApiRoutes(app);

// Mount authentication routes
app.use('/api/auth', require('./auth-routes'));

// Mount patent feature API routes
app.use('/api/patent', require('./patent-api-routes'));

// Mount AI Strategy API routes
app.use('/api/ai', require('./ai-api-routes'));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Iowa DOT Tracker Server is running on port ${PORT}`);
  console.log(`- Web Interface: http://localhost:${PORT}`);
  console.log(`- API Endpoints: http://localhost:${PORT}/api/...`);
});
