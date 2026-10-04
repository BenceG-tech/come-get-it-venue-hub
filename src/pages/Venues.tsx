import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpDown,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Gift,
  Globe2,
  Grid2X2,
  GripVertical,
  List,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageLayout } from '@/components/PageLayout';
import { PriceTierBadge } from '@/components/PriceTierBadge';
import { RouteGuard } from '@/components/RouteGuard';
import { VenueFormModal } from '@/components/VenueFormModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import type { Venue } from '@/lib/types';

type VenueRow = {
  id: string;
  name: string;
  address: string;
  plan: 'basic' | 'standard' | 'premium';
  is_paused: boolean;
  website_url?: string | null;
  phone_number?: string | null;
  created_at: string;
  business_hours?: unknown;
  image_url?: string | null;
  hero_image_url?: string | null;
  price_tier?: number | null;
  display_order?: number | null;
  coordinates?: { lat?: number; lng?: number } | null;
};

type StatusFilter = 'all' | 'active' | 'paused' | 'needs_attention';
type PlanFilter = 'all' | VenueRow['plan'];
type ViewMode = 'cards' | 'table';

const PAGE_SIZE = 20;

const workspaceLinks = [
  { href: '/venues', label: 'Helyszínek', icon: Building2 },
  { href: '/rewards', label: 'Jutalmak', icon: Gift },
  { href: '/redemptions', label: 'Beváltások', icon: Activity },
  { href: '/pos/redeem', label: 'QR beváltás', icon: QrCode },
] as const;

function getVenueImage(venue: VenueRow) {
  return venue.image_url || venue.hero_image_url || null;
}

function venueNeedsAttention(venue: VenueRow) {
  const hasCoordinate = Number.isFinite(venue.coordinates?.lat) && Number.isFinite(venue.coordinates?.lng);
  const hasContact = Boolean(venue.phone_number || venue.website_url);
  return !venue.address || !getVenueImage(venue) || !hasCoordinate || !hasContact;
}

function planBadgeClass(plan: VenueRow['plan']) {
  switch (plan) {
    case 'premium':
      return 'border-amber-300/30 bg-amber-300/10 text-amber-200';
    case 'standard':
      return 'border-cgi-primary/30 bg-cgi-primary/10 text-cgi-primary';
    default:
      return 'border-white/10 bg-white/5 text-cgi-muted-foreground';
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ismeretlen hiba történt.';
}

function StatusSummary({
  label,
  value,
  detail,
  icon: Icon,
  selected,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Building2;
  selected: boolean;
  tone: 'cyan' | 'green' | 'amber' | 'slate';
  onClick: () => void;
}) {
  const toneClass = {
    cyan: 'border-cgi-primary/30 bg-cgi-primary/10 text-cgi-primary',
    green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    slate: 'border-white/10 bg-white/[0.04] text-slate-300',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group min-w-0 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cgi-primary/40 hover:bg-cgi-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgi-primary ${
        selected ? 'border-cgi-primary bg-cgi-primary/[0.12] shadow-[0_0_28px_rgba(31,177,183,0.12)]' : 'border-white/10 bg-black/55'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-white">{value}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-white">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-cgi-muted-foreground">{detail}</p>
    </button>
  );
}

function VenueCard({
  venue,
  onToggleActive,
  disabled = false,
}: {
  venue: VenueRow;
  onToggleActive: (venue: VenueRow) => void;
  disabled?: boolean;
}) {
  const image = getVenueImage(venue);
  const needsAttention = venueNeedsAttention(venue);

  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_12px_42px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:border-cgi-primary/35 hover:shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-cgi-muted to-black">
        {image ? (
          <img
            src={image}
            alt={`${venue.name} helyszínképe`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(31,177,183,0.18),transparent_55%)]">
            <Building2 className="h-10 w-10 text-cgi-primary/55" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className={`${venue.is_paused ? 'border-red-400/30 bg-red-500/80 text-white' : 'border-emerald-300/30 bg-emerald-500/85 text-white'} backdrop-blur-md`}>
            {venue.is_paused ? 'Rejtett az appban' : 'Élő az appban'}
          </Badge>
          {needsAttention ? (
            <Badge className="border-amber-300/30 bg-amber-500/80 text-black backdrop-blur-md">
              <CircleAlert className="mr-1 h-3 w-3" /> Ellenőrizendő
            </Badge>
          ) : null}
        </div>
        <Badge className={`absolute right-3 top-3 capitalize backdrop-blur-md ${planBadgeClass(venue.plan)}`}>
          {venue.plan}
        </Badge>
      </div>

      <div className="flex h-[calc(100%-auto)] flex-col p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/venues/${venue.id}`}
              className="line-clamp-1 text-base font-semibold text-white transition-colors hover:text-cgi-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgi-primary"
            >
              {venue.name}
            </Link>
            <p className="mt-1 flex min-w-0 items-start gap-1.5 text-xs leading-5 text-cgi-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cgi-primary" />
              <span className="line-clamp-2">{venue.address || 'Nincs cím megadva'}</span>
            </p>
          </div>
          <PriceTierBadge tier={venue.price_tier} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-cgi-muted-foreground">
          {venue.phone_number ? (
            <a href={`tel:${venue.phone_number}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 hover:text-white">
              <Phone className="h-3.5 w-3.5" /> Telefon
            </a>
          ) : null}
          {venue.website_url ? (
            <a
              href={venue.website_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 hover:text-white"
            >
              <Globe2 className="h-3.5 w-3.5" /> Weboldal
            </a>
          ) : null}
          {venue.business_hours ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5">
              <Clock3 className="h-3.5 w-3.5" /> Nyitvatartás
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={!venue.is_paused}
              onCheckedChange={() => onToggleActive(venue)}
              disabled={disabled}
              aria-label={venue.is_paused ? `${venue.name} aktiválása` : `${venue.name} elrejtése`}
            />
            <span className="text-xs text-cgi-muted-foreground">{venue.is_paused ? 'Inaktív' : 'Aktív'}</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl text-cgi-primary hover:bg-cgi-primary/10 hover:text-cgi-primary">
            <Link to={`/venues/${venue.id}`} aria-label={`${venue.name} részleteinek megnyitása`}>
              Részletek <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function SortableVenueItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-3 top-3 z-20 flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-xl border border-white/15 bg-black/85 text-white shadow-lg backdrop-blur-md hover:border-cgi-primary/50 hover:text-cgi-primary active:cursor-grabbing"
        aria-label="Helyszín sorrendjének módosítása"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="pointer-events-none">{children}</div>
    </div>
  );
}

function VenueTable({ venues, onToggleActive }: { venues: VenueRow[]; onToggleActive: (venue: VenueRow) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/65 md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-white/10 bg-white/[0.035]">
            <tr>
              {['Helyszín', 'Csomag', 'App státusz', 'Adatminőség', 'Kapcsolat', 'Létrehozva', ''].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-cgi-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {venues.map((venue) => {
              const image = getVenueImage(venue);
              const needsAttention = venueNeedsAttention(venue);
              return (
                <tr key={venue.id} className="transition-colors hover:bg-white/[0.035]">
                  <td className="px-4 py-3">
                    <div className="flex min-w-[260px] items-center gap-3">
                      <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-cgi-muted">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Building2 className="m-auto mt-3 h-5 w-5 text-cgi-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/venues/${venue.id}`} className="line-clamp-1 font-medium text-white hover:text-cgi-primary">{venue.name}</Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-cgi-muted-foreground">{venue.address || 'Nincs cím'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge className={`capitalize ${planBadgeClass(venue.plan)}`}>{venue.plan}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={!venue.is_paused} onCheckedChange={() => onToggleActive(venue)} aria-label={venue.is_paused ? `${venue.name} aktiválása` : `${venue.name} elrejtése`} />
                      <span className={`text-xs ${venue.is_paused ? 'text-red-300' : 'text-emerald-300'}`}>{venue.is_paused ? 'Rejtett' : 'Élő'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${needsAttention ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {needsAttention ? <CircleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {needsAttention ? 'Ellenőrizendő' : 'Rendben'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-cgi-muted-foreground">
                      {venue.phone_number ? <Phone className="h-4 w-4" /> : null}
                      {venue.website_url ? <Globe2 className="h-4 w-4" /> : null}
                      {!venue.phone_number && !venue.website_url ? <span className="text-xs">Nincs megadva</span> : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-cgi-muted-foreground">{formatDate(venue.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="icon" className="rounded-xl text-cgi-primary hover:bg-cgi-primary/10 hover:text-cgi-primary">
                      <Link to={`/venues/${venue.id}`} aria-label={`${venue.name} megnyitása`}><ChevronRight className="h-4 w-4" /></Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Venues() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [csvExporting, setCsvExporting] = useState(false);
  const [fixingCoords, setFixingCoords] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [reorderMode, setReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const dataProvider = useMemo(() => getDataProvider(), []);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadVenues = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await dataProvider.getList<VenueRow>('venues', {
        orderBy: 'display_order',
        orderDir: 'asc',
        limit: 1000,
        offset: 0,
      });
      setVenues(rows);
    } catch (error) {
      console.error('Error loading venues:', error);
      setVenues([]);
      toast({ title: 'Hiba', description: 'Nem sikerült betölteni a helyszíneket.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [dataProvider, toast]);

  useEffect(() => {
    void loadVenues();
  }, [loadVenues]);

  const stats = useMemo(() => ({
    total: venues.length,
    active: venues.filter((venue) => !venue.is_paused).length,
    paused: venues.filter((venue) => venue.is_paused).length,
    needsAttention: venues.filter(venueNeedsAttention).length,
  }), [venues]);

  const filteredVenues = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('hu-HU');
    return venues.filter((venue) => {
      const matchesSearch = !normalizedSearch || `${venue.name} ${venue.address}`.toLocaleLowerCase('hu-HU').includes(normalizedSearch);
      const matchesPlan = planFilter === 'all' || venue.plan === planFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !venue.is_paused) ||
        (statusFilter === 'paused' && venue.is_paused) ||
        (statusFilter === 'needs_attention' && venueNeedsAttention(venue));
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [planFilter, searchTerm, statusFilter, venues]);

  const pageCount = Math.max(1, Math.ceil(filteredVenues.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * PAGE_SIZE;
  const pageVenues = filteredVenues.slice(offset, offset + PAGE_SIZE);
  const hasFilters = Boolean(searchTerm || statusFilter !== 'all' || planFilter !== 'all');
  const canReorder = !hasFilters && viewMode === 'cards';

  const selectStatus = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
    setReorderMode(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlanFilter('all');
    setPage(1);
  };

  const handleCreateVenue = async (venueData: Partial<Venue>) => {
    setIsCreating(true);
    try {
      await dataProvider.create('venues', {
        name: venueData.name,
        address: venueData.address,
        description: venueData.description,
        plan: venueData.plan || 'basic',
        is_paused: venueData.is_paused || false,
        phone_number: venueData.phone_number,
        website_url: venueData.website_url,
        redemption_radius_m: venueData.redemption_radius_m ?? null,
      });
      toast({ title: 'Helyszín létrehozva', description: 'Az új helyszín szerkesztésre kész.' });
      await loadVenues();
    } catch (error) {
      console.error('Error creating venue:', error);
      toast({ title: 'Hiba', description: 'Nem sikerült létrehozni a helyszínt.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !canReorder) return;
    const oldIndex = pageVenues.findIndex((venue) => venue.id === active.id);
    const newIndex = pageVenues.findIndex((venue) => venue.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedPage = arrayMove(pageVenues, oldIndex, newIndex);
    setVenues((current) => {
      const next = [...current];
      next.splice(offset, reorderedPage.length, ...reorderedPage);
      return next;
    });

    setIsSavingOrder(true);
    try {
      const updates = reorderedPage.map((venue, index) => ({ id: venue.id, display_order: (offset + index + 1) * 10 }));
      const results = await Promise.all(updates.map((update) => supabase.from('venues').update({ display_order: update.display_order }).eq('id', update.id)));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      toast({ title: 'Sorrend mentve', description: 'Az alkalmazás helyszínsorrendje frissült.' });
    } catch (error) {
      console.error('Reorder failed:', error);
      toast({ title: 'Hiba', description: 'A sorrendet nem sikerült menteni.', variant: 'destructive' });
      await loadVenues();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const toggleVenueActive = async (venue: VenueRow) => {
    const nextPaused = !venue.is_paused;
    setVenues((current) => current.map((item) => item.id === venue.id ? { ...item, is_paused: nextPaused } : item));
    try {
      const { error } = await supabase.from('venues').update({ is_paused: nextPaused }).eq('id', venue.id);
      if (error) throw error;
      toast({
        title: nextPaused ? 'Helyszín elrejtve' : 'Helyszín aktiválva',
        description: nextPaused ? 'Nem jelenik meg a mobilalkalmazásban.' : 'Ismét látható a mobilalkalmazásban.',
      });
    } catch (error) {
      console.error('Toggle active failed:', error);
      setVenues((current) => current.map((item) => item.id === venue.id ? { ...item, is_paused: !nextPaused } : item));
      toast({ title: 'Hiba', description: 'Nem sikerült módosítani a helyszín állapotát.', variant: 'destructive' });
    }
  };

  const exportCSV = async () => {
    setCsvExporting(true);
    try {
      const header = ['id', 'name', 'address', 'plan', 'is_paused', 'website_url', 'phone_number', 'created_at'];
      const lines = [
        header.join(','),
        ...filteredVenues.map((venue) => [
          venue.id,
          `"${(venue.name || '').replace(/"/g, '""')}"`,
          `"${(venue.address || '').replace(/"/g, '""')}"`,
          venue.plan,
          venue.is_paused,
          venue.website_url || '',
          venue.phone_number || '',
          venue.created_at,
        ].join(',')),
      ];
      const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'come-get-it-helyszinek.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setCsvExporting(false);
    }
  };

  const fixBadCoordinates = async () => {
    if (fixingCoords || !window.confirm('A hibás vagy hiányzó koordinátákat újra meghatározzuk a címek alapján. Folytatod?')) return;
    setFixingCoords(true);
    try {
      const { data, error } = await supabase.from('venues').select('id, name, address, coordinates').order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as Array<{ id: string; name: string; address: string | null; coordinates: { lat?: number; lng?: number } | null }>;
      const inBudapest = (lat: number, lng: number) => lat >= 47.3 && lat <= 47.7 && lng >= 18.8 && lng <= 19.4;
      const needsFix = rows.filter((venue) => {
        const lat = venue.coordinates?.lat;
        const lng = venue.coordinates?.lng;
        return lat == null || lng == null || (lat === 0 && lng === 0) || (venue.address?.toLowerCase().includes('budapest') && !inBudapest(lat, lng));
      });

      if (needsFix.length === 0) {
        toast({ title: 'Minden rendben', description: 'Minden helyszín koordinátája használható.' });
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      for (const venue of needsFix) {
        if (!venue.address) {
          failureCount += 1;
          continue;
        }
        const { data: geocoded, error: geocodeError } = await supabase.functions.invoke('geocode-address', { body: { address: venue.address } });
        if (geocodeError || !geocoded?.lat || !geocoded?.lng) {
          failureCount += 1;
          continue;
        }
        const { error: updateError } = await supabase.from('venues').update({
          coordinates: { lat: geocoded.lat, lng: geocoded.lng },
          formatted_address: geocoded.formatted_address ?? undefined,
          google_maps_url: geocoded.google_maps_url ?? undefined,
        }).eq('id', venue.id);
        if (updateError) failureCount += 1;
        else successCount += 1;
      }
      toast({ title: 'Koordináták ellenőrizve', description: `${successCount} javítva, ${failureCount} sikertelen.` });
      await loadVenues();
    } catch (error) {
      console.error('fixBadCoordinates error:', error);
      toast({ title: 'Hiba', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setFixingCoords(false);
    }
  };

  if (isLoading) {
    return (
      <RouteGuard requiredRoles={['cgi_admin']}>
        <PageLayout>
          <div className="space-y-5" aria-busy="true" aria-label="Helyszínek betöltése">
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}
            </div>
          </div>
        </PageLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['cgi_admin']}>
      <PageLayout className="py-4 sm:py-6">
        <div className="space-y-5 pb-10">
          <section className="overflow-hidden rounded-3xl border border-cgi-primary/20 bg-black/70 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
            <div className="relative p-5 sm:p-7">
              <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-cgi-primary/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cgi-primary/25 bg-cgi-primary/10 text-cgi-primary shadow-[0_0_26px_rgba(31,177,183,0.12)]">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cgi-primary">Venue operations</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Helyszínek</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-cgi-muted-foreground">Az alkalmazásban megjelenő partnerhelyek, láthatóságuk és adatminőségük egy helyen.</p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <VenueFormModal
                    onSave={handleCreateVenue}
                    trigger={
                      <Button className="h-11 flex-1 rounded-xl cgi-button-primary sm:flex-none" disabled={isCreating}>
                        <Plus className="h-4 w-4" /> {isCreating ? 'Létrehozás…' : 'Új helyszín'}
                      </Button>
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl cgi-button-secondary" aria-label="További helyszínműveletek">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 border-white/10 bg-[#111] text-white">
                      <DropdownMenuItem onSelect={() => void loadVenues()} className="gap-2"><RefreshCw className="h-4 w-4" /> Adatok frissítése</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setReorderMode((current) => !current)} disabled={!canReorder || isSavingOrder} className="gap-2">
                        {reorderMode ? <Check className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />} {reorderMode ? 'Sorrend lezárása' : 'App-sorrend szerkesztése'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onSelect={() => void fixBadCoordinates()} disabled={fixingCoords} className="gap-2"><Sparkles className="h-4 w-4" /> {fixingCoords ? 'Koordináták javítása…' : 'Koordináták javítása'}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void exportCSV()} disabled={csvExporting} className="gap-2"><Download className="h-4 w-4" /> {csvExporting ? 'Exportálás…' : 'Szűrt lista exportálása'}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <nav aria-label="Helyszínműveletek" className="no-scrollbar relative mt-6 flex gap-2 overflow-x-auto pb-1">
                {workspaceLinks.map(({ href, label, icon: Icon }) => (
                  <Button key={href} asChild variant={href === '/venues' ? 'default' : 'ghost'} size="sm" className={`h-10 shrink-0 rounded-xl ${href === '/venues' ? 'cgi-button-primary' : 'border border-white/10 bg-white/[0.03] text-cgi-muted-foreground hover:bg-white/[0.07] hover:text-white'}`}>
                    <Link to={href}><Icon className="h-4 w-4" /> {label}</Link>
                  </Button>
                ))}
              </nav>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Helyszín-összesítés">
            <StatusSummary label="Összes hely" value={stats.total} detail="Minden partnerhely" icon={Building2} selected={statusFilter === 'all'} tone="cyan" onClick={() => selectStatus('all')} />
            <StatusSummary label="Aktív az appban" value={stats.active} detail="A felhasználók látják" icon={Check} selected={statusFilter === 'active'} tone="green" onClick={() => selectStatus('active')} />
            <StatusSummary label="Rejtett" value={stats.paused} detail="Nem jelenik meg az appban" icon={X} selected={statusFilter === 'paused'} tone="slate" onClick={() => selectStatus('paused')} />
            <StatusSummary label="Ellenőrizendő" value={stats.needsAttention} detail="Hiányzó kép, hely vagy kontakt" icon={CircleAlert} selected={statusFilter === 'needs_attention'} tone="amber" onClick={() => selectStatus('needs_attention')} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/65 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => { setSearchTerm(event.target.value); setPage(1); setReorderMode(false); }}
                  placeholder="Keresés név vagy cím alapján…"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.035] pl-10 pr-10"
                  aria-label="Helyszínek keresése"
                />
                {searchTerm ? (
                  <button type="button" onClick={() => { setSearchTerm(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-cgi-muted-foreground hover:text-white" aria-label="Keresés törlése"><X className="h-4 w-4" /></button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select value={planFilter} onValueChange={(value: PlanFilter) => { setPlanFilter(value); setPage(1); setReorderMode(false); }}>
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.035] sm:w-44" aria-label="Csomag szűrése"><SelectValue placeholder="Minden csomag" /></SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#111] text-white">
                    <SelectItem value="all">Minden csomag</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden items-center rounded-xl border border-white/10 bg-white/[0.025] p-1 md:flex">
                  <Button variant="ghost" size="icon" onClick={() => { setViewMode('cards'); setReorderMode(false); }} aria-label="Kártyanézet" aria-pressed={viewMode === 'cards'} className={`h-9 w-9 rounded-lg ${viewMode === 'cards' ? 'bg-cgi-primary text-black hover:bg-cgi-primary/90' : 'text-cgi-muted-foreground'}`}><Grid2X2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { setViewMode('table'); setReorderMode(false); }} aria-label="Listanézet" aria-pressed={viewMode === 'table'} className={`h-9 w-9 rounded-lg ${viewMode === 'table' ? 'bg-cgi-primary text-black hover:bg-cgi-primary/90' : 'text-cgi-muted-foreground'}`}><List className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-cgi-muted-foreground">
              <div className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><span>{filteredVenues.length} helyszín felel meg</span></div>
              {hasFilters ? <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 rounded-lg text-cgi-primary hover:bg-cgi-primary/10 hover:text-cgi-primary">Szűrők törlése</Button> : null}
            </div>
          </section>

          {reorderMode ? (
            <div className="flex items-start gap-3 rounded-2xl border border-cgi-primary/30 bg-cgi-primary/10 p-4 text-sm text-white">
              <ArrowUpDown className="mt-0.5 h-5 w-5 shrink-0 text-cgi-primary" />
              <div><p className="font-medium">App-sorrend szerkesztése</p><p className="mt-1 text-xs leading-5 text-cgi-muted-foreground">Húzd a kártyákat az új sorrendbe. A változás automatikusan mentődik. {isSavingOrder ? 'Mentés folyamatban…' : ''}</p></div>
            </div>
          ) : null}

          {pageVenues.length > 0 ? (
            <>
              <div className={viewMode === 'cards' ? 'block' : 'md:hidden'}>
                {reorderMode ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={pageVenues.map((venue) => venue.id)} strategy={rectSortingStrategy}>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pageVenues.map((venue) => <SortableVenueItem key={venue.id} id={venue.id}><VenueCard venue={venue} onToggleActive={toggleVenueActive} disabled /></SortableVenueItem>)}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {pageVenues.map((venue) => <VenueCard key={venue.id} venue={venue} onToggleActive={toggleVenueActive} />)}
                  </div>
                )}
              </div>
              {viewMode === 'table' ? <VenueTable venues={pageVenues} onToggleActive={toggleVenueActive} /> : null}
            </>
          ) : (
            <Card className="rounded-2xl border-dashed border-white/15 bg-black/55 p-8 text-center sm:p-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-cgi-muted-foreground"><Search className="h-5 w-5" /></div>
              <h2 className="mt-4 text-lg font-semibold text-white">Nincs találat</h2>
              <p className="mt-1 text-sm text-cgi-muted-foreground">Módosítsd a keresést vagy töröld a szűrőket.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl cgi-button-secondary">Szűrők törlése</Button>
            </Card>
          )}

          <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/55 p-3 sm:flex-row sm:p-4">
            <p className="text-xs text-cgi-muted-foreground">
              {filteredVenues.length === 0 ? '0 helyszín' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, filteredVenues.length)} / ${filteredVenues.length} helyszín`}
            </p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} className="h-10 flex-1 rounded-xl cgi-button-secondary sm:flex-none"><ChevronLeft className="h-4 w-4" /> Előző</Button>
              <span className="min-w-16 text-center text-xs font-medium text-white">{safePage} / {pageCount}</span>
              <Button variant="outline" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage === pageCount} className="h-10 flex-1 rounded-xl cgi-button-secondary sm:flex-none">Következő <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </footer>
        </div>
      </PageLayout>
    </RouteGuard>
  );
}

export { Venues };
