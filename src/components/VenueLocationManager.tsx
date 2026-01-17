import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Venue } from '@/lib/types';

interface VenueLocation {
  id: string;
  venue_id: string;
  fidel_location_id: string;
  fidel_brand_id: string;
  scheme: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
}

interface VenueLocationManagerProps {
  venue: Venue;
  onUpdate?: () => void;
}

export default function VenueLocationManager({ venue, onUpdate }: VenueLocationManagerProps) {
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    fidel_location_id: '',
    fidel_brand_id: '',
    scheme: 'visa'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadVenueLocations();
  }, [venue.id]);

  const loadVenueLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venue_locations')
        .select('*')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Cast status to the expected union type
      const typedLocations: VenueLocation[] = (data || []).map(loc => ({
        ...loc,
        status: loc.status as 'pending' | 'active' | 'inactive'
      }));
      setLocations(typedLocations);
    } catch (error: any) {
      console.error('Failed to load venue locations:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a helyszín adatokat.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.fidel_location_id.trim()) {
      toast({
        title: 'Hiba',
        description: 'Fidel Location ID megadása kötelező.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('venue_locations')
        .insert({
          venue_id: venue.id,
          fidel_location_id: newLocation.fidel_location_id.trim(),
          fidel_brand_id: newLocation.fidel_brand_id.trim() || null,
          scheme: newLocation.scheme,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Siker',
        description: 'Fidel helyszín sikeresen hozzáadva.',
      });

      setNewLocation({
        fidel_location_id: '',
        fidel_brand_id: '',
        scheme: 'visa'
      });
      setShowAddForm(false);
      loadVenueLocations();
      onUpdate?.();

    } catch (error: any) {
      console.error('Failed to add location:', error);
      toast({
        title: 'Hiba',
        description: error.message || 'Nem sikerült hozzáadni a helyszínt.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('venue_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: 'Siker',
        description: 'Fidel helyszín eltávolítva.',
      });

      loadVenueLocations();
      onUpdate?.();

    } catch (error: any) {
      console.error('Failed to remove location:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült eltávolítani a helyszínt.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-cgi-success/10 text-cgi-success border-cgi-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aktív
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-cgi-warning/10 text-cgi-warning border-cgi-warning/20">
            <Clock className="h-3 w-3 mr-1" />
            Függő
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-cgi-error/10 text-cgi-error border-cgi-error/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Inaktív
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <div className="p-4">
          <div className="text-cgi-surface-foreground">Betöltés...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="cgi-card">
      <div className="cgi-card-header">
        <h3 className="cgi-card-title flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Fidel Helyszín Kezelés
        </h3>
      </div>

      <div className="space-y-4">
        {/* Existing locations */}
        {locations.length > 0 ? (
          <div className="space-y-3">
            {locations.map((location) => (
              <div key={location.id} className="p-3 bg-cgi-muted/10 rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <span className="font-medium text-cgi-surface-foreground break-all">
                        {location.fidel_location_id}
                      </span>
                      {getStatusBadge(location.status)}
                    </div>
                    <div className="text-sm text-cgi-muted-foreground">
                      Rendszer: {location.scheme.toUpperCase()}
                      {location.fidel_brand_id && ` • Brand: ${location.fidel_brand_id}`}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLocation(location.id)}
                    className="text-cgi-error hover:text-cgi-error self-end sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-cgi-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Még nincs Fidel helyszín beállítva</p>
          </div>
        )}

        {/* Add new location form */}
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full cgi-button-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Fidel helyszín hozzáadása
          </Button>
        ) : (
          <div className="space-y-4 border-t border-cgi-muted pt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="location-id">Fidel Location ID *</Label>
                <Input
                  id="location-id"
                  value={newLocation.fidel_location_id}
                  onChange={(e) => setNewLocation(prev => ({ 
                    ...prev, 
                    fidel_location_id: e.target.value 
                  }))}
                  placeholder="loc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="cgi-input"
                />
              </div>

              <div>
                <Label htmlFor="brand-id">Fidel Brand ID (opcionális)</Label>
                <Input
                  id="brand-id"
                  value={newLocation.fidel_brand_id}
                  onChange={(e) => setNewLocation(prev => ({ 
                    ...prev, 
                    fidel_brand_id: e.target.value 
                  }))}
                  placeholder="brand_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="cgi-input"
                />
              </div>

              <div>
                <Label htmlFor="scheme">Kártya rendszer</Label>
                <Select
                  value={newLocation.scheme}
                  onValueChange={(value) => setNewLocation(prev => ({ 
                    ...prev, 
                    scheme: value 
                  }))}
                >
                  <SelectTrigger className="cgi-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNewLocation({
                    fidel_location_id: '',
                    fidel_brand_id: '',
                    scheme: 'visa'
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                Mégse
              </Button>
              <Button
                onClick={handleAddLocation}
                className="flex-1 cgi-button-primary"
              >
                Hozzáadás
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
