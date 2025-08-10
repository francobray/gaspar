import React from 'react';
import { Mic, Search, Calendar, CheckCircle } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: 'intake' | 'discovery' | 'booking' | 'complete';
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  const steps = [
    {
      id: 'intake',
      title: 'Describe Problem',
      description: 'Tell us what needs fixing',
      icon: Mic,
      completed: ['discovery', 'booking', 'complete'].includes(currentStep),
      active: currentStep === 'intake'
    },
    {
      id: 'discovery',
      title: 'Find Professionals',
      description: 'We contact local experts',
      icon: Search,
      completed: ['booking', 'complete'].includes(currentStep),
      active: currentStep === 'discovery'
    },
    {
      id: 'booking',
      title: 'Book Appointment',
      description: 'Automatic scheduling',
      icon: Calendar,
      completed: currentStep === 'complete',
      active: currentStep === 'booking'
    },
    {
      id: 'complete',
      title: 'All Set!',
      description: 'Your appointment is confirmed',
      icon: CheckCircle,
      completed: false,
      active: currentStep === 'complete'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 py-6">
      <div className="container mx-auto px-4" style={{ maxWidth: '83.2rem' }}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${step.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : step.active 
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Step Info */}
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-medium ${
                      step.completed || step.active ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs mt-1 ${
                      step.completed || step.active ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {/* Connector Line */}
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                    step.completed ? 'bg-emerald-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};