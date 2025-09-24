import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploadInput } from './ImageUploadInput';
import { Upload } from 'lucide-react';

interface SimpleImageInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function SimpleImageInput({ value, onChange, placeholder }: SimpleImageInputProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="cgi-input flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
      
      {showUpload && (
        <div className="flex justify-center">
          <ImageUploadInput
            onUploaded={(url) => {
              onChange(url);
              setShowUpload(false);
            }}
            buttonLabel="Kép feltöltése"
            size="sm"
            variant="outline"
          />
        </div>
      )}
      
      {value && (
        <div className="mt-2">
          <img 
            src={value} 
            alt="Preview" 
            className="h-20 w-20 object-cover rounded border"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}