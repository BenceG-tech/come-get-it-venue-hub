import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploadInput } from './ImageUploadInput';
import { ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SimpleImageInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function SimpleImageInput({ value, onChange, placeholder = 'Kép URL' }: SimpleImageInputProps) {
  const [showUrl, setShowUrl] = useState(false);
  const hasImage = !!value?.trim();

  return (
    <div className="space-y-2">
      {hasImage ? (
        <div className="overflow-hidden rounded-md border border-cgi-muted bg-cgi-muted/10">
          <div className="relative aspect-[16/9] bg-cgi-muted/30">
            <img
              src={value}
              alt="Ital kép előnézet"
              className="h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.opacity = '0.25'; }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-cgi-background/85 p-2 backdrop-blur-sm">
              <ImageUploadInput
                onUploaded={onChange}
                buttonLabel="Csere"
                size="sm"
                variant="outline"
                className="[&_button]:h-8 [&_button]:text-xs"
              />
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-cgi-error hover:text-cgi-error" onClick={() => onChange('')}>
                <Trash2 className="h-4 w-4 mr-1" /> Törlés
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-cgi-muted bg-cgi-muted/10 p-4 text-center">
          <ImageIcon className="mx-auto mb-2 h-7 w-7 text-cgi-muted-foreground" />
          <ImageUploadInput
            onUploaded={onChange}
            buttonLabel="Kép feltöltése"
            size="sm"
            variant="outline"
            className="justify-center [&_button]:h-9"
          />
        </div>
      )}

      <Collapsible open={showUrl} onOpenChange={setShowUrl}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-1 text-xs text-cgi-muted-foreground hover:text-cgi-surface-foreground">
            <Link2 className="h-3.5 w-3.5 mr-1" /> URL megadása
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              className="cgi-input h-10 flex-1"
            />
            <ImageUploadInput
              onUploaded={onChange}
              buttonLabel=""
              size="sm"
              variant="outline"
              className="[&_button]:h-10 [&_button]:w-10 [&_button]:px-0"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}