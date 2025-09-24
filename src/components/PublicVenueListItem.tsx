import { Link } from 'react-router-dom';
import { Star, MapPin, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PublicVenueListItemProps {
  venue: {
    id: string;
    name: string;
    address: string;
    image_url?: string;
    hero_image_url?: string;
    rating?: number;
    price_tier?: number;
    participates_in_points?: boolean;
    points_per_visit?: number;
    category?: string;
  };
}

export default function PublicVenueListItem({ venue }: PublicVenueListItemProps) {
  const imageUrl = venue.image_url || venue.hero_image_url;
  const hasRating = venue.rating && venue.rating > 0;

  return (
    <Link to={`/venues/${venue.id}`} className="block">
      <div className="bg-cgi-background border border-cgi-muted rounded-lg p-4 hover:shadow-md transition-shadow duration-200 hover:border-cgi-primary/20">
        <div className="flex items-center gap-4">
          {/* Venue Image */}
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-cgi-muted">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={venue.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cgi-muted">
                <Gift className="h-6 w-6 text-cgi-muted-foreground" />
              </div>
            )}
          </div>

          {/* Venue Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-cgi-surface-foreground truncate">
                  {venue.name}
                </h3>
                
                {venue.participates_in_points && (
                  <p className="text-sm text-cgi-primary font-medium mt-1">
                    Szerezz pontokat
                  </p>
                )}
                
                <div className="flex items-center gap-1 mt-2 text-sm text-cgi-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{venue.address}</span>
                </div>
              </div>

              {/* Rating */}
              {hasRating && (
                <div className="flex items-center gap-1 text-sm ml-2 flex-shrink-0">
                  <Star className="h-4 w-4 text-cgi-success fill-current" />
                  <span className="text-cgi-surface-foreground font-medium">
                    {venue.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                NYITVA
              </Badge>
              <Badge variant="outline" className="text-xs text-cgi-primary border-cgi-primary">
                Ingyen ital
              </Badge>
              {venue.category && (
                <Badge variant="outline" className="text-xs">
                  {venue.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}