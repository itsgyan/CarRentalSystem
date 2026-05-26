const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  extendBooking,
  getInvoice
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require a verified login session
router.use(protect);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.post('/:id/cancel', cancelBooking);
router.post('/:id/extend', extendBooking);
router.get('/:id/invoice', getInvoice);

module.exports = router;
