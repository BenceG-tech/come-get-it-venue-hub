import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, Mail, Building2, UserCheck, Crown, Briefcase } from "lucide-react";
import logoImage from "@/assets/come-get-it-logo.png";
import loginBackground from "@/assets/login-background.png";
import { DEMO_USERS, sessionManager } from "@/auth/mockSession";
import { seedData } from "@/lib/mock/seed";
import { runtimeConfig } from "@/config/runtime";
import { signInWithEmailPassword, signInWithGoogle } from "@/auth/supabaseAuth";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const isSupabaseMode = runtimeConfig.useSupabase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await seedData();

    if (isSupabaseMode) {
      try {
        const user = await signInWithEmailPassword(email, password);
        setIsLoading(false);
        if ((user as any).hasAccess === false) {
          navigate("/no-access");
        } else {
          navigate("/dashboard");
        }
        return;
      } catch (err) {
        console.error("[Login] Supabase sign-in failed", err);
        alert("Bejelentkezés sikertelen. Ellenőrizd az email/jelszó párost.");
        setIsLoading(false);
        return;
      }
    }

    // Mock mode
    let user = DEMO_USERS.find((u) => u.role === selectedRole);
    if (!user && email) user = DEMO_USERS.find((u) => u.email === email);

    if (user) {
      sessionManager.setCurrentSession(user);
      setTimeout(() => {
        setIsLoading(false);
        navigate("/dashboard");
      }, 600);
    } else {
      setIsLoading(false);
      alert("Felhasználó nem található");
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google; onAuthStateChange in App.tsx handles the rest.
    } catch (err) {
      console.error("[Login] Google sign-in failed", err);
      alert("Google bejelentkezés sikertelen. Próbáld újra később.");
      setIsGoogleLoading(false);
    }
  };

  const handleRoleSelect = (role: string) => {
    const user = DEMO_USERS.find((u) => u.role === role);
    if (user) {
      setSelectedRole(role);
      setEmail(user.email);
    }
  };

  const roleCards = [
    { role: "venue_staff", title: "Munkatárs", icon: UserCheck, color: "staff" },
    { role: "venue_owner", title: "Tulajdonos", icon: Building2, color: "owner" },
    { role: "brand_admin", title: "Márka Admin", icon: Briefcase, color: "brand" },
    { role: "cgi_admin", title: "Főadmin", icon: Crown, color: "admin" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
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

      <div className="w-full max-w-md space-y-3 relative z-10">
        <div className="flex justify-center mb-2">
          <img src={logoImage} alt="Come Get It Logo" className="h-20 sm:h-24 w-auto" />
        </div>

        <Card className="bg-cgi-surface/90 backdrop-blur border-cgi-secondary/30 p-6 shadow-xl">
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-xl font-bold text-cgi-surface-foreground">
                Adminisztrációs felület
              </h1>
              <p className="text-cgi-muted-foreground mt-1 text-sm">
                Jelentkezz be a folytatáshoz
              </p>
              {isSupabaseMode && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cgi-primary/10 border border-cgi-primary/20">
                  <div className="w-2 h-2 bg-cgi-primary rounded-full animate-pulse" />
                  <span className="text-xs text-cgi-primary">Supabase hitelesítés aktív</span>
                </div>
              )}
            </div>

            {/* Google sign-in (Supabase mode only) */}
            {isSupabaseMode && (
              <>
                <Button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isGoogleLoading || isLoading}
                  variant="outline"
                  className="w-full h-11 bg-cgi-surface hover:bg-cgi-surface/80 border-cgi-secondary/50 text-cgi-surface-foreground"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  {isGoogleLoading ? "Átirányítás..." : "Folytatás Google-lel"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-cgi-secondary/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-cgi-surface px-2 text-cgi-muted-foreground">vagy</span>
                  </div>
                </div>
              </>
            )}

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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-10"
                    required
                  />
                </div>
                {isSupabaseMode && (
                  <div className="text-right pt-1">
                    <button
                      type="button"
                      className="text-xs text-cgi-muted-foreground hover:text-cgi-primary"
                      onClick={() =>
                        alert("Az elfelejtett jelszó funkció hamarosan elérhető lesz.")
                      }
                    >
                      Elfelejtetted a jelszót?
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-primary-foreground font-semibold h-10 transition-all duration-300"
                disabled={isLoading || isGoogleLoading}
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

            {/* Demo role picker — collapsed by default, only useful for mock/demo */}
            {!isSupabaseMode && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-cgi-muted-foreground hover:text-cgi-surface-foreground select-none">
                  Demo gyors-belépés (fejlesztői mód)
                </summary>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {roleCards.map((card) => (
                    <button
                      key={card.role}
                      type="button"
                      onClick={() => handleRoleSelect(card.role)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        selectedRole === card.role
                          ? `border-cgi-role-${card.color} bg-cgi-role-${card.color}/10`
                          : `border-cgi-secondary/30 bg-cgi-secondary/5 hover:border-cgi-primary/50`
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <card.icon className={`h-4 w-4 text-cgi-role-${card.color}`} />
                        <div className="font-medium text-cgi-surface-foreground text-xs">
                          {card.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
