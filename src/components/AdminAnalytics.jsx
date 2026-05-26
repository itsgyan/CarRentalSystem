import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldAlert, Car, Users, Calendar, Check, X, UserCheck, Plus, Trash, Eye, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard Sub-tabs: 'metrics' | 'bookings' | 'fleet' | 'users'
  const [subTab, setSubTab] = useState('metrics');

  // Fleet Add Form States
  const [newCar, setNewCar] = useState({
    brand: '',
    name: '',
    category: 'SUV',
    transmission: 'Automatic',
    fuelType: 'Electric',
    seats: 5,
    pricePerDay: '',
    image1: '',
    acceleration: '',
    topSpeed: '',
    engine: '',
    range: ''
  });

  const [addCarSuccess, setAddCarSuccess] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Initial Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${user.token}` };

      // 1. Fetch Analytics
      const resAnalytic = await fetch('http://localhost:5000/api/admin/analytics', { headers });
      const analyticData = await resAnalytic.json();
      if (analyticData.success) setAnalytics(analyticData.data);

      // 2. Fetch Bookings
      const resBookings = await fetch('http://localhost:5000/api/admin/bookings', { headers });
      const bookingData = await resBookings.json();
      if (bookingData.success) setBookings(bookingData.data);

      // 3. Fetch Users
      const resUsers = await fetch('http://localhost:5000/api/admin/users', { headers });
      const usersData = await resUsers.json();
      if (usersData.success) setUsersList(usersData.data);

    } catch (e) {
      setError('Failed to aggregate admin dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.token]);

  // Handle Booking Status Transitions
  const handleUpdateStatus = async (bookingId, status, reason = '') => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status, reason })
      });
      const result = await res.json();
      if (result.success) {
        setRejectId(null);
        setRejectReason('');
        await fetchData(); // Refresh data
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Failed to change booking status:', err);
    }
  };

  // Handle Manual User License Verification
  const handleVerifyUser = async (userId, isVerified) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ isVerified })
      });
      const result = await res.json();
      if (result.success) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to verify user:', err);
    }
  };

  // Handle Adding new Car
  const handleAddCar = async (e) => {
    e.preventDefault();
    setAddCarSuccess('');
    setError('');

    if (!newCar.brand || !newCar.name || !newCar.pricePerDay) {
      setError('Please fill in required fields (Brand, Name, Pricing).');
      return;
    }

    try {
      const specifications = {
        acceleration: newCar.acceleration || '5.5s (0-60 mph)',
        topSpeed: newCar.topSpeed || '130 mph',
        engine: newCar.engine || 'Electric Propulsion',
        range: newCar.range || '300 miles'
      };

      const payload = {
        brand: newCar.brand,
        name: newCar.name,
        category: newCar.category,
        transmission: newCar.transmission,
        fuelType: newCar.fuelType,
        seats: parseInt(newCar.seats),
        pricePerDay: parseFloat(newCar.pricePerDay),
        specifications: JSON.stringify(specifications),
        images: newCar.image1 ? [newCar.image1] : []
      };

      const res = await fetch('http://localhost:5000/api/admin/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        setAddCarSuccess('New vehicle successfully enrolled to the fleet!');
        setNewCar({
          brand: '',
          name: '',
          category: 'SUV',
          transmission: 'Automatic',
          fuelType: 'Electric',
          seats: 5,
          pricePerDay: '',
          image1: '',
          acceleration: '',
          topSpeed: '',
          engine: '',
          range: ''
        });
        await fetchData();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to transmit fleet enrollment request.');
    }
  };

  // Handle Deleting Car
  const handleDeleteCar = async (carId) => {
    if (!confirm('Are you sure you want to remove this vehicle from the active fleet catalog? This will drop related bookings.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/cars/${carId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !analytics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading business metrics...
      </div>
    );
  }

  const { summary = {}, statusBreakdown = {}, categoryPopularity = {}, revenueTimeline = [] } = analytics || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
      
      {/* Admin Title Card */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontFamily:'var(--font-title)' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Command operations center and revenue tracking console.
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding:'8px 16px', fontSize:'13px' }}>
          Refresh Feeds
        </button>
      </div>

      {/* Sub-Tabs Nav */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-glass)',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <button 
          onClick={() => setSubTab('metrics')}
          style={{
            background: 'transparent',
            border: 'none',
            color: subTab === 'metrics' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            borderBottom: subTab === 'metrics' ? '2px solid var(--accent-secondary)' : 'none',
            padding: '10px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Analytics & Charts
        </button>
        <button 
          onClick={() => setSubTab('bookings')}
          style={{
            background: 'transparent',
            border: 'none',
            color: subTab === 'bookings' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            borderBottom: subTab === 'bookings' ? '2px solid var(--accent-secondary)' : 'none',
            padding: '10px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Manage Rentals ({bookings.length})
        </button>
        <button 
          onClick={() => setSubTab('fleet')}
          style={{
            background: 'transparent',
            border: 'none',
            color: subTab === 'fleet' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            borderBottom: subTab === 'fleet' ? '2px solid var(--accent-secondary)' : 'none',
            padding: '10px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Fleet Enrollments
        </button>
        <button 
          onClick={() => setSubTab('users')}
          style={{
            background: 'transparent',
            border: 'none',
            color: subTab === 'users' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            borderBottom: subTab === 'users' ? '2px solid var(--accent-secondary)' : 'none',
            padding: '10px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Customer Roster
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid var(--accent-danger)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          color: 'var(--accent-danger)',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* SUBTAB 1: Metrics & Charts */}
      {subTab === 'metrics' && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Quick Metrics grid */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '20px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ background:'rgba(6, 182, 212, 0.15)', color:'var(--accent-secondary)', padding:'10px', borderRadius:'10px' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'block', textTransform:'uppercase' }}>Gross Revenue</span>
                <span style={{ fontSize:'24px', fontWeight:'800', fontFamily:'var(--font-title)' }}>₹{summary.totalRevenue}</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ background:'rgba(99, 102, 241, 0.15)', color:'var(--accent-primary)', padding:'10px', borderRadius:'10px' }}>
                <ArrowUpRight size={24} />
              </div>
              <div>
                <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'block', textTransform:'uppercase' }}>Utilization Rate</span>
                <span style={{ fontSize:'24px', fontWeight:'800', fontFamily:'var(--font-title)' }}>{summary.fleetUtilization}%</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ background:'rgba(16, 185, 129, 0.15)', color:'var(--accent-success)', padding:'10px', borderRadius:'10px' }}>
                <Car size={24} />
              </div>
              <div>
                <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'block', textTransform:'uppercase' }}>Fleet Enrolled</span>
                <span style={{ fontSize:'24px', fontWeight:'800', fontFamily:'var(--font-title)' }}>{summary.totalCars} Cars</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ background:'rgba(245, 158, 11, 0.15)', color:'var(--accent-warning)', padding:'10px', borderRadius:'10px' }}>
                <Users size={24} />
              </div>
              <div>
                <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'block', textTransform:'uppercase' }}>Active Customers</span>
                <span style={{ fontSize:'24px', fontWeight:'800', fontFamily:'var(--font-title)' }}>{summary.totalUsers} Clients</span>
              </div>
            </div>
          </div>

          {/* SVG Charts area */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Revenue timeline line-graph */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px', fontFamily:'var(--font-title)' }}>
                Recent Bookings Revenue
              </h3>

              {revenueTimeline.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Clean custom SVG bar chart */}
                  <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

                    {/* Bars */}
                    {revenueTimeline.map((item, i) => {
                      const maxVal = Math.max(...revenueTimeline.map(r => r.amount)) || 1;
                      const barHeight = (item.amount / maxVal) * 130;
                      const x = 55 + i * 55;
                      const y = 170 - barHeight;

                      return (
                        <g key={i}>
                          {/* Rectangle */}
                          <rect 
                            x={x} 
                            y={y} 
                            width="25" 
                            height={barHeight} 
                            rx="4" 
                            fill="url(#barGrad)" 
                            style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.3))' }}
                          />
                          {/* Text amount */}
                          <text x={x + 12.5} y={y - 6} fill="#f8fafc" fontSize="9" textAnchor="middle" fontWeight="600">
                            ₹{Math.round(item.amount)}
                          </text>
                          {/* Label */}
                          <text x={x + 12.5} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                            {item.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div style={{ height:'180px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'13px' }}>
                  No confirmed bookings revenue recorded yet.
                </div>
              )}
            </div>

            {/* Category popularity segment progress bars */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px', fontFamily:'var(--font-title)' }}>
                Vehicle Segment Demands
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(categoryPopularity).map(([category, count]) => {
                  const total = Object.values(categoryPopularity).reduce((a, b) => a + b, 0) || 1;
                  const percentage = Math.round((count / total) * 100);
                  
                  // Color codes
                  const colors = { SUV: '#6366f1', Sedan: '#06b6d4', Hatchback: '#10b981', Luxury: '#ec4899' };
                  const color = colors[category] || '#6366f1';

                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>{category}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{count} bookings ({percentage}%)</span>
                      </div>
                      
                      {/* Bar back */}
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.01)' }}>
                        {/* Fill bar */}
                        <div style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          background: color, 
                          borderRadius: '4px',
                          boxShadow: `0 0 10px ${color}`
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Manage Bookings Approvals */}
      {subTab === 'bookings' && (
        <div className="glass-panel" style={{ overflowX: 'auto', padding:'20px 24px' }}>
          <h3 style={{ fontSize:'16px', color:'var(--text-primary)', marginBottom:'16px', fontFamily:'var(--font-title)' }}>
            Active Reservations Dispatch Panel
          </h3>

          {rejectId && (
            <div style={{
              background: 'rgba(18,20,32,0.8)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Specify reason for rejecting booking request:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="e.g. Driving license upload is invalid/blurred."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-input"
                />
                <button 
                  onClick={() => handleUpdateStatus(rejectId, 'Rejected', rejectReason)}
                  className="btn-primary" 
                  style={{ background: 'var(--accent-danger)' }}
                >
                  Submit Decline
                </button>
                <button 
                  onClick={() => setRejectId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {bookings.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Client</th>
                  <th style={{ padding: '12px' }}>Vehicle</th>
                  <th style={{ padding: '12px' }}>Timeline</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px' }}>License</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600' }}>{b.user?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.user?.email}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600' }}>{b.car?.brand} {b.car?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.car?.category}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-secondary)' }}>({b.totalDays} Days)</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>
                      ₹{b.priceBreakdown?.totalAmount}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {b.user?.isVerified ? (
                        <span style={{ color: 'var(--accent-success)', display:'flex', alignItems:'center', gap:'4px' }}>
                          <Check size={14} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-warning)', display:'flex', alignItems:'center', gap:'4px' }}>
                          <ShieldAlert size={14} /> Unverified
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${
                        b.status === 'Pending' ? 'badge-pending' : 
                        b.status === 'Approved' ? 'badge-suv' : 
                        b.status === 'Active' ? 'badge-sedan' :
                        b.status === 'Completed' ? 'badge-hatchback' : 'badge-danger'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {b.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(b.id, 'Approved')}
                              className="btn-primary" 
                              style={{ padding: '6px 10px', fontSize: '11px', background: 'var(--accent-success)' }}
                              title="Approve Booking"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => setRejectId(b.id)}
                              className="btn-secondary" 
                              style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                              title="Reject Booking"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.status === 'Approved' && (
                          <button 
                            onClick={() => handleUpdateStatus(b.id, 'Active')}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--accent-primary)' }}
                          >
                            Check-Out keys
                          </button>
                        )}
                        {b.status === 'Active' && (
                          <button 
                            onClick={() => handleUpdateStatus(b.id, 'Completed')}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--accent-success)' }}
                          >
                            Complete return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding:'30px', textAlign:'center', color:'var(--text-muted)' }}>
              No rental transactions recorded.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: Fleet Enrollments */}
      {subTab === 'fleet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          {/* Enroll Car Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px', fontFamily:'var(--font-title)' }}>
              Enroll New Car to Catalog
            </h3>

            {addCarSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--accent-success)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: 'var(--accent-success)',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                {addCarSuccess}
              </div>
            )}

            <form onSubmit={handleAddCar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Brand/Manufacturer *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Audi"
                    value={newCar.brand}
                    onChange={(e) => setNewCar({...newCar, brand: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Model Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. e-tron GT"
                    value={newCar.name}
                    onChange={(e) => setNewCar({...newCar, name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Category *</label>
                  <select 
                    value={newCar.category} 
                    onChange={(e) => setNewCar({...newCar, category: e.target.value})}
                    className="form-input"
                    style={{ background: '#121420' }}
                  >
                    <option value="SUV">SUV</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Daily Price (₹) *</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1500"
                    value={newCar.pricePerDay}
                    onChange={(e) => setNewCar({...newCar, pricePerDay: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Transmission</label>
                  <select 
                    value={newCar.transmission} 
                    onChange={(e) => setNewCar({...newCar, transmission: e.target.value})}
                    className="form-input"
                    style={{ background: '#121420' }}
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Fuel Source</label>
                  <select 
                    value={newCar.fuelType} 
                    onChange={(e) => setNewCar({...newCar, fuelType: e.target.value})}
                    className="form-input"
                    style={{ background: '#121420' }}
                  >
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Seats</label>
                  <input 
                    type="number" 
                    value={newCar.seats}
                    onChange={(e) => setNewCar({...newCar, seats: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Unsplash Image URL</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..."
                    value={newCar.image1}
                    onChange={(e) => setNewCar({...newCar, image1: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Spec fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Acceleration (0-60)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 4.2s"
                    value={newCar.acceleration}
                    onChange={(e) => setNewCar({...newCar, acceleration: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Top Speed</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 155 mph"
                    value={newCar.topSpeed}
                    onChange={(e) => setNewCar({...newCar, topSpeed: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Engine details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dual Motor AWD"
                    value={newCar.engine}
                    onChange={(e) => setNewCar({...newCar, engine: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Range / Fuel Economy</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 290 miles"
                    value={newCar.range}
                    onChange={(e) => setNewCar({...newCar, range: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                <Plus size={16} /> Enroll Car to Fleet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Customer Roster */}
      {subTab === 'users' && (
        <div className="glass-panel" style={{ overflowX: 'auto', padding:'20px 24px' }}>
          <h3 style={{ fontSize:'16px', color:'var(--text-primary)', marginBottom:'16px', fontFamily:'var(--font-title)' }}>
            Customer Verification Console
          </h3>

          {usersList.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>License Document</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Override Verification</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      {u.drivingLicenseUrl ? (
                        <a 
                          href={`http://localhost:5000${u.drivingLicenseUrl}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: 'var(--accent-secondary)', textDecoration: 'none', display:'flex', alignItems:'center', gap:'4px' }}
                        >
                          <Eye size={14} /> View File
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not Uploaded</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.isVerified ? (
                        <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>VERIFIED</span>
                      ) : (
                        <span style={{ color: 'var(--accent-warning)', fontWeight: '600' }}>UNVERIFIED</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleVerifyUser(u.id, !u.isVerified)}
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '11px', borderColor: u.isVerified ? 'var(--accent-danger)' : 'var(--accent-success)' }}
                      >
                        {u.isVerified ? 'Revoke Status' : 'Approve Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding:'30px', textAlign:'center', color:'var(--text-muted)' }}>
              No registered user accounts.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
