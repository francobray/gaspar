import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, MapPin, Star, Phone, Globe, MessageCircle, Clock, Loader2, Map, ExternalLink } from 'lucide-react';
import GooglePlacesMap from './GooglePlacesMap';
import { ProblemSummary, VendorData } from '../types';
import { findVendors } from '../utils/vendorFinder';
import { fetchVendorsFromPlaces } from '../utils/placesVendors';
import { getThumbtackMockVendors } from '../utils/thumbtackMock';
import { apiClient } from '../utils/apiClient';
import { simulateOutreach } from '../utils/simulator';

interface VendorDiscoveryProps {
  problemSummary: ProblemSummary;
  zipCode: string;
  onVendorSelected: (vendor: VendorData) => void;
  onBack: () => void;
}

export const VendorDiscovery: React.FC<VendorDiscoveryProps> = ({
  problemSummary,
  zipCode,
  onVendorSelected,
  onBack
}) => {
  const THUMBTACK_VENDOR_URL = 'https://www.thumbtack.com/fl/north-miami-beach/central-air-conditioning-installation/fuse-hvac-miami-dade/service/526932646681133062?service_pk=526932646681133062&encoded_answers=eyJzZl9wayI6IjU0NDQwOTMxNjMyMzY4ODQ0OSIsImFucyI6eyIyIjpbM10sIjMiOlswXX0sIm5idyI6eyJyYWRpbyI6WzBdfSwiY3EiOlswXX0%3D&project_pk=555702466235801604&lp_request_pk=555702479129362446&zip_code=33149&keyword_pk=296100734453031077&category_pk=166577475042034098&click_origin=pro%20list%2Fclick%20pro%20cta&hideBack=true&ir_referrer=HOME_PAGE_SEARCH&user_query_pk=555702463202729988';
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Default to Map View
  const [showMap, setShowMap] = useState(true);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [recommendedTerm, setRecommendedTerm] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'places' | 'demo'>('demo');
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [hideLowReview, setHideLowReview] = useState(true);
  const [mapsKeyState, setMapsKeyState] = useState<string | null>(null);

  useEffect(() => {
    const discoverVendors = async () => {
      setIsLoading(true);
      try {
        // Call Gemini first to ensure backend endpoint is hit and capture the term
        try {
          const rec = await apiClient.recommendSearchTerm(problemSummary.transcript);
          if (rec?.success && rec.term) {
            setRecommendedTerm(rec.term);
          }
        } catch (e) {
          // non-fatal; proceed with fallback
        }
        let foundVendors;
        // Prefer key from backend if present
        let mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
        try {
          const cfg = await apiClient.getMapsApiKey();
          if (cfg?.mapsApiKey) mapsKey = cfg.mapsApiKey;
        } catch {}

        setMapsKeyState(mapsKey || null);

        if (mapsKey) {
          try {
            foundVendors = await fetchVendorsFromPlaces(
              mapsKey,
              problemSummary.category,
              zipCode,
              { overrideTerm: recommendedTerm || undefined, userText: problemSummary.transcript }
            );
            // Append Thumbtack mock entries to the list (clearly marked in UI via addresses)
            const thumbtack = getThumbtackMockVendors(problemSummary.category, zipCode);
            foundVendors = [...foundVendors, ...thumbtack];
            setDataSource('places');
            setPlacesError(null);
          } catch (err) {
            console.warn('Places fetch failed, falling back to sample vendors:', (err as Error).message);
            foundVendors = await findVendors(problemSummary.category, zipCode);
            // Add Thumbtack mock even in demo fallback for visual parity
            foundVendors = [...foundVendors, ...getThumbtackMockVendors(problemSummary.category, zipCode)];
            setDataSource('demo');
            setPlacesError((err as Error).message);
          }
        } else {
          foundVendors = await findVendors(problemSummary.category, zipCode);
          foundVendors = [...foundVendors, ...getThumbtackMockVendors(problemSummary.category, zipCode)];
          setDataSource('demo');
          setPlacesError('Missing VITE_GOOGLE_MAPS_API_KEY');
        }
        setVendors(foundVendors);
        
        // Start outreach simulation for all vendors
        foundVendors.forEach((vendor) => {
          simulateOutreach(vendor, problemSummary, (updatedVendor) => {
            setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
          });
        });
      } catch (error) {
        console.error('Vendor discovery failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    discoverVendors();
  }, [problemSummary, zipCode]);

  // Compute visible vendors every render to keep hooks order stable
  const visibleVendors = useMemo(() => {
    if (!hideLowReview) return vendors;
    return vendors.filter(v => (v.reviewCount || 0) >= 20);
  }, [vendors, hideLowReview]);

  const getStatusColor = (status: VendorData['outreachStatus']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'in-progress': return 'text-blue-600';
      case 'completed': return 'text-emerald-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (vendor: VendorData) => {
    if (vendor.outreachStatus === 'completed' && vendor.eta) {
      return `Available: ${vendor.eta}`;
    }
    switch (vendor.outreachStatus) {
      case 'pending': return 'Checking availability...';
      case 'in-progress': return 'Getting ETA...';
      case 'completed': return vendor.eta ? `Available: ${vendor.eta}` : 'No availability';
      case 'failed': return 'Unable to reach';
      default: return 'Checking...';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Finding {problemSummary.category} professionals near you...
            </h3>
            <p className="text-gray-600">Searching in {zipCode}</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto" style={{ maxWidth: '83.2rem' }}>
      <div className="bg-white rounded-2xl shadow-xl overflow-visible">
        <div className="border-b border-gray-200 p-6 overflow-visible">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Available Professionals
              </h2>
              <p className="text-gray-600 mb-1">{problemSummary.summary}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold text-gray-900">
                  {visibleVendors.length} professionals found
                </h3>
                <label className="flex items-center text-xs text-gray-600 gap-1 ml-4 md:ml-8">
                  <input type="checkbox" checked={hideLowReview} onChange={(e)=>setHideLowReview(e.target.checked)} />
                  Hide under 20 reviews
                </label>
              </div>
              <div className="text-xs text-gray-500">
                Search: {(recommendedTerm || (problemSummary.category === 'hvac' ? 'AC specialist' : `${problemSummary.category} contractors`))} near {zipCode}
              </div>
              <div className="text-xs">
                <span className={dataSource === 'places' ? 'text-emerald-600' : 'text-amber-600'}>
                  Source: {dataSource === 'places' ? 'Google Places' : 'Demo data'}
                </span>
                {placesError && (
                  <span className="text-gray-400 ml-2">({placesError})</span>
                )}
              </div>
            </div>
            {/* Removed view toggle buttons */}
          </div>

            {true ? (
              <div className="space-y-6 mt-4">
                {/* Map Section */}
                {mapsKeyState ? (
                  <div className="bg-gray-100 rounded-xl overflow-hidden">
                    <GooglePlacesMap
                      apiKey={mapsKeyState}
                      query={`${(recommendedTerm || (problemSummary.category === 'hvac' ? 'AC specialist' : `${problemSummary.category} contractors`))} near ${zipCode}`}
                      highlightKey={highlightKey}
                    />
                  </div>
                ) : (
                  // Fallback to a public Google Maps embed that does not require an API key
                  <div className="bg-gray-100 rounded-xl overflow-hidden">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent((recommendedTerm || (problemSummary.category === 'hvac' ? 'AC specialist' : `${problemSummary.category} contractors`)) + ' near ' + zipCode)}&z=13&output=embed`}
                      width="100%"
                      height="520"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Vendor locations map (fallback)"
                    />
                  </div>
                )}
              </div>
            ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {visibleVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className={`rounded-xl p-6 hover:shadow-lg transition-all duration-300 h-full flex flex-col 
                    ${vendor.source === 'google' ? 'bg-blue-50 border border-blue-100' : ''}
                    ${vendor.source === 'thumbtack' ? 'bg-purple-50 border border-purple-100' : ''}
                    ${!vendor.source || vendor.source === 'demo' ? 'bg-gray-50 border border-gray-200' : ''}
                  `}
                  onMouseEnter={() => setHighlightKey(vendor.name)}
                  onMouseLeave={() => setHighlightKey(null)}
                >
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{vendor.name}</h3>
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{vendor.rating}</span>
                        <span className="text-gray-500">({vendor.reviewCount} reviews)</span>
                      </div>
                      {vendor.source && (
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          vendor.source === 'google' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          vendor.source === 'thumbtack' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {vendor.source === 'google' ? 'Google' : vendor.source === 'thumbtack' ? 'Thumbtack' : 'Demo'}
                        </span>
                      )}
                      <div className="flex items-center space-x-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{vendor.distance} mi</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{vendor.address}</p>
                    <div className="flex items-center flex-wrap gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{vendor.phone}</span>
                      </div>
                      {vendor.website && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span>Website</span>
                        </div>
                      )}
                      {vendor.hasWebChat && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <MessageCircle className="w-4 h-4" />
                          <span>Web Chat</span>
                        </div>
                      )}
                      {vendor.hasWhatsApp && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </div>
                      )}
                      {vendor.hasSms && (
                        <div className="flex items-center space-x-2 text-sm text-emerald-700">
                          <MessageCircle className="w-4 h-4" />
                          <span>SMS</span>
                        </div>
                      )}
                      {vendor.serviceFee && (
                        <div className="text-sm text-gray-600">Service fee: ${vendor.serviceFee}</div>
                      )}
                    </div>
                    <div className={`flex items-center space-x-2 ${getStatusColor(vendor.outreachStatus)}`}>
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{getStatusText(vendor)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onVendorSelected(vendor)}
                      disabled={vendor.outreachStatus !== 'completed' || !vendor.eta}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {vendor.outreachStatus === 'completed' && vendor.eta ? 'Book Now' : 'Getting ETA...'}
                    </button>
                    {(() => {
                      const detailsUrl = vendor.source === 'thumbtack'
                        ? THUMBTACK_VENDOR_URL
                        : vendor.source === 'google'
                          ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(vendor.id)}`
                          : (vendor.website || null);
                      return (
                        <button
                          onClick={() => detailsUrl && window.open(detailsUrl, '_blank', 'noopener')}
                          disabled={!detailsUrl}
                          className="px-3 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
                          title={detailsUrl ? 'Open in new tab' : 'No details available'}
                          aria-label="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};