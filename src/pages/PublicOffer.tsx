import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { gdb } from "@/lib/growth";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "ok"; srcDoc: string };

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export default function PublicOffer() {
  const { token = "" } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await gdb.rpc("growth_get_offer", { p_token: token });
        if (error || !data) throw new Error("missing");
        const venue = String(data.venue_name ?? "");
        document.title = `${venue} × Come Get It`;
        const url = supabase.storage.from("ajanlatok").getPublicUrl(`${token}/index.html`).data.publicUrl;
        const base = url.replace(/\/index\.html$/, "");
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("missing");
        const html = await res.text();
        const srcDoc = '<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="' + base + '/"><title>' + esc(venue) + ' × Come Get It</title></head><body style="margin:0;background:#000">' + html + "</body></html>";
        if (!cancelled) setState({ kind: "ok", srcDoc });
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.kind === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Betöltés…</div>;
  }
  if (state.kind === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Ez az ajánlat nem elérhető</h1>
        <p className="text-muted-foreground max-w-sm">Lehet, hogy a link lejárt vagy elírás történt. Írj nekünk, és küldünk egy újat!</p>
      </div>
    );
  }
  return (
    <iframe
      title="Ajánlat"
      sandbox="allow-scripts allow-popups"
      srcDoc={state.srcDoc}
      style={{ border: 0, width: "100vw", height: "100dvh", display: "block" }}
    />
  );
}
