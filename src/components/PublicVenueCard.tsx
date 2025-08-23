
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Gift, Star, Phone, Globe } from 'lucide-react';

interface PublicVenue {
  id: string;
  name: string;
  address: string;
  description?: string;
  plan: 'basic' | 'standard' | 'premium';
  phone_number?: string;
  website_url?: string;
  is_paused: boolean;
}

interface PublicVenueCardProps {
  venue: PublicVenue;
}

export default function PublicVenueCard({ venue }: PublicVenueCardProps) {
  const planBadgeColor = (plan: 'basic' | 'standard' | 'premium') => {
    switch (plan) {
      case 'premium':
        return 'bg-cgi-secondary text-cgi-secondary-foreground';
      case 'standard':
        return 'bg-cgi-primary/10 text-cgi-primary border border-cgi-primary/30';
      case 'basic':
      default:
        return 'bg-cgi-muted text-cgi-muted-foreground';
    }
  };

  return (
    <Card className="cgi-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <Link to={`/venue/${venue.id}`}>
        <div className="aspect-video bg-gradient-to-br from-cgi-primary/20 to-cgi-secondary/20 flex items-center justify-center group-hover:from-cgi-primary/30 group-hover:to-cgi-secondary/30 transition-all duration-200">
          <Gift className="h-12 w-12 text-cgi-primary" />
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-lg font-semibold text-cgi-surface-foreground line-clamp-1 group-hover:text-cgi-primary transition-colors">
              {venue.name}
            </h4>
            <Badge className={`${planBadgeColor(venue.plan)} capitalize ml-2 shrink-0`}>
              {venue.plan}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-cgi-muted-foreground mb-3">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="text-sm line-clamp-1">{venue.address}</span>
          </div>
          
          {venue.description && (
            <p className="text-sm text-cgi-muted-foreground mb-4 line-clamp-2">
              {venue.description}
            </p>
          )}
          
          <div className="space-y-2 mb-4">
            {venue.phone_number && (
              <div className="flex items-center gap-2 text-cgi-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{venue.phone_number}</span>
              </div>
            )}
            {venue.website_url && (
              <div className="flex items-center gap-2 text-cgi-secondary">
                <Globe className="h-4 w-4" />
                <span className="text-sm truncate">Weboldal</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-cgi-muted/20">
            <div className="flex items-center gap-1 text-cgi-success">
              <Star className="h-4 w-4" />
              <span className="text-sm font-medium">Ingyenes italok</span>
            </div>
            <div className="flex items-center gap-1 text-cgi-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Nyitva</span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
