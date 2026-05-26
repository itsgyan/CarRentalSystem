# Premium Car Rental System 🚗💨

Welcome to the official documentation for the **Premium Car Rental System**! This application is engineered with a gorgeous, high-fidelity **Google Material Design 3 (M3) Dark Theme** frontend and a robust **NoSQL MongoDB (Mongoose)** backend database persistence layer.

---

## 🌟 Key Engineered Features

### 🛡️ MongoDB Mongoose Persistent Layer
The entire backend database layer has been fully engineered using **Mongoose ORM** inside Node.js:
*   **Persistent Schemas**: Utilizes strict schemas inside `/server/src/models/` for `User`, `Car`, `Booking`, `Review`, `Notification`, and `Coupon` collections with automatic timestamps and schema validators.
*   **Bcrypt Secure Hooks**: Employs Mongoose Promise-based `pre-save` lifecycle hooks to hash account passwords automatically using salted Bcrypt algorithms.
*   **Virtual Relative Populates**: Custom-mapped virtual populate joins (`car` and `user` inside `Booking.js` pointing to raw `carId` and `userId` fields) to eager-load full object details while maintaining identical response structures for frontend synchronization.
*   **Resilient Database Connection**: Built with a failover connector supporting direct replica-set cluster shards (bypassing ISP/network DNS SRV query limits) and falling back seamlessly to local offline databases if remote endpoints are completely blocked.

### 🎨 Material Design 3 Dark Theme UI
Styled strictly using **Vanilla CSS Variables** inside `src/index.css`, the frontend implements Google's official **Material Design 3 (M3)** specifications:
*   **M3 Palette System**: Defines Lavender Primary (`#D0BCFF`), On-Primary Indigo (`#381E72`), Charcoal Slate Surface (`#1C1B1F`), and Zinc Outline (`#938F99`) custom tokens.
*   **Physical Elevation Shadows**: Implements M3 elevation tokens (`elevation-1` through `elevation-4`) instead of flat borders to create gorgeous layers and physical depth.
*   **Pill Buttons & Rounded Corners**: Upgrades call-to-actions to pill-shaped designs (`border-radius: 100px`) and catalog cards to M3 rounded containers (`16px` to `24px` radius).
*   **Outlined Focused Fields**: Textboxes, profile details, and checkout forms use M3 outlined layouts with responsive active color boundaries.
*   **Solid Header Masks**: The sticky header is fully colored with the M3 surface background, preventing content from bleeding through visually during scrolling.

### 🗺️ Leaflet GIS Location Tracking
The map tracking portal (`src/components/LeafletMap.jsx`) loads customized dark-map tiles from CartoDB:
*   Renders glowing marker vectors for all active vehicles scattered around NYC coordinates.
*   Clicking a card flies the map focus seamlessly using `.flyTo()` coordinates, opening popup indicators with checkout buttons.

### 🔢 Multi-Stage Billing & Verification
*   **Dynamic pricing**: Calculates base price, 5% service handling fees, and 8% tax.
*   **Working Promo Coupons**: Entering active codes like `WELCOME10` (10% off) recalculates the invoice breakdown immediately.
*   **Inline Identity Uploader**: Unverified accounts are prompted with a secure license drag-and-drop uploader directly in the checkout drawer.

---

## 📁 Project Directory Structures

```
CarRentalSystem/
├── package.json                   # Root package definitions (Vite, React, Leaflet, Lucide)
├── vite.config.js                 # Vite bundler configurations
├── index.html                     # HTML root mounting canvas
├── src/
│   ├── main.jsx                   # Binds App under <AuthProvider> session wrappers
│   ├── index.css                  # Core M3 Dark Theme stylesheet and tokens
│   ├── App.jsx                    # Primary state tab router, catalog and dashboard views
│   ├── contexts/
│   │   └── AuthContext.jsx        # JWT session loader, profiles and uploader coordinators
│   └── components/
│       ├── CarCard.jsx            # M3 elevated catalog car cards
│       ├── BookingModal.jsx       # Multi-stage invoice calculation and inline upload form
│       ├── LeafletMap.jsx         # CartoDB dark-tiles NYC coordinates mapping engine
│       ├── NotificationPanel.jsx  # SMS, Email and App alerts dropdown list
│       └── AdminAnalytics.jsx     # SVG command analytics charts & booking approvals
└── server/
    ├── package.json               # Server node manifest (Express, Mongoose, Multer)
    ├── .env                       # Environment values & database connection URLs
    └── src/
        ├── index.js               # Primary server entry bootstrap and route registries
        ├── config/
        │   └── db.js              # Resilient multi-stage database connector
        ├── middleware/
        │   ├── authMiddleware.js  # JWT payload decoders and role gating security rules
        │   └── uploadMiddleware.js# Multer size guards and type-extension limiters
        ├── models/
        │   ├── User.js            # User parameters, pre-create Bcrypt hooks
        │   ├── Car.js             # Fleet catalog schemas and JSON specs
        │   ├── Booking.js         # Reservation calendars and billing invoice fields
        │   ├── Review.js          # Star-rating validation links
        │   ├── Notification.js    # Multi-channel notification templates
        │   ├── Coupon.js          # Active coupon percentages and dates
        │   └── index.js           # 1-to-many model association index
        ├── controllers/
        │   ├── authController.js  # JWT profiles, license registrations and resets
        │   ├── carController.js   # Advanced search and calendar overlaps
        │   ├── bookingController.js# Pricing engine, conflict checks and extensions
        │   ├── reviewController.js# Star feedback restricted to historical drivers
        │   ├── notificationController.js # Read-state inbox log adjusters
        │   └── adminController.js # Stat compilers, booking status transition operators
        ├── routes/
        │   └── [Route Files].js   # API endpoint controllers
        └── scripts/
            └── seeder.js          # Dynamic cloud database data seeder
```

---

## 🚀 Quick-Start Running Instructions

Open **two terminal windows** (both running from the root workspace directory `c:\Users\gyan4\OneDrive\Documents\CarRentalSystem`):

### Terminal 1: Backend API Server
```powershell
cd server
npm start
```
*The Express server will start up, successfully authenticate, establish connection with your cloud MongoDB Atlas replica set shards, and listen at `http://localhost:5000`.*

### Terminal 2: Frontend Client
```powershell
npm run dev
```
*Vite will compile and launch the M3 Dashboard portal at `http://localhost:5173`.*

---

## 🔑 Pre-Seeded Testing Accounts

Log in inside the **Profile** tab using:

### 1. Administrative Account
*   **Email**: `admin@carrental.com`
*   **Password**: `AdminPass123!`
*   *Provides full access to the interactive SVG revenue charts, CRUD fleet enrollments, client rosters, and the booking approval state machines.*

### 2. Customer Account (Verified)
*   **Email**: `customer@carrental.com`
*   **Password**: `CustomerPass123!`
*   *Provides access to instant reservations, booking extensions, notification dropdown lists, and receipt logs.*

### 3. Customer Account (Unverified)
*   **Email**: `jane@carrental.com`
*   **Password**: `CustomerPass123!`
*   *Allows testing of the inline uploader verification flow during checkout.*
