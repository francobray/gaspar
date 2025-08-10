export interface ProblemSummary {
  transcript: string;
  summary: string;
  category: 'hvac' | 'plumber' | 'electrician' | 'roofer' | 'appliance' | 'pest' | 'general';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  symptoms: string[];
  modelSerial?: string;
}

export interface VendorData {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website?: string;
  address: string;
  distance: number;
  category: string;
  hasWebChat: boolean;
  hasWhatsApp: boolean;
  hasSms?: boolean;
  eta?: string;
  serviceFee?: number;
  outreachStatus: 'pending' | 'in-progress' | 'completed' | 'failed';
  outreachLog: OutreachAttempt[];
  source?: 'google' | 'thumbtack' | 'demo';
}

export interface OutreachAttempt {
  channel: 'sms' | 'whatsapp' | 'phone' | 'email';
  timestamp: string;
  status: 'sent' | 'delivered' | 'replied' | 'failed';
  message?: string;
  response?: string;
}

export interface BookingResult {
  status: 'confirmed' | 'tentative' | 'failed';
  channel: 'phone' | 'web_chat' | 'whatsapp';
  scheduledStartISO?: string;
  notes: string;
  log: BookingLogEntry[];
  confirmationNumber?: string;
}

export interface BookingLogEntry {
  timestamp: string;
  channel: string;
  action: string;
  message: string;
  success: boolean;
}

export interface SimulationConfig {
  fastDemo: boolean;
  randomSeed?: number;
  outreachSuccessRate: number;
  bookingSuccessRate: number;
  maxAttempts: number;
  delayRange: [number, number];
}