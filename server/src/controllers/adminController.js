const { Booking, Car, User, Review, Notification } = require('../models');

// @desc    Get dashboard metrics & chart data
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Core counters
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalCars = await Car.countDocuments({});
    const totalBookings = await Booking.countDocuments({});

    // 2. Revenue aggregation (Only counts confirmed/active/completed bookings)
    const activeBookingsList = await Booking.find({
      status: { $in: ['Approved', 'Active', 'Completed'] }
    });

    const totalRevenue = activeBookingsList.reduce((acc, curr) => {
      const breakdown = curr.priceBreakdown || {};
      return acc + (parseFloat(breakdown.totalAmount) || 0);
    }, 0);

    // 3. Fleet Utilization Rate: (% of cars currently in 'Active' status)
    const activeRentals = await Booking.countDocuments({ status: 'Active' });
    const fleetUtilization = totalCars > 0 ? parseFloat(((activeRentals / totalCars) * 100).toFixed(1)) : 0;

    // 4. Booking status breakdown
    const pendingCount = await Booking.countDocuments({ status: 'Pending' });
    const approvedCount = await Booking.countDocuments({ status: 'Approved' });
    const activeCount = await Booking.countDocuments({ status: 'Active' });
    const completedCount = await Booking.countDocuments({ status: 'Completed' });
    const cancelledCount = await Booking.countDocuments({ status: 'Cancelled' });
    const rejectedCount = await Booking.countDocuments({ status: 'Rejected' });

    const statusBreakdown = {
      Pending: pendingCount,
      Approved: approvedCount,
      Active: activeCount,
      Completed: completedCount,
      Cancelled: cancelledCount,
      Rejected: rejectedCount
    };

    // 5. Category Popularity (Count bookings by car category)
    const bookingsWithCars = await Booking.find({}).populate('car', 'category');

    const categoryPopularity = { SUV: 0, Sedan: 0, Hatchback: 0, Luxury: 0 };
    bookingsWithCars.forEach(b => {
      if (b.car && categoryPopularity[b.car.category] !== undefined) {
        categoryPopularity[b.car.category]++;
      }
    });

    // 6. Recent Revenue Breakdown (Simulated chronological revenue logs for charts)
    // We group revenue by the last 6 bookings to draw an SVG chart
    const recentApprovedBookings = await Booking.find({
      status: { $in: ['Approved', 'Active', 'Completed'] }
    })
      .populate('car', 'brand name')
      .sort({ createdAt: 1 })
      .limit(6);

    const revenueTimeline = recentApprovedBookings.map((b, index) => {
      const brand = b.car ? b.car.brand : 'Vehicle';
      const name = b.car ? b.car.name.substring(0, 5) : 'Asset';
      return {
        label: `${brand} ${name}`,
        amount: parseFloat(b.priceBreakdown.totalAmount)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalCars,
          totalBookings,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          fleetUtilization
        },
        statusBreakdown,
        categoryPopularity,
        revenueTimeline
      }
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings (Admin View)
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('car', 'name brand category images')
      .populate('user', 'name email phone isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve/Reject/Complete bookings
// @route   PUT /api/admin/bookings/:id/status
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body; // Approved, Rejected, Active, Completed, Cancelled

  const allowedStatuses = ['Approved', 'Rejected', 'Active', 'Completed', 'Cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status transition.' });
  }

  try {
    const booking = await Booking.findById(id).populate('car');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    booking.status = status;
    if (status === 'Rejected') {
      booking.cancellationReason = reason || 'Rejected by Admin';
    }
    await booking.save();

    // Create customized notifications for the customer based on status
    let title = '';
    let message = '';

    switch (status) {
      case 'Approved':
        title = 'Booking Approved! 🎉';
        message = `Your reservation for ${booking.car.brand} ${booking.car.name} is approved. You can pick it up at the scheduled date and time.`;
        break;
      case 'Rejected':
        title = 'Booking Request Rejected ❌';
        message = `Your reservation request for ${booking.car.brand} ${booking.car.name} was declined. Reason: ${booking.cancellationReason}`;
        break;
      case 'Active':
        title = 'Rental Active 🔑';
        message = `You have officially checked out ${booking.car.brand} ${booking.car.name}. Drive safely! Your rental drops off on ${new Date(booking.endDate).toLocaleDateString()}.`;
        break;
      case 'Completed':
        title = 'Rental Completed 🏁';
        message = `Thank you for choosing CarRental! Your booking of ${booking.car.brand} ${booking.car.name} is complete. Please share your rating and review!`;
        break;
      case 'Cancelled':
        title = 'Booking Cancelled ⚠️';
        message = `Your booking for ${booking.car.brand} ${booking.car.name} was marked as Cancelled.`;
        break;
    }

    await Notification.create({
      userId: booking.userId,
      title,
      message,
      type: 'App'
    });

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: booking
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new car to the fleet
// @route   POST /api/admin/cars
// @access  Private/Admin
exports.addCar = async (req, res) => {
  const { name, brand, category, transmission, fuelType, seats, pricePerDay, specifications } = req.body;

  try {
    // Parse specs if received as JSON string
    let parsedSpecs = specifications;
    if (typeof specifications === 'string') {
      parsedSpecs = JSON.parse(specifications);
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    } else {
      // Generic fallback
      imageUrls = ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600'];
    }

    const car = await Car.create({
      name,
      brand,
      category,
      transmission,
      fuelType,
      seats: parseInt(seats),
      pricePerDay: parseFloat(pricePerDay),
      images: imageUrls,
      specifications: parsedSpecs || {},
      isAvailable: true
    });

    return res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully!',
      data: car
    });
  } catch (error) {
    console.error('Add car error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update car details
// @route   PUT /api/admin/cars/:id
// @access  Private/Admin
exports.updateCar = async (req, res) => {
  const { id } = req.params;
  const { name, brand, category, transmission, fuelType, seats, pricePerDay, specifications, isAvailable } = req.body;

  try {
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let parsedSpecs = specifications;
    if (typeof specifications === 'string') {
      parsedSpecs = JSON.parse(specifications);
    }

    car.name = name || car.name;
    car.brand = brand || car.brand;
    car.category = category || car.category;
    car.transmission = transmission || car.transmission;
    car.fuelType = fuelType || car.fuelType;
    car.seats = seats ? parseInt(seats) : car.seats;
    car.pricePerDay = pricePerDay ? parseFloat(pricePerDay) : car.pricePerDay;
    car.specifications = parsedSpecs || car.specifications;
    if (isAvailable !== undefined) {
      car.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    // Check if new images are uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      car.images = [...car.images, ...newImages];
    }

    await car.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle details updated successfully.',
      data: car
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a car from the fleet
// @route   DELETE /api/admin/cars/:id
// @access  Private/Admin
exports.deleteCar = async (req, res) => {
  const { id } = req.params;

  try {
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    await Car.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Vehicle removed from fleet successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users (Admin View)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'customer' })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve user driving license verification
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Admin
exports.verifyUser = async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isVerified = isVerified === 'true' || isVerified === true;
    await user.save();

    await Notification.create({
      userId: user._id,
      title: user.isVerified ? 'Profile Verified! ✅' : 'Verification Update ⚠️',
      message: user.isVerified 
        ? 'Your account profile and driving license have been fully verified. Happy renting!'
        : 'Your account verification status was updated by an admin.',
      type: 'App'
    });

    return res.status(200).json({
      success: true,
      message: `User verification set to ${user.isVerified}.`,
      data: {
        id: user._id.toString(),
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
