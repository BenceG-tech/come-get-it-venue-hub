
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CreditCard, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkedCard {
  id: string;
  fidel_card_id: string;
  last_four: string;
  scheme: string;
  is_active: boolean;
  created_at: string;
}

interface CardLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CardLinkingModal({ isOpen, onClose, onSuccess }: CardLinkingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const { toast } = useToast();

  // Load user's linked cards
  const loadLinkedCards = async () => {
    try {
      const { data, error } = await supabase
        .from('linked_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedCards(data || []);
    } catch (error: any) {
      console.error('Failed to load linked cards:', error);
    }
  };

  // Link a new card via Fidel SDK
  const handleLinkCard = async () => {
    if (!cardNumber.trim() || cardNumber.length < 16) {
      toast({
        title: 'Hibás kártyaszám',
        description: 'Kérjük, adjon meg egy érvényes kártyaszámot.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, you would use Fidel SDK here
      // For now, we'll simulate the card linking process
      
      // Generate a mock Fidel card ID (in production this comes from Fidel)
      const mockFidelCardId = `card_${Date.now()}`;
      const lastFour = cardNumber.slice(-4);
      
      // Store the linked card in our database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Felhasználó nincs bejelentkezve');

      const { error } = await supabase
        .from('linked_cards')
        .insert({
          user_id: user.id,
          fidel_card_id: mockFidelCardId,
          program_id: 'prog_test', // This should come from env
          last_four: lastFour,
          scheme: 'visa', // Would be detected by Fidel
          is_active: false // Will be activated by webhook
        });

      if (error) throw error;

      toast({
        title: 'Kártya sikeresen összekapcsolva!',
        description: 'A kártyád most már használható pontgyűjtésre.',
      });

      setCardNumber('');
      setShowLinkForm(false);
      loadLinkedCards();
      onSuccess?.();
      
    } catch (error: any) {
      console.error('Card linking failed:', error);
      toast({
        title: 'Hiba',
        description: error.message || 'Nem sikerült összekapcsolni a kártyát.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a linked card
  const handleRemoveCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('linked_cards')
        .update({ is_active: false })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Kártya eltávolítva',
        description: 'A kártya már nem aktív a rendszerben.',
      });

      loadLinkedCards();
    } catch (error: any) {
      console.error('Failed to remove card:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült eltávolítani a kártyát.',
        variant: 'destructive',
      });
    }
  };

  // Load cards when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLinkedCards();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bankkártyák kezelése
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing cards */}
          <div className="space-y-2">
            <Label>Összekapcsolt kártyák</Label>
            {linkedCards.length > 0 ? (
              <div className="space-y-2">
                {linkedCards.map((card) => (
                  <Card key={card.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-cgi-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            **** {card.last_four}
                          </div>
                          <div className="text-xs text-cgi-muted-foreground">
                            {card.scheme.toUpperCase()} • {card.is_active ? 'Aktív' : 'Inaktív'}
                          </div>
                        </div>
                      </div>
                      {card.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCard(card.id)}
                          className="text-cgi-error hover:text-cgi-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-cgi-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Még nincs összekapcsolt kártya</p>
              </div>
            )}
          </div>

          {/* Add new card */}
          {!showLinkForm ? (
            <Button
              onClick={() => setShowLinkForm(true)}
              className="w-full cgi-button-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Új kártya hozzáadása
            </Button>
          ) : (
            <div className="space-y-3 border-t border-cgi-muted pt-4">
              <div className="flex items-center gap-2 text-sm text-cgi-warning">
                <AlertCircle className="h-4 w-4" />
                <span>Csak saját bankkártyádat add hozzá!</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="card-number">Kártyaszám</Label>
                <Input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '');
                    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
                    setCardNumber(formatted);
                  }}
                  maxLength={19}
                  className="cgi-input"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowLinkForm(false);
                    setCardNumber('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Mégse
                </Button>
                <Button
                  onClick={handleLinkCard}
                  disabled={isLoading}
                  className="flex-1 cgi-button-primary"
                >
                  {isLoading ? 'Összekapcsolás...' : 'Hozzáadás'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
