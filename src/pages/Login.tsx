import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import logoImage from "@/assets/come-get-it-logo.png";
import loginBackground from "@/assets/login-background.png";
import { signInWithEmailPassword, requestPasswordReset } from "@/auth/supabaseAuth";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signInWithEmailPassword(email, password);
      setIsLoading(false);
      navigate(result.hasAccess === false ? "/no-access" : "/dashboard", { replace: true });
    } catch {
      setIsLoading(false);
      toast.error("Bejelentkezés sikertelen", {
        description: "Ellenőrizd az e-mail / jelszó párost.",
      });
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Add meg az e-mail címed");
      return;
    }
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setResetSent(true);
      toast.success("Jelszó-visszaállító e-mail elküldve", {
        description: "Nézd meg a postafiókod, és kövesd a linket.",
      });
    } catch {
      toast.error("Nem sikerült elküldeni az e-mailt", {
        description: "Ellenőrizd az e-mail címet, majd próbáld újra.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative overflow-y-auto"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-24 opacity-30 pointer-events-none"
        style={{ background: "var(--cgi-bottom-accent)" }}
      />

      <div className="w-full max-w-md space-y-3 relative z-10 py-4">
        <div className="flex justify-center mb-2">
          <img src={logoImage} alt="Come Get It Logo" className="h-16 sm:h-24 w-auto" />
        </div>

        <Card className="bg-cgi-surface/90 backdrop-blur border-cgi-secondary/30 p-4 sm:p-6 shadow-xl">
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-xl font-bold text-cgi-surface-foreground">
                {mode === "login" ? "Adminisztrációs felület" : "Jelszó visszaállítása"}
              </h1>
              <p className="text-cgi-muted-foreground mt-1 text-sm">
                {mode === "login"
                  ? "Jelentkezz be a folytatáshoz"
                  : "Küldünk egy linket, amivel új jelszót állíthatsz be"}
              </p>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-cgi-surface-foreground text-sm">
                    E-mail cím
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="te@pelda.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-cgi-surface-foreground text-sm">
                    Jelszó
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                      required
                    />
                  </div>
                  <div className="text-right pt-1">
                    <button
                      type="button"
                      className="text-xs text-cgi-muted-foreground hover:text-cgi-primary py-2 px-1 -mr-1"
                      onClick={() => {
                        setResetSent(false);
                        setMode("forgot");
                      }}
                    >
                      Elfelejtetted a jelszót?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-primary-foreground font-semibold h-10 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-cgi-primary-foreground border-t-transparent rounded-full" />
                      <span>Bejelentkezés...</span>
                    </div>
                  ) : (
                    "Bejelentkezés"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgot} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="reset-email" className="text-cgi-surface-foreground text-sm">
                    E-mail cím
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="te@pelda.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                      required
                    />
                  </div>
                </div>

                {resetSent && (
                  <p className="text-xs text-cgi-primary">
                    Elküldtük a linket erre a címre. Ha nem találod, nézd meg a spam mappát is.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-primary-foreground font-semibold h-10"
                  disabled={isLoading}
                >
                  {isLoading ? "Küldés..." : "Visszaállító link küldése"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-9 text-cgi-muted-foreground"
                  onClick={() => setMode("login")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Vissza a bejelentkezéshez
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
