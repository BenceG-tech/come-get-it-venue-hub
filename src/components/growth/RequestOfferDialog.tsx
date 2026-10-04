import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { gdb, randomSuffix, slugify } from "@/lib/growth";

export const DRINK_OPTIONS = ["Kávé", "Limonádé", "Sör", "Fröccs/bor", "Automatikus"];

export interface RequestTarget {
  leadId?: string | null;
  venueName: string;
  idosav?: string;
  // used to create a lead if none exists
  email?: string | null;
  phone?: string | null;
  signupId?: string;
}

interface Props {
  target: RequestTarget | null;
  onClose: () => void;
  onDone?: () => void;
}

export function RequestOfferDialog({ target, onClose, onDone }: Props) {
  const [drink, setDrink] = useState("Automatikus");
  const [idosav, setIdosav] = useState("");
  const [cap, setCap] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setDrink("Automatikus");
      setIdosav(target.idosav ?? "");
      setCap(5);
    }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      let leadId = target.leadId ?? null;
      if (!leadId) {
        leadId = `${slugify(target.venueName)}-${randomSuffix(6)}`;
        const { error } = await gdb.from("growth_leads").insert({
          id: leadId,
          name: target.venueName,
          email: target.email ?? null,
          phone: target.phone ?? null,
          data: {},
        });
        if (error) throw error;
        if (target.signupId) {
          await gdb.from("growth_signups").update({ lead_id: leadId }).eq("id", target.signupId);
        }
      }
      const { error } = await gdb.from("growth_offer_requests").insert({
        lead_id: leadId,
        drink,
        time_window: idosav || null,
        daily_cap: cap,
        status: "varakozik",
      });
      if (error) throw error;
      toast.success("Kérés elküldve – a generálás pár perc");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hiba történt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-cgi-surface border-cgi-muted text-cgi-surface-foreground">
        <DialogHeader>
          <DialogTitle>Ajánlat generálása – {target?.venueName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ital</Label>
            <Select value={drink} onValueChange={setDrink}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRINK_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Idősáv</Label>
            <Input value={idosav} onChange={(e) => setIdosav(e.target.value)} placeholder="7:00–9:00" />
          </div>
          <div className="space-y-1.5">
            <Label>Napi keret (db)</Label>
            <Input type="number" min={1} value={cap} onChange={(e) => setCap(Number(e.target.value) || 1)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Mégse</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Küldés…" : "Kérés küldése"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
