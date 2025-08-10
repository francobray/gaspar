import React, { useState } from 'react';
import { AudioIntake } from './components/AudioIntake';
import { VendorDiscovery } from './components/VendorDiscovery';
import { BookingFlow } from './components/BookingFlow';
import { BookingSummary } from './components/BookingSummary';
import { Header } from './components/Header';
import { ProgressSteps } from './components/ProgressSteps';
import { ProblemSummary, VendorData, BookingResult } from './types';

type AppState = 'intake' | 'discovery' | 'booking' | 'complete';

function App() {
  const [state, setState] = useState<AppState>('intake');
  const [problemSummary, setProblemSummary] = useState<ProblemSummary | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [zipCode, setZipCode] = useState<string>('');

  const handleProblemAnalyzed = (summary: ProblemSummary, zip: string, photos?: File[]) => {
    setProblemSummary(summary);
    setZipCode(zip);
    // Store photos if needed for vendor communication
    if (photos) {
      console.log('Photos uploaded:', photos.length);
    }
    setState('discovery');
  };

  const handleVendorSelected = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    setState('booking');
  };

  const handleBookingComplete = (result: BookingResult) => {
    setBookingResult(result);
    setState('complete');
  };

  const resetFlow = () => {
    setState('intake');
    setProblemSummary(null);
    setSelectedVendor(null);
    setBookingResult(null);
    setZipCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <ProgressSteps currentStep={state} />
      
    <main className="container mx-auto px-4 py-8" style={{ maxWidth: '83.2rem' }}>
        {state === 'intake' && (
          <AudioIntake onProblemAnalyzed={handleProblemAnalyzed} />
        )}
        
        {state === 'discovery' && problemSummary && (
          <VendorDiscovery 
            problemSummary={problemSummary}
            zipCode={zipCode}
            onVendorSelected={handleVendorSelected}
            onBack={() => setState('intake')}
          />
        )}
        
        {state === 'booking' && selectedVendor && problemSummary && (
          <BookingFlow 
            vendor={selectedVendor}
            problemSummary={problemSummary}
            onBookingComplete={handleBookingComplete}
            onBack={() => setState('discovery')}
          />
        )}
        
        {state === 'complete' && bookingResult && selectedVendor && problemSummary && (
          <BookingSummary 
            bookingResult={bookingResult}
            vendor={selectedVendor}
            problemSummary={problemSummary}
            onStartOver={resetFlow}
          />
        )}
      </main>
    </div>
  );
}

export default App;