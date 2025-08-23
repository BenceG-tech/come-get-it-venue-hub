
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, Gift, Star } from 'lucide-react';
import { usePublicVenues } from '@/hooks/usePublicVenues';

export default function PublicHome() {
  const [searchTerm, setSearchTerm] = useState('');
  const { venues, isLoading, error } = usePublicVenues(searchTerm);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-4">Come Get It</h1>
            <p className="text-cgi-muted-foreground">Betöltés...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cgi-surface">
      {/* Header */}
      <header className="bg-cgi-surface border-b border-cgi-muted">
        <div className="cgi-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Come Get It</h1>
                <p className="text-sm text-cgi-muted-foreground">Fedezd fel az ingyenes italokat</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" className="cgi-button-secondary">
                  Bejelentkezés
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button className="cgi-button-primary">
                  Partner Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-cgi-primary/10 to-cgi-secondary/10 py-16">
        <div className="cgi-container text-center">
          <h2 className="text-4xl font-bold text-cgi-surface-foreground mb-4">
            Ingyenes italok a kedvenc helyeidtől
          </h2>
          <p className="text-xl text-cgi-muted-foreground mb-8 max-w-2xl mx-auto">
            Fedezd fel a környékbeli bárokat és éttermeket, és élvezd az ingyenes italokat különleges időablakokban.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cgi-muted-foreground" />
            <Input
              placeholder="Keresés helyszín vagy név alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cgi-input pl-10 h-12 text-lg"
            />
          </div>
        </div>
      </section>

      {/* Venues Grid */}
      <section className="py-12">
        <div className="cgi-container">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-cgi-surface-foreground">
              Elérhető helyszínek ({venues.length})
            </h3>
          </div>

          {error && (
            <div className="text-center py-8">
              <p className="text-cgi-error">{error}</p>
            </div>
          )}

          {!error && venues.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-16 w-16 text-cgi-muted mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-cgi-surface-foreground mb-2">
                Nincsenek elérhető helyszínek
              </h4>
              <p className="text-cgi-muted-foreground">
                Próbálj meg egy másik keresési kifejezést.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <Card key={venue.id} className="cgi-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <Link to={`/venue/${venue.id}`}>
                    <div className="aspect-video bg-gradient-to-br from-cgi-primary/20 to-cgi-secondary/20 flex items-center justify-center">
                      <Gift className="h-12 w-12 text-cgi-primary" />
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-semibold text-cgi-surface-foreground line-clamp-1">
                          {venue.name}
                        </h4>
                        <Badge className={`${planBadgeColor(venue.plan)} capitalize ml-2`}>
                          {venue.plan}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-cgi-muted-foreground mb-3">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm line-clamp-1">{venue.address}</span>
                      </div>
                      
                      {venue.description && (
                        <p className="text-sm text-cgi-muted-foreground mb-4 line-clamp-2">
                          {venue.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
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
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cgi-muted/30 border-t border-cgi-muted py-8 mt-12">
        <div className="cgi-container text-center">
          <p className="text-cgi-muted-foreground">
            © 2025 Come Get It. Minden jog fenntartva.
          </p>
        </div>
      </footer>
    </div>
  );
}
