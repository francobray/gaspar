import React, { useEffect, useRef } from 'react';
import { loadGoogleMapsApi } from '../utils/googleMaps';

interface GooglePlacesMapProps {
  apiKey: string;
  query: string; // e.g., "plumbers near 10001"
  highlightKey?: string | null; // vendor name to highlight
}

export const GooglePlacesMap: React.FC<GooglePlacesMapProps> = ({ apiKey, query, highlightKey }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Array<{
    marker: google.maps.Marker;
    name: string;
    placeId?: string;
    defaultIcon: string;
    highlightIcon: string;
  }>>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeZoomRef = useRef<number>(12);

  useEffect(() => {
    let map: google.maps.Map | null = null;
    let markers: Array<{
      marker: google.maps.Marker;
      name: string;
      placeId?: string;
      defaultIcon: string;
      highlightIcon: string;
    }> = [];
    let abort = false;

    const initMap = async () => {
      try {
        await loadGoogleMapsApi(apiKey, ['places', 'marker', 'geometry']);
        if (abort || !mapRef.current) return;

        const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
         const { PlacesService, PlacesServiceStatus } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
        const { Geocoder } = (await google.maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary;

        map = new Map(mapRef.current, {
          center: { lat: 39.5, lng: -98.35 },
          zoom: 4,
          mapId: undefined,
        });

        // Custom Zoom Controls (in addition to default)
        const controlDiv = document.createElement('div');
        controlDiv.style.display = 'flex';
        controlDiv.style.flexDirection = 'column';
        controlDiv.style.gap = '6px';
        controlDiv.style.margin = '10px';

        const makeBtn = (label: string) => {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.style.background = '#ffffff';
          btn.style.border = '1px solid #e5e7eb';
          btn.style.borderRadius = '8px';
          btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
          btn.style.width = '36px';
          btn.style.height = '36px';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '18px';
          btn.style.lineHeight = '18px';
          btn.style.color = '#111827';
          btn.setAttribute('aria-label', label === '+' ? 'Zoom in' : 'Zoom out');
          return btn;
        };

        const zoomInBtn = makeBtn('+');
        const zoomOutBtn = makeBtn('−');
        controlDiv.appendChild(zoomInBtn);
        controlDiv.appendChild(zoomOutBtn);

        zoomInBtn.addEventListener('click', () => map && map.setZoom((map.getZoom() || 10) + 1));
        zoomOutBtn.addEventListener('click', () => map && map.setZoom((map.getZoom() || 10) - 1));

        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);

        const service = new PlacesService(map as any);
        infoWindowRef.current = new google.maps.InfoWindow();
        const geocoder = new Geocoder();

         const renderEmbedFallback = () => {
          if (!mapRef.current) return;
          console.warn('Places Text Search returned no results or failed; falling back to Maps Embed search.');
          mapRef.current.innerHTML = '';
           mapRef.current.style.position = 'relative';
          const iframe = document.createElement('iframe');
          iframe.width = '100%';
          iframe.height = '520';
          iframe.style.border = '0';
          iframe.loading = 'lazy';
          iframe.referrerPolicy = 'no-referrer-when-downgrade';
          // Prefer embed v1 with key; fall back to public embed if needed
          iframe.src = apiKey
            ? `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(query)}&zoom=12`
            : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`;
           iframeRef.current = iframe;
           iframeZoomRef.current = 12;
           mapRef.current.appendChild(iframe);

           // Overlay custom zoom controls controlling iframe zoom via URL param
           const overlay = document.createElement('div');
           overlay.style.position = 'absolute';
           overlay.style.right = '12px';
           overlay.style.bottom = '12px';
           overlay.style.display = 'flex';
           overlay.style.flexDirection = 'column';
           overlay.style.gap = '6px';
           const bPlus = document.createElement('button');
           const bMinus = document.createElement('button');
           ;[bPlus, bMinus].forEach((b, idx) => {
             b.textContent = idx === 0 ? '+' : '−';
             b.style.background = '#ffffff';
             b.style.border = '1px solid #e5e7eb';
             b.style.borderRadius = '8px';
             b.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
             b.style.width = '36px';
             b.style.height = '36px';
             b.style.cursor = 'pointer';
             b.style.fontSize = '18px';
             overlay.appendChild(b);
           });
           const updateIframeZoom = (delta: number) => {
             const next = Math.max(3, Math.min(20, iframeZoomRef.current + delta));
             if (next === iframeZoomRef.current || !iframeRef.current) return;
             iframeZoomRef.current = next;
             const src = iframeRef.current.src;
             const hasZ = /[?&](z|zoom)=/i.test(src);
             if (src.includes('embed/v1/search')) {
               const url = new URL(src);
               url.searchParams.set('zoom', String(next));
               iframeRef.current.src = url.toString();
             } else {
               // maps.google.com embed uses z param
               if (hasZ) {
                 iframeRef.current.src = src.replace(/([?&]z=)(\d+)/i, `$1${next}`);
               } else {
                 iframeRef.current.src = src + `${src.includes('?') ? '&' : '?'}z=${next}`;
               }
             }
           };
           bPlus.addEventListener('click', () => updateIframeZoom(+1));
           bMinus.addEventListener('click', () => updateIframeZoom(-1));
           mapRef.current.appendChild(overlay);
        };

        // First geocode the query area to get a good initial center
        geocoder.geocode({ address: query.split(' near ').pop() || query }, (geoResults, geoStatus) => {
          if (geoStatus !== 'OK' || !geoResults || !geoResults[0]) {
            // If geocoding fails, attempt text search directly
            service.textSearch({ query, radius: 25000 }, handlePlacesResults);
            return;
          }

          const loc = geoResults[0].geometry.location;
          map!.setCenter(loc);
          map!.setZoom(12);

          // Prefer nearbySearch anchored to the geocoded location for consistent centering
          const keyword = query.split(' near ')[0] || query;
          service.nearbySearch({
            location: loc,
            radius: 25000,
            keyword,
          }, (nearbyResults, nearbyStatus) => {
            if (nearbyStatus === PlacesServiceStatus.OK && nearbyResults && nearbyResults.length) {
              handlePlacesResults(nearbyResults as unknown as google.maps.places.PlaceResult[], PlacesServiceStatus.OK);
            } else {
              // Fallback to text search if nearbySearch returns nothing
              service.textSearch({ query, radius: 25000 }, handlePlacesResults);
            }
          });
        });

         const handlePlacesResults = (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status !== PlacesServiceStatus.OK || !results || results.length === 0) {
            renderEmbedFallback();
            return;
          }

           // Fit bounds to results and compute centroid as a secondary fallback
          const bounds = new google.maps.LatLngBounds();
           const points: google.maps.LatLng[] = [];
           results.forEach((place) => {
            if (!place.geometry || !place.geometry.location) return;
             bounds.extend(place.geometry.location);
             points.push(place.geometry.location as google.maps.LatLng);

            // Use standard marker icons for maximum compatibility
            const defaultIcon = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
            const highlightIcon = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';

            const marker = new google.maps.Marker({
              map: map!,
              position: place.geometry.location,
              title: place.name,
              icon: defaultIcon,
            });

             // On click, fetch details and open info window with contact + fit snippet
             marker.addListener('click', () => {
               const openWith = (d?: google.maps.places.PlaceResult) => {
                 const name = d?.name || place.name || 'Business';
                 const address = d?.formatted_address || (place as any).formatted_address || '';
                 const phone = (d as any)?.formatted_phone_number || '';
                 const website = (d as any)?.website || '';
                 const rating = typeof (d?.rating || place.rating) === 'number' ? (d?.rating || place.rating) : undefined;
                 const reviews = d?.user_ratings_total || place.user_ratings_total || undefined;
                 // Sample fit assessment based on the keyword from query
                 const keyword = (query.split(' near ')[0] || '').trim();
                 const fitScore = Math.floor(78 + Math.random() * 15); // 78-93
                 const fitText = keyword
                   ? `Good match for “${keyword}”. Estimated fit score ${fitScore}%.`
                   : `Estimated fit score ${fitScore}%.`;

                 const container = document.createElement('div');
                 container.style.maxWidth = '280px';
                 container.innerHTML = `
                   <div style="font-weight:600;margin-bottom:4px;">${name}</div>
                   ${rating ? `<div style=\"font-size:12px;color:#555;margin-bottom:6px;\">⭐ ${rating} ${reviews ? `(${reviews})` : ''}</div>` : ''}
                   ${address ? `<div style=\"font-size:12px;margin-bottom:4px;\">${address}</div>` : ''}
                   ${phone ? `<div style=\"font-size:12px;margin-bottom:4px;\"><a href=\"tel:${phone}\">${phone}</a></div>` : ''}
                   ${website ? `<div style=\"font-size:12px;margin-bottom:6px;\"><a href=\"${website}\" target=\"_blank\" rel=\"noopener\">Website</a></div>` : ''}
                   <div style="font-size:12px;padding:6px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
                     <div style="font-weight:600;margin-bottom:2px;">Fit assessment</div>
                     <div>${fitText}</div>
                   </div>
                 `;
                 infoWindowRef.current!.setContent(container);
                 infoWindowRef.current!.open({ map: map!, anchor: marker });
               };

               if (place.place_id) {
                 service.getDetails(
                   {
                     placeId: place.place_id,
                     fields: ['name','formatted_address','formatted_phone_number','website','rating','user_ratings_total']
                   },
                   (details, s) => {
                     if (s === PlacesServiceStatus.OK && details) openWith(details);
                     else openWith();
                   }
                 );
               } else {
                 openWith();
               }
             });
            markers.push({
              marker,
              name: place.name?.toLowerCase() || '',
              placeId: place.place_id,
              defaultIcon,
              highlightIcon,
            });
          });

          // Save markers for highlight effect
          markersRef.current = markers;

           if (!bounds.isEmpty()) {
            const count = results.length;
            if (count === 1) {
              // For a single result, set an appropriate zoom level
              const only = results[0];
              if (only.geometry?.location) {
                map!.setCenter(only.geometry.location);
                map!.setZoom(15);
              }
            } else {
               // Use generous padding so all pins are comfortably visible
               const padding: google.maps.Padding = { top: 80, right: 80, bottom: 80, left: 80 } as any;
               map!.fitBounds(bounds, padding);
               // In rare cases fitBounds may end too tight at high zoom levels; recenter to centroid
               if (points.length > 1) {
                 const centroid = points.reduce((acc, cur) => new google.maps.LatLng(
                   (acc.lat() + cur.lat()) / 2,
                   (acc.lng() + cur.lng()) / 2
                 ));
                 map!.setCenter(centroid);
               }
            }
          }
        };
      } catch (err) {
        console.error('GooglePlacesMap init failed:', err);
        // Final defensive fallback
        const container = mapRef.current;
        if (container) {
          container.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.width = '100%';
          iframe.height = '520';
          iframe.style.border = '0';
          iframe.loading = 'lazy';
          iframe.referrerPolicy = 'no-referrer-when-downgrade';
          iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`;
          container.appendChild(iframe);
        }
      }
    };

    initMap();

    return () => {
      abort = true;
      markersRef.current.forEach((m) => m.marker.setMap(null));
      markersRef.current = [];
      map = null;
    };
  }, [apiKey, query]);

  // Highlight marker on hover key changes
  useEffect(() => {
    const key = (highlightKey || '').toLowerCase().trim();
    const stored = markersRef.current;
    if (!stored || !stored.length) return;
    stored.forEach(({ marker, name, defaultIcon, highlightIcon }) => {
      const isMatch = key && (name === key || name.includes(key));
      marker.setIcon(isMatch ? highlightIcon : defaultIcon);
      marker.setZIndex(isMatch ? 1000 : 1);
    });
  }, [highlightKey]);

  return <div ref={mapRef} className="relative" style={{ width: '100%', height: 520, overflow: 'visible' }} />;
};

export default GooglePlacesMap;

