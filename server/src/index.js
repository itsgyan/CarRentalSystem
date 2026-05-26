const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so our React app on localhost:5173 can query this server
app.use(cors({
  origin: '*', // For development flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder statically so frontend can display license proofs and car images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Start Server
const startServer = async () => {
  try {
    // 1. Initialize and sync database (PostgreSQL or resilient SQLite fallback)
    await connectDB();
    
    // Dynamically load routes after database is ready
    const authRoutes = require('./routes/authRoutes');
    const carRoutes = require('./routes/carRoutes');
    const bookingRoutes = require('./routes/bookingRoutes');
    const reviewRoutes = require('./routes/reviewRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');
    const adminRoutes = require('./routes/adminRoutes');

    // Register API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/cars', carRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/admin', adminRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({ success: true, message: 'Car Rental Backend Service is healthy!' });
    });

    // Root fallback route
    app.use((req, res) => {
      res.status(404).json({ success: false, message: 'API endpoint not found.' });
    });

    // 2. Start listening on the port
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 CAR RENTAL API SERVER RUNNING ON PORT: ${PORT}`);
      console.log(`🔗 API Health URL: http://localhost:${PORT}/api/health`);
      console.log(`📁 Static Uploads: http://localhost:${PORT}/uploads`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();

