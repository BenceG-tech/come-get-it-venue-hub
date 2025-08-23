
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import type { VenueImage } from '@/lib/types';

interface VenueImageGalleryProps {
  images: VenueImage[];
  venueName: string;
}

export function VenueImageGallery({ images, venueName }: VenueImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Find cover image or use first image
  const coverImage = images.find(img => img.isCover) || images[0];
  const mainImageIndex = coverImage ? images.findIndex(img => img.id === coverImage.id) : 0;

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };

  const handleImageLoad = (index: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  // If no images or all images failed to load, show placeholder
  const hasValidImages = images.length > 0 && images.some((_, index) => !imageErrors.has(index));

  if (!hasValidImages) {
    return (
      <Card className="cgi-card overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-cgi-primary/20 to-cgi-secondary/20 flex items-center justify-center">
          <Gift className="h-16 w-16 text-cgi-primary" />
        </div>
      </Card>
    );
  }

  const currentImage = images[selectedImage] || images[mainImageIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <Card className="cgi-card overflow-hidden">
        <div className="aspect-video relative">
          {!imageErrors.has(selectedImage) ? (
            <img
              src={currentImage.url}
              alt={currentImage.label || `${venueName} - Kép`}
              className="w-full h-full object-cover"
              onError={() => handleImageError(selectedImage)}
              onLoad={() => handleImageLoad(selectedImage)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cgi-primary/20 to-cgi-secondary/20 flex items-center justify-center">
              <Gift className="h-16 w-16 text-cgi-primary" />
            </div>
          )}
        </div>
      </Card>

      {/* Thumbnail Gallery - only show if more than one image */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? 'border-cgi-primary shadow-md'
                  : 'border-cgi-muted hover:border-cgi-primary/50'
              }`}
            >
              {!imageErrors.has(index) ? (
                <img
                  src={image.url}
                  alt={image.label || `${venueName} - Előnézet ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                  onLoad={() => handleImageLoad(index)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cgi-muted/20 to-cgi-muted/10 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-cgi-muted-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
