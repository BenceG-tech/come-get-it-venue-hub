import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Zap, Building2, CreditCard, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { VenueIntegrationType } from '@/lib/types';

interface VenueIntegrationSettingsProps {
  integrationType: VenueIntegrationType;
  goorderzExternalId?: string;
  saltedgeConnectionId?: string;
  onChange: (updates: {
    integration_type?: VenueIntegrationType;
    goorderz_external_id?: string;
    saltedge_connection_id?: string;
  }) => void;
  readOnly?: boolean;
}

const INTEGRATION_OPTIONS = [
  {
    value: 'goorderz' as VenueIntegrationType,
    label: 'Goorderz POS',
    description: 'Teljes SKU-szintű adatok, First Glass elemzés',
    icon: Zap,
    badge: 'Deep Integration',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    value: 'saltedge' as VenueIntegrationType,
    label: 'Salt Edge (Open Banking)',
    description: 'Banki tranzakció alapú pontgyűjtés',
    icon: CreditCard,
    badge: 'Standard',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    value: 'manual' as VenueIntegrationType,
    label: 'Manuális',
    description: 'Személyzet általi beváltás rögzítés',
    icon: Users,
    badge: 'Basic',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    value: 'none' as VenueIntegrationType,
    label: 'Nincs integráció',
    description: 'Csak QR kód alapú beváltás',
    icon: Building2,
    badge: 'Minimal',
    badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
];

export function VenueIntegrationSettings({
  integrationType,
  goorderzExternalId,
  saltedgeConnectionId,
  onChange,
  readOnly = false,
}: VenueIntegrationSettingsProps) {
  const selectedOption = INTEGRATION_OPTIONS.find(opt => opt.value === integrationType) || INTEGRATION_OPTIONS[3];

  return (
    <div className="space-y-6">
      {/* Integration Type Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-cgi-surface-foreground">Integráció típusa</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-cgi-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>A venue adatintegráció típusa határozza meg, milyen mélységű elemzések érhetők el (pl. First Glass hatás csak Goorderz esetén).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTEGRATION_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = integrationType === option.value;
            
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cgi-primary bg-cgi-primary/5 ring-1 ring-cgi-primary'
                    : 'border-cgi-muted hover:border-cgi-muted-foreground/50'
                } ${readOnly ? 'pointer-events-none opacity-75' : ''}`}
                onClick={() => !readOnly && onChange({ integration_type: option.value })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-cgi-primary/20' : 'bg-cgi-muted'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-cgi-primary' : 'text-cgi-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-cgi-surface-foreground">{option.label}</span>
                        <Badge variant="outline" className={`text-xs ${option.badgeColor}`}>
                          {option.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-cgi-muted-foreground mt-1">{option.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-cgi-primary flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Conditional Config Fields */}
      {integrationType === 'goorderz' && (
        <Card className="border-cgi-muted bg-cgi-muted/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cgi-surface-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Goorderz Konfiguráció
            </CardTitle>
            <CardDescription>
              A Goorderz POS rendszer által használt venue azonosító
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goorderz_id" className="text-cgi-surface-foreground">
                External Venue ID
              </Label>
              <Input
                id="goorderz_id"
                value={goorderzExternalId || ''}
                onChange={(e) => onChange({ goorderz_external_id: e.target.value })}
                placeholder="GZ-12345"
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                disabled={readOnly}
              />
              <p className="text-xs text-cgi-muted-foreground">
                Ez az ID megegyezik a Goorderz rendszerben beállított venue azonosítóval.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {integrationType === 'saltedge' && (
        <Card className="border-cgi-muted bg-cgi-muted/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cgi-surface-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-400" />
              Salt Edge Konfiguráció
            </CardTitle>
            <CardDescription>
              Az Open Banking kapcsolat azonosítója
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saltedge_id" className="text-cgi-surface-foreground">
                Connection ID
              </Label>
              <Input
                id="saltedge_id"
                value={saltedgeConnectionId || ''}
                onChange={(e) => onChange({ saltedge_connection_id: e.target.value })}
                placeholder="SE-xxxxx"
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                disabled={readOnly}
              />
              <p className="text-xs text-cgi-muted-foreground">
                A Salt Edge rendszerben létrehozott kapcsolat azonosítója.
              </p>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">
                Salt Edge integrációnál a Merchant Match szabályokat is be kell állítani a pontos helyszín-párosításhoz.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Status Summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-cgi-muted/30 border border-cgi-muted">
        <selectedOption.icon className="h-5 w-5 text-cgi-secondary" />
        <div className="flex-1">
          <p className="text-sm text-cgi-surface-foreground font-medium">
            {selectedOption.label}
          </p>
          <p className="text-xs text-cgi-muted-foreground">
            {integrationType === 'goorderz' && goorderzExternalId && `ID: ${goorderzExternalId}`}
            {integrationType === 'saltedge' && saltedgeConnectionId && `Connection: ${saltedgeConnectionId}`}
            {integrationType === 'goorderz' && !goorderzExternalId && 'External ID nincs beállítva'}
            {integrationType === 'saltedge' && !saltedgeConnectionId && 'Connection ID nincs beállítva'}
            {integrationType === 'manual' && 'Manuális beváltás rögzítés'}
            {integrationType === 'none' && 'Csak QR beváltás'}
          </p>
        </div>
        <Badge variant="outline" className={selectedOption.badgeColor}>
          {selectedOption.badge}
        </Badge>
      </div>
    </div>
  );
}
