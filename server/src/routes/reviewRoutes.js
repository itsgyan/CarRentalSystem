const express = require('express');
const router = express.Router();
const { addReview, getCarReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addReview);
router.get('/car/:carId', getCarReviews);

module.exports = router;
