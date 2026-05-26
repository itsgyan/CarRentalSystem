const { Car, Review, Booking, User } = require('../models');

// @desc    Get all cars with search and filter parameters
// @route   GET /api/cars
// @access  Public
exports.getCars = async (req, res) => {
  const {
    brand,
    category,
    fuelType,
    transmission,
    seats,
    minPrice,
    maxPrice,
    startDate,
    endDate
  } = req.query;

  try {
    let query = {};

    // 1. Text Search & Direct Filters
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }
    if (fuelType) {
      query.fuelType = fuelType;
    }
    if (transmission) {
      query.transmission = transmission;
    }
    if (seats) {
      query.seats = parseInt(seats);
    }
    
    // 2. Price filter
    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerDay.$lte = parseFloat(maxPrice);
    }

    // 3. Fetch all matching cars
    const cars = await Car.find(query).populate('reviews');

    let formattedCars = cars.map(car => {
      const reviews = car.reviews || [];
      const averageRating = reviews.length > 0
        ? parseFloat((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1))
        : 0;

      const carJson = car.toJSON({ virtuals: true });

      return {
        ...carJson,
        averageRating,
        totalReviews: reviews.length
      };
    });

    // 4. Calendar availability collision checking
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Query overlapping bookings
        const activeBookings = await Booking.find({
          status: { $nin: ['Cancelled', 'Rejected'] },
          startDate: { $lte: end },
          endDate: { $gte: start }
        });

        // Set of booked car IDs
        const bookedCarIds = new Set(activeBookings.map(b => b.carId.toString()));
        
        // Dynamically adjust isAvailable tag based on booking overlap
        formattedCars = formattedCars.map(car => ({
          ...car,
          isAvailable: !bookedCarIds.has(car.id.toString())
        }));
      }
    }

    return res.status(200).json({
      success: true,
      count: formattedCars.length,
      data: formattedCars
    });
  } catch (error) {
    console.error('Fetch cars error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single car details with reviews
// @route   GET /api/cars/:id
// @access  Public
exports.getCarById = async (req, res) => {
  const { id } = req.params;

  try {
    const car = await Car.findById(id).populate({
      path: 'reviews',
      populate: {
        path: 'userId',
        select: 'name'
      }
    });

    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found.' });
    }

    const reviews = car.reviews || [];
    const averageRating = reviews.length > 0
      ? parseFloat((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1))
      : 0;

    // Convert reviews to match Sequelize user structure: review.user = { name: review.userId.name }
    const formattedReviews = reviews.map(r => {
      const rJson = r.toJSON({ virtuals: true });
      return {
        ...rJson,
        user: rJson.userId ? { name: rJson.userId.name } : null
      };
    });

    const carJson = car.toJSON({ virtuals: true });

    return res.status(200).json({
      success: true,
      data: {
        ...carJson,
        reviews: formattedReviews,
        averageRating,
        totalReviews: reviews.length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
