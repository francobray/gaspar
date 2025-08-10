import React from 'react';
import { Calendar, Download, RotateCcw, CheckCircle, MapPin, Phone, Clock } from 'lucide-react';
import { BookingResult, VendorData, ProblemSummary } from '../types';
import { generateICS, generateReceipt } from '../utils/calendarUtils';

interface BookingSummaryProps {
  bookingResult: BookingResult;
  vendor: VendorData;
  problemSummary: ProblemSummary;
  onStartOver: () => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  bookingResult,
  vendor,
  problemSummary,
  onStartOver
}) => {
  const downloadICS = () => {
    if (bookingResult.scheduledStartISO) {
      const icsContent = generateICS(bookingResult, vendor, problemSummary);
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vendor.name.replace(/\s+/g, '_')}_appointment.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadReceipt = () => {
    const receiptContent = generateReceipt(bookingResult, vendor, problemSummary);
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendor.name.replace(/\s+/g, '_')}_receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-blue-600 p-8 text-white">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Booking Complete!</h2>
            <p className="text-emerald-100 text-lg">
              Your appointment has been {bookingResult.status === 'confirmed' ? 'confirmed' : 'tentatively scheduled'}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Appointment Details</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Service Provider</h4>
                <p className="text-lg font-semibold text-blue-600">{vendor.name}</p>
                <div className="flex items-center space-x-1 text-gray-600 mt-1">
                  <Phone className="w-4 h-4" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{vendor.address}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Scheduled Time</h4>
                {bookingResult.scheduledStartISO ? (
                  <div>
                    <p className="text-lg font-semibold text-emerald-600">
                      {new Date(bookingResult.scheduledStartISO).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-lg text-gray-700">
                      {new Date(bookingResult.scheduledStartISO).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">Time to be confirmed</p>
                )}
              </div>
            </div>
          </div>

          {/* Problem Summary */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Problem:</span>
                <p className="text-gray-900">{problemSummary.summary}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <p className="text-gray-900 capitalize">{problemSummary.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Urgency:</span>
                  <p className="text-gray-900 capitalize">{problemSummary.urgency}</p>
                </div>
              </div>

              {vendor.serviceFee && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Service Fee:</span>
                  <p className="text-gray-900">${vendor.serviceFee}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Method */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Method</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                {bookingResult.channel === 'phone' && <Phone className="w-5 h-5 text-white" />}
                {bookingResult.channel === 'web_chat' && <Calendar className="w-5 h-5 text-white" />}
                {bookingResult.channel === 'whatsapp' && <Clock className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Booked via {bookingResult.channel === 'phone' ? 'Phone Call' : 
                             bookingResult.channel === 'web_chat' ? 'Website Chat' : 'WhatsApp'}
                </p>
                {bookingResult.confirmationNumber && (
                  <p className="text-sm text-gray-600">
                    Confirmation: {bookingResult.confirmationNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {bookingResult.notes && (
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900 mb-2">Important Notes</h3>
              <p className="text-gray-700">{bookingResult.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {bookingResult.scheduledStartISO && (
              <button
                onClick={downloadICS}
                className="flex items-center justify-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Add to Calendar</span>
              </button>
            )}
            
            <button
              onClick={downloadReceipt}
              className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
            
            <button
              onClick={onStartOver}
              className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Book Another Service</span>
            </button>
          </div>

          {/* Next Steps */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-gray-700">
              {bookingResult.status === 'confirmed' ? (
                <>
                  <li>• The service provider will call you 24 hours before the appointment</li>
                  <li>• Make sure someone is available at the scheduled time</li>
                  <li>• Prepare any relevant information about the problem</li>
                </>
              ) : (
                <>
                  <li>• The service provider will contact you to confirm the exact time</li>
                  <li>• You'll receive a confirmation call within 24 hours</li>
                  <li>• Keep your calendar flexible until confirmed</li>
                </>
              )}
              <li>• Have your payment method ready (cash, check, or card)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};