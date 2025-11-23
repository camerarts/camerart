import React, { useEffect, useRef } from 'react';
import { Photo, Theme } from '../types';

interface MapViewProps {
  photos: Photo[];
  theme: Theme;
  onPhotoClick: (photo: Photo) => void;
}

export const MapView: React.FC<MapViewProps> = ({ photos, theme, onPhotoClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy existing map if it exists to cleanly handle theme/data updates
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const L = (window as any).L;
    if (!L) return;

    // Initialize Map
    const map = L.map(mapRef.current, {
      center: [25, 10], // Approximate World Center
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    });

    // CartoDB Basemap (Positron for Light, Dark Matter for Dark)
    // Minimalist, flat design
    const layerStyle = theme === 'dark' ? 'dark_all' : 'light_all';
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${layerStyle}/{z}/{x}/{y}{r}.png`, {
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map);

    // Add Markers
    photos.forEach(photo => {
      if (photo.exif.latitude && photo.exif.longitude) {
        // Create minimalist circle markers
        const marker = L.circleMarker([photo.exif.latitude, photo.exif.longitude], {
          radius: 5,
          fillColor: theme === 'dark' ? '#fff' : '#000',
          color: 'transparent',
          weight: 0,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        // Click Event
        marker.on('click', () => {
          onPhotoClick(photo);
        });

        // Hover Effect (Popup with thumbnail)
        // Using a custom HTML string for the popup
        const popupContent = `
          <div style="width: 120px; height: 120px; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <img src="${photo.url}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          closeButton: false,
          className: 'leaflet-custom-popup',
          offset: [0, -5]
        });

        marker.on('mouseover', function (this: any) {
          this.openPopup();
          this.setStyle({ fillOpacity: 1, radius: 7 });
        });
        
        marker.on('mouseout', function (this: any) {
           this.closePopup();
           this.setStyle({ fillOpacity: 0.8, radius: 5 });
        });
      }
    });

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [theme, photos, onPhotoClick]);

  return (
    <div className="w-full h-full animate-fade-in relative z-0">
       <div ref={mapRef} className="w-full h-[70vh] rounded-2xl overflow-hidden shadow-inner" style={{ background: theme === 'dark' ? '#111' : '#f5f5f5' }} />
       {/* Instruction overlay */}
       <div className={`absolute bottom-4 left-4 text-xs ${theme === 'dark' ? 'text-white/30' : 'text-black/30'} pointer-events-none z-[400]`}>
          可缩放 · 点击查看
       </div>
    </div>
  );
};