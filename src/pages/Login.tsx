import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Lock, Mail, ShieldCheck, Building2, UserCheck, Crown, Briefcase } from "lucide-react";
import logoImage from "@/assets/come-get-it-logo.png";
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
      title: 'Staff',
      description: 'Limited access to venue operations',
      icon: <UserCheck className="h-6 w-6" />,
      email: 'staff@trendybar.com'
    },
    {
      role: 'venue_owner',
      title: 'Owner',
      description: 'Manage your venues and rewards',
      icon: <Building2 className="h-6 w-6" />,
      email: 'owner@trendybar.com'
    },
    {
      role: 'brand_admin',
      title: 'Brand Admin',
      description: 'Manage brand partnerships',
      icon: <Briefcase className="h-6 w-6" />,
      email: 'brand@heineken.com'
    },
    {
      role: 'cgi_admin',
      title: 'Main Admin',
      description: 'Full system administration',
      icon: <Crown className="h-6 w-6" />,
      email: 'admin@comegetit.app'
    }
  ];

  return (
    <div className="cgi-page flex flex-col items-center justify-center p-4 space-y-8">
      {/* Logo - Large and outside the card */}
      <div className="flex justify-center">
        <img 
          src={logoImage} 
          alt="Come Get It Logo" 
          className="h-80 w-auto"
        />
      </div>

      <Card className="w-full max-w-lg cgi-card">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cgi-surface-foreground">Admin Interface</h1>
            <p className="text-cgi-muted-foreground mt-2">Select your role to continue</p>
            {isSupabaseMode && (
              <div className="mt-3 inline-flex items-center gap-2 text-cgi-success">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs">Supabase Auth mód aktív</span>
              </div>
            )}
          </div>

          {/* Role selection - always visible */}
          <div className="space-y-3">
            <Label className="text-cgi-surface-foreground text-sm font-medium">Choose Role</Label>
            <div className="grid grid-cols-2 gap-3">
              {roleCards.map((card) => (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => handleRoleSelect(card.role)}
                  className={`p-4 rounded-lg border-2 transition-all text-left hover:bg-cgi-muted/50 ${
                    selectedRole === card.role
                      ? 'border-cgi-primary bg-cgi-primary/10'
                      : 'border-cgi-muted bg-cgi-surface'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`p-2 rounded-lg ${
                      selectedRole === card.role ? 'bg-cgi-primary text-cgi-primary-foreground' : 'bg-cgi-muted text-cgi-muted-foreground'
                    }`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="font-medium text-cgi-surface-foreground text-sm">{card.title}</div>
                      <div className="text-xs text-cgi-muted-foreground">{card.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email" className="text-cgi-surface-foreground">E-mail cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={isSupabaseMode ? "you@example.com" : "admin@venue.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cgi-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-cgi-surface-foreground">Jelszó</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cgi-input pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full cgi-button-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Bejelentkezés...' : (isSupabaseMode ? 'Bejelentkezés Supabase-szel' : 'Bejelentkezés')}
            </Button>
          </form>

          {selectedRole && (
            <div className="text-xs text-cgi-muted-foreground text-center">
              <p>Selected: <strong>{roleCards.find(c => c.role === selectedRole)?.title}</strong></p>
              <p>Email: {roleCards.find(c => c.role === selectedRole)?.email}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
