import { VendorData, ProblemSummary } from '../types';
import { loadGoogleMapsApi } from './googleMaps';
import { apiClient } from './apiClient';

const CATEGORY_TO_QUERY: Record<ProblemSummary['category'], string> = {
  hvac: 'AC specialist',
  plumber: 'plumber',
  electrician: 'electrician',
  roofer: 'roofer',
  appliance: 'appliance repair',
  pest: 'pest control',
  general: 'general contractor'
};

export interface PlacesVendorOptions {
  overrideTerm?: string; // use this term directly for Places search
  userText?: string; // if provided and overrideTerm is absent, ask Gemini to suggest a term
}

export const fetchVendorsFromPlaces = async (
  apiKey: string,
  category: ProblemSummary['category'],
  zipCode: string,
  options?: PlacesVendorOptions
): Promise<VendorData[]> => {
  await loadGoogleMapsApi(apiKey, ['places', 'geocoding']);

  const { PlacesService, PlacesServiceStatus } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  const { Geocoder } = (await google.maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary;
  const geocoder = new Geocoder();

  let term = options?.overrideTerm?.trim() || CATEGORY_TO_QUERY[category] || 'contractor';
  // If no override term and user text provided, try Gemini once
  if (!options?.overrideTerm && options?.userText) {
    try {
      const rec = await apiClient.recommendSearchTerm(options.userText);
      if (rec?.success && rec.term) {
        term = rec.term;
      }
    } catch {
      // silent fallback
    }
  }
  const query = `${term} near ${zipCode}`;

  const center = await new Promise<google.maps.LatLngLiteral | null>((resolve) => {
    geocoder.geocode({ address: zipCode }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });

  // We need a map instance for PlacesService; create an offscreen div
  const tempDiv = document.createElement('div');
  const map = new google.maps.Map(tempDiv, { center: center || { lat: 39.5, lng: -98.35 }, zoom: 12 });
  const service = new PlacesService(map as any);

  const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    // Build a valid request: include location+radius only if we have a center
    const request: google.maps.places.TextSearchRequest = center
      ? { query, location: center as google.maps.LatLngLiteral, radius: 25000 }
      : { query };
    service.textSearch(request, (r, status) => {
      if (status === PlacesServiceStatus.OK && r) resolve(r);
      else reject(new Error(`Places search failed: ${status}`));
    });
  });

  // Mock distance generator for demo purposes
  const randomDistanceMiles = (): number => {
    const min = 0.3; // 0.3 miles
    const max = 12;  // 12 miles
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  };

  const vendors: VendorData[] = results.slice(0, 20).map((place) => {
    const distance = randomDistanceMiles();
    return {
      id: place.place_id || crypto.randomUUID(),
      name: place.name || 'Unknown',
      rating: typeof place.rating === 'number' ? place.rating : 4.5,
      reviewCount: place.user_ratings_total || 0,
      phone: 'N/A',
      website: place.website || undefined,
      address: place.formatted_address || place.vicinity || 'Address unavailable',
      distance,
      category: category,
      hasWebChat: false,
      hasWhatsApp: false,
      outreachStatus: 'pending',
      outreachLog: [],
      source: 'google'
    };
  });

  return vendors;
};

