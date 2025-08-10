import { VendorData, ProblemSummary } from '../types';

// Lightweight mock of a few Thumbtack results. This is NOT an integration.
// The data below is static and only meant to visually augment the demo.
export const getThumbtackMockVendors = (
  category: ProblemSummary['category'],
  zipCode: string
): VendorData[] => {
  const categoryLabel =
    category === 'hvac' ? 'HVAC'
    : category === 'plumber' ? 'Plumbing'
    : category === 'electrician' ? 'Electrical'
    : category === 'roofer' ? 'Roofing'
    : category === 'appliance' ? 'Appliance'
    : category === 'pest' ? 'Pest Control'
    : 'General';

  const base: Omit<VendorData, 'id' | 'name' | 'rating' | 'reviewCount' | 'address' | 'distance' | 'serviceFee'> = {
    phone: 'N/A',
    website: undefined,
    category: categoryLabel,
    hasWebChat: false,
    hasWhatsApp: true,
    hasSms: true,
    outreachStatus: 'pending',
    outreachLog: [],
    source: 'thumbtack'
  };

  const cityNote = `Serves ${zipCode}`;

  const vendors: VendorData[] = [
    {
      id: `thumbtack-pro-1-${zipCode}`,
      name: `${categoryLabel} Pros of ${zipCode}`,
      rating: 4.9,
      reviewCount: 164,
      address: cityNote,
      distance: Math.round((0.3 + Math.random() * 12) * 10) / 10,
      serviceFee: 95,
      ...base
    },
    {
      id: `thumbtack-pro-2-${zipCode}`,
      name: `Advance ${categoryLabel} Services`,
      rating: 4.7,
      reviewCount: 133,
      address: cityNote,
      distance: Math.round((0.3 + Math.random() * 12) * 10) / 10,
      serviceFee: 89,
      ...base
    },
    {
      id: `thumbtack-pro-3-${zipCode}`,
      name: `${categoryLabel} Wizards`,
      rating: 4.8,
      reviewCount: 92,
      address: cityNote,
      distance: Math.round((0.3 + Math.random() * 12) * 10) / 10,
      serviceFee: 0,
      ...base
    }
  ];

  return vendors;
};

