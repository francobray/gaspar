import { VendorData, ProblemSummary, BookingResult, BookingLogEntry } from '../types';

const PHONE_SCRIPTS = [
  "Calling {vendor}... Connected! Confirming availability for {problem}.",
  "Speaking with receptionist... Checking schedule for {eta}.",
  "Confirming appointment details... Getting confirmation number.",
  "Appointment confirmed! Booking reference: {confirmationNumber}"
];

const WEB_CHAT_MESSAGES = [
  "Initiating chat on {vendor} website...",
  "Chat agent connected. Explaining: {problem}",
  "Agent checking availability for {eta}...",
  "Securing appointment slot... Processing booking.",
  "Booking confirmed through web chat!"
];

const WHATSAPP_MESSAGES = [
  "Sending WhatsApp message to {vendor}...",
  "Message delivered. Explaining service need: {problem}",
  "Vendor responding... Confirming {eta} availability.",
  "Appointment details confirmed via WhatsApp."
];

const generateConfirmationNumber = (): string => {
  return 'GSP-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

const addLogEntry = (
  log: BookingLogEntry[],
  channel: string,
  action: string,
  message: string,
  success: boolean,
  onLogUpdate: (entry: BookingLogEntry) => void
): void => {
  const entry: BookingLogEntry = {
    timestamp: new Date().toISOString(),
    channel,
    action,
    message,
    success
  };
  log.push(entry);
  onLogUpdate(entry);
};

const simulateChannel = async (
  channel: 'phone' | 'web_chat' | 'whatsapp' | 'sms',
  vendor: VendorData,
  problemSummary: ProblemSummary,
  log: BookingLogEntry[],
  onAttemptUpdate: (attempt: string) => void,
  onLogUpdate: (entry: BookingLogEntry) => void
): Promise<{ success: boolean; scheduledTime?: string; notes: string; confirmationNumber?: string }> => {
  
  const SMS_MESSAGES = [
    'Sending SMS to {vendor}...',
    'Message sent. Explaining: {problem}',
    'Awaiting confirmation for {eta} via SMS...',
    'Appointment confirmed via SMS.'
  ];

  const scripts = channel === 'phone' ? PHONE_SCRIPTS :
                 channel === 'web_chat' ? WEB_CHAT_MESSAGES :
                 channel === 'whatsapp' ? WHATSAPP_MESSAGES :
                 SMS_MESSAGES;

  const channelName = channel === 'phone' ? 'Phone Call' :
                     channel === 'web_chat' ? 'Website Chat' :
                     channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

  // Determine success probability based on channel and vendor capabilities
  let successRate = 0.85;
  if (channel === 'web_chat' && !vendor.hasWebChat) successRate = 0.1;
  if (channel === 'whatsapp' && !vendor.hasWhatsApp) successRate = 0.1;
  if (channel === 'sms' && !vendor.hasSms) successRate = 0.1;
  
  const confirmationNumber = generateConfirmationNumber();
  
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
      .replace('{vendor}', vendor.name)
      .replace('{problem}', problemSummary.summary)
      .replace('{eta}', vendor.eta || 'requested time')
      .replace('{confirmationNumber}', confirmationNumber);
    
    onAttemptUpdate(`${channelName}: ${script}`);
    
    const isLastStep = i === scripts.length - 1;
    const stepSuccess = isLastStep ? Math.random() < successRate : true;
    
    addLogEntry(log, channel, `step_${i + 1}`, script, stepSuccess, onLogUpdate);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    if (!stepSuccess && isLastStep) {
      const failureReason = channel === 'phone' ? 'Line busy, no answer after 3 attempts' :
                           channel === 'web_chat' ? 'Chat unavailable, no agents online' :
                           channel === 'whatsapp' ? 'No response to WhatsApp messages' :
                           'No response to SMS';
      
      return {
        success: false,
        notes: `${channelName} booking failed: ${failureReason}`
      };
    }
  }
  
  // Generate realistic appointment time based on ETA
  const scheduledTime = generateAppointmentTime(vendor.eta);
  
  return {
    success: true,
    scheduledTime,
    confirmationNumber,
    notes: `Successfully booked via ${channelName}. Please be available 15 minutes before the scheduled time.`
  };
};

const generateAppointmentTime = (eta?: string): string => {
  if (!eta) {
    // Default to tomorrow 10 AM if no ETA
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString();
  }
  
  // Parse the ETA and generate a specific time
  const now = new Date();
  
  if (eta.toLowerCase().includes('today')) {
    const today = new Date();
    if (eta.includes('2-4') || eta.includes('2:00-4:00')) {
      today.setHours(14, 0, 0, 0); // 2 PM
    } else if (eta.includes('3-5') || eta.includes('3:00-5:00')) {
      today.setHours(15, 0, 0, 0); // 3 PM
    } else {
      today.setHours(13, 0, 0, 0); // 1 PM default
    }
    return today.toISOString();
  }
  
  if (eta.toLowerCase().includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (eta.includes('9-11') || eta.includes('9:00-11:00')) {
      tomorrow.setHours(9, 0, 0, 0); // 9 AM
    } else if (eta.includes('2-4') || eta.includes('2:00-4:00')) {
      tomorrow.setHours(14, 0, 0, 0); // 2 PM
    } else {
      tomorrow.setHours(10, 0, 0, 0); // 10 AM default
    }
    return tomorrow.toISOString();
  }
  
  // Default case - next business day at 10 AM
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 2);
  nextDay.setHours(10, 0, 0, 0);
  return nextDay.toISOString();
};

export const simulateBooking = async (
  vendor: VendorData,
  problemSummary: ProblemSummary,
  onAttemptUpdate: (attempt: string) => void,
  onLogUpdate: (entry: BookingLogEntry) => void
): Promise<BookingResult> => {
  const log: BookingLogEntry[] = [];
  
  // Define booking channel priority
  const channels: Array<'phone' | 'web_chat' | 'whatsapp' | 'sms'> = ['phone'];
  if (vendor.hasWebChat) channels.push('web_chat');
  if (vendor.hasWhatsApp) channels.push('whatsapp');
  if (vendor.hasSms) channels.push('sms');
  
  for (const channel of channels) {
    onAttemptUpdate(`Attempting booking via ${channel === 'phone' ? 'Phone Call' : channel === 'web_chat' ? 'Website Chat' : channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}...`);
    
    try {
      const result = await simulateChannel(
        channel,
        vendor,
        problemSummary,
        log,
        onAttemptUpdate,
        onLogUpdate
      );
      
      if (result.success) {
        return {
          status: 'confirmed',
          channel,
          scheduledStartISO: result.scheduledTime,
          notes: result.notes,
          log,
          confirmationNumber: result.confirmationNumber
        };
      }
      
      // If this channel failed, try the next one
      onAttemptUpdate(`${channel} failed, trying next channel...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      addLogEntry(log, channel, 'error', `Booking attempt failed: ${error}`, false, onLogUpdate);
    }
  }
  
  // All channels failed
  return {
    status: 'failed',
    channel: channels[0],
    notes: 'Unable to complete automatic booking. Please call the vendor directly to schedule your appointment.',
    log
  };
};