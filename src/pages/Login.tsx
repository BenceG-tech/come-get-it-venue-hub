import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Lock, Mail, ShieldCheck, Building2, UserCheck, Crown, Briefcase } from "lucide-react";
import logoImage from "@/assets/come-get-it-logo.png";
import loginBackground from "@/assets/login-background.png";
import { DEMO_USERS, sessionManager } from "@/auth/mockSession";
import { seedData } from "@/lib/mock/seed";
import { runtimeConfig } from "@/config/runtime";
import { signInWithEmailPassword } from "@/auth/supabaseAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const isSupabaseMode = runtimeConfig.useSupabase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Always keep mock data seeded for demo mode
    await seedData();

    if (isSupabaseMode) {
      console.log("[Login] Supabase mode enabled, using email/password auth");
      try {
        await signInWithEmailPassword(email, password);
        setIsLoading(false);
        navigate('/dashboard');
        return;
      } catch (err) {
        console.error("[Login] Supabase sign-in failed", err);
        alert('Bejelentkezés sikertelen. Ellenőrizd az email/jelszó párost.');
        setIsLoading(false);
        return;
      }
    }

    // Mock login - find user by role or email
    let user = DEMO_USERS.find(u => u.role === selectedRole);
    if (!user && email) {
      user = DEMO_USERS.find(u => u.email === email);
    }

    if (user) {
      sessionManager.setCurrentSession(user);
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 800);
    } else {
      setIsLoading(false);
      alert('Felhasználó nem található');
    }
  };

  const handleRoleSelect = (role: string) => {
    const user = DEMO_USERS.find(u => u.role === role);
    if (user) {
      setSelectedRole(role);
      setEmail(user.email);
    }
  };

  const roleCards = [
    {
      role: 'venue_staff',
      title: 'Munkatárs',
      description: 'Korlátozott hozzáférés a venue műveletekhez',
      icon: UserCheck,
      email: 'staff@trendybar.com',
      color: 'staff'
    },
    {
      role: 'venue_owner', 
      title: 'Tulajdonos',
      description: 'Venue-k és jutalmak kezelése',
      icon: Building2,
      email: 'owner@trendybar.com',
      color: 'owner'
    },
    {
      role: 'brand_admin',
      title: 'Márka Admin', 
      description: 'Márka partnerségek kezelése',
      icon: Briefcase,
      email: 'brand@heineken.com',
      color: 'brand'
    },
    {
      role: 'cgi_admin',
      title: 'Főadmin',
      description: 'Teljes rendszer adminisztráció',
      icon: Crown,
      email: 'admin@comegetit.app',
      color: 'admin'
    }
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Blue accent at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 opacity-30 pointer-events-none"
        style={{ background: 'var(--cgi-bottom-accent)' }}
      />
      
      <div className="w-full max-w-xl space-y-2 relative z-10">
        {/* Logo - Smaller and responsive */}
        <div className="flex justify-center mb-2">
          <img 
            src={logoImage} 
            alt="Come Get It Logo" 
            className="h-20 sm:h-24 md:h-28 w-auto"
          />
        </div>

        <Card className="bg-cgi-surface/90 backdrop-blur border-cgi-secondary/30 p-4 shadow-xl">
          <div className="space-y-3">
            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-bold text-cgi-surface-foreground">Adminisztrációs Felület</h1>
              <p className="text-cgi-muted-foreground mt-1 text-sm">Válassza ki a szerepét a folytatáshoz</p>
              {isSupabaseMode && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cgi-primary/10 border border-cgi-primary/20">
                  <div className="w-2 h-2 bg-cgi-primary rounded-full animate-pulse" />
                  <span className="text-xs text-cgi-primary">Supabase hitelesítés aktív</span>
                </div>
              )}
            </div>

            {/* Role selection - compact */}
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground text-sm font-medium">Szerepkör Választás</Label>
              <div className="grid grid-cols-2 gap-2">
                {roleCards.map((card) => (
                  <button
                    key={card.role}
                    type="button"
                    onClick={() => handleRoleSelect(card.role)}
                    className={`p-2 rounded-lg border-2 transition-all duration-300 text-left hover:scale-[1.02] ${
                      selectedRole === card.role
                        ? `border-cgi-role-${card.color} bg-cgi-role-${card.color}/10 shadow-lg shadow-cgi-role-${card.color}/20`
                        : `border-cgi-role-${card.color}/30 bg-cgi-role-${card.color}/5 hover:border-cgi-primary/50 hover:bg-cgi-primary/10`
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg bg-cgi-role-${card.color}/20`}>
                        <card.icon className={`h-4 w-4 text-cgi-role-${card.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-cgi-surface-foreground text-xs">{card.title}</div>
                        <div className="text-xs text-cgi-muted-foreground truncate">{card.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form - compact */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-cgi-surface-foreground text-sm">E-mail cím</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isSupabaseMode ? "te@pelda.com" : "admin@venue.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-cgi-surface-foreground text-sm">Jelszó</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-cgi-surface/50 border-cgi-secondary/50 text-cgi-surface-foreground h-9 text-sm"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-primary-foreground font-semibold h-10 transition-all duration-300 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-cgi-primary-foreground border-t-transparent rounded-full"></div>
                    <span>Bejelentkezés...</span>
                  </div>
                ) : (
                  isSupabaseMode ? 'Bejelentkezés' : 'Bejelentkezés'
                )}
              </Button>
            </form>

            {/* Selected Role Display - compact */}
            {selectedRole && (
              <div className="text-xs text-cgi-muted-foreground text-center bg-cgi-secondary/10 rounded-lg p-2">
                <p>Kiválasztott: <strong className="text-cgi-surface-foreground">{roleCards.find(c => c.role === selectedRole)?.title}</strong></p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
