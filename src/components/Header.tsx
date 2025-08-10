import React from 'react';
import { Mic, Wrench } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gaspar</h1>
              <p className="text-sm text-gray-600">Audio-First Home Repair Booking</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};