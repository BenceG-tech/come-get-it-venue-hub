
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { VenueDrink } from '@/lib/types';

interface DrinkSelectorProps {
  drinks: VenueDrink[];
  onChange: (drinks: VenueDrink[]) => void;
}

const DRINK_CATEGORIES = [
  'cocktail',
  'beer',
  'wine',
  'spirits',
  'non-alcoholic',
  'coffee',
  'tea',
  'other'
];

export function DrinkSelector({ drinks, onChange }: DrinkSelectorProps) {
  const [newDrink, setNewDrink] = useState<Partial<VenueDrink>>({
    drinkName: '',
    category: '',
    abv: 0,
    is_sponsored: false,
    is_free_drink: false
  });

  const addDrink = () => {
    if (!newDrink.drinkName?.trim()) return;

    const drink: VenueDrink = {
      id: `drink-${Date.now()}`,
      venue_id: '', // Will be set when venue is saved
      drinkName: newDrink.drinkName,
      category: newDrink.category || undefined,
      abv: newDrink.abv || undefined,
      is_sponsored: newDrink.is_sponsored || false,
      brand_id: newDrink.brand_id || undefined,
      is_free_drink: newDrink.is_free_drink || false
    };

    onChange([...drinks, drink]);
    setNewDrink({
      drinkName: '',
      category: '',
      abv: 0,
      is_sponsored: false,
      is_free_drink: false
    });
  };

  const removeDrink = (id: string) => {
    onChange(drinks.filter(drink => drink.id !== id));
  };

  const updateDrink = (id: string, updates: Partial<VenueDrink>) => {
    onChange(drinks.map(drink => 
      drink.id === id ? { ...drink, ...updates } : drink
    ));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-cgi-surface-foreground">Jelenlegi italok</Label>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {drinks.map((drink) => (
            <Card key={drink.id} className="p-3 cgi-card">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                  <div>
                    <Input
                      value={drink.drinkName}
                      onChange={(e) => updateDrink(drink.id, { drinkName: e.target.value })}
                      className="cgi-input text-sm"
                      placeholder="Ital neve"
                    />
                  </div>
                  <div>
                    <Select 
                      value={drink.category || ''} 
                      onValueChange={(value) => updateDrink(drink.id, { category: value })}
                    >
                      <SelectTrigger className="cgi-input text-sm">
                        <SelectValue placeholder="Kategória" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRINK_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Checkbox
                        checked={drink.is_free_drink}
                        onCheckedChange={(checked) => updateDrink(drink.id, { is_free_drink: !!checked })}
                      />
                      <span className="text-xs text-cgi-muted-foreground">Ingyenes</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => removeDrink(drink.id)}
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-cgi-surface-foreground">Új ital hozzáadása</Label>
        <Card className="p-3 cgi-card">
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={newDrink.drinkName || ''}
              onChange={(e) => setNewDrink({ ...newDrink, drinkName: e.target.value })}
              placeholder="Ital neve"
              className="cgi-input"
            />
            <Select 
              value={newDrink.category || ''} 
              onValueChange={(value) => setNewDrink({ ...newDrink, category: value })}
            >
              <SelectTrigger className="cgi-input">
                <SelectValue placeholder="Kategória" />
              </SelectTrigger>
              <SelectContent>
                {DRINK_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Checkbox
                  checked={newDrink.is_free_drink || false}
                  onCheckedChange={(checked) => setNewDrink({ ...newDrink, is_free_drink: !!checked })}
                />
                <span className="text-xs text-cgi-muted-foreground">Ingyenes</span>
              </div>
              <Button
                onClick={addDrink}
                size="sm"
                className="cgi-button-primary"
                disabled={!newDrink.drinkName?.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
