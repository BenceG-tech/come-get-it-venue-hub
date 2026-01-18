import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Venue {
  id: string;
  name: string;
}

export interface RedemptionFiltersState {
  startDate: string;
  endDate: string;
  venueId: string;
  status: string;
}

interface RedemptionFiltersProps {
  filters: RedemptionFiltersState;
  onFiltersChange: (filters: RedemptionFiltersState) => void;
  onReset: () => void;
}

export function RedemptionFilters({
  filters,
  onFiltersChange,
  onReset,
}: RedemptionFiltersProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVenues() {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name")
        .order("name");
      
      if (!error && data) {
        setVenues(data);
      }
      setLoading(false);
    }
    fetchVenues();
  }, []);

  const handleChange = (key: keyof RedemptionFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.startDate || filters.endDate || filters.venueId || filters.status;

  return (
    <div className="cgi-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-cgi-muted-foreground" />
        <span className="font-medium text-cgi-surface-foreground">Szűrők</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-cgi-muted-foreground">
            Kezdő dátum
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-cgi-muted-foreground">
            Záró dátum
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Venue Filter */}
        <div className="space-y-2">
          <Label className="text-cgi-muted-foreground">Helyszín</Label>
          <Select
            value={filters.venueId}
            onValueChange={(value) => handleChange("venueId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Összes helyszín" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes helyszín</SelectItem>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-cgi-muted-foreground">Státusz</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Összes státusz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes státusz</SelectItem>
              <SelectItem value="success">Sikeres</SelectItem>
              <SelectItem value="void">Visszavont</SelectItem>
              <SelectItem value="cancelled">Törölve</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          {hasActiveFilters && (
            <Button variant="outline" onClick={onReset} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Szűrők törlése
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
