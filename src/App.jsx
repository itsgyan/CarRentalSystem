import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { CarCard } from './components/CarCard';
import { BookingModal } from './components/BookingModal';
import { LeafletMap } from './components/LeafletMap';
import { NotificationPanel } from './components/NotificationPanel';
import { AdminAnalytics } from './components/AdminAnalytics';
import { 
  Car, User, Calendar, Bell, LogOut, Search, SlidersHorizontal, Map, Grid, 
  UserCheck, Clock, ShieldAlert, X, ChevronRight, RefreshCw, FileText, CheckCircle 
} from 'lucide-react';

const API_BASE = 'https://carrentalsystem-yczy.onrender.com/api';
const UPLOADS_BASE = 'https://carrentalsystem-yczy.onrender.com';

function App() {
  const { 
    user, loading, notifications, login, register, logout, 
    uploadLicense, refreshNotifications 
  } = useAuth();

  // Navigation states: 'catalog' | 'bookings' | 'profile' | 'admin'
  const [activeTab, setActiveTab] = useState('catalog');
  const [showNotifications, setShowNotifications] = useState(false);

  // Catalog Feed & Filter states
  const [cars, setCars] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [selectedTransmission, setSelectedTransmission] = useState('');
  const [selectedSeats, setSelectedSeats] = useState('');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // View states
  const [showMap, setShowMap] = useState(true);
  const [selectedMapCar, setSelectedMapCar] = useState(null);
  const [rentingCar, setRentingCar] = useState(null);

  // Booking Flow states
  const [myBookings, setMyBookings] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [extBookingId, setExtBookingId] = useState(null);
  const [extDays, setExtDays] = useState(1);
  const [extSuccess, setExtSuccess] = useState('');
  const [extError, setExtError] = useState('');

  // Login Form states
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  // Profile Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    licenseFile: null
  });
  const [profileSuccess, setProfileSuccess] = useState('');

  // Fetch Cars list from API
  const fetchCars = async () => {
    setCatalogLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('brand', searchQuery);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (selectedFuel) queryParams.append('fuelType', selectedFuel);
      if (selectedTransmission) queryParams.append('transmission', selectedTransmission);
      if (selectedSeats) queryParams.append('seats', selectedSeats);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`${API_BASE}/cars?${queryParams.toString()}`);
      const result = await res.json();
      if (result.success) {
        setCars(result.data);
      }
    } catch (e) {
      console.error('Failed to fetch car listings:', e);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch My Bookings from API
  const fetchMyBookings = async () => {
    if (!user) return;
    setBookingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setMyBookings(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [searchQuery, selectedCategory, selectedFuel, selectedTransmission, selectedSeats, maxPrice, startDate, endDate]);

  useEffect(() => {
    if (user) {
      fetchMyBookings();
      setProfileForm({ name: user.name, phone: user.phone || '', licenseFile: null });
    }
  }, [user]);

  // Auth Operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (isLogin) {
      const res = await login(authForm.email, authForm.password);
      if (!res.success) setAuthError(res.message);
    } else {
      const res = await register(authForm.name, authForm.email, authForm.password, authForm.phone);
      if (!res.success) setAuthError(res.message);
    }
  };

  // Profile update and Document upload
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setAuthError('');

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone })
      });
      const result = await res.json();
      if (result.success) {
        setProfileSuccess('Profile details updated successfully!');
      }
    } catch (err) {
      setAuthError('Failed to modify profile records.');
    }
  };

  const handleProfileLicenseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfileSuccess('');
    setAuthError('');

    const res = await uploadLicense(file);
    if (res.success) {
      setProfileSuccess('License uploaded and account successfully verified!');
    } else {
      setAuthError(res.message);
    }
  };

  // Booking Cancellations
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this reservation request?')) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ reason: 'Cancelled by customer' })
      });
      const result = await res.json();
      if (result.success) {
        await fetchMyBookings();
        refreshNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Booking Extensions
  const handleExtendBooking = async (e) => {
    e.preventDefault();
    setExtSuccess('');
    setExtError('');

    try {
      const res = await fetch(`${API_BASE}/bookings/${extBookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ extendDays: extDays })
      });
      const result = await res.json();
      if (result.success) {
        setExtSuccess(`Rental extended successfully by ${extDays} days!`);
        await fetchMyBookings();
        refreshNotifications();
        setTimeout(() => setExtBookingId(null), 2500);
      } else {
        setExtError(result.message);
      }
    } catch (err) {
      setExtError('Extension failed due to overlapping reservation schedules.');
    }
  };

  // Fetch and display Invoice Receipt
  const handleFetchInvoice = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/invoice`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setActiveInvoice(result.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRentCarTrigger = (car) => {
    if (!user) {
      // Prompt login
      setActiveTab('profile');
      setIsLogin(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setRentingCar(car);
    }
  };

  // Clear filters
  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedFuel('');
    setSelectedTransmission('');
    setSelectedSeats('');
    setMaxPrice(10000);
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Loading Car Rental Engine...
      </div>
    );
  }

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Minimalist Navbar */}
      <header className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        padding: '0 24px',
        height: '65px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('catalog')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <Car size={18} style={{ color: 'var(--text-primary)' }} />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            fontFamily: 'var(--font-title)', 
            letterSpacing: '0.15em',
            color: 'var(--text-primary)'
          }}>
            CAR RENTAL
          </span>
        </div>

        {/* Tab Controls */}
        <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`btn-secondary ${activeTab === 'catalog' ? 'btn-primary' : ''}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Catalog
          </button>
          
          {user && (
            <>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`btn-secondary ${activeTab === 'bookings' ? 'btn-primary' : ''}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                My Rentals
              </button>
              
              {user.role === 'admin' && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`btn-secondary ${activeTab === 'admin' ? 'btn-primary' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Admin Control
                </button>
              )}
            </>
          )}

          <button 
            onClick={() => setActiveTab('profile')}
            className={`btn-secondary ${activeTab === 'profile' ? 'btn-primary' : ''}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {user ? `Profile (${user.name.split(' ')[0]})` : 'Login'}
          </button>
        </nav>

        {/* Action Tray */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          {user && (
            <>
              {/* Notification Center Trigger */}
              <button 
                onClick={() => setShowNotifications(prev => !prev)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: showNotifications ? 'var(--accent-secondary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '6px'
                }}
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'var(--accent-danger)',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: '700',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 6px var(--accent-danger)'
                  }}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button 
                onClick={logout} 
                className="btn-secondary" 
                style={{ padding: '8px 12px', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>

        {/* Interactive Alerts Dropdown */}
        <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      </header>

      {/* 2. Main Tab Body */}
      <main style={{ flexGrow: 1, padding: '30px 24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        
        {/* TAB 1: VEHICLE CATALOG */}
        {activeTab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Catalog Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
                  Premium Fleet Catalog
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Browse, filter, and reserve top-tier luxury SUVs, sedans, and hatchbacks.
                </p>
              </div>

              {/* View Split Map Toggle */}
              <button 
                onClick={() => setShowMap(prev => !prev)}
                className="btn-secondary"
                style={{ fontSize:'13px', display:'flex', gap:'8px' }}
              >
                {showMap ? <Grid size={16} /> : <Map size={16} />}
                {showMap ? 'Hide Location Map' : 'Split-Screen Map View'}
              </button>
            </div>

            {/* Split Screen Grid & Map Layout */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: showMap ? 'minmax(300px, 1.2fr) minmax(350px, 0.8fr)' : '1fr', 
              gap: '24px', 
              alignItems: 'start' 
            }}>
              
              {/* Left Panel: Filters + Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Advanced Filter Sidebar */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily:'var(--font-title)', display:'flex', gap:'8px', alignItems:'center' }}>
                      <SlidersHorizontal size={15} /> Search & Filter Parameters
                    </h3>
                    <button onClick={resetFilters} style={{ background:'transparent', border:'none', color:'var(--accent-secondary)', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                      Clear All
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    
                    {/* Brand Search */}
                    <div style={{ position: 'relative' }}>
                      <label className="form-label">Search Brand</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Tesla, BMW" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input" 
                        style={{ paddingLeft: '38px' }}
                      />
                      <Search size={14} className="text-muted" style={{ position:'absolute', left:'14px', top:'40px' }} />
                    </div>

                    {/* Category Select */}
                    <div>
                      <label className="form-label">Category</label>
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="form-input"
                        style={{ background: '#121420' }}
                      >
                        <option value="">All Categories</option>
                        <option value="SUV">SUV</option>
                        <option value="Sedan">Sedan</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </div>

                    {/* Fuel Select */}
                    <div>
                      <label className="form-label">Fuel Type</label>
                      <select 
                        value={selectedFuel} 
                        onChange={(e) => setSelectedFuel(e.target.value)}
                        className="form-input"
                        style={{ background: '#121420' }}
                      >
                        <option value="">All Fuel Types</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                      </select>
                    </div>

                    {/* Transmission Select */}
                    <div>
                      <label className="form-label">Transmission</label>
                      <select 
                        value={selectedTransmission} 
                        onChange={(e) => setSelectedTransmission(e.target.value)}
                        className="form-input"
                        style={{ background: '#121420' }}
                      >
                        <option value="">All Transmissions</option>
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Pricing Slider + Calendar Date overlaps */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop:'16px' }}>
                    
                    {/* Rate slider */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                        <label className="form-label" style={{ margin:0 }}>Max Daily Rate</label>
                        <span style={{ fontSize:'12px', fontWeight:'700', color:'var(--accent-secondary)' }}>₹{maxPrice}</span>
                      </div>
                      <input 
                        type="range" 
                        min="500" 
                        max="10000" 
                        step="100"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor:'pointer' }}
                      />
                    </div>

                    {/* Check Calendar Starts */}
                    <div>
                      <label className="form-label">Start Date (Check Overlaps)</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input" 
                      />
                    </div>

                    {/* Check Calendar Ends */}
                    <div>
                      <label className="form-label">End Date (Check Overlaps)</label>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input" 
                      />
                    </div>
                  </div>
                </div>

                {/* Main Cars catalog feed */}
                {catalogLoading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Recalculating available fleet matches...
                  </div>
                ) : cars.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px'
                  }}>
                    {cars.map(car => (
                      <CarCard 
                        key={car.id} 
                        car={car} 
                        onSelectMap={(selected) => {
                          setSelectedMapCar(selected);
                          setShowMap(true); // Auto-force map open
                        }}
                        onRent={handleRentCarTrigger} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding:'50px', textAlign:'center', color:'var(--text-muted)' }}>
                    No fleet vehicles match your search parameter filters. Try clearing dates or adjustments!
                  </div>
                )}
              </div>

              {/* Right Panel: Split Leaflet Map View */}
              {showMap && (
                <div className="glass-panel animate-fade-in" style={{
                  position: 'sticky',
                  top: '90px',
                  height: 'calc(100vh - 120px)',
                  minHeight: '400px',
                  overflow: 'hidden',
                  padding: '4px'
                }}>
                  <LeafletMap 
                    cars={cars} 
                    selectedCar={selectedMapCar} 
                    onRentCar={handleRentCarTrigger}
                  />
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: MY BOOKINGS HISTORY & CONTROLS */}
        {activeTab === 'bookings' && user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
            <div>
              <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontFamily:'var(--font-title)' }}>
                Your Reservation History
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Review active rentals, submit extension dates, and download receipt invoices.
              </p>
            </div>

            {/* Extends Editor Widget Drawer */}
            {extBookingId && (
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--accent-primary)', background: 'rgba(99,102,241,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                  <h3 style={{ fontSize:'15px', color:'var(--text-primary)' }}>Extend Rental Duration</h3>
                  <button onClick={() => setExtBookingId(null)} className="btn-secondary" style={{ padding:'4px 8px' }}><X size={14} /></button>
                </div>
                
                {extSuccess && <div style={{ color:'var(--accent-success)', fontSize:'13px', marginBottom:'10px' }}>{extSuccess}</div>}
                {extError && <div style={{ color:'var(--accent-danger)', fontSize:'13px', marginBottom:'10px' }}>{extError}</div>}

                <form onSubmit={handleExtendBooking} style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                  <div style={{ flexGrow:1 }}>
                    <label className="form-label">Select Extension Duration (Days)</label>
                    <select 
                      value={extDays} 
                      onChange={(e) => setExtDays(e.target.value)} 
                      className="form-input"
                      style={{ background: '#121420' }}
                    >
                      <option value="1">1 Extra Day</option>
                      <option value="3">3 Extra Days</option>
                      <option value="7">1 Extra Week</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop:'22px' }}>
                    Confirm Extension
                  </button>
                </form>
              </div>
            )}

            {/* Print Invoice Modal Popup */}
            {activeInvoice && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(5, 6, 10, 0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px'
              }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom:'12px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{activeInvoice.invoiceNumber}</h2>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Issued: {new Date(activeInvoice.issueDate).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => setActiveInvoice(null)} className="btn-secondary" style={{ padding:'6px' }}><X size={18} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '12px', marginBottom: '20px' }}>
                    <div>
                      <span style={{ color:'var(--text-muted)', display:'block', textTransform:'uppercase', fontSize:'10px' }}>Billing To</span>
                      <strong style={{ fontSize:'13px', display:'block', margin:'4px 0' }}>{activeInvoice.billingTo.name}</strong>
                      <span>{activeInvoice.billingTo.email}</span><br />
                      <span>{activeInvoice.billingTo.phone}</span>
                    </div>
                    <div>
                      <span style={{ color:'var(--text-muted)', display:'block', textTransform:'uppercase', fontSize:'10px' }}>Rental Asset</span>
                      <strong style={{ fontSize:'13px', display:'block', margin:'4px 0' }}>{activeInvoice.vehicle.brand} {activeInvoice.vehicle.name}</strong>
                      <span>Segment: {activeInvoice.vehicle.category}</span><br />
                      <span>Rate: ₹{activeInvoice.vehicle.pricePerDay}/day</span>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(18,20,32,0.4)', fontSize: '13px', marginBottom: '20px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:'var(--text-secondary)' }}>Daily Base Total ({activeInvoice.summary.totalDays} Days):</span>
                      <span>₹{activeInvoice.summary.basePrice}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:'var(--text-secondary)' }}>Service Charge (5%):</span>
                      <span>₹{activeInvoice.summary.serviceFee}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:'var(--text-secondary)' }}>Tax Fee (8%):</span>
                      <span>₹{activeInvoice.summary.tax}</span>
                    </div>
                    {parseFloat(activeInvoice.summary.discount) > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', color:'var(--accent-success)', marginBottom:'4px' }}>
                        <span>Promo Code ({activeInvoice.summary.couponUsed}):</span>
                        <span>-₹{activeInvoice.summary.discount}</span>
                      </div>
                    )}
                    <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.05)', margin:'8px 0' }} />
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'16px', color:'var(--accent-secondary)' }}>
                      <span>Paid Grand Total:</span>
                      <span>₹{activeInvoice.summary.grandTotal}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', fontSize:'11px', color:'var(--text-muted)' }}>
                    Invoice confirmation paid via Simulated On-Pickup Gateway. Drive safely!
                  </div>
                </div>
              </div>
            )}

            {bookingLoading ? (
              <div style={{ padding:'40px', textAlign:'center', color:'var(--text-secondary)' }}>Loading rental logs...</div>
            ) : myBookings.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                {myBookings.map(b => (
                  <div key={b.id} className="glass-panel animate-fade-in" style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'16px' }}>
                    
                    {/* Header: Car details + Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap:'wrap', gap:'12px' }}>
                      <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                        <img 
                          src={b.car?.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=200'} 
                          style={{ width:'80px', height:'55px', objectFit:'cover', borderRadius:'8px' }} 
                        />
                        <div>
                          <h3 style={{ fontSize:'18px', color:'var(--text-primary)', fontFamily:'var(--font-title)' }}>
                            {b.car?.brand} {b.car?.name}
                          </h3>
                          <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                            Pickup Hub: {b.pickupLocation}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <span className={`badge ${
                          b.status === 'Pending' ? 'badge-pending' : 
                          b.status === 'Approved' ? 'badge-suv' : 
                          b.status === 'Active' ? 'badge-sedan' :
                          b.status === 'Completed' ? 'badge-hatchback' : 'badge-danger'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>

                    {/* Timeline & Price summary details */}
                    <div style={{ 
                      display:'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                      gap:'16px', 
                      borderTop:'1px solid rgba(255,255,255,0.03)', 
                      paddingTop:'12px' 
                    }}>
                      <div>
                        <span style={{ fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase', display:'block' }}>Rental Range</span>
                        <span style={{ fontSize:'13px', fontWeight:'600' }}>
                          {new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase', display:'block' }}>Total Duration</span>
                        <span style={{ fontSize:'13px', fontWeight:'600' }}>
                          {b.totalDays} Days {b.extDurationHours > 0 && `(Includes +${b.extDurationHours/24}d Extension)`}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase', display:'block' }}>Total Paid</span>
                        <span style={{ fontSize:'14px', fontWeight:'700', color:'var(--accent-secondary)' }}>
                          ₹{b.priceBreakdown?.totalAmount}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons drawer */}
                    <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', borderTop:'1px solid rgba(255,255,255,0.03)', paddingTop:'12px' }}>
                      <button 
                        onClick={() => handleFetchInvoice(b.id)}
                        className="btn-secondary" 
                        style={{ padding:'6px 12px', fontSize:'12px' }}
                      >
                        <FileText size={14} style={{ display:'inline', marginRight:'4px' }} /> View Invoice
                      </button>

                      {(b.status === 'Approved' || b.status === 'Active') && (
                        <button 
                          onClick={() => { setExtBookingId(b.id); setExtDays(1); setExtSuccess(''); setExtError(''); }}
                          className="btn-secondary" 
                          style={{ padding:'6px 12px', fontSize:'12px', borderColor:'var(--accent-primary)', color:'var(--accent-primary)' }}
                        >
                          Extend Rental
                        </button>
                      )}

                      {(b.status === 'Pending' || b.status === 'Approved') && (
                        <button 
                          onClick={() => handleCancelBooking(b.id)}
                          className="btn-secondary" 
                          style={{ padding:'6px 12px', fontSize:'12px', borderColor:'var(--accent-danger)', color:'var(--accent-danger)' }}
                        >
                          Cancel Rental
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding:'50px', textAlign:'center', color:'var(--text-muted)' }}>
                You have not booked any rental vehicles yet. Go back to the Catalog page to rent cars!
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USER PROFILE & LICENSE PORTALS */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
            
            {/* If user is NOT logged in, show Auth panels */}
            {!user ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'20px 0' }}>
                <div className="glass-panel" style={{ width:'100%', maxWidth:'450px', padding:'30px' }}>
                  <h2 style={{ fontSize:'24px', color:'var(--text-primary)', fontFamily:'var(--font-title)', marginBottom:'8px', textAlign:'center' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'20px', textAlign:'center' }}>
                    {isLogin ? 'Log in to rent premium cars and manage bookings.' : 'Register to start booking premium vehicles today.'}
                  </p>

                  {authError && (
                    <div style={{
                      background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-danger)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--accent-danger)', fontSize: '13px', marginBottom: '16px'
                    }}>
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                    {!isLogin && (
                      <div>
                        <label className="form-label">Full Name *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. John Doe"
                          value={authForm.name}
                          onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                          className="form-input" 
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="form-label">Email Address *</label>
                      <input 
                        type="email" 
                        placeholder="your@email.com"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        className="form-input" 
                        required
                      />
                    </div>
                    {!isLogin && (
                      <div>
                        <label className="form-label">Phone Number</label>
                        <input 
                          type="text" 
                          placeholder="+1 (555) 123-4567"
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({...authForm, phone: e.target.value})}
                          className="form-input" 
                        />
                      </div>
                    )}
                    <div>
                      <label className="form-label">Account Password *</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                        className="form-input" 
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'8px' }}>
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                  </form>

                  <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                      onClick={() => { setIsLogin(prev => !prev); setAuthError(''); }}
                      style={{ background:'transparent', border:'none', color:'var(--accent-secondary)', fontWeight:'600', cursor:'pointer' }}
                    >
                      {isLogin ? 'Create one' : 'Sign in'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // If logged in, show profile dashboard
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                
                {/* Profile detail updates */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', fontFamily:'var(--font-title)' }}>
                    Personal Details
                  </h3>

                  {profileSuccess && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--accent-success)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--accent-success)', fontSize: '13px', marginBottom: '16px'
                    }}>
                      {profileSuccess}
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                    <div>
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        value={profileForm.name} 
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        className="form-input" 
                      />
                    </div>
                    <div>
                      <label className="form-label">Email Address (Read-only)</label>
                      <input 
                        type="email" 
                        value={user.email} 
                        className="form-input" 
                        style={{ opacity: 0.5, cursor:'not-allowed' }}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="text" 
                        value={profileForm.phone} 
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        className="form-input" 
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ alignSelf:'flex-start' }}>
                      Update Information
                    </button>
                  </form>
                </div>

                {/* Identity Verification details Upload */}
                <div className="glass-panel" style={{ padding: '24px', display:'flex', flexDirection:'column', gap:'20px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontFamily:'var(--font-title)' }}>
                    Driving License Verification
                  </h3>

                  {user.isVerified ? (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <UserCheck size={40} style={{ color: 'var(--accent-success)' }} />
                      <div>
                        <strong style={{ color:'var(--text-primary)', fontSize:'15px', display:'block' }}>Account Verified</strong>
                        <span style={{ color:'var(--text-secondary)', fontSize:'12px' }}>
                          Your license is verified and you are fully authorized to book vehicles.
                        </span>
                      </div>
                      
                      {user.drivingLicenseUrl && (
                        <a 
                          href={`${UPLOADS_BASE}${user.drivingLicenseUrl}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontSize:'12px', fontWeight:'600' }}
                        >
                          View Uploaded Document
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}>
                        <ShieldAlert size={20} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <strong>Verification Required</strong><br />
                          Upload your valid driving license to clear the verification blocks. Pending bookings are gated until verification is approved.
                        </div>
                      </div>

                      <div style={{
                        border: '2px dashed var(--border-glass)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        textAlign: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        background: 'rgba(18,20,32,0.2)'
                      }} className="glass-panel-hover">
                        <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          onChange={handleProfileLicenseUpload}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight:'600', display:'block', marginBottom:'4px' }}>
                          Select or Drop File to Upload
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          PDF, JPEG, or PNG up to 5MB
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMIN OPERATIONS */}
        {activeTab === 'admin' && user && user.role === 'admin' && (
          <AdminAnalytics />
        )}

      </main>

      {/* 3. Dynamic Booking Flow Modal */}
      {rentingCar && (
        <BookingModal 
          car={rentingCar} 
          onClose={() => setRentingCar(null)} 
          onBookingSuccess={() => {
            fetchMyBookings();
            refreshNotifications();
          }}
        />
      )}

      {/* 4. Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-glass)',
        padding: '20px 24px',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        &copy; {new Date().getFullYear()} Car Rental Application. High-Fidelity Glassmorphic Obsidian Design. All simulated payments skipped.
      </footer>

    </div>
  );
}

export default App;
