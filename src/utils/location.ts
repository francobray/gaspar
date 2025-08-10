interface LocationResult {
  zipCode: string;
  city: string;
  state: string;
}

export const getCurrentLocation = async (): Promise<LocationResult> => {
  return new Promise((resolve) => {
    const fallback = () =>
      resolve({ zipCode: '10001', city: 'New York', state: 'NY' });

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim reverse geocoding to get postal code
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
          const resp = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            }
          });
          const data = await resp.json();
          const postcode = data?.address?.postcode as string | undefined;
          const city = (data?.address?.city || data?.address?.town || data?.address?.village || '') as string;
          const state = (data?.address?.state || data?.address?.state_district || '') as string;
          if (postcode) {
            resolve({ zipCode: postcode, city: city || 'Unknown', state: state || '' });
          } else {
            console.warn('Nominatim: postcode not found, falling back');
            fallback();
          }
        } catch (err) {
          console.warn('Reverse geocoding failed, falling back:', (err as Error).message);
          fallback();
        }
      },
      (error) => {
        console.warn('Geolocation error, falling back:', error.message);
        fallback();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
};

export const getLocationFromZip = async (zipCode: string): Promise<LocationResult> => {
  // Simulate ZIP code validation and location lookup
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Sample ZIP code database (in a real app, use a proper geocoding service)
  const zipDatabase: Record<string, Omit<LocationResult, 'zipCode'>> = {
    '94102': { city: 'San Francisco', state: 'CA' },
    '10001': { city: 'New York', state: 'NY' },
    '90210': { city: 'Beverly Hills', state: 'CA' },
    '60601': { city: 'Chicago', state: 'IL' },
    '77001': { city: 'Houston', state: 'TX' },
    '30301': { city: 'Atlanta', state: 'GA' },
    '02101': { city: 'Boston', state: 'MA' },
    '98101': { city: 'Seattle', state: 'WA' }
  };
  
  const location = zipDatabase[zipCode];
  if (!location) {
    throw new Error('Invalid ZIP code');
  }
  
  return {
    zipCode,
    ...location
  };
};

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};