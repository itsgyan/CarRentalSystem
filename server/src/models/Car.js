const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a car name']
  },
  brand: {
    type: String,
    required: [true, 'Please provide a car brand']
  },
  category: {
    type: String,
    enum: ['SUV', 'Sedan', 'Hatchback', 'Luxury'],
    required: [true, 'Please provide a car category']
  },
  transmission: {
    type: String,
    enum: ['Manual', 'Automatic'],
    required: [true, 'Please provide a car transmission type']
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    required: [true, 'Please provide a car fuel type']
  },
  seats: {
    type: Number,
    required: [true, 'Please provide the number of seats']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Please provide the daily rental rate']
  },
  images: {
    type: [String],
    default: []
  },
  specifications: {
    acceleration: { type: String, default: '' },
    topSpeed: { type: String, default: '' },
    engine: { type: String, default: '' },
    range: { type: String, default: '' }
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for reviews
carSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'carId',
  justOne: false
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
