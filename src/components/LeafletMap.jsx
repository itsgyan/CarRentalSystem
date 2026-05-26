import React, { useEffect, useRef } from 'react';
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

// Mock coordinates in India for our cars (index-keyed or hashed from brand)
const getCarCoords = (brand, name) => {
  const hash = (brand + name).charCodeAt(0) + (brand + name).charCodeAt(1 || 0);
  // Centered around New Delhi: Lat 28.6139, Lng 77.2090
  const latOffset = ((hash % 30) - 15) * 0.003;
  const lngOffset = (((hash * 7) % 30) - 15) * 0.003;
  return [28.6139 + latOffset, 77.2090 + lngOffset];
};

export const LeafletMap = ({ cars, selectedCar, onRentCar }) => {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef({});

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map instance
    leafletMapInstance.current = L.map(mapRef.current, {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: false // Positioned custom below
    });

    // Load ultra-premium dark map tiles from CartoDB Voyager Dark
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(leafletMapInstance.current);

    // Add custom zoom controls in top right
    L.control.zoom({
      position: 'topright'
    }).addTo(leafletMapInstance.current);

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Update Markers when cars list or selection changes
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !cars || cars.length === 0) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => map.removeLayer(marker));
    markersRef.current = {};

    // Colors by category
    const categoryColors = {
      SUV: '#6366f1',     // Indigo
      Sedan: '#06b6d4',   // Cyan
      Hatchback: '#10b981', // Emerald
      Luxury: '#ec4899'    // Pink
    };

    cars.forEach(car => {
      if (!car.isAvailable) return; // Only show available cars on map

      const coords = getCarCoords(car.brand, car.name);
      const color = categoryColors[car.category] || '#6366f1';
      const icon = createPremiumIcon(color);

      // Popup Content Card
      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; width: 220px; padding: 4px;">
          <img src="${car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300'}" 
               style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />
          <h4 style="font-family:'Outfit'; font-size:16px; margin:0 0 2px 0; color:#f8fafc;">${car.brand} ${car.name}</h4>
          <span style="font-size:12px; color:#94a3b8; display:block; margin-bottom:8px;">
            ${car.category} &bull; ${car.transmission}
          </span>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:'Outfit'; font-size:16px; font-weight:700; color:#06b6d4;">
              ₹${car.pricePerDay}<span style="font-size:11px; font-weight:normal; color:#94a3b8;">/day</span>
            </span>
            <button id="btn-rent-${car.id}" style="
              background:#6366f1; border:none; color:white; font-family:'Inter'; font-weight:600;
              font-size:11px; padding:6px 12px; border-radius:4px; cursor:pointer; transition: all 0.2s;
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

  }, [cars, onRentCar]);

  // Handle flyTo when selectedCar changes
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !selectedCar) return;

    const coords = getCarCoords(selectedCar.brand, selectedCar.name);
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
  }, [selectedCar]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '350px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '350px' }}></div>
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(9, 10, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-glass)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>FLEET CLASSIFICATION:</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#6366f1', borderRadius: '50%' }}></span> SUV
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#06b6d4', borderRadius: '50%' }}></span> Sedan
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span> Hatchback
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ec4899', borderRadius: '50%' }}></span> Luxury
        </div>
      </div>
    </div>
  );
};
