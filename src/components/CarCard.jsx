import React from 'react';
import { Star, MapPin } from 'lucide-react';

export const CarCard = ({ car, onSelectMap, onRent }) => {
  const getBadgeClass = (category) => {
    switch (category) {
      case 'SUV': return 'badge badge-suv';
      case 'Sedan': return 'badge badge-sedan';
      case 'Hatchback': return 'badge badge-hatchback';
      case 'Luxury': return 'badge badge-luxury';
      default: return 'badge';
    }
  };

  const averageRating = car.averageRating || 0;
  const totalReviews = car.totalReviews || 0;

  return (
    <div className="glass-panel glass-panel-hover animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Car Image */}
      <div style={{
        position: 'relative',
        height: '170px',
        width: '100%',
        overflow: 'hidden',
        background: '#121214'
      }}>
        <img 
          src={car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600'} 
          alt={`${car.brand} ${car.name}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '40px',
          background: 'linear-gradient(to top, rgba(9, 10, 11, 0.7), transparent)',
          zIndex: 1
        }}></div>
      </div>

      {/* Car Body Details */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className={getBadgeClass(car.category)}>{car.category}</span>
          
          {/* Average Rating Stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={12} style={{ fill: '#fafafa', stroke: '#fafafa' }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {averageRating > 0 ? averageRating : 'New'}
            </span>
            {totalReviews > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                ({totalReviews})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)', margin: 0 }}>
            {car.brand} <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>{car.name}</span>
          </h3>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: car.isAvailable ? 'var(--accent-success)' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: car.isAvailable ? 'var(--accent-success)' : 'var(--text-muted)' 
            }}></span>
            {car.isAvailable ? 'Available' : 'Reserved'}
          </span>
        </div>

        {/* Fleet Specs Row - Clean dot separated */}
        <div style={{ 
          fontSize: '12px',
          color: 'var(--text-secondary)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '8px 0',
          marginBottom: '16px'
        }}>
          {car.transmission} &bull; {car.fuelType} &bull; {car.seats} Seats
        </div>


        {/* Pricing and Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Rate</span>
            <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-secondary)', fontFamily: 'var(--font-title)' }}>
              ₹{car.pricePerDay}
              <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-secondary)' }}> /day</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onSelectMap && car.isAvailable && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSelectMap(car); }}
                className="btn-secondary"
                style={{ padding: '8px 10px' }}
                title="Locate on Map"
              >
                <MapPin size={15} />
              </button>
            )}

            <button 
              disabled={!car.isAvailable}
              onClick={(e) => { e.stopPropagation(); onRent(car); }}
              className="btn-primary"
              style={{ 
                padding: '8px 16px', 
                fontSize: '12px', 
                opacity: car.isAvailable ? 1 : 0.4,
                cursor: car.isAvailable ? 'pointer' : 'not-allowed'
              }}
            >
              {car.isAvailable ? 'Rent Now' : 'Reserved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
