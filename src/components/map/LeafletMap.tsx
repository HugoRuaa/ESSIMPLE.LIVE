import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  showAccuracyCircle?: boolean;
  accuracyRadius?: number; // meters
  showSafeZoneCircle?: boolean;
  safeZoneRadius?: number; // meters
  markerType?: 'user' | 'home';
  markerLabel?: string;
  destinationCenter?: [number, number];
  destinationMarkerType?: 'home' | 'user';
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 16,
  interactive = true,
  onLocationSelect,
  showAccuracyCircle = false,
  accuracyRadius = 35,
  showSafeZoneCircle = false,
  safeZoneRadius = 300,
  markerType = 'user',
  markerLabel,
  destinationCenter,
  destinationMarkerType = 'home',
  className = 'h-72 w-full rounded-2xl',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const safeZoneCircleRef = useRef<L.Circle | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map is already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        attributionControl: true,
      });

      // Add OpenStreetMap tile layer (exact match to screenshots: OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      if (interactive) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          if (onLocationSelectRef.current) {
            onLocationSelectRef.current(e.latlng.lat, e.latlng.lng);
          }
        });
      }
    }

    const map = mapInstanceRef.current;
    try {
      map.flyTo(center, zoom, { duration: 0.8 });
    } catch {
      map.setView(center, zoom);
    }

    // Create custom SVG markers
    let icon: L.DivIcon;
    if (markerType === 'home') {
      // Vivid Blue house pin with grab cursor, bold white border and eye-catching drop shadow
      icon = L.divIcon({
        className: 'custom-home-pin',
        html: `
          <div style="transform: translate(-20px, -44px); width: 40px; height: 48px; display: flex; flex-direction: column; align-items: center; cursor: grab;">
            <div style="background: linear-gradient(135deg, #2563eb, #0b4f9e); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px #ffffff, 0 4px 12px rgba(11, 79, 158, 0.55); border: 1px solid rgba(255,255,255,0.4); transition: transform 0.15s ease;">
              <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(1px); margin-top: 3px;"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 46],
      });
    } else {
      // Blue pulsing user dot as in screens [13] and [38]
      icon = L.divIcon({
        className: 'custom-user-dot',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: rgba(11, 79, 158, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background-color: #0b4f9e; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    }

    // Update or add marker with drag support
    const isDraggable = interactive && !!onLocationSelect;

    if (markerRef.current) {
      markerRef.current.setLatLng(center);
      markerRef.current.setIcon(icon);
      if (isDraggable) {
        markerRef.current.dragging?.enable();
      } else {
        markerRef.current.dragging?.disable();
      }
    } else {
      const marker = L.marker(center, {
        icon,
        draggable: isDraggable,
        autoPan: true,
        autoPanPadding: [40, 40],
      }).addTo(map);

      marker.on('dragend', (e: L.LeafletEvent) => {
        const target = e.target as L.Marker;
        const pos = target.getLatLng();
        if (onLocationSelectRef.current) {
          onLocationSelectRef.current(pos.lat, pos.lng);
        }
      });

      markerRef.current = marker;
    }

    // Destination marker (e.g. Home on route view)
    if (destinationCenter) {
      const destIcon =
        destinationMarkerType === 'home'
          ? L.divIcon({
              className: 'custom-home-pin',
              html: `
                <div style="transform: translate(-20px, -44px); width: 40px; height: 48px; display: flex; flex-direction: column; align-items: center;">
                  <div style="background: linear-gradient(135deg, #0b6b3a, #08542d); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px #ffffff, 0 4px 12px rgba(11, 107, 58, 0.55); border: 1px solid rgba(255,255,255,0.4);">
                    <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  </div>
                  <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(1px); margin-top: 3px;"></div>
                </div>
              `,
              iconSize: [40, 48],
              iconAnchor: [20, 46],
            })
          : L.divIcon({
              className: 'custom-dest-dot',
              html: `
                <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #0b6b3a; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng(destinationCenter);
        destinationMarkerRef.current.setIcon(destIcon);
      } else {
        destinationMarkerRef.current = L.marker(destinationCenter, { icon: destIcon }).addTo(map);
      }

      try {
        map.fitBounds([center, destinationCenter], { padding: [45, 45], maxZoom: 16 });
      } catch {
        map.setView(center, zoom);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Accuracy circle (blue shade)
    if (showAccuracyCircle) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(center);
        accuracyCircleRef.current.setRadius(accuracyRadius);
      } else {
        accuracyCircleRef.current = L.circle(center, {
          radius: accuracyRadius,
          color: '#0b4f9e',
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#0b4f9e',
          fillOpacity: 0.15,
        }).addTo(map);
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    // Safe zone circle (dashed blue boundary as in screen [29])
    if (showSafeZoneCircle) {
      if (safeZoneCircleRef.current) {
        safeZoneCircleRef.current.setLatLng(center);
        safeZoneCircleRef.current.setRadius(safeZoneRadius);
      } else {
        safeZoneCircleRef.current = L.circle(center, {
          radius: safeZoneRadius,
          color: '#0b4f9e',
          dashArray: '8, 8',
          weight: 2.5,
          opacity: 0.9,
          fillColor: '#0b4f9e',
          fillOpacity: 0.08,
        }).addTo(map);
      }
    } else if (safeZoneCircleRef.current) {
      safeZoneCircleRef.current.remove();
      safeZoneCircleRef.current = null;
    }

    // Timeout resize invalidate
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [
    center,
    zoom,
    interactive,
    markerType,
    markerLabel,
    destinationCenter,
    destinationMarkerType,
    showAccuracyCircle,
    accuracyRadius,
    showSafeZoneCircle,
    safeZoneRadius,
    onLocationSelect,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative overflow-hidden border-2 border-[#ddd5c3] shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
