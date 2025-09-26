import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, MapPin, Clock, Star, ArrowRight } from "lucide-react";
import PublicVenueListItem from "@/components/PublicVenueListItem";
import { usePublicVenues } from "@/hooks/usePublicVenues";

export default function ConsumerApp() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { venues = [], isLoading, error } = usePublicVenues(searchTerm);

  const handleVenueClick = (venueId: string) => {
    navigate(`/app/venue/${venueId}`);
  };

  const handleAdminLogin = () => {
    navigate('/');
  };

  return (
    <div className="cgi-page">
      <div className="cgi-container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cgi-surface-foreground mb-2">
            Come Get It
          </h1>
          <p className="text-cgi-muted-foreground text-lg mb-6">
            Discover amazing venues and exclusive drinks
          </p>
          
          <Button 
            variant="ghost" 
            onClick={handleAdminLogin}
            className="text-sm text-cgi-muted-foreground hover:text-cgi-surface-foreground"
          >
            Admin Login <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Search */}
        <Card className="cgi-card mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
            <Input
              placeholder="Search venues, locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cgi-input pl-10"
            />
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="cgi-card text-center">
            <MapPin className="h-8 w-8 text-cgi-primary mx-auto mb-2" />
            <h3 className="font-semibold text-cgi-surface-foreground">Multiple Locations</h3>
            <p className="text-sm text-cgi-muted-foreground">Find venues near you</p>
          </Card>
          <Card className="cgi-card text-center">
            <Clock className="h-8 w-8 text-cgi-primary mx-auto mb-2" />
            <h3 className="font-semibold text-cgi-surface-foreground">Free Drinks</h3>
            <p className="text-sm text-cgi-muted-foreground">During happy hours</p>
          </Card>
          <Card className="cgi-card text-center">
            <Star className="h-8 w-8 text-cgi-primary mx-auto mb-2" />
            <h3 className="font-semibold text-cgi-surface-foreground">Quality Venues</h3>
            <p className="text-sm text-cgi-muted-foreground">Curated experiences</p>
          </Card>
        </div>

        {/* Venues */}
        <div>
          <h2 className="text-2xl font-bold text-cgi-surface-foreground mb-6">
            Featured Venues
          </h2>
          
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-cgi-muted-foreground">Loading venues...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <p className="text-cgi-error">Error loading venues</p>
            </div>
          )}
          
          {venues.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => (
                <div key={venue.id} onClick={() => handleVenueClick(venue.id)} className="cursor-pointer">
                  <PublicVenueListItem venue={venue} />
                </div>
              ))}
            </div>
          )}
          
          {venues.length === 0 && !isLoading && !error && (
            <div className="text-center py-8">
              <p className="text-cgi-muted-foreground">
                {searchTerm ? 'No venues found matching your search.' : 'No venues available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}