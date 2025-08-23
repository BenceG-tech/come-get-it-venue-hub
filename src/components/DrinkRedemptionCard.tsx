
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface DrinkOffer {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  availableUntil?: string;
  remainingRedemptions?: number;
  maxRedemptions?: number;
}

interface DrinkRedemptionCardProps {
  offer: DrinkOffer;
  onRedeem?: (offerId: string) => void;
  isAuthenticated?: boolean;
}

export default function DrinkRedemptionCard({ 
  offer, 
  onRedeem, 
  isAuthenticated = false 
}: DrinkRedemptionCardProps) {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!isAuthenticated || !onRedeem) return;
    
    setIsRedeeming(true);
    try {
      await onRedeem(offer.id);
      setIsRedeemed(true);
    } catch (error) {
      console.error('Redemption failed:', error);
    } finally {
      setIsRedeeming(false);
    }
  };

  const getStatusBadge = () => {
    if (isRedeemed) {
      return (
        <Badge className="bg-cgi-success/10 text-cgi-success border border-cgi-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Beváltva
        </Badge>
      );
    }
    
    if (!offer.isActive) {
      return (
        <Badge className="bg-cgi-muted text-cgi-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Nem aktív
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-cgi-primary/10 text-cgi-primary border border-cgi-primary/30">
        <Gift className="h-3 w-3 mr-1" />
        Elérhető
      </Badge>
    );
  };

  const getRemainingText = () => {
    if (!offer.maxRedemptions) return null;
    
    const remaining = offer.remainingRedemptions ?? 0;
    const total = offer.maxRedemptions;
    const percentage = (remaining / total) * 100;
    
    if (percentage < 20) {
      return (
        <div className="flex items-center gap-1 text-cgi-warning text-xs">
          <AlertCircle className="h-3 w-3" />
          Csak {remaining} maradt!
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 text-cgi-muted-foreground text-xs">
        <Users className="h-3 w-3" />
        {remaining}/{total} elérhető
      </div>
    );
  };

  return (
    <Card className="cgi-card overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-semibold text-cgi-surface-foreground mb-2">
              {offer.name}
            </h4>
            {offer.description && (
              <p className="text-sm text-cgi-muted-foreground mb-3">
                {offer.description}
              </p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-3">
          {offer.availableUntil && (
            <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Elérhető: {offer.availableUntil}-ig</span>
            </div>
          )}
          
          {getRemainingText()}
          
          <div className="pt-3 border-t border-cgi-muted/20">
            {!isAuthenticated ? (
              <Button 
                variant="outline" 
                className="w-full cgi-button-secondary"
                disabled
              >
                Bejelentkezés szükséges
              </Button>
            ) : isRedeemed ? (
              <Button 
                variant="outline" 
                className="w-full bg-cgi-success/10 text-cgi-success border-cgi-success/20"
                disabled
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Sikeresen beváltva
              </Button>
            ) : !offer.isActive ? (
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                Jelenleg nem elérhető
              </Button>
            ) : (
              <Button 
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="w-full cgi-button-primary"
              >
                {isRedeeming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Beváltás...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Beváltás most
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
