import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Tag, ChevronRight, FileText, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'https://carrentalsystem-yczy.onrender.com/api';

export const BookingModal = ({ car, onClose, onBookingSuccess }) => {
  const { user, uploadLicense } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1 Form States
  const [pickupLocation, setPickupLocation] = useState('Indira Gandhi International Airport (T3)');
  const [dropLocation, setDropLocation] = useState('Indira Gandhi International Airport (T3)');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Step 2 Promo States
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState('');

  // Step 3 Upload States
  const [licenseFile, setLicenseFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Price Calculations
  const [days, setDays] = useState(0);
  const [prices, setPrices] = useState({
    basePrice: 0,
    serviceFee: 0,
    tax: 0,
    discount: 0,
    totalAmount: 0
  });

  // Calculate days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start && end && end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const finalDays = diffDays === 0 ? 1 : diffDays;
        setDays(finalDays);
      } else {
        setDays(0);
      }
    } else {
      setDays(0);
    }
  }, [startDate, endDate]);

  // Update prices when days or discount changes
  useEffect(() => {
    if (days > 0) {
      const basePrice = car.pricePerDay * days;
      const serviceFee = basePrice * 0.05;
      const tax = basePrice * 0.08;
      const discount = (basePrice * discountPercent) / 100;
      const totalAmount = basePrice + serviceFee + tax - discount;

      setPrices({
        basePrice: parseFloat(basePrice.toFixed(2)),
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2))
      });
    } else {
      setPrices({ basePrice: 0, serviceFee: 0, tax: 0, discount: 0, totalAmount: 0 });
    }
  }, [days, discountPercent, car.pricePerDay]);

  // Pre-populate dates on load with tomorrow and day-after
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 3); // 3-day default
    dayAfter.setHours(18, 0, 0, 0); // 6 PM drop-off

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setStartDate(formatDate(tomorrow));
    setEndDate(formatDate(dayAfter));
  }, []);

  const handleNextStep1 = () => {
    setError('');
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < new Date(Date.now() - 1000 * 60 * 30)) { // 30m padding
      setError('Pickup date cannot be in the past.');
      return;
    }
    if (end <= start) {
      setError('Drop-off date must be after pickup date.');
      return;
    }
    if (days <= 0) {
      setError('Please select valid rental dates.');
      return;
    }
    setStep(2);
  };

  const handleVerifyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponSuccess('');
    setError('');

    try {
      // Simulate verifying with server
      const code = couponCode.toUpperCase();
      let percent = 0;
      
      // Seed matching codes
      if (code === 'WELCOME10') {
        percent = 10;
      } else if (code === 'ROADTRIP') {
        percent = 20;
      } else {
        // Mock server fetch behavior
        setError('Invalid or expired coupon code.');
        setDiscountPercent(0);
        setCouponApplied('');
        setCouponLoading(false);
        return;
      }

      setDiscountPercent(percent);
      setCouponApplied(code);
      setCouponSuccess(`Coupon ${code} applied successfully! (${percent}% off)`);
    } catch (e) {
      setError('Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleNextStep2 = () => {
    // If user is not verified, force license upload step. 
    // Otherwise, transition straight to submitting the booking request.
    if (!user.isVerified) {
      setStep(3);
    } else {
      submitBookingRequest();
    }
  };

  const handleLicenseUpload = async (e) => {
    e.preventDefault();
    if (!licenseFile) return;

    setUploadProgress(true);
    setError('');

    const res = await uploadLicense(licenseFile);
    setUploadProgress(false);

    if (res.success) {
      // User is now verified in Auth Context, continue to submit booking
      submitBookingRequest();
    } else {
      setError(res.message || 'Failed to upload driving license.');
    }
  };

  const submitBookingRequest = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          carId: car.id,
          pickupLocation,
          dropLocation,
          startDate,
          endDate,
          couponCode: couponApplied
        })
      });

      const result = await res.json();
      if (result.success) {
        onBookingSuccess();
        setStep(4); // Success step
      } else {
        setError(result.message || 'Failed to confirm reservation.');
      }
    } catch (err) {
      setError('Server unreachable. Could not complete booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 6, 10, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '550px',
        position: 'relative',
        boxShadow: 'none',
        border: '1px solid var(--border-glass)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: '600' }}>
              Step {step} of {user?.isVerified ? 3 : 4}
            </span>
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
              Rent {car.brand} {car.name}
            </h2>
          </div>
          {step !== 4 && (
            <button onClick={onClose} style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }} className="car-image-hover">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid var(--accent-danger)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--accent-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Rental Context */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label"><MapPin size={13} style={{ display:'inline', marginRight:'4px' }} /> Pickup Hub</label>
                  <select 
                    value={pickupLocation} 
                    onChange={(e) => setPickupLocation(e.target.value)} 
                    className="form-input"
                    style={{ background: '#121420' }}
                  >
                    <option value="Indira Gandhi International Airport (T3)">IGI Airport (T3), New Delhi</option>
                    <option value="Connaught Place Central Hub">Connaught Place Central Hub</option>
                    <option value="Gurugram Sector 29 Depot">Gurugram Sector 29 Depot</option>
                  </select>
                </div>
                <div>
                  <label className="form-label"><MapPin size={13} style={{ display:'inline', marginRight:'4px' }} /> Drop Hub</label>
                  <select 
                    value={dropLocation} 
                    onChange={(e) => setDropLocation(e.target.value)} 
                    className="form-input"
                    style={{ background: '#121420' }}
                  >
                    <option value="Indira Gandhi International Airport (T3)">IGI Airport (T3), New Delhi</option>
                    <option value="Connaught Place Central Hub">Connaught Place Central Hub</option>
                    <option value="Gurugram Sector 29 Depot">Gurugram Sector 29 Depot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label"><Calendar size={13} style={{ display:'inline', marginRight:'4px' }} /> Pickup Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input" 
                />
              </div>

              <div>
                <label className="form-label"><Calendar size={13} style={{ display:'inline', marginRight:'4px' }} /> Drop-off Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input" 
                />
              </div>

              {days > 0 && (
                <div style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Calculated Duration:</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-secondary)', fontFamily: 'var(--font-title)' }}>
                    {days} {days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Invoice Breakdown */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(18,20,32,0.4)' }}>
                <h3 style={{ fontSize: '14px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'12px', letterSpacing:'0.05em' }}>
                  Invoice Breakdown
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display:'flex', justifyBetween:'space-between', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-secondary)' }}>Daily Rate ({days} days x ₹{car.pricePerDay}):</span>
                    <span>₹{prices.basePrice}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-secondary)' }}>Premium Service Fee (5%):</span>
                    <span>₹{prices.serviceFee}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-secondary)' }}>Local Highway Tax (8%):</span>
                    <span>₹{prices.tax}</span>
                  </div>
                  
                  {prices.discount > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', color:'var(--accent-success)' }}>
                      <span>Coupon Discount ({discountPercent}%):</span>
                      <span>-₹{prices.discount}</span>
                    </div>
                  )}

                  <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.05)', margin:'8px 0' }} />
                  
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'17px', color:'var(--accent-secondary)' }}>
                    <span>Estimated Total:</span>
                    <span style={{ fontFamily:'var(--font-title)' }}>₹{prices.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Promo Coupon Entry */}
              <div>
                <label className="form-label"><Tag size={13} style={{ display:'inline', marginRight:'4px' }} /> Have a Coupon Code?</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. WELCOME10, ROADTRIP" 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value)} 
                    className="form-input" 
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button 
                    disabled={couponLoading}
                    onClick={handleVerifyCoupon}
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '10px 16px' }}
                  >
                    {couponLoading ? 'Validating...' : 'Apply'}
                  </button>
                </div>
                {couponSuccess && (
                  <span style={{ fontSize: '12px', color: 'var(--accent-success)', display: 'block', marginTop: '6px' }}>
                    {couponSuccess}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Identity & Upload Gating */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <UploadCloud size={48} className="text-muted" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontFamily:'var(--font-title)', marginBottom:'6px' }}>
                  Driving License Required
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  To finalize this booking request, you must upload a high-resolution photo or PDF of your driving license for safety verification.
                </p>
              </div>

              <form onSubmit={handleLicenseUpload} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div style={{
                  border: '2px dashed var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  cursor: 'pointer',
                  background: 'rgba(18,20,32,0.2)',
                  transition: 'var(--transition-smooth)'
                }} className="glass-panel-hover">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => setLicenseFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="modal-license-file"
                  />
                  <label htmlFor="modal-license-file" style={{ cursor:'pointer', display:'block' }}>
                    {licenseFile ? (
                      <div>
                        <FileText size={24} style={{ color: 'var(--accent-secondary)', margin:'0 auto 8px auto' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight:'600' }}>
                          {licenseFile.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display:'block', marginTop:'4px' }}>
                          {(licenseFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display:'block', marginBottom:'4px' }}>
                          Click to select your license file
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          PDF, JPEG, or PNG up to 5MB
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={!licenseFile || uploadProgress}
                  className="btn-primary" 
                  style={{ width:'100%', justifyContent:'center' }}
                >
                  {uploadProgress ? 'Uploading and Verifying...' : 'Upload & Confirm Booking'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS Receipt */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <CheckCircle2 size={56} style={{ color: 'var(--accent-success)', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }} />
              
              <div>
                <h3 style={{ fontSize: '22px', color: 'var(--text-primary)', fontFamily:'var(--font-title)', marginBottom:'6px' }}>
                  Booking Requested!
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth:'400px' }}>
                  Excellent choice! Your reservation request for the **{car.brand} {car.name}** has been recorded and submitted to our dispatch operators.
                </p>
              </div>

              <div className="glass-panel" style={{ width: '100%', padding: '16px 20px', background: 'rgba(18,20,32,0.4)', textAlign: 'left', fontSize:'13px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ color:'var(--text-muted)' }}>Pickup Location:</span>
                  <span style={{ fontWeight:'600' }}>{pickupLocation}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ color:'var(--text-muted)' }}>Dates:</span>
                  <span style={{ fontWeight:'600' }}>
                    {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--text-muted)' }}>Status:</span>
                  <span style={{ fontWeight:'700', color:'var(--accent-warning)' }}>PENDING APPROVAL</span>
                </div>
              </div>

              <p style={{ fontSize:'12px', color:'var(--text-muted)', maxWidth:'400px' }}>
                An operator will review your license and approve the rental shortly. You can track this booking's state or extend the timeline inside your Customer Dashboard!
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step !== 4 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(9, 10, 15, 0.3)'
          }}>
            {step > 1 ? (
              <button 
                onClick={() => setStep(prev => prev - 1)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Back
              </button>
            ) : (
              <div></div> // Spacing
            )}

            {step === 1 && (
              <button 
                onClick={handleNextStep1}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            )}

            {step === 2 && (
              <button 
                disabled={loading}
                onClick={handleNextStep2}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                {loading ? 'Processing...' : (user?.isVerified ? 'Confirm Booking' : 'Verify & Continue')}
              </button>
            )}
          </div>
        )}

        {/* Close Button for Success Step */}
        {step === 4 && (
          <div style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid var(--border-glass)' }}>
            <button 
              onClick={onClose}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Back to Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
