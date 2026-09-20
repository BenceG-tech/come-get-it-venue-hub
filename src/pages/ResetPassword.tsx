import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import logoImage from "@/assets/come-get-it-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { updatePassword } from "@/auth/supabaseAuth";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
      } else {
        setInvalid(true);
      }
    };

    // Supabase parses the recovery hash asynchronously on load.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setInvalid(false);
        setReady(true);
      }
    });

    const timer = setTimeout(check, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("A jelszó legalább 8 karakter legyen");
      return;
    }
    if (password !== confirm) {
      toast.error("A két jelszó nem egyezik");
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(password);
      toast.success("Jelszó frissítve", { description: "Most már beléphetsz az új jelszóval." });
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch {
      toast.error("Nem sikerült frissíteni a jelszót", {
        description: "A link lejárhatott. Kérj újat a bejelentkezésnél.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cgi-bg">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <img src={logoImage} alt="Come Get It" className="h-16 w-auto" />
        </div>

        <Card className="bg-cgi-surface border-cgi-secondary/30 p-6 space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-bold text-cgi-surface-foreground">Új jelszó beállítása</h1>
            <p className="text-cgi-muted-foreground mt-1 text-sm">
              Adj meg egy új jelszót a fiókodhoz.
            </p>
          </div>

          {invalid && !ready ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-cgi-muted-foreground">
                Ez a visszaállító link érvénytelen vagy lejárt. Kérj újat a bejelentkezési oldalon.
              </p>
              <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
                Vissza a bejelentkezéshez
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="new-password" className="text-cgi-surface-foreground text-sm">
                  Új jelszó
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirm-password" className="text-cgi-surface-foreground text-sm">
                  Új jelszó megerősítése
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-primary-foreground font-semibold h-10"
                disabled={isLoading || !ready}
              >
                {isLoading ? "Mentés..." : "Jelszó mentése"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
