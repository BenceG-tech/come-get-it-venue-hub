import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gdb, guessContentType, offerShareUrl } from "@/lib/growth";

interface OfferJob {
  folder: string;
  files: File[];
  state: "varakozik" | "fut" | "kesz" | "kihagyva" | "hiba";
  progress: number;
  message?: string;
}

interface Meta {
  lead?: string; venue_name?: string; headline?: string; ital?: string; idosav?: string; keret?: number;
  legacy_artifact_url?: string; offer_info?: string;
}

function relPath(f: File) {
  // webkitRelativePath = "<root>/<leadId>/..." → strip root
  const p = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const parts = p.split("/");
  return parts.length > 2 ? parts.slice(1) : parts;
}

async function processOffer(job: OfferJob, update: (p: Partial<OfferJob>) => void) {
  const byPath = new Map(job.files.map((f) => [relPath(f).slice(1).join("/"), f]));
  const metaFile = byPath.get("meta.json");
  const htmlFile = byPath.get("index.html");
  if (!metaFile || !htmlFile) throw new Error("Hiányzó meta.json vagy index.html");
  const meta: Meta = JSON.parse(await metaFile.text());
  const venue_name = meta.venue_name || job.folder;

  let token: string | null = null;
  let offerId: string | null = null;
  if (meta.legacy_artifact_url) {
    const { data } = await gdb.from("growth_offers").select("id, token, media").eq("legacy_artifact_url", meta.legacy_artifact_url).maybeSingle();
    if (data) {
      // Finished (media set) → skip; partially uploaded → resume with same token.
      if (Array.isArray(data.media) && data.media.length > 0) {
        update({ state: "kihagyva", progress: 100, message: "Már importálva" });
        return;
      }
      token = data.token; offerId = data.id;
    }
  }

  let leadId: string | null = null;
  if (meta.lead) {
    const { data } = await gdb.from("partner_leads").select("id").eq("id", meta.lead).maybeSingle();
    leadId = data?.id ?? null;
  }

  if (!token) {
    const { data, error } = await gdb.from("growth_offers").insert({
      lead_id: leadId, venue_name, headline: meta.headline ?? null, drink: meta.ital ?? null,
      time_window: meta.idosav ?? null, daily_cap: meta.keret ?? null, legacy_artifact_url: meta.legacy_artifact_url ?? null,
      page: meta, media: [], status: "kesz",
    }).select("id, token").single();
    if (error) throw error;
    token = data.token; offerId = data.id;
  }

  const mediaFiles = [...byPath.entries()].filter(([p]) => p.startsWith("media/"));
  const total = mediaFiles.length + 1;
  let n = 0;
  const up = async (path: string, f: File, ct: string) => {
    const { error } = await supabase.storage.from("ajanlatok").upload(path, f, { upsert: true, contentType: ct });
    if (error) throw new Error(`${path}: ${error.message}`);
    n++; update({ progress: Math.round((n / total) * 95) });
  };
  await up(`${token}/index.html`, htmlFile, "text/html");
  const media: string[] = [];
  for (const [p, f] of mediaFiles) {
    const name = p.slice("media/".length);
    await up(`${token}/media/${name}`, f, guessContentType(name));
    media.push(`${token}/media/${name}`);
  }
  const { error: mErr } = await gdb.from("growth_offers").update({ media: media.length ? media : ["index.html"] }).eq("id", offerId);
  if (mErr) throw mErr;
  if (leadId) {
    const { error: lErr } = await gdb.from("partner_leads").update({ offer_url: offerShareUrl(token!), offer_info: meta.offer_info ?? null, offer_request: null }).eq("id", leadId);
    if (lErr) throw lErr;
  }
  update({ state: "kesz", progress: 100 });
}

function OfferImport() {
  const [jobs, setJobs] = useState<OfferJob[]>([]);
  const [busy, setBusy] = useState(false);

  const onFolder = (list: FileList | null) => {
    if (!list) return;
    const groups = new Map<string, File[]>();
    Array.from(list).forEach((f) => {
      const parts = relPath(f);
      if (parts.length < 2) return;
      const folder = parts[0];
      groups.set(folder, [...(groups.get(folder) ?? []), f]);
    });
    const js: OfferJob[] = [...groups.entries()]
      .filter(([, files]) => files.some((f) => relPath(f).slice(1).join("/") === "meta.json"))
      .map(([folder, files]) => ({ folder, files, state: "varakozik", progress: 0 }));
    setJobs(js);
    toast.success(`${js.length} ajánlatmappa található`);
  };

  const run = async () => {
    setBusy(true);
    const queue = jobs.map((_, i) => i).filter((i) => jobs[i].state !== "kesz" && jobs[i].state !== "kihagyva");
    const set = (i: number, p: Partial<OfferJob>) => setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, ...p } : j)));
    const worker = async () => {
      while (queue.length) {
        const i = queue.shift()!;
        set(i, { state: "fut", progress: 0, message: undefined });
        try { await processOffer(jobs[i], (p) => set(i, p)); }
        catch (e) { set(i, { state: "hiba", message: e instanceof Error ? e.message : "Ismeretlen hiba" }); }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
    toast.success("Ajánlat-import befejeződött");
  };

  const finished = jobs.filter((j) => ["kesz", "kihagyva", "hiba"].includes(j.state)).length;
  const errors = jobs.filter((j) => j.state === "hiba");
  const label: Record<OfferJob["state"], string> = { varakozik: "Várakozik", fut: "Fut", kesz: "Kész", kihagyva: "Kihagyva", hiba: "Hiba" };

  return (
    <Card className="cgi-card p-5 space-y-4">
      <h2 className="text-lg font-semibold text-cgi-surface-foreground">Ajánlatok importálása</h2>
      <p className="text-sm text-cgi-muted-foreground">Válaszd ki a mappát: minden almappa egy ajánlat (meta.json, index.html, media/). Újrafuttatáskor a kész ajánlatok kimaradnak.</p>
      {/* @ts-expect-error webkitdirectory is non-standard */}
      <Input type="file" webkitdirectory="" directory="" multiple onChange={(e) => onFolder(e.target.files)} disabled={busy} />
      {jobs.length > 0 && (
        <>
          <Progress value={(finished / jobs.length) * 100} />
          <div className="flex items-center justify-between text-sm text-cgi-muted-foreground">
            <span>{finished} / {jobs.length} feldolgozva</span>
            <Button onClick={run} disabled={busy}>{busy ? "Importálás…" : errors.length ? "Folytatás / újrapróbálás" : "Importálás indítása"}</Button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {jobs.map((j) => (
              <div key={j.folder} className="text-xs">
                <div className="flex justify-between text-cgi-surface-foreground"><span className="truncate">{j.folder}</span><span className={j.state === "hiba" ? "text-red-400" : "text-cgi-muted-foreground"}>{label[j.state]}</span></div>
                <Progress value={j.progress} className="h-1.5" />
              </div>
            ))}
          </div>
          {errors.length > 0 && (
            <div className="rounded-md border border-red-500/40 p-3 text-xs text-red-300 space-y-1">
              {errors.map((e) => <div key={e.folder}><b>{e.folder}:</b> {e.message}</div>)}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function GrowthImport() {
  return (
    <PageLayout>
      <h1 className="text-2xl font-semibold text-cgi-surface-foreground mb-6">Importálás</h1>
      <div className="grid gap-4 max-w-3xl">
        <OfferImport />
      </div>
    </PageLayout>
  );
}
