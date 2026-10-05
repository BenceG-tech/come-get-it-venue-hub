import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

const destinations = [
  ['Áttekintés', '/dashboard', 'dashboard mai feladatok'],
  ['Felhasználók', '/users', 'ügyfél profil keresés'],
  ['Helyszínek', '/venues', 'hely étterem kocsma szerkesztés'],
  ['Leadek', '/partner-leads', 'partner CRM megkeresés'],
  ['Ajánlatok', '/growth/offers', 'értékesítés kész ajánlat link'],
  ['Jelentkezők', '/applicants', 'új partner jelentkezés'],
  ['Értesítések', '/notifications', 'kommunikáció push AI'],
  ['Beváltások', '/redemptions', 'ital előzmények'],
  ['QR beváltás', '/pos/redeem', 'scanner olvasó'],
  ['Jutalmak', '/rewards', 'pontok jutalom'],
  ['Tartalom', '/growth/content', 'facebook instagram poszt'],
  ['Beállítások', '/settings', 'admin profil'],
];

/** Navigation only: no customer data is fetched merely by opening the command menu. */
export function AdminQuickNavigation() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <>
    <div className="mb-5 flex items-center justify-between gap-3 border-b border-cgi-muted/40 pb-3">
      <p className="hidden sm:block text-xs font-medium uppercase tracking-wider text-cgi-muted-foreground">Come Get It · munkatér</p>
      <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 text-cgi-muted-foreground" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" /> Oldal keresése
        <kbd className="ml-4 rounded border px-1.5 text-[10px]">⌘ / Ctrl K</kbd>
      </Button>
    </div>
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Oldal keresése</DialogTitle>
      <DialogDescription className="sr-only">Keress egy adminisztrációs oldalt, majd nyomj Entert.</DialogDescription>
      <CommandInput placeholder="Felhasználók, helyszínek, értesítések…" />
      <CommandList>
        <CommandEmpty>Nincs ilyen oldal. Próbálj másik kifejezést.</CommandEmpty>
        <CommandGroup heading="Ugrás az oldalra">
          {destinations.map(([label, path, keywords]) => <CommandItem key={path} value={`${label} ${keywords}`} onSelect={() => { setOpen(false); navigate(path); }}>
            <span>{label}</span><ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </CommandItem>)}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </>;
}
