'use client';

import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-100">
      <style jsx>{`
        /* Define the animation for the pulsing dots */
        .animate-pulse-delay-1 {
          animation: pulse 1.5s infinite 0.1s;
        }
        .animate-pulse-delay-2 {
          animation: pulse 1.5s infinite 0.2s;
        }
        .animate-pulse-delay-3 {
          animation: pulse 1.5s infinite 0.3s;
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.5;
          }
        }
      `}</style>
      <div className="flex space-x-2">
        <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse-delay-1"></div>
        <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse-delay-2"></div>
        <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse-delay-3"></div>
      </div>
      <p className="mt-4 text-gray-600 text-lg font-medium">Loading data...</p>
    </div>
  );
};

export default LoadingSpinner;