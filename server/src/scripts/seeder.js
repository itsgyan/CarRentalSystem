const { connectDB } = require('../config/db');
const mongoose = require('mongoose');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Load models dynamically after DB is connected
    const { User, Car, Review, Coupon, Booking, Notification } = require('../models');
    
    console.log('🔄 Syncing and clearing database collections...');
    await User.deleteMany({});
    await Car.deleteMany({});
    await Review.deleteMany({});
    await Coupon.deleteMany({});
    await Booking.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Collections cleared and ready.');

    // 1. Seed Users
    console.log('👤 Seeding accounts...');
    const users = [];
    
    const admin = new User({
      name: 'System Admin',
      email: 'admin@carrental.com',
      password: 'AdminPass123!',
      phone: '+1 (555) 123-4567',
      role: 'admin',
      isVerified: true
    });
    await admin.save();
    users.push(admin);

    const customer = new User({
      name: 'Alex Johnson',
      email: 'customer@carrental.com',
      password: 'CustomerPass123!',
      phone: '+1 (555) 987-6543',
      role: 'customer',
      isVerified: true,
      drivingLicenseUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400'
    });
    await customer.save();
    users.push(customer);

    const unverifiedCustomer = new User({
      name: 'Jane Doe',
      email: 'jane@carrental.com',
      password: 'CustomerPass123!',
      phone: '+1 (555) 444-5555',
      role: 'customer',
      isVerified: false
    });
    await unverifiedCustomer.save();
    users.push(unverifiedCustomer);

    // 2. Seed Cars
    console.log('🚗 Seeding custom Indian car models...');
    const carData = [
      {
        name: 'Baleno Alpha',
        brand: 'Maruti Suzuki',
        category: 'Hatchback',
        transmission: 'Manual',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 900.00,
        images: [
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqatrdsogOeNSu72h0Eg-R1zmoHcPrsXz0CdUy5zusTEN2g_m-DMyzcDPFdtPdtElmTdcr8CIVZwIEF_TuJTbScNpZ7gaOCw76hDN6eBHq&s=10'
        ],
        specifications: {
          acceleration: '11.8s (0-100 km/h)',
          topSpeed: '160 km/h',
          engine: '1.2L DualJet Petrol',
          range: '22.3 km/l'
        },
        isAvailable: true
      },
      {
        name: 'i20 Asta (O)',
        brand: 'Hyundai',
        category: 'Hatchback',
        transmission: 'Automatic',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 950.00,
        images: [
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTijzZSwG3E2MOucdKtqcBo-lAZe9Zqh_WOzn7ORUHSMq0SPkFtEFTc1erCmCFKuekKEg5-6xPL4olxZoilA_Xm0Vwa8PtGSN4dLQw4y1Xm&s=10'
        ],
        specifications: {
          acceleration: '10.5s (0-100 km/h)',
          topSpeed: '170 km/h',
          engine: '1.0L Turbo GDi Petrol',
          range: '20.2 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Dzire ZXi+',
        brand: 'Maruti Suzuki',
        category: 'Sedan',
        transmission: 'Manual',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 1000.00,
        images: [
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrXpP3przL0phP2Ffm8yM091-iMmg5-3LKMuryAD7Cb3BBBI8jnxrX5_WqQQQvALXXNQBLQ__51IOMp6weGUVLQBM-vfxOckkzNP6YImmiAw&s=10'
        ],
        specifications: {
          acceleration: '12.0s (0-100 km/h)',
          topSpeed: '155 km/h',
          engine: '1.2L K-Series Petrol',
          range: '23.2 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Amaze VX',
        brand: 'Honda',
        category: 'Sedan',
        transmission: 'Automatic',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 1100.00,
        images: [
          'https://www.indiacarnews.com/wp-content/uploads/2024/12/New-Honda-Amaze-ZX.webp'
        ],
        specifications: {
          acceleration: '11.2s (0-100 km/h)',
          topSpeed: '160 km/h',
          engine: '1.2L i-VTEC Petrol',
          range: '18.6 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Verna SX(O) Turbo',
        brand: 'Hyundai',
        category: 'Sedan',
        transmission: 'Automatic',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 1400.00,
        images: [
          'https://imgd.aeplcdn.com/664x374/n/cw/ec/204398/verna-exterior-right-front-three-quarter.png?isig=0&q=80'
        ],
        specifications: {
          acceleration: '8.1s (0-100 km/h)',
          topSpeed: '210 km/h',
          engine: '1.5L Turbo GDi Petrol',
          range: '20.6 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Creta SX(O)',
        brand: 'Hyundai',
        category: 'SUV',
        transmission: 'Automatic',
        fuelType: 'Petrol',
        seats: 5,
        pricePerDay: 1600.00,
        images: [
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuPT8CnZuKqV2bHCXBHTYKzIXZVZYEnEl84S7QmWAZ9v9Md0v80vL5uStHmpj8YVqC6iJXRjFaWWaWfBCvJHFQdKqsq1XwXchuS8Fuz02ZSg&s=10'
        ],
        specifications: {
          acceleration: '10.5s (0-100 km/h)',
          topSpeed: '170 km/h',
          engine: '1.5L CRDi Diesel',
          range: '18.0 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Ertiga ZXi+',
        brand: 'Maruti Suzuki',
        category: 'SUV',
        transmission: 'Manual',
        seats: 7,
        fuelType: 'Petrol',
        pricePerDay: 1800.00,
        images: [
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600'
        ],
        specifications: {
          acceleration: '13.5s (0-100 km/h)',
          topSpeed: '150 km/h',
          engine: '1.5L K-Series Smart Hybrid',
          range: '20.5 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Innova Crysta VX',
        brand: 'Toyota',
        category: 'Luxury',
        transmission: 'Manual',
        seats: 7,
        fuelType: 'Diesel',
        pricePerDay: 3000.00,
        images: [
          'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&q=80&w=600'
        ],
        specifications: {
          acceleration: '11.5s (0-100 km/h)',
          topSpeed: '175 km/h',
          engine: '2.4L GD Diesel Engine',
          range: '12.0 km/l'
        },
        isAvailable: true
      },
      {
        name: 'Scorpio-N Z8 L',
        brand: 'Mahindra',
        category: 'Luxury',
        transmission: 'Automatic',
        seats: 7,
        fuelType: 'Diesel',
        pricePerDay: 3200.00,
        images: [
          'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600'
        ],
        specifications: {
          acceleration: '9.5s (0-100 km/h)',
          topSpeed: '180 km/h',
          engine: '2.2L mHawk Diesel Engine',
          range: '13.5 km/l'
        },
        isAvailable: true
      }
    ];

    const seededCars = await Car.insertMany(carData);
    const baleno = seededCars[0];
    const i20 = seededCars[1];
    const scorpio = seededCars[8];

    // 3. Seed Reviews
    console.log('⭐ Seeding star ratings and feedback...');
    await Review.create([
      {
        userId: customer._id,
        carId: baleno._id,
        rating: 5,
        comment: 'Excellent premium hatchback! Great mileage, very smooth to drive in city traffic, and comfortable seats.'
      },
      {
        userId: customer._id,
        carId: i20._id,
        rating: 5,
        comment: 'Very premium ride. The suspension absorbs bumps beautifully, and the infotainment system is top-notch!'
      },
      {
        userId: customer._id,
        carId: scorpio._id,
        rating: 5,
        comment: 'A beast on the road! Scorpio-N has incredible road presence, high seating, and loads of torque. Perfect for highway cruising!'
      }
    ]);

    // 4. Seed Coupons
    console.log('🎫 Seeding discount coupons...');
    await Coupon.create([
      {
        code: 'WELCOME10',
        discountPercent: 10,
        maxDiscount: 50.00,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'ROADTRIP',
        discountPercent: 20,
        maxDiscount: 100.00,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'SUPERDRIVE',
        discountPercent: 30,
        maxDiscount: 200.00,
        expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ]);

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedData();
