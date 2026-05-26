import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issues in Leaflet inside built React environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A custom glow marker icon for our premium cars
const createPremiumIcon = (color = '#6366f1') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 15px ${color}, 0 0 5px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      ">
        <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// Pulsating blue marker icon representing the user's active GPS coordinate position
const createGPSIcon = () => {
  return L.divIcon({
    className: 'gps-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          background: rgba(33, 150, 243, 0.4);
          border-radius: 50%;
          animation: gps-pulse 2s infinite ease-out;
        "></div>
        <div style="
          width: 14px;
          height: 14px;
          background: #2196F3;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(33, 150, 243, 0.8), 0 0 2px rgba(0,0,0,0.5);
          z-index: 2;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -6]
  });
};

export const LeafletMap = ({ cars, selectedCar, onRentCar }) => {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef({});
  const userGPSMarkerInstance = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Off'); // 'Off' | 'Searching' | 'Locked' | 'Denied'

  // Standard center around New Delhi (fallback center)
  const defaultCenter = [28.6139, 77.2090];

  // Helper to dynamically position/scatter cars around Delhi fallback OR user's GPS center
  const getCarCoords = (brand, name, centerCoords) => {
    const hash = (brand + name).charCodeAt(0) + (brand + name).charCodeAt(1 || 0);
    const latOffset = ((hash % 30) - 15) * 0.003;
    const lngOffset = (((hash * 7) % 30) - 15) * 0.003;
    return [centerCoords[0] + latOffset, centerCoords[1] + lngOffset];
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map instance
    leafletMapInstance.current = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false
    });

    const map = leafletMapInstance.current;

    // Load ultra-premium dark map tiles from CartoDB Voyager Dark
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add custom zoom controls in top right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Trigger Browser GPS Geolocation Request automatically
    requestUserLocation();

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Request browser GPS position
  const requestUserLocation = () => {
    const map = leafletMapInstance.current;
    if (!map || !navigator.geolocation) return;

    setGpsStatus('Searching');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];
        
        setUserLocation(coords);
        setGpsStatus('Locked');

        // Center map to User coordinates dynamically
        map.setView(coords, 13);

        // Remove old GPS indicator marker if exists
        if (userGPSMarkerInstance.current) {
          map.removeLayer(userGPSMarkerInstance.current);
        }

        // Add glowing blue M3 GPS position marker
        userGPSMarkerInstance.current = L.marker(coords, { icon: createGPSIcon() })
          .addTo(map)
          .bindPopup('<strong style="color: #2196F3; font-family:\'Inter\';">Your GPS Location</strong>');
      },
      (error) => {
        console.warn('GPS positioning permission denied, using default center:', error.message);
        setGpsStatus('Denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Center map on user location
  const handleLocateUserClick = () => {
    const map = leafletMapInstance.current;
    if (map && userLocation) {
      map.flyTo(userLocation, 15, { animate: true, duration: 1.5 });
      if (userGPSMarkerInstance.current) {
        setTimeout(() => {
          userGPSMarkerInstance.current.openPopup();
        }, 1500);
      }
    } else {
      requestUserLocation();
    }
  };

  // Update Markers when cars list or selection changes
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !cars || cars.length === 0) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => map.removeLayer(marker));
    markersRef.current = {};

    // Center coordinates to base car dispersion (Delhi coordinates if GPS is denied or offline)
    const baseCenter = userLocation || defaultCenter;

    // Colors by category
    const categoryColors = {
      SUV: '#D0BCFF',     // M3 Lavender Primary
      Sedan: '#CCC2DC',   // M3 Sage Secondary
      Hatchback: '#10b981', // M3 Emerald
      Luxury: '#EFB8C8'    // M3 Clay Rose
    };

    cars.forEach(car => {
      if (!car.isAvailable) return; // Only show available cars on map

      const coords = getCarCoords(car.brand, car.name, baseCenter);
      const color = categoryColors[car.category] || '#D0BCFF';
      const icon = createPremiumIcon(color);

      // Popup Content Card
      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; width: 220px; padding: 4px;">
          <img src="${car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300'}" 
               style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />
          <h4 style="font-family:'Outfit'; font-size:16px; margin:0 0 2px 0; color:#fafafa;">${car.brand} ${car.name}</h4>
          <span style="font-size:12px; color:#a1a1aa; display:block; margin-bottom:8px;">
            ${car.category} &bull; ${car.transmission}
          </span>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:'Outfit'; font-size:16px; font-weight:700; color:#D0BCFF;">
              ₹${car.pricePerDay}<span style="font-size:11px; font-weight:normal; color:#a1a1aa;">/day</span>
            </span>
            <button id="btn-rent-${car.id}" style="
              background:#D0BCFF; border:none; color:#381E72; font-family:'Inter'; font-weight:600;
              font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer; transition: all 0.2s;
            ">Rent Now</button>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon })
        .addTo(map)
        .bindPopup(popupHtml);

      // Handle button clicks inside leaflet popup dynamically
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-rent-${car.id}`);
        if (btn) {
          btn.onclick = () => {
            onRentCar(car);
            marker.closePopup();
          };
        }
      });

      markersRef.current[car.id] = marker;
    });

  }, [cars, userLocation, onRentCar]);

  // Handle flyTo when selectedCar changes
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !selectedCar) return;

    const baseCenter = userLocation || defaultCenter;
    const coords = getCarCoords(selectedCar.brand, selectedCar.name, baseCenter);
    
    map.flyTo(coords, 15, {
      animate: true,
      duration: 1.5
    });

    // Open popup
    const marker = markersRef.current[selectedCar.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 1500);
    }
  }, [selectedCar, userLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '350px' }}>
      
      {/* GPS Pulsate Keyframes Style Tag */}
      <style>{`
        @keyframes gps-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Map canvas */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '350px' }}></div>

      {/* Floating Locate Me Button */}
      <button 
        onClick={handleLocateUserClick}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline)',
          color: gpsStatus === 'Locked' ? '#2196F3' : 'var(--md-sys-color-primary)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          boxShadow: 'var(--elevation-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'var(--transition-smooth)'
        }}
        title="Locate Me on GPS"
        className="glass-panel-hover"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </button>

      {/* Map Legend & Active GPS indicator */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(20, 18, 24, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        fontSize: '11px',
        color: 'var(--md-sys-color-on-background)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: 'var(--elevation-2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontWeight: '600', color: 'var(--md-sys-color-primary)', fontFamily: 'var(--font-title)' }}>
            FLEET POSITIONING
          </span>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: '600',
            color: gpsStatus === 'Locked' ? '#81C784' : gpsStatus === 'Searching' ? '#FFB74D' : '#E57373',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: gpsStatus === 'Locked' ? '#81C784' : gpsStatus === 'Searching' ? '#FFB74D' : '#E57373',
              display: 'inline-block'
            }}></span>
            GPS: {gpsStatus}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#D0BCFF', borderRadius: '50%' }}></span> SUV
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#CCC2DC', borderRadius: '50%' }}></span> Sedan
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span> Hatchback
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#EFB8C8', borderRadius: '50%' }}></span> Luxury
        </div>
      </div>
    </div>
  );
};
