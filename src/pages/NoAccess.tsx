import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOutSupabase } from "@/auth/supabaseAuth";

export default function NoAccess() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOutSupabase();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cgi-bg">
      <Card className="max-w-md w-full p-8 text-center space-y-4 bg-cgi-surface border-cgi-secondary/30">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-cgi-error/10">
            <ShieldAlert className="h-8 w-8 text-cgi-error" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-cgi-surface-foreground">
          Nincs jogosultságod ehhez a felülethez
        </h1>
        <p className="text-sm text-cgi-muted-foreground">
          A Come Get It admin felülete csak partnerek és belső munkatársak számára
          érhető el. Ha úgy gondolod, hogy hozzáférést kéne kapnod, vedd fel a
          kapcsolatot a CGI csapattal a <a href="mailto:hello@come-get-it.app" className="text-cgi-primary underline">hello@come-get-it.app</a> címen.
        </p>
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          Kijelentkezés
        </Button>
      </Card>
    </div>
  );
}
