
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Gift, Star, Sparkles } from 'lucide-react';
import { usePublicVenues } from '@/hooks/usePublicVenues';
import PublicVenueCard from '@/components/PublicVenueCard';

export default function PublicHome() {
  const [searchTerm, setSearchTerm] = useState('');
  const { venues, isLoading, error } = usePublicVenues(searchTerm);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Gift className="h-8 w-8 text-cgi-secondary animate-bounce" />
              <h1 className="text-3xl font-bold text-cgi-surface-foreground">Come Get It</h1>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cgi-primary"></div>
              <p className="text-cgi-muted-foreground">Betöltés...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cgi-surface">
      {/* Header */}
      <header className="bg-cgi-surface border-b border-cgi-muted sticky top-0 z-50 backdrop-blur-sm bg-cgi-surface/95">
        <div className="cgi-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <Gift className="h-6 w-6 md:h-8 md:w-8 text-cgi-secondary" />
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-cgi-primary absolute -top-1 -right-1" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-cgi-surface-foreground truncate">Come Get It</h1>
                <p className="text-xs md:text-sm text-cgi-muted-foreground hidden sm:block">Fedezd fel az ingyenes italokat</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="cgi-button-secondary text-xs md:text-sm px-2 md:px-4">
                  Bejelentkezés
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="sm" className="cgi-button-primary text-xs md:text-sm px-2 md:px-4 hidden sm:inline-flex">
                  Partner Dashboard
                </Button>
                <Button size="sm" className="cgi-button-primary text-xs md:text-sm px-2 sm:hidden">
                  Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-cgi-primary/10 via-cgi-secondary/10 to-cgi-primary/5 py-8 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="cgi-container text-center relative">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cgi-surface-foreground mb-3 md:mb-4 px-4">
              Ingyenes italok a
              <span className="text-cgi-primary block sm:inline"> kedvenc helyeidtől</span>
            </h2>
            <p className="text-base md:text-xl text-cgi-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Fedezd fel a környékbeli bárokat és éttermeket, és élvezd az ingyenes italokat különleges időablakokban.
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-lg mx-auto relative mb-6 md:mb-8 px-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  placeholder="Keresés helyszín vagy név alapján..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="cgi-input pl-10 md:pl-12 pr-4 h-12 md:h-14 text-base md:text-lg shadow-lg border-0 ring-1 ring-cgi-muted/20 focus:ring-cgi-primary focus:ring-2"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-cgi-muted-foreground px-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-cgi-primary flex-shrink-0" />
                <span className="whitespace-nowrap">{venues.length} aktív helyszín</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-cgi-secondary flex-shrink-0" />
                <span className="whitespace-nowrap">Ingyenes italok</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-cgi-success flex-shrink-0" />
                <span className="whitespace-nowrap">Minőségi partnerek</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Venues Grid */}
      <section className="py-12">
        <div className="cgi-container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-cgi-surface-foreground">
                Elérhető helyszínek
              </h3>
              <p className="text-cgi-muted-foreground mt-1">
                {venues.length} helyszín {searchTerm && `"${searchTerm}" keresésre`}
              </p>
            </div>
            
            {venues.length > 0 && (
              <div className="text-sm text-cgi-muted-foreground">
                Frissítve: most
              </div>
            )}
          </div>

          {error && (
            <div className="text-center py-8">
              <div className="bg-cgi-error/10 border border-cgi-error/20 rounded-lg p-6 max-w-md mx-auto">
                <Gift className="h-12 w-12 text-cgi-error mx-auto mb-3" />
                <p className="text-cgi-error font-medium">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => window.location.reload()}
                >
                  Újrapróbálás
                </Button>
              </div>
            </div>
          )}

          {!error && venues.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Gift className="h-20 w-20 text-cgi-muted mx-auto mb-6 opacity-50" />
                <h4 className="text-xl font-semibold text-cgi-surface-foreground mb-3">
                  {searchTerm 
                    ? `Nincs találat "${searchTerm}" keresésre` 
                    : 'Nincsenek elérhető helyszínek'
                  }
                </h4>
                <p className="text-cgi-muted-foreground mb-6">
                  {searchTerm 
                    ? 'Próbálj meg egy másik keresési kifejezést, vagy böngészd az összes helyszínt.'
                    : 'Jelenleg nincsenek aktív partnerhelyszínek. Nézz vissza később!'
                  }
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="cgi-button-secondary"
                  >
                    Összes helyszín megjelenítése
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {venues.map((venue) => (
                <PublicVenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      {venues.length > 0 && (
        <section className="bg-cgi-muted/20 py-12 mt-12">
          <div className="cgi-container text-center">
            <h3 className="text-2xl font-bold text-cgi-surface-foreground mb-4">
              Készen állsz az ingyenes italokra?
            </h3>
            <p className="text-cgi-muted-foreground mb-6 max-w-2xl mx-auto">
              Regisztrálj most, és kezd el felfedezni a legjobb helyeket a környékeden. 
              Minden nap új lehetőségek várnak rád!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="cgi-button-primary w-full sm:w-auto min-h-[44px]">
                  <Gift className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Regisztrálás most</span>
                </Button>
              </Link>
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="cgi-button-secondary w-full sm:w-auto min-h-[44px]">
                  <span className="truncate">Partner lettél?</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-cgi-muted/30 border-t border-cgi-muted py-8">
        <div className="cgi-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-cgi-secondary" />
              <span className="text-cgi-surface-foreground font-medium">Come Get It</span>
            </div>
            <p className="text-cgi-muted-foreground text-sm">
              © 2025 Come Get It. Minden jog fenntartva.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/privacy" className="text-cgi-muted-foreground hover:text-cgi-primary">
                Adatvédelem
              </Link>
              <Link to="/terms" className="text-cgi-muted-foreground hover:text-cgi-primary">
                Felhasználási feltételek
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
