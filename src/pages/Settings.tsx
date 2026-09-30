import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Crown, Star, Shield, MapPin, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sessionManager } from "@/auth/session";
import type { Json } from "@/integrations/supabase/types";

type VenuePlan = 'basic' | 'standard' | 'premium';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  weekly_reports: boolean;
}

interface VenueSettingsState {
  id: string;
  name: string;
  address: string;
  plan: VenuePlan;
  notifications: NotificationPreferences;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  email: true,
  push: false,
  weekly_reports: true,
};

function parseNotifications(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_NOTIFICATIONS;
  }

  const record = value as Record<string, unknown>;
  return {
    email: typeof record.email === 'boolean' ? record.email : true,
    push: typeof record.push === 'boolean' ? record.push : false,
    weekly_reports:
      typeof record.weekly_reports === 'boolean' ? record.weekly_reports : true,
  };
}

export default function Settings() {
  const { toast } = useToast();
  const session = sessionManager.getCurrentSession();
  const isAdmin = session?.user.role === 'cgi_admin';
  const venueId = isAdmin ? undefined : sessionManager.getManageableVenueIds()[0];

  const [venue, setVenue] = useState<VenueSettingsState | null>(null);
  const [venueLoading, setVenueLoading] = useState(!isAdmin);
  const [venueSaving, setVenueSaving] = useState(false);

  const [enforceRadius, setEnforceRadius] = useState(true);
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [platformLoading, setPlatformLoading] = useState(isAdmin);
  const [platformSaving, setPlatformSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setPlatformLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setPlatformLoading(true);
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["enforce_redemption_radius", "default_redemption_radius_m"]);

      if (!cancelled) {
        if (error) {
          toast({
            title: "Hiba",
            description: "Nem sikerült betölteni a platform beállításait.",
            variant: "destructive",
          });
        } else if (Array.isArray(data)) {
          const map = new Map<string, unknown>(data.map((row) => [row.key, row.value]));
          setEnforceRadius(map.get("enforce_redemption_radius") !== false);
          const radius = Number(map.get("default_redemption_radius_m") ?? 100);
          setDefaultRadius(Number.isFinite(radius) && radius > 0 ? radius : 100);
        }
        setPlatformLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, toast]);

  useEffect(() => {
    if (isAdmin) {
      setVenue(null);
      setVenueLoading(false);
      return;
    }

    if (!venueId) {
      setVenue(null);
      setVenueLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setVenueLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, address, plan, notifications')
        .eq('id', venueId)
        .maybeSingle();

      if (!cancelled) {
        if (error || !data) {
          setVenue(null);
          toast({
            title: "Hiba",
            description: "Nem sikerült betölteni a hozzárendelt helyszínt.",
            variant: "destructive",
          });
        } else {
          setVenue({
            id: data.id,
            name: data.name,
            address: data.address,
            plan: data.plan,
            notifications: parseNotifications(data.notifications),
          });
        }
        setVenueLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, toast, venueId]);

  const savePlatformSettings = async () => {
    if (!isAdmin) return;

    setPlatformSaving(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const rows = [
        {
          key: "enforce_redemption_radius",
          value: enforceRadius,
          updated_by: authData.session?.user.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: "default_redemption_radius_m",
          value: Math.max(10, Math.min(5000, defaultRadius)),
          updated_by: authData.session?.user.id,
          updated_at: new Date().toISOString(),
        },
      ];
      const { error } = await supabase
        .from("platform_settings")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast({ title: "Elmentve", description: "A platform beállításai frissültek." });
    } catch (error) {
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "A mentés nem sikerült.",
        variant: "destructive",
      });
    } finally {
      setPlatformSaving(false);
    }
  };

  const saveVenueSettings = async () => {
    if (!venue || !sessionManager.canEditVenue(venue.id)) return;

    setVenueSaving(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: venue.name.trim(),
          address: venue.address.trim(),
          notifications: venue.notifications as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venue.id);
      if (error) throw error;
      toast({ title: "Elmentve", description: "A helyszín beállításai frissültek." });
    } catch (error) {
      toast({
        title: "Hiba",
        description: error instanceof Error ? error.message : "A mentés nem sikerült.",
        variant: "destructive",
      });
    } finally {
      setVenueSaving(false);
    }
  };

  const getTierIcon = (plan: VenuePlan) => {
    if (plan === 'premium') return Crown;
    if (plan === 'standard') return Star;
    return Shield;
  };

  const getTierColor = (plan: VenuePlan) => {
    if (plan === 'premium') return 'cgi-badge-success';
    if (plan === 'standard') return 'cgi-badge-warning';
    return 'cgi-badge-info';
  };

  return (
    <PageLayout className="py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Beállítások</h1>
        <p className="text-cgi-muted-foreground">
          {isAdmin
            ? 'A Come Get It platform biztonságos működési beállításai'
            : 'A saját helyszín profilja és értesítési beállításai'}
        </p>
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <Card className="cgi-card">
            <div className="cgi-card-header">
              <h3 className="cgi-card-title flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cgi-primary" />
                Beváltás — helymeghatározás
              </h3>
              <Badge className="cgi-badge-info">Platform</Badge>
            </div>

            {platformLoading ? (
              <div className="flex items-center gap-2 text-cgi-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Betöltés…
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-cgi-surface-foreground">
                      Távolság-ellenőrzés kényszerítése
                    </Label>
                    <p className="text-sm text-cgi-muted-foreground mt-1">
                      Bekapcsolva a mobilapp csak a helyszín engedélyezett sugarán belül indít beváltást.
                    </p>
                  </div>
                  <Switch checked={enforceRadius} onCheckedChange={setEnforceRadius} />
                </div>

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="default-radius" className="text-cgi-surface-foreground">
                    Alapértelmezett sugár (méter)
                  </Label>
                  <Input
                    id="default-radius"
                    type="number"
                    min={10}
                    max={5000}
                    value={defaultRadius}
                    onChange={(event) => setDefaultRadius(parseInt(event.target.value, 10) || 0)}
                    className="cgi-input"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={savePlatformSettings}
                    disabled={platformSaving}
                    className="cgi-button-primary"
                  >
                    {platformSaving ? "Mentés…" : "Platform beállítások mentése"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {!isAdmin && venueLoading && (
          <Card className="cgi-card flex items-center gap-2 text-cgi-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Saját helyszín betöltése…
          </Card>
        )}

        {!isAdmin && !venueLoading && !venue && (
          <Card className="cgi-card">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-cgi-muted-foreground" />
              <div>
                <p className="font-medium text-cgi-surface-foreground">Nincs hozzárendelt helyszín</p>
                <p className="text-sm text-cgi-muted-foreground">
                  Kérd a Come Get It admintól a partnerfiók hozzárendelését.
                </p>
              </div>
            </div>
          </Card>
        )}

        {!isAdmin && venue && (
          <>
            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title">Helyszín profil</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue-name" className="text-cgi-surface-foreground">
                    Helyszín neve
                  </Label>
                  <Input
                    id="venue-name"
                    value={venue.name}
                    onChange={(event) => setVenue((current) => current && ({ ...current, name: event.target.value }))}
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
                    onChange={(event) => setVenue((current) => current && ({ ...current, address: event.target.value }))}
                    className="cgi-input"
                  />
                </div>
              </div>
            </Card>

            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title">Csomagszint</h3>
                {(() => {
                  const TierIcon = getTierIcon(venue.plan);
                  return (
                    <Badge className={`${getTierColor(venue.plan)} flex items-center gap-1`}>
                      <TierIcon className="h-3 w-3" />
                      {venue.plan === 'basic' ? 'Alap' : venue.plan === 'standard' ? 'Normál' : 'Prémium'}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-cgi-muted-foreground">
                A csomagszint módosításához lépj kapcsolatba a Come Get It csapatával.
              </p>
            </Card>

            <Card className="cgi-card">
              <div className="cgi-card-header">
                <h3 className="cgi-card-title">Értesítési beállítások</h3>
              </div>

              <div className="space-y-4">
                {([
                  ['email', 'E-mail értesítések', 'Fontos partnerértesítések e-mailben'],
                  ['push', 'Push értesítések', 'Azonnali böngészős értesítések'],
                  ['weekly_reports', 'Heti jelentések', 'Automatikus heti teljesítmény-összefoglaló'],
                ] as const).map(([key, label, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-cgi-surface-foreground">{label}</Label>
                      <p className="text-sm text-cgi-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={venue.notifications[key]}
                      onCheckedChange={(checked) =>
                        setVenue((current) => current && ({
                          ...current,
                          notifications: { ...current.notifications, [key]: checked },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveVenueSettings}
                disabled={venueSaving || !venue.name.trim() || !venue.address.trim()}
                className="cgi-button-primary"
              >
                {venueSaving ? 'Mentés…' : 'Beállítások mentése'}
              </Button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
