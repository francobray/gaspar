import { VendorData, ProblemSummary, OutreachAttempt, SimulationConfig } from '../types';

const DEFAULT_CONFIG: SimulationConfig = {
  fastDemo: true,
  outreachSuccessRate: 0.8,
  bookingSuccessRate: 0.85,
  maxAttempts: 3,
  delayRange: [500, 2000],
  randomSeed: undefined
};

const CHANNELS: Array<OutreachAttempt['channel']> = ['sms', 'whatsapp', 'phone', 'email'];

const OUTREACH_MESSAGES = {
  sms: "Hi! We have a customer needing {category} service. Can you provide your earliest availability and service fee?",
  whatsapp: "Hello! Gaspar here - we have a homeowner with a {category} issue. What's your earliest availability?",
  phone: "Calling to check availability for a {category} service call...",
  email: "Service inquiry: Customer needs {category} assistance. Please respond with availability and pricing."
};

const SUCCESS_RESPONSES = [
  "Available tomorrow 2-4pm. $95 service call fee.",
  "Can do today 4-6pm or tomorrow morning. $120 service fee.",
  "Earliest is Thursday 10am-12pm. $85 diagnostic fee.",
  "Available this afternoon 1-3pm. $110 service call.",
  "Tomorrow 9am-11am works. $100 service charge.",
  "Can fit you in today 3-5pm. $95 call-out fee."
];

const ETA_PATTERNS = [
  { eta: "Today 2-4 PM", fee: 120 },
  { eta: "Tomorrow 9-11 AM", fee: 95 },
  { eta: "Tomorrow 2-4 PM", fee: 100 },
  { eta: "Thursday 10 AM-12 PM", fee: 85 },
  { eta: "Friday 1-3 PM", fee: 95 },
  { eta: "This afternoon 3-5 PM", fee: 110 }
];

export const simulateOutreach = async (
  vendor: VendorData,
  problemSummary: ProblemSummary,
  onUpdate: (vendor: VendorData) => void,
  config: Partial<SimulationConfig> = {}
): Promise<VendorData> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let currentVendor = { ...vendor, outreachStatus: 'in-progress' as const };
  onUpdate(currentVendor);

  const delays = finalConfig.fastDemo ? [800, 1200, 1600] : [2000, 4000, 6000];
  
  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    const channel = CHANNELS[attempt % CHANNELS.length];
    const delay = delays[attempt] || delays[delays.length - 1];
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const message = OUTREACH_MESSAGES[channel].replace('{category}', problemSummary.category);
    const timestamp = new Date().toISOString();
    
    // Simulate attempt
    const attemptLog: OutreachAttempt = {
      channel,
      timestamp,
      status: 'sent',
      message
    };
    
    currentVendor.outreachLog.push(attemptLog);
    onUpdate(currentVendor);
    
    // Wait a bit for "delivery"
    await new Promise(resolve => setTimeout(resolve, finalConfig.fastDemo ? 300 : 1000));
    
    attemptLog.status = 'delivered';
    onUpdate(currentVendor);
    
    // Determine if this attempt succeeds
    const success = Math.random() < finalConfig.outreachSuccessRate;
    
    if (success) {
      await new Promise(resolve => setTimeout(resolve, finalConfig.fastDemo ? 500 : 2000));
      
      const responsePattern = ETA_PATTERNS[Math.floor(Math.random() * ETA_PATTERNS.length)];
      attemptLog.status = 'replied';
      attemptLog.response = `Available: ${responsePattern.eta} - $${responsePattern.fee} service fee`;
      
      currentVendor.eta = responsePattern.eta;
      currentVendor.serviceFee = responsePattern.fee;
      currentVendor.outreachStatus = 'completed';
      
      onUpdate(currentVendor);
      return currentVendor;
    } else {
      await new Promise(resolve => setTimeout(resolve, finalConfig.fastDemo ? 400 : 1500));
      attemptLog.status = 'failed';
      onUpdate(currentVendor);
    }
  }
  
  // All attempts failed
  currentVendor.outreachStatus = 'failed';
  onUpdate(currentVendor);
  return currentVendor;
};