const { Booking, Car, User, Coupon, Notification } = require('../models');

// Helper to calculate days between two dates
const getDaysBetween = (start, end) => {
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays; // Minimum 1 day
};

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const { carId, pickupLocation, dropLocation, startDate, endDate, couponCode } = req.body;
  const userId = req.user.id;

  try {
    // 1. Check if user is verified (must have uploaded license)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your account is not verified. Please upload your driving license to rent vehicles.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || !start || isNaN(end.getTime()) || !end) {
      return res.status(400).json({ success: false, message: 'Invalid pickup or drop-off dates.' });
    }

    if (start < new Date(Date.now() - 1000 * 60 * 60)) { // Allow minor time drift
      return res.status(400).json({ success: false, message: 'Pickup date cannot be in the past.' });
    }

    if (end <= start) {
      return res.status(400).json({ success: false, message: 'Drop-off date must be after pickup date.' });
    }

    // 2. Fetch car details
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // 3. Collision check: check if car is already booked for these dates
    const conflictingBooking = await Booking.findOne({
      carId,
      status: { $nin: ['Cancelled', 'Rejected'] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is already reserved for the selected date range. Please choose different dates or another car.'
      });
    }

    // 4. Calculate pricing
    const totalDays = getDaysBetween(start, end);
    const basePrice = parseFloat((car.pricePerDay * totalDays).toFixed(2));
    const serviceFee = parseFloat((basePrice * 0.05).toFixed(2)); // 5% service fee
    const tax = parseFloat((basePrice * 0.08).toFixed(2)); // 8% local tax
    
    let discount = 0.00;
    let couponApplied = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (coupon) {
        discount = parseFloat(((basePrice * coupon.discountPercent) / 100).toFixed(2));
        if (coupon.maxDiscount && discount > parseFloat(coupon.maxDiscount)) {
          discount = parseFloat(coupon.maxDiscount);
        }
        couponApplied = coupon.code;
      }
    }

    const totalAmount = parseFloat((basePrice + serviceFee + tax - discount).toFixed(2));

    const priceBreakdown = {
      pricePerDay: car.pricePerDay,
      basePrice,
      serviceFee,
      tax,
      discount,
      totalAmount
    };

    // 5. Create booking in Pending status
    const booking = await Booking.create({
      userId,
      carId,
      pickupLocation,
      dropLocation,
      startDate: start,
      endDate: end,
      totalDays,
      priceBreakdown,
      couponCode: couponApplied,
      status: 'Pending'
    });

    // 6. Create app alerts
    await Notification.create({
      userId,
      title: 'Booking Request Submitted',
      message: `Your reservation request for ${car.brand} ${car.name} (${totalDays} days) has been received and is pending admin approval.`,
      type: 'App'
    });

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user bookings history
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate({
        path: 'car',
        select: 'name brand category images'
      })
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

// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const booking = await Booking.findById(id).populate('car');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Security check: only the booker or an admin can cancel
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is already ${booking.status.toLowerCase()}.`
      });
    }

    booking.status = 'Cancelled';
    booking.cancellationReason = reason || 'Cancelled by customer';
    await booking.save();

    // Notify user
    await Notification.create({
      userId: booking.userId,
      title: 'Booking Cancelled',
      message: `Your booking for ${booking.car.brand} ${booking.car.name} was successfully cancelled.`,
      type: 'App'
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: booking
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Extend rental duration
// @route   POST /api/bookings/:id/extend
// @access  Private
exports.extendBooking = async (req, res) => {
  const { id } = req.params;
  const { extendDays } = req.body; // Number of days to extend

  try {
    const booking = await Booking.findById(id).populate('car');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    if (booking.status !== 'Approved' && booking.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Only approved or currently active bookings can be extended.'
      });
    }

    const additionalDays = parseInt(extendDays);
    if (isNaN(additionalDays) || additionalDays <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid extension days.' });
    }

    // Calculate new end date
    const currentEndDate = new Date(booking.endDate);
    const newEndDate = new Date(currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    // Collision check: verify no future reservations collide with the extension
    const conflictingBooking = await Booking.findOne({
      carId: booking.carId,
      _id: { $ne: booking._id },
      status: { $nin: ['Cancelled', 'Rejected'] },
      startDate: { $gte: currentEndDate, $lte: newEndDate }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Extension failed. This vehicle is already reserved by another customer during those extended days.'
      });
    }

    // Calculate additional cost
    const pricePerDay = parseFloat(booking.priceBreakdown.pricePerDay);
    const additionalBase = pricePerDay * additionalDays;
    const additionalTax = additionalBase * 0.08;
    const additionalFee = additionalBase * 0.05;
    const additionalTotal = additionalBase + additionalTax + additionalFee;

    // Update prices
    const breakdown = { ...booking.priceBreakdown };
    breakdown.basePrice = parseFloat((parseFloat(breakdown.basePrice) + additionalBase).toFixed(2));
    breakdown.tax = parseFloat((parseFloat(breakdown.tax) + additionalTax).toFixed(2));
    breakdown.serviceFee = parseFloat((parseFloat(breakdown.serviceFee) + additionalFee).toFixed(2));
    breakdown.totalAmount = parseFloat((parseFloat(breakdown.totalAmount) + additionalTotal).toFixed(2));

    // Update booking record
    booking.endDate = newEndDate;
    booking.totalDays += additionalDays;
    booking.priceBreakdown = breakdown;
    booking.extDurationHours += additionalDays * 24;
    await booking.save();

    // Send notifications
    await Notification.create({
      userId: booking.userId,
      title: 'Rental Extension Confirmed',
      message: `Your rental of ${booking.car.brand} ${booking.car.name} has been extended by ${additionalDays} days.`,
      type: 'App'
    });

    return res.status(200).json({
      success: true,
      message: 'Rental extended successfully!',
      data: booking
    });
  } catch (error) {
    console.error('Extend booking error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Invoice Data
// @route   GET /api/bookings/:id/invoice
// @access  Private
exports.getInvoice = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id)
      .populate('car')
      .populate({
        path: 'user',
        select: 'name email phone'
      });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    const bookingIdStr = booking._id.toString();

    return res.status(200).json({
      success: true,
      data: {
        invoiceNumber: `INV-${bookingIdStr.substring(0, 8).toUpperCase()}`,
        issueDate: booking.createdAt,
        billingTo: {
          name: booking.user.name,
          email: booking.user.email,
          phone: booking.user.phone
        },
        vehicle: {
          brand: booking.car.brand,
          name: booking.car.name,
          category: booking.car.category,
          pricePerDay: booking.priceBreakdown.pricePerDay
        },
        dates: {
          pickup: booking.startDate,
          dropoff: booking.endDate,
          locationPickup: booking.pickupLocation,
          locationDrop: booking.dropLocation
        },
        summary: {
          totalDays: booking.totalDays,
          basePrice: booking.priceBreakdown.basePrice,
          serviceFee: booking.priceBreakdown.serviceFee,
          tax: booking.priceBreakdown.tax,
          discount: booking.priceBreakdown.discount,
          couponUsed: booking.couponCode || 'None',
          grandTotal: booking.priceBreakdown.totalAmount
        },
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
