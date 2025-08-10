let mapsApiPromise: Promise<void> | null = null;

export const loadGoogleMapsApi = (apiKey: string, libraries: string[] = ['places', 'marker', 'geocoding', 'geometry']): Promise<void> => {
  if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
    return Promise.resolve();
  }

  if (mapsApiPromise) return mapsApiPromise;

  mapsApiPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps-loader]') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    const libsParam = libraries.length ? `&libraries=${libraries.join(',')}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${libsParam}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return mapsApiPromise;
};

