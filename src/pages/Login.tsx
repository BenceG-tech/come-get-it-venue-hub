
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Lock, Mail } from "lucide-react";
import { DEMO_USERS, sessionManager } from "@/auth/mockSession";
import { seedData } from "@/lib/mock/seed";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Initialize seed data
    await seedData();
    
    // Mock login - find user by ID or email
    let user = DEMO_USERS.find(u => u.id === selectedUserId);
    if (!user && email) {
      user = DEMO_USERS.find(u => u.email === email);
    }
    
    if (user) {
      sessionManager.setCurrentSession(user);
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 1000);
    } else {
      setIsLoading(false);
      alert('Felhasználó nem található');
    }
  };

  const handleDemoUserSelect = (userId: string) => {
    const user = DEMO_USERS.find(u => u.id === userId);
    if (user) {
      setSelectedUserId(userId);
      setEmail(user.email);
    }
  };

  return (
    <div className="cgi-page flex items-center justify-center p-4">
      <Card className="w-full max-w-md cgi-card">
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cgi-secondary">
                <Users className="h-7 w-7 text-cgi-secondary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-cgi-surface-foreground">Come Get It</h1>
            <p className="text-cgi-muted-foreground mt-2">Partner Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-user" className="text-cgi-surface-foreground">Demo Felhasználó</Label>
              <Select value={selectedUserId} onValueChange={handleDemoUserSelect}>
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Válassz demo felhasználót" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_USERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-cgi-surface-foreground">E-mail cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@venue.com"
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
              {isLoading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </Button>
          </form>

          <div className="text-center">
            <Button variant="ghost" className="cgi-button-ghost text-sm">
              Elfelejtett jelszó?
            </Button>
          </div>

          <div className="text-xs text-cgi-muted-foreground space-y-1">
            <p><strong>Demo felhasználók:</strong></p>
            <ul className="space-y-1">
              <li>• CGI Admin: teljes hozzáférés</li>
              <li>• Venue Owner: saját helyszín kezelése</li>
              <li>• Venue Staff: csak olvasási jogok</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
