const { Review, Booking, Car } = require('../models');

// @desc    Add a review for a car
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res) => {
  const { carId, rating, comment } = req.body;
  const userId = req.user.id;

  try {
    // 1. Verify that the car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // 2. Premium Guard: Only allow reviews if the user has historically rented this specific car
    const completedRental = await Booking.findOne({
      userId,
      carId,
      status: { $in: ['Completed', 'Active'] }
    });

    if (!completedRental) {
      return res.status(403).json({
        success: false,
        message: 'Review blocked. You can only leave feedback on vehicles you have rented and driven.'
      });
    }

    // 3. Prevent duplicate reviews by the same user on the same car
    const existingReview = await Review.findOne({ userId, carId });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this vehicle. You can update your existing review if needed.'
      });
    }

    // 4. Create review
    const review = await Review.create({
      userId,
      carId,
      rating: parseInt(rating),
      comment
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: review
    });
  } catch (error) {
    console.error('Add review error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all reviews for a car
// @route   GET /api/reviews/car/:carId
// @access  Public
exports.getCarReviews = async (req, res) => {
  const { carId } = req.params;

  try {
    const reviews = await Review.find({ carId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
