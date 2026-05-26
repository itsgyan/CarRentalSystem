const { User, Notification } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'car_rental_jwt_secret_998877', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    if (user) {
      // Create a welcome notification
      await Notification.create({
        userId: user._id,
        title: 'Welcome to CarRental!',
        message: `Hello ${user.name}, welcome to our premium car rental fleet. Please upload your driving license to start booking!`,
        type: 'App'
      });

      return res.status(201).json({
        success: true,
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          token: generateToken(user._id.toString())
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data.' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      return res.status(200).json({
        success: true,
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          drivingLicenseUrl: user.drivingLicenseUrl,
          token: generateToken(user._id.toString())
        }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (user) {
      return res.status(200).json({ success: true, data: user });
    } else {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      return res.status(200).json({
        success: true,
        data: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          drivingLicenseUrl: updatedUser.drivingLicenseUrl
        }
      });
    } else {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload driving license / ID proof
// @route   POST /api/auth/upload-license
// @access  Private
exports.uploadLicense = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Set license URL (relative local path which is served statically)
    const fileUrl = `/uploads/${req.file.filename}`;
    user.drivingLicenseUrl = fileUrl;
    
    // Auto mark as true in this system for easy showcase, 
    // or keep isVerified=false until an Admin approves it. Let's make it so it auto-verifies
    // but log a notification for transparency!
    user.isVerified = true; 
    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'License Uploaded Successfully',
      message: 'Your driving license has been uploaded and auto-verified! You can now book any car from the catalog.',
      type: 'App'
    });

    return res.status(200).json({
      success: true,
      message: 'License uploaded successfully!',
      data: {
        drivingLicenseUrl: fileUrl,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('License upload controller error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot password simulation
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email.' });
    }

    // Simulated token
    const resetToken = Math.random().toString(36).substring(2, 15);
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${email}`;
    
    console.log(`\n📬 [Simulated Email Sent to: ${email}]`);
    console.log(`🔗 Reset Link: ${resetLink}\n`);

    // Create an app notification with the reset link so they can click it directly in-app!
    await Notification.create({
      userId: user._id,
      title: 'Password Reset Request',
      message: `We received a request to reset your password. Click this simulated link to continue: ${resetLink}`,
      type: 'Email'
    });

    return res.status(200).json({
      success: true,
      message: 'Simulated password reset email triggered! Check the user notification logs or server console.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password simulation
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword; // Hashed automatically on save
    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'Password Changed Successfully',
      message: 'Your password has been successfully reset. If this was not you, please contact support.',
      type: 'App'
    });

    return res.status(200).json({ success: true, message: 'Password has been reset successfully! Please log in.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
