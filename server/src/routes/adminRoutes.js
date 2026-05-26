const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getAllBookings,
  updateBookingStatus,
  addCar,
  updateCar,
  deleteCar,
  getAllUsers,
  verifyUser
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Gate all routes below to authenticated administrator roles
router.use(protect, admin);

router.get('/analytics', getAnalytics);
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);
router.get('/users', getAllUsers);
router.put('/users/:id/verify', verifyUser);

// Vehicle operations (supporting multi-image uploads)
router.post('/cars', upload.array('images', 5), addCar);
router.put('/cars/:id', upload.array('images', 5), updateCar);
router.delete('/cars/:id', deleteCar);

module.exports = router;
