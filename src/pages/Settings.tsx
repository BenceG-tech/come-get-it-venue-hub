
import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Copy, Crown, Star, Shield } from "lucide-react";
import { mockVenue } from "@/lib/mockData";

export default function Settings() {
  const [venue, setVenue] = useState(mockVenue);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Mock save operation
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const copyApiKey = () => {
    if (venue.api_key) {
      navigator.clipboard.writeText(venue.api_key);
    }
  };

  const getTierIcon = (plan: string) => {
    switch (plan) {
      case 'basic': return Shield;
      case 'standard': return Star;
      case 'premium': return Crown;
      default: return Shield;
    }
  };

  const getTierColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'cgi-badge-info';
      case 'standard': return 'cgi-badge-warning';
      case 'premium': return 'cgi-badge-success';
      default: return 'cgi-badge-info';
    }
  };

  const TierIcon = getTierIcon(venue.plan);

  return (
    <PageLayout className="py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Beállítások</h1>
        <p className="text-cgi-muted-foreground">
          Helyszín profiljának és preferenciáinak kezelése
        </p>
      </div>

      <div className="space-y-6">
        {/* Venue Profile */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Helyszín profil</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name" className="text-cgi-surface-foreground">
                  Helyszín neve
                </Label>
                <Input
                  id="venue-name"
                  value={venue.name}
                  onChange={(e) => setVenue(prev => ({ ...prev, name: e.target.value }))}
                  className="cgi-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venue-address" className="text-cgi-surface-foreground">
                  Cím
                </Label>
                <Input
                  id="venue-address"
                  value={venue.address}
                  onChange={(e) => setVenue(prev => ({ ...prev, address: e.target.value }))}
                  className="cgi-input"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Subscription Tier */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Csomagszint</h3>
            <Badge className={`${getTierColor(venue.plan)} flex items-center gap-1`}>
              <TierIcon className="h-3 w-3" />
              {venue.plan.charAt(0).toUpperCase() + venue.plan.slice(1)}
            </Badge>
          </div>
          
          <div className="text-cgi-muted-foreground">
            Jelenlegi csomagja: <strong className="text-cgi-surface-foreground">
              {venue.plan === 'basic' && 'Alap'}
              {venue.plan === 'standard' && 'Normál'}
              {venue.plan === 'premium' && 'Prémium'}
            </strong>
            <br />
            A csomag frissítéséhez lépjen kapcsolatba ügyfélszolgálatunkkal.
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Értesítési beállítások</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-cgi-surface-foreground">E-mail értesítések</Label>
                <p className="text-sm text-cgi-muted-foreground">
                  Értesítések fogadása e-mailben
                </p>
              </div>
              <Switch
                checked={venue.notifications.email}
                onCheckedChange={(checked) => 
                  setVenue(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: checked }
                  }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-cgi-surface-foreground">Push értesítések</Label>
                <p className="text-sm text-cgi-muted-foreground">
                  Azonnali értesítések a böngészőben
                </p>
              </div>
              <Switch
                checked={venue.notifications.push}
                onCheckedChange={(checked) => 
                  setVenue(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: checked }
                  }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-cgi-surface-foreground">Heti jelentések</Label>
                <p className="text-sm text-cgi-muted-foreground">
                  Automatikus heti összefoglalók
                </p>
              </div>
              <Switch
                checked={venue.notifications.weekly_reports}
                onCheckedChange={(checked) => 
                  setVenue(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, weekly_reports: checked }
                  }))
                }
              />
            </div>
          </div>
        </Card>

        {/* API Key */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">API kulcs</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">API kulcs</Label>
              <div className="flex gap-2">
                <Input
                  value={venue.api_key || ''}
                  className="cgi-input font-mono"
                  readOnly
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyApiKey}
                  className="cgi-button-secondary"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-cgi-muted-foreground">
                Ez a kulcs szükséges a Come Get It API-val való integrációhoz.
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="cgi-button-primary"
          >
            {isLoading ? 'Mentés...' : 'Beállítások mentése'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
