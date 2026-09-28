import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  History, 
  LogOut,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface RedemptionResult {
  success: boolean;
  drink_name?: string;
  drink_image_url?: string;
  venue_name?: string;
  token_prefix?: string;
  redeemed_at?: string;
  error?: string;
  code?: string;
}

interface Venue {
  id: string;
  name: string;
}

interface ConsumeRedemptionResponse {
  success: boolean;
  code?: string;
  error?: string;
  redemption?: {
    drink_name?: string;
    drink_image_url?: string;
    venue_name?: string;
    token_prefix?: string;
    redeemed_at?: string;
  };
}

const getErrorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export default function POSRedeem() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<RedemptionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";
  const isEmbeddedPreview = window.self !== window.top;

  const disposeScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      // The camera may already have stopped after a scan or browser interruption.
    }

    try {
      scanner.clear();
    } catch {
      // Clearing an already removed scanner container is harmless.
    }

    html5QrCodeRef.current = null;
  }, []);

  // Load user's venues
  useEffect(() => {
    const loadVenues = async () => {
      const session = sessionManager.getCurrentSession();
      if (!session) return;

      try {
        if (session.user.role === "cgi_admin") {
          // Admin can see all venues
          const { data } = await supabase
            .from("venues")
            .select("id, name")
            .order("name");
          setVenues(data || []);
        } else {
          // Staff/Owner can only see their venues
          const { data: memberships } = await supabase
            .from("venue_memberships")
            .select("venue_id")
            .eq("profile_id", session.user.id);

          if (memberships && memberships.length > 0) {
            const venueIds = memberships.map(m => m.venue_id);
            const { data } = await supabase
              .from("venues")
              .select("id, name")
              .in("id", venueIds)
              .order("name");
            setVenues(data || []);
          }
        }
      } catch (error) {
        console.error("Error loading venues:", error);
      }
    };

    loadVenues();
  }, []);

  // Auto-select first venue
  useEffect(() => {
    if (venues.length === 1 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      void disposeScanner();
    };
  }, [disposeScanner]);

  const startScanner = async () => {
    if (!selectedVenueId) {
      toast.error("Kérlek válassz helyszínt!");
      return;
    }

    setCameraError(null);
    setShowResult(false);
    setActiveCameraLabel(null);

    try {
      await disposeScanner();

      // The scanner library needs a visible, measured container before it
      // creates the video element. Previously this div was `display: none`
      // until after start() resolved, which can leave a black/zero-size feed.
      setIsScanning(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error("NO_CAMERA");
      }

      const preferredCamera =
        cameras.find((camera) => /back|rear|environment|hátsó/i.test(camera.label)) ?? cameras[0];

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        preferredCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Stop scanning while processing
          await disposeScanner();
          setIsScanning(false);
          await handleTokenScan(decodedText);
        },
        () => {} // Ignore scan failures
      );

      setActiveCameraLabel(preferredCamera.label || "Alapértelmezett kamera");
      setIsScanning(true);
    } catch (error: unknown) {
      console.error("Camera error:", error);
      await disposeScanner();
      setIsScanning(false);
      const errorText = getErrorText(error);
      setCameraError(
        errorText === "NO_CAMERA"
          ? "Nem található használható kamera ezen az eszközön."
          : /permission|notallowed|denied/i.test(errorText)
          ? "Kamera hozzáférés megtagadva. Kérlek engedélyezd a kamera használatát."
          : "Nem sikerült elindítani a kamerát. Zárd be a kamerát használó másik alkalmazást, majd próbáld újra."
      );
    }
  };

  const stopScanner = useCallback(async () => {
    await disposeScanner();
    setIsScanning(false);
    setActiveCameraLabel(null);
  }, [disposeScanner]);

  const handleTokenScan = async (token: string) => {
    setIsProcessing(true);
    setShowResult(false);

    try {
      // Get current session for auth
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.access_token) {
        setLastResult({
          success: false,
          error: "Nincs bejelentkezve",
          code: "NO_AUTH"
        });
        setShowResult(true);
        setIsProcessing(false);
        return;
      }

      // Call consume endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://nrxfiblssxwzeziomlvc.supabase.co"}/functions/v1/consume-redemption-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json() as ConsumeRedemptionResponse;

      if (result.success && result.redemption) {
        // Play success sound
        try {
          const audio = new Audio("/sounds/success.mp3");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {
          // Audio feedback is optional and may be blocked by the browser.
        }

        setLastResult({
          success: true,
          drink_name: result.redemption.drink_name,
          drink_image_url: result.redemption.drink_image_url,
          venue_name: result.redemption.venue_name,
          token_prefix: result.redemption.token_prefix,
          redeemed_at: result.redemption.redeemed_at,
        });
      } else {
        // Play error sound
        try {
          const audio = new Audio("/sounds/error.mp3");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {
          // Audio feedback is optional and may be blocked by the browser.
        }

        setLastResult({
          success: false,
          error: getErrorMessage(result.code ?? "UNKNOWN", result.error ?? ""),
          code: result.code,
        });
      }
    } catch (error: unknown) {
      console.error("Consume error:", error);
      setLastResult({
        success: false,
        error: "Hálózati hiba történt",
        code: "NETWORK_ERROR",
      });
    }

    setShowResult(true);
    setIsProcessing(false);
  };

  const getErrorMessage = (code: string, fallback: string): string => {
    const messages: Record<string, string> = {
      INVALID_FORMAT: "Érvénytelen QR kód formátum",
      NOT_FOUND: "Token nem található",
      ALREADY_CONSUMED: "Ez a token már fel lett használva",
      EXPIRED: "A token lejárt",
      INVALID_STATUS: "Érvénytelen token státusz",
      VENUE_UNAUTHORIZED: "Nem vagy jogosult ehhez a helyszínhez",
      NO_AUTH: "Nincs bejelentkezve",
      NETWORK_ERROR: "Hálózati hiba",
    };
    return messages[code] || fallback || "Ismeretlen hiba";
  };

  const handleContinue = () => {
    setShowResult(false);
    setLastResult(null);
    startScanner();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionManager.clear();
    navigate("/");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Come Get It POS</h1>
            <span className="inline-flex items-center mt-1 rounded-full bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[11px] font-medium">
              QR/POS béta
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Venue selector — only the venues this user is a member of */}
        <Card>
          <CardContent className="pt-4">
            {venues.length <= 1 ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Helyszín: </span>
                <span className="font-medium text-foreground">
                  {venues[0]?.name ?? "Nincs hozzárendelt helyszín"}
                </span>
              </div>
            ) : (
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz helyszínt..." />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Scanner Area */}
        {isEmbeddedPreview && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-medium">A Lovable előnézet beágyazott ablak.</p>
            <p className="mt-1 text-amber-100/80">
              A Chrome itt engedélyezett kamera mellett is blokkolhatja a videóképet. A valódi beolvasáshoz nyisd meg az éles POS-oldalt külön lapon.
            </p>
            <Button asChild variant="outline" className="mt-3 w-full border-amber-500/50">
              <a
                href="https://come-get-it-venue-hub.lovable.app/pos/redeem"
                target="_blank"
                rel="noreferrer"
              >
                Éles szkenner megnyitása
              </a>
            </Button>
          </div>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* QR Scanner Container */}
            <div 
              id={scannerContainerId} 
              className={`w-full aspect-square bg-muted ${!isScanning ? 'hidden' : ''}`}
            />

            {isScanning && activeCameraLabel && (
              <div className="border-t border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
                Aktív kamera: {activeCameraLabel} · Tartsd a QR-kódot a keretbe
              </div>
            )}

            {/* Start/Processing State */}
            {!isScanning && !showResult && (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted p-8 text-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Feldolgozás...</p>
                  </>
                ) : cameraError ? (
                  <>
                    <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                    <p className="text-destructive text-sm mb-4">{cameraError}</p>
                    <Button onClick={startScanner}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Újra próbálom
                    </Button>
                  </>
                ) : (
                  <>
                    <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Nyomd meg a gombot a szkenner indításához
                    </p>
                    <Button 
                      onClick={startScanner} 
                      disabled={!selectedVenueId}
                      size="lg"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Szkenner indítása
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Result Display */}
            {showResult && lastResult && (
              <div 
                className={`w-full aspect-square flex flex-col items-center justify-center p-8 text-center ${
                  lastResult.success 
                    ? 'bg-green-500/10' 
                    : 'bg-destructive/10'
                }`}
              >
                {lastResult.success ? (
                  <>
                    <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-green-500 mb-2">SIKERES!</h2>
                    {lastResult.drink_image_url && (
                      <img 
                        src={lastResult.drink_image_url} 
                        alt={lastResult.drink_name}
                        className="w-24 h-24 object-cover rounded-lg mb-4"
                      />
                    )}
                    <p className="text-xl font-semibold text-foreground mb-1">
                      {lastResult.drink_name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Token: {lastResult.token_prefix}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {lastResult.redeemed_at && formatTime(lastResult.redeemed_at)}
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-20 w-20 text-destructive mb-4" />
                    <h2 className="text-2xl font-bold text-destructive mb-2">HIBA</h2>
                    <p className="text-lg text-foreground mb-6">{lastResult.error}</p>
                  </>
                )}
                <Button onClick={handleContinue} size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Következő
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stop Scanner Button */}
        {isScanning && (
          <Button 
            onClick={stopScanner} 
            variant="outline" 
            className="w-full"
          >
            Szkenner leállítása
          </Button>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate("/pos/history")} 
            variant="outline" 
            className="flex-1"
          >
            <History className="h-4 w-4 mr-2" />
            Előzmények
          </Button>
          <Button 
            onClick={() => navigate("/dashboard")} 
            variant="outline"
            className="flex-1"
          >
            Irányítópult
          </Button>
        </div>
      </div>
    </div>
  );
}
