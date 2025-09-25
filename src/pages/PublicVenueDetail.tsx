
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Globe, Clock, CreditCard } from 'lucide-react';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { VenueImageGallery } from '@/components/VenueImageGallery';
import DrinkRedemptionCard from '@/components/DrinkRedemptionCard';
import CardLinkingModal from '@/components/CardLinkingModal';
import type { Venue } from '@/lib/types';

import { isWindowActive } from '@/lib/businessLogic';

export default function PublicVenueDetail() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const dataProvider = getDataProvider();

  useEffect(() => {
    const loadVenue = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Use the new getPublicVenue method if available
        let venueData;
        if ('getPublicVenue' in dataProvider && typeof dataProvider.getPublicVenue === 'function') {
          venueData = await dataProvider.getPublicVenue(id);
        } else {
          // Fallback to regular getOne method
          venueData = await dataProvider.getOne<Venue>('venues', id);
        }
        setVenue(venueData);
      } catch (error) {
        console.error('Error loading venue:', error);
        setError('Nem sikerült betölteni a helyszín adatait');
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
          <div className="flex items-center justify-center">
            <div className="text-cgi-surface-foreground">Betöltés...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cgi-surface-foreground mb-4">
              {error || 'Helyszín nem található'}
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

  // Build gallery images with fallback to hero/image_url if images array is empty
  const hasDbImages = Array.isArray(venue.images) && venue.images.length > 0;
  const syntheticImages = !hasDbImages && (venue.hero_image_url || venue.image_url)
    ? [
        {
          id: 'cover',
          url: (venue.hero_image_url || venue.image_url) as string,
          label: 'Borítókép',
          isCover: true,
        },
      ]
    : [];
  const galleryImages = hasDbImages ? (venue.images as NonNullable<Venue['images']>) : syntheticImages;

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
              <Button 
                onClick={() => setShowCardModal(true)}
                variant="outline" 
                className="cgi-button-secondary"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Kártyák
              </Button>
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
              images={galleryImages} 
              venueName={venue.name} 
            />

            {/* Free Drinks Section - Only show currently active ones */}
            {venue.drinks && venue.drinks.filter(d => {
              if (!d.is_free_drink) return false;
              const drinkWindows = venue.freeDrinkWindows?.filter(w => w.drink_id === d.id) || [];
              return drinkWindows.some(w => isWindowActive(w, new Date()));
            }).length > 0 && (
              <Card className="cgi-card">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title">Ingyenes italok</h3>
                  <p className="text-sm text-cgi-muted-foreground">Jelenleg elérhető italok</p>
                </div>
                <div className="space-y-4">
                  {venue.drinks.filter(d => {
                    if (!d.is_free_drink) return false;
                    const drinkWindows = venue.freeDrinkWindows?.filter(w => w.drink_id === d.id) || [];
                    return drinkWindows.some(w => isWindowActive(w, new Date()));
                  }).map(drink => {
                    const drinkWindows = venue.freeDrinkWindows?.filter(w => w.drink_id === drink.id) || [];
                    const formatTimeWindows = (windows: any[]) => {
                      if (!windows.length) return 'Nincs megadva időablak';
                      return windows.map(w => {
                        const dayNames = ['', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
                        const days = w.days.map((d: number) => dayNames[d]).join(', ');
                        return `${days} ${w.start}-${w.end}`;
                      }).join(' | ');
                    };
                    
                    return (
                      <div key={drink.id} className="flex items-start gap-4 p-4 bg-cgi-surface rounded-lg border border-cgi-muted">
                        {drink.image_url && (
                          <div className="flex-shrink-0">
                            <img 
                              src={drink.image_url} 
                              alt={drink.drinkName}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-cgi-surface-foreground mb-1">{drink.drinkName}</h4>
                          {drink.description && (
                            <p className="text-sm text-cgi-muted-foreground mb-2">{drink.description}</p>
                          )}
                          <div className="text-xs text-cgi-secondary">
                            {formatTimeWindows(drinkWindows)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ALL FREE DRINKS SECTION - For verification/debugging */}
            {venue.drinks && venue.drinks.filter(d => d.is_free_drink).length > 0 && (
              <Card className="cgi-card border-orange-200 bg-orange-50/50">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title text-orange-800">🔧 Összes ingyenes ital (ellenőrzés)</h3>
                  <p className="text-sm text-orange-600">Ideiglenesen megjelenítjük az összes ingyenes italt az időablakoktól függetlenül</p>
                </div>
                <div className="space-y-4">
                  {venue.drinks.filter(d => d.is_free_drink).map(drink => {
                    const drinkWindows = venue.freeDrinkWindows?.filter(w => w.drink_id === drink.id) || [];
                    const formatTimeWindows = (windows: any[]) => {
                      if (!windows.length) return 'Nincs megadva időablak';
                      return windows.map(w => {
                        const dayNames = ['', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
                        const days = w.days.map((d: number) => dayNames[d]).join(', ');
                        return `${days} ${w.start}-${w.end}`;
                      }).join(' | ');
                    };
                    
                    const isCurrentlyActive = drinkWindows.some(w => isWindowActive(w, new Date()));
                    
                    return (
                      <div key={drink.id} className={`flex items-start gap-4 p-4 rounded-lg border ${
                        isCurrentlyActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {drink.image_url && (
                          <div className="flex-shrink-0">
                            <img 
                              src={drink.image_url} 
                              alt={drink.drinkName}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-800">{drink.drinkName}</h4>
                            <Badge className={isCurrentlyActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                              {isCurrentlyActive ? 'Aktív' : 'Inaktív'}
                            </Badge>
                          </div>
                          {drink.description && (
                            <p className="text-sm text-gray-600 mb-2">{drink.description}</p>
                          )}
                          <div className="text-xs text-gray-500">
                            {formatTimeWindows(drinkWindows)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <DrinkRedemptionCard
              offer={{
                id: 'daily-happy-hour',
                name: 'Napi Happy Hour',
                description: 'Válassz kedvenc italod minden nap 14:00-16:00 között.',
                isActive: true,
                availableUntil: '16:00',
                remainingRedemptions: 25,
                maxRedemptions: 50
              }}
              onRedeem={async (offerId) => {
                console.log('Redeeming offer:', offerId);
                // This would typically call an API to redeem the offer
              }}
              isAuthenticated={false}
            />

            {/* Card Linking CTA */}
            <Card className="cgi-card bg-gradient-to-r from-cgi-primary/10 to-cgi-secondary/10 border-cgi-primary/20">
              <div className="p-6 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-cgi-primary" />
                <h3 className="text-lg font-semibold text-cgi-surface-foreground mb-2">
                  Automatikus pontgyűjtés
                </h3>
                <p className="text-cgi-muted-foreground mb-4">
                  Kapcsold össze a bankkártyádat és automatikusan gyűjts pontokat minden vásárláskor.
                </p>
                <Button 
                  onClick={() => setShowCardModal(true)}
                  className="cgi-button-primary"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Kártya összekapcsolása
                </Button>
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
                  <Clock className="h-5 w-5" />
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

        {/* Card Linking Modal */}
        <CardLinkingModal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          onSuccess={() => {
            console.log('Card linked successfully');
          }}
        />
      </div>
    </div>
  );
}
