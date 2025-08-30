import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Globe, Clock, Gift, Users, Calendar } from 'lucide-react';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { VenueImageGallery } from '@/components/VenueImageGallery';
import type { Venue } from '@/lib/types';

export default function PublicVenueDetail() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dataProvider = getDataProvider();

  useEffect(() => {
    const loadVenue = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const venueData = await dataProvider.getOne<Venue>('venues', id);
        setVenue(venueData);
      } catch (error) {
        console.error('Error loading venue:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVenue();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="text-cgi-surface-foreground">Betöltés...</div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cgi-surface-foreground mb-4">
              Helyszín nem található
            </h1>
            <Link to="/">
              <Button className="cgi-button-primary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza a főoldalra
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const planBadgeColor = (plan: Venue['plan']) => {
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
    <div className="min-h-screen bg-cgi-surface">
      {/* Header */}
      <header className="bg-cgi-surface border-b border-cgi-muted">
        <div className="cgi-container py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-cgi-muted-foreground hover:text-cgi-surface-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span>Vissza</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" className="cgi-button-secondary">
                  Bejelentkezés
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="cgi-container py-8">
        {/* Venue Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">
                {venue.name}
              </h1>
              <div className="flex items-center gap-2 text-cgi-muted-foreground mb-2">
                <MapPin className="h-5 w-5" />
                <span>{venue.address}</span>
              </div>
              {venue.description && (
                <p className="text-cgi-muted-foreground mb-4">
                  {venue.description}
                </p>
              )}
            </div>
            
            <Badge className={`${planBadgeColor(venue.plan)} capitalize`}>
              {venue.plan}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 mb-6">
            {venue.phone_number && (
              <div className="flex items-center gap-2 text-cgi-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{venue.phone_number}</span>
              </div>
            )}
            {venue.website_url && (
              <a 
                href={venue.website_url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-cgi-secondary hover:underline"
              >
                <Globe className="h-4 w-4" />
                <span>Weboldal</span>
              </a>
            )}
          </div>

          {/* Tags - Fixed with proper null check */}
          {venue.tags && venue.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {venue.tags.map(tag => (
                <Badge key={tag} className="cgi-badge bg-cgi-secondary/10 text-cgi-secondary border border-cgi-secondary/20">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue Images */}
            <VenueImageGallery 
              images={venue.images || []} 
              venueName={venue.name} 
            />

            {/* Free Drinks Section */}
            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title flex items-center gap-2">
                  <Gift className="h-5 w-5 text-cgi-secondary" />
                  Ingyenes Italok
                </h3>
              </div>
              <div className="space-y-4">
                <div className="bg-cgi-success/10 border border-cgi-success/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-cgi-success rounded-full"></div>
                    <span className="font-medium text-cgi-success">Aktív ajánlat</span>
                  </div>
                  <h4 className="font-semibold text-cgi-surface-foreground mb-1">
                    Napi Happy Hour
                  </h4>
                  <p className="text-sm text-cgi-muted-foreground mb-3">
                    Válassz kedvenc italod az alábbi opcióból minden nap 14:00-16:00 között.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>14:00 - 16:00</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Hétfő - Vasárnap</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button className="cgi-button-primary" size="lg">
                    <Gift className="h-5 w-5 mr-2" />
                    Ital beváltása
                  </Button>
                  <p className="text-xs text-cgi-muted-foreground mt-2">
                    Bejelentkezés szükséges a beváltáshoz
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Opening Hours */}
            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Nyitvatartás
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cgi-surface-foreground">Hétfő - Csütörtök</span>
                  <span className="text-cgi-muted-foreground">12:00 - 23:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cgi-surface-foreground">Péntek - Szombat</span>
                  <span className="text-cgi-muted-foreground">12:00 - 01:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cgi-surface-foreground">Vasárnap</span>
                  <span className="text-cgi-muted-foreground">14:00 - 22:00</span>
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Helyszín
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-cgi-muted-foreground">
                  {venue.address}
                </p>
                {venue.coordinates && (
                  <Button 
                    variant="outline" 
                    className="w-full cgi-button-secondary"
                    asChild
                  >
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${venue.coordinates.lat},${venue.coordinates.lng}`}
                      target="_blank" 
                      rel="noreferrer"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Útvonalterv
                    </a>
                  </Button>
                )}
              </div>
            </Card>

            {/* Stats */}
            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Statisztikák
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-cgi-muted-foreground">Mai beváltások</span>
                  <span className="font-semibold text-cgi-surface-foreground">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-cgi-muted-foreground">Aktív felhasználók</span>
                  <span className="font-semibold text-cgi-surface-foreground">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-cgi-muted-foreground">Értékelés</span>
                  <span className="font-semibold text-cgi-surface-foreground">4.8★</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
