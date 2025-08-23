
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock login - in real app, this would authenticate with your backend
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1000);
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
        </div>
      </Card>
    </div>
  );
}
