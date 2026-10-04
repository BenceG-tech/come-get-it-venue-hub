import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expand, MapPin, Navigation, Ruler, UnfoldHorizontal } from "lucide-react";
import { STAGES, type PartnerLead } from "@/lib/partnerOutreach";

const BUDAPEST_CENTER: [number, number] = [19.0558, 47.4979];
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const SOURCE_ID = "partner-leads";

interface PartnerLeadMapProps {
  leads: PartnerLead[];
  totalFiltered: number;
  onSelect: (leadId: string) => void;
}

interface MappedLead extends PartnerLead {
  lat: number;
  lon: number;
}

function isMappedLead(lead: PartnerLead): lead is MappedLead {
  return (
    typeof lead.lat === "number" &&
    Number.isFinite(lead.lat) &&
    typeof lead.lon === "number" &&
    Number.isFinite(lead.lon) &&
    lead.lat >= 47 &&
    lead.lat <= 48 &&
    lead.lon >= 18 &&
    lead.lon <= 20
  );
}

function distanceKm(a: MappedLead, b: MappedLead) {
  const radius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDistance(value: number) {
  if (!value) return "–";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toLocaleString("hu-HU", { maximumFractionDigits: 1 })} km`;
}

function mapStats(leads: MappedLead[]) {
  const nearest = leads.map((lead, index) => {
    let minimum = Number.POSITIVE_INFINITY;
    leads.forEach((candidate, candidateIndex) => {
      if (candidateIndex !== index) minimum = Math.min(minimum, distanceKm(lead, candidate));
    });
    return Number.isFinite(minimum) ? minimum : 0;
  });

  const center = leads.length
    ? {
        lat: leads.reduce((sum, lead) => sum + lead.lat, 0) / leads.length,
        lon: leads.reduce((sum, lead) => sum + lead.lon, 0) / leads.length,
      }
    : null;
  const centerLead = center
    ? ({ lat: center.lat, lon: center.lon } as MappedLead)
    : null;
  const centerDistances = centerLead
    ? leads.map((lead) => distanceKm(centerLead, lead)).sort((a, b) => a - b)
    : [];
  const coverageIndex = Math.max(0, Math.ceil(centerDistances.length * 0.8) - 1);

  return {
    districts: new Set(leads.map((lead) => lead.district).filter(Boolean)).size,
    nearestMedian: median(nearest),
    coverageRadius: centerDistances[coverageIndex] || 0,
  };
}

export function PartnerLeadMap({ leads, totalFiltered, onSelect }: PartnerLeadMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const initialFitDoneRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const mappedLeads = useMemo(() => leads.filter(isMappedLead), [leads]);
  const stats = useMemo(() => mapStats(mappedLeads), [mappedLeads]);
  const geoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: mappedLeads.map((lead) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lead.lon, lead.lat] },
        properties: {
          id: lead.id,
          name: lead.name,
          grade: lead.grade || "N",
          stage: lead.stage,
          stageLabel: STAGES[lead.stage]?.label || "Ismeretlen",
        },
      })),
    }),
    [mappedLeads]
  );

  const fitToLeads = useCallback((animated = true) => {
    const map = mapRef.current;
    if (!map || mappedLeads.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    mappedLeads.forEach((lead) => bounds.extend([lead.lon, lead.lat]));
    map.fitBounds(bounds, {
      padding: { top: 54, right: 54, bottom: 54, left: 54 },
      maxZoom: 14,
      duration: animated ? 700 : 0,
    });
  }, [mappedLeads]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: BUDAPEST_CENTER,
      zoom: 10.5,
      minZoom: 8,
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
      });

      map.addLayer({
        id: "partner-clusters-halo",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "rgba(34, 211, 238, 0.18)",
          "circle-radius": ["step", ["get", "point_count"], 24, 20, 30, 60, 38],
          "circle-blur": 0.35,
        },
      });
      map.addLayer({
        id: "partner-clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#22d3ee", 20, "#14b8a6", 60, "#0e7490"],
          "circle-radius": ["step", ["get", "point_count"], 16, 20, 21, 60, 27],
          "circle-stroke-color": "#ecfeff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "partner-cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#001316" },
      });
      map.addLayer({
        id: "partner-points-halo",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(34, 211, 238, 0.22)",
          "circle-radius": 11,
          "circle-blur": 0.35,
        },
      });
      map.addLayer({
        id: "partner-points",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match", ["get", "grade"],
            "A", "#34d399",
            "B", "#22d3ee",
            "C", "#fbbf24",
            "D", "#94a3b8",
            "#38bdf8",
          ],
          "circle-radius": 7,
          "circle-stroke-color": "#020617",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "partner-point-labels",
        type: "symbol",
        source: SOURCE_ID,
        minzoom: 13,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "#020617",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "partner-clusters", async (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const coordinates = feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;
        if (clusterId == null || !coordinates) return;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: coordinates as [number, number], zoom });
      });
      map.on("click", "partner-points", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });

      ["partner-clusters", "partner-points"].forEach((layer) => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      });
      setReady(true);
    });
    map.on("error", (event) => {
      const message = event.error?.message || "A térkép nem tölthető be.";
      if (/style|source|tile/i.test(message)) setMapError(message);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(geoJson);
    if (!initialFitDoneRef.current && mappedLeads.length) {
      initialFitDoneRef.current = true;
      fitToLeads(false);
    }
  }, [fitToLeads, geoJson, mappedLeads.length, ready]);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MapMetric icon={MapPin} label="Térképen" value={`${mappedLeads.length}/${totalFiltered}`} />
        <MapMetric icon={Navigation} label="Érintett kerületek" value={String(stats.districts)} />
        <MapMetric icon={Ruler} label="Tipikus közelség" value={formatDistance(stats.nearestMedian)} />
        <MapMetric icon={UnfoldHorizontal} label="80%-os lefedettség" value={formatDistance(stats.coverageRadius)} />
      </div>

      <Card className="cgi-card relative overflow-hidden p-0">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <Badge className="border border-white/10 bg-black/85 text-white backdrop-blur">
            {mappedLeads.length} látható hely
          </Badge>
          {totalFiltered > mappedLeads.length && (
            <Badge variant="outline" className="border-amber-400/30 bg-black/85 text-amber-300 backdrop-blur">
              {totalFiltered - mappedLeads.length} koordináta nélkül
            </Badge>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-3 z-10 bg-black/85 text-white backdrop-blur hover:bg-black"
          onClick={() => fitToLeads()}
          disabled={!mappedLeads.length}
        >
          <Expand className="mr-2 h-4 w-4" /> Összes hely
        </Button>
        <div ref={containerRef} className="h-[520px] w-full lg:h-[620px]" aria-label="Potenciális partnerhelyek térképe" />
        {mapError && (
          <div className="absolute inset-x-3 bottom-14 z-20 rounded-md border border-amber-400/30 bg-black/90 p-3 text-sm text-amber-200">
            A háttértérkép átmenetileg nem érhető el. A lista és a partneradatok továbbra is használhatók.
          </div>
        )}
        <div className="absolute bottom-3 right-12 z-10 hidden items-center gap-2 rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-slate-200 backdrop-blur sm:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> A
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> B
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> C
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> D
        </div>
      </Card>
      <p className="text-xs text-cgi-muted-foreground">
        Kattints egy pontra a hely adatlapjához. A körök közelben lévő helyeket csoportosítanak; kattintással szétnyithatók.
      </p>
    </div>
  );
}

function MapMetric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <Card className="cgi-card flex items-center gap-3 p-3">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-cgi-primary/10 text-cgi-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-cgi-muted-foreground">{label}</div>
        <div className="truncate font-semibold text-cgi-surface-foreground">{value}</div>
      </div>
    </Card>
  );
}
