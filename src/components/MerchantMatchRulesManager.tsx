import { useState } from "react";
import { Venue } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MerchantMatchRulesManagerProps {
  venue: Venue;
  onUpdate?: () => void;
}

interface MerchantMatchRules {
  names: string[];
  mcc: string[];
  ibans: string[];
  terminals: string[];
  contains: string[];
}

interface PointsRules {
  per_huf: number;
  min_amount_huf: number;
}

export function MerchantMatchRulesManager({ venue, onUpdate }: MerchantMatchRulesManagerProps) {
  const { toast } = useToast();
  
  const initialRules: MerchantMatchRules = venue.merchant_match_rules || {
    names: [],
    mcc: [],
    ibans: [],
    terminals: [],
    contains: []
  };

  const initialPoints: PointsRules = venue.points_rules || {
    per_huf: 1,
    min_amount_huf: 0
  };

  const [rules, setRules] = useState<MerchantMatchRules>(initialRules);
  const [pointsRules, setPointsRules] = useState<PointsRules>(initialPoints);
  const [newValue, setNewValue] = useState({
    names: "",
    mcc: "",
    ibans: "",
    terminals: "",
    contains: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const addItem = (field: keyof MerchantMatchRules) => {
    const value = newValue[field].trim();
    if (!value) return;
    
    if (rules[field].includes(value)) {
      toast({
        title: "Már létezik",
        description: "Ez az érték már hozzá van adva.",
        variant: "destructive"
      });
      return;
    }

    setRules(prev => ({
      ...prev,
      [field]: [...prev[field], value]
    }));
    setNewValue(prev => ({ ...prev, [field]: "" }));
  };

  const removeItem = (field: keyof MerchantMatchRules, value: string) => {
    setRules(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: This will be connected to the data provider after API is available
      console.log("Saving merchant rules:", { rules, pointsRules });
      
      toast({
        title: "Szabályok mentve",
        description: "A banki egyeztetési szabályok sikeresen mentve lettek."
      });
      
      onUpdate?.();
    } catch (error) {
      console.error("Error saving rules:", error);
      toast({
        title: "Hiba",
        description: "A szabályok mentése sikertelen.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderChipsInput = (
    field: keyof MerchantMatchRules,
    label: string,
    placeholder: string,
    description: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      
      <div className="flex gap-2">
        <Input
          value={newValue[field]}
          onChange={(e) => setNewValue(prev => ({ ...prev, [field]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem(field);
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => addItem(field)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {rules[field].length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {rules[field].map((item) => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => removeItem(field, item)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Banki egyeztetési szabályok</CardTitle>
        <CardDescription>
          Állítsd be, hogy mely banki tranzakciók kerüljenek automatikusan párosításra ezzel a helyszínnel.
          A tranzakciók a Salt Edge rendszeren keresztül érkeznek.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderChipsInput(
          "names",
          "Pontos kereskedőnevek",
          "pl. FIRST CRAFT BEER",
          "Pontos egyezés a kereskedő nevével (normalizált formában)"
        )}

        {renderChipsInput(
          "contains",
          "Név tartalmazza",
          "pl. FIRST",
          "Egyezés, ha a kereskedőnév tartalmazza ezt a szöveget"
        )}

        {renderChipsInput(
          "mcc",
          "MCC kódok",
          "pl. 5813",
          "Merchant Category Code (pl. 5813 = bárok, éttermek)"
        )}

        {renderChipsInput(
          "ibans",
          "IBAN azonosítók",
          "pl. HU42...",
          "Kedvezményezett IBAN számlaszáma"
        )}

        {renderChipsInput(
          "terminals",
          "Terminál azonosítók",
          "pl. TERM12345",
          "POS terminál azonosító, ha elérhető"
        )}

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium">Pontszabályok</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="per_huf">Pont / Forint</Label>
              <Input
                id="per_huf"
                type="number"
                min="0"
                step="0.01"
                value={pointsRules.per_huf}
                onChange={(e) => setPointsRules(prev => ({
                  ...prev,
                  per_huf: parseFloat(e.target.value) || 0
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Hány pontot ér 1 forint költés
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_amount">Min. összeg (Ft)</Label>
              <Input
                id="min_amount"
                type="number"
                min="0"
                value={pointsRules.min_amount_huf}
                onChange={(e) => setPointsRules(prev => ({
                  ...prev,
                  min_amount_huf: parseInt(e.target.value) || 0
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum tranzakciós összeg pontszerzéshez
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Mentés..." : "Szabályok mentése"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
