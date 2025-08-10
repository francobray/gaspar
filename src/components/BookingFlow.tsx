import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, MessageCircle, Globe, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ProblemSummary, VendorData, BookingResult, BookingLogEntry } from '../types';
import { simulateBooking } from '../utils/bookingSimulator';

interface BookingFlowProps {
  vendor: VendorData;
  problemSummary: ProblemSummary;
  onBookingComplete: (result: BookingResult) => void;
  onBack: () => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  vendor,
  problemSummary,
  onBookingComplete,
  onBack
}) => {
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<string>('');
  const [log, setLog] = useState<BookingLogEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const mockAudioUrl = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_9cb62a04f0.mp3?filename=phone-call-141290.mp3';

  const startBooking = async () => {
    setIsBooking(true);
    
    const result = await simulateBooking(
      vendor,
      problemSummary,
      (attempt) => setCurrentAttempt(attempt),
      (logEntry) => setLog(prev => [...prev, logEntry])
    );
    
    setBookingResult(result);
    setIsBooking(false);
  };

  const handleComplete = () => {
    if (bookingResult) {
      onBookingComplete(bookingResult);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'web_chat': return <Globe className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case 'phone': return 'Phone Call';
      case 'web_chat': return 'Website Chat';
      case 'whatsapp': return 'WhatsApp';
      default: return channel;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking with {vendor.name}
            </h2>
            <p className="text-gray-600">
              Automatically booking your appointment for: {problemSummary.summary}
            </p>
            {vendor.eta && (
              <p className="text-emerald-600 font-medium mt-2">
                Available: {vendor.eta}
              </p>
            )}
          </div>
        </div>

        <div className="p-6">
          {!isBooking && !bookingResult && (
            <div className="text-center space-y-6">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ready to book automatically
                </h3>
                <p className="text-gray-600 mb-4">
                  Gaspar will attempt to book your appointment using multiple channels:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 max-w-3xl mx-auto justify-items-center">
                  <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                    <Phone className="w-8 h-8 text-blue-600" />
                    <span className="font-medium">Phone Call</span>
                    <span className="text-sm text-gray-600">Direct booking</span>
                  </div>

                  {vendor.hasWebChat && (
                    <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                      <Globe className="w-8 h-8 text-emerald-600" />
                      <span className="font-medium">Website Chat</span>
                      <span className="text-sm text-gray-600">Online booking</span>
                      <button
                        onClick={() => window.open(vendor.website || '#', '_blank')}
                        className="mt-2 px-3 py-1 rounded-md text-xs border"
                      >
                        Open Chat
                      </button>
                    </div>
                  )}

                  {vendor.hasWhatsApp && (
                    <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                      <MessageCircle className="w-8 h-8 text-green-600" />
                      <span className="font-medium">WhatsApp</span>
                      <span className="text-sm text-gray-600">Instant messaging</span>
                    </div>
                  )}

                  {vendor.hasSms && (
                    <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                      <MessageCircle className="w-8 h-8 text-emerald-700" />
                      <span className="font-medium">SMS</span>
                      <span className="text-sm text-gray-600">Text messaging</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={startBooking}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Start Automatic Booking
                </button>
              </div>
            </div>
          )}

          {isBooking && (
            <div className="space-y-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Booking in progress...
                </h3>
                <p className="text-gray-600">
                  {currentAttempt || 'Attempting to reach the vendor...'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Booking Log</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {log.map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {getChannelIcon(entry.channel)}
                        <span className="font-medium">{getChannelName(entry.channel)}</span>
                      </div>
                      <span className="text-gray-700">{entry.message}</span>
                      {entry.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bookingResult && (
            <div className="space-y-6">
              <div className={`text-center p-8 rounded-xl ${
                bookingResult.status === 'confirmed' 
                  ? 'bg-emerald-50 border border-emerald-200' 
                  : bookingResult.status === 'tentative'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {bookingResult.status === 'confirmed' ? (
                  <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                ) : bookingResult.status === 'tentative' ? (
                  <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                )}
                
                <h3 className={`text-2xl font-bold mb-2 ${
                  bookingResult.status === 'confirmed' 
                    ? 'text-emerald-800' 
                    : bookingResult.status === 'tentative'
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  {bookingResult.status === 'confirmed' ? 'Booking Confirmed!' :
                   bookingResult.status === 'tentative' ? 'Booking Tentative' :
                   'Booking Failed'}
                </h3>
                
                <p className="text-gray-700 mb-4">{bookingResult.notes}</p>
                
                {bookingResult.scheduledStartISO && (
                  <div className="text-lg font-medium text-gray-900 mb-4">
                    Scheduled: {new Date(bookingResult.scheduledStartISO).toLocaleString()}
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-6">
                  {getChannelIcon(bookingResult.channel)}
                  <span>Booked via {getChannelName(bookingResult.channel)}</span>
                  {bookingResult.confirmationNumber && (
                    <span>• Confirmation: {bookingResult.confirmationNumber}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Continue to Summary
                  </button>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="px-4 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    View Contact Log
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Complete Booking Log</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bookingResult.log.map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {getChannelIcon(entry.channel)}
                        <span className="font-medium">{getChannelName(entry.channel)}</span>
                      </div>
                      <span className="text-gray-700">{entry.message}</span>
                      {entry.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showLogModal && bookingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Log</h3>
              <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {/* Conversation transcript */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {(() => {
                const name = vendor.name;
                const need = problemSummary.summary;
                const eta = vendor.eta || 'tomorrow morning';
                const lines = [
                  { who: 'Agent', text: `Hi, this is Gaspar calling ${name}. I’m helping a homeowner who said: “${need}”. Do you have availability ${eta}?` },
                  { who: 'Owner', text: `Hi! Yes, we can help. Let me check the schedule for ${eta}.` },
                  { who: 'Owner', text: `We can do ${eta}. Can you share the address and contact?` },
                  { who: 'Agent', text: `Great. I’ll send the details over text. Please hold the slot; the customer will be ready.` },
                  { who: 'Owner', text: `Perfect. We’re confirmed. See you then!` }
                ];
                return lines.map((l, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${l.who === 'Agent' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{l.who}</div>
                    <div className="text-gray-900 text-sm leading-relaxed">{l.text}</div>
                  </div>
                ));
              })()}
            </div>
            {bookingResult.log.some(e => e.channel === 'phone') && (
              <div className="mt-4">
                <audio controls controlsList="nodownload noplaybackrate" src={mockAudioUrl} className="w-full" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};