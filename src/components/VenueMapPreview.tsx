import React from 'react';
import { MapPin } from 'lucide-react';

interface VenueMapPreviewProps {
  lat: number;
  lng: number;
  isLoading?: boolean;
}

const VenueMapPreview: React.FC<VenueMapPreviewProps> = ({ lat, lng, isLoading }) => {
  const hasCoordinates = lat !== 0 || lng !== 0;

  // MapBox Static Images API URL
  const mapUrl = hasCoordinates
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+f97316(${lng},${lat})/${lng},${lat},14,0/600x240@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRxbHJ5dGowMDdzMmtzZHpvYWE3NHJrIn0.1'}`
    : null;

  if (isLoading) {
    return (
      <div className="w-full h-[240px] border rounded-md flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Geocoding address...</p>
        </div>
      </div>
    );
  }

  if (!hasCoordinates) {
    return (
      <div className="w-full h-[240px] border rounded-md flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No coordinates yet</p>
          <p className="text-xs text-muted-foreground">Geocoding will happen on save</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[240px] border rounded-md overflow-hidden">
      <img
        src={mapUrl || ''}
        alt={`Map preview at ${lat}, ${lng}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="w-full h-full flex items-center justify-center bg-muted">
                <div class="text-center space-y-2">
                  <svg class="h-8 w-8 text-muted-foreground mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p class="text-sm text-muted-foreground">Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                </div>
              </div>
            `;
          }
        }}
      />
    </div>
  );
};

export default VenueMapPreview;
