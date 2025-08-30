
import { useState, useEffect } from 'react';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';

interface PublicVenue {
  id: string;
  name: string;
  address: string;
  description?: string;
  plan: 'basic' | 'standard' | 'premium';
  phone_number?: string;
  website_url?: string;
  is_paused: boolean;
  // New fields for image handling
  image_url?: string;
  hero_image_url?: string;
}

export function usePublicVenues(searchTerm?: string) {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dataProvider = getDataProvider();

  useEffect(() => {
    const loadVenues = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let allVenues: PublicVenue[] = [];
        
        // Try to use the new public venues method if available
        if ('getPublicVenues' in dataProvider && typeof dataProvider.getPublicVenues === 'function') {
          allVenues = await dataProvider.getPublicVenues({
            search: searchTerm || undefined,
            limit: 50,
          });
        } else {
          // Fallback to regular getList method
          allVenues = await dataProvider.getList<PublicVenue>('venues', {
            search: searchTerm || undefined,
            orderBy: 'created_at',
            orderDir: 'desc',
            limit: 50,
          } as any);
          
          // Filter active venues only in fallback mode
          allVenues = allVenues.filter(venue => !venue.is_paused);
        }
        
        setVenues(allVenues);
      } catch (err) {
        console.error('Error loading venues:', err);
        setError('Nem sikerült betölteni a helyszíneket');
        setVenues([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadVenues();
  }, [searchTerm]);

  return { venues, isLoading, error };
}
