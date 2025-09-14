import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CadenceCreatedViewProps {
  message: string;
  data: {
    status?: string;
    cadence_id?: string;
    details?: any;
    error?: string;
    message?: string;
  } | null | undefined;
  onScrollToMessage?: (messageId: string) => void;
  messageId: string;
  onSwitchTab?: () => void;
}

export const CadenceCreatedView: React.FC<CadenceCreatedViewProps> = ({
  message,
  data,
  onScrollToMessage,
  messageId,
  onSwitchTab
}) => {
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter()
  // Enhanced safety checks for data
  const safeData = data || {};
  const hasValidData = data && (data.status === 'success' || data.status === 'created' || data.cadence_id);
  const hasError = data && (data.status === 'error' || data.status === 'failed');
  const hasPartialSuccess = data && data.status === 'partial_success';
  
  // Additional safety checks
  const isDataValid = data !== null && data !== undefined && typeof data === 'object';
  const hasNoData = !isDataValid || Object.keys(safeData).length === 0;

  console.log('CadenceCreatedView - data:', data, 'hasValidData:', hasValidData, 'hasError:', hasError, 'hasPartialSuccess:', hasPartialSuccess);

  // Auto-show redirect modal for successful cadence creation only
  useEffect(() => {
    console.log('CadenceCreatedView mounted with status:', safeData);

    // Only show modal for successful creation
    if (hasValidData && (safeData.status === 'success' || safeData.status === 'created')) {
      // Check if modal was already shown for this specific cadence
      const modalKey = `cadence-modal-shown-${safeData.cadence_id}`;
      const alreadyShown = localStorage.getItem(modalKey);

      if (!alreadyShown) {
        const timer = setTimeout(() => {
          setShowRedirectModal(true);
          // Mark as shown in localStorage
          localStorage.setItem(modalKey, 'true');
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [safeData?.status, safeData?.cadence_id, hasValidData]);

  const handleSwitchTab = () => {
    try {
      console.log("Navigating to automated sequence");
      setIsRedirecting(true);

      // Use a more reliable navigation approach
      const navigateToSequence = () => {
        try {
          const url = safeData?.cadence_id 
            ? `/outreach/automated-sequence?cadence_id=${safeData.cadence_id}`
            : '/outreach/automated-sequence';
          router.push(url);
        } catch (error) {
          console.error('Router navigation failed:', error);
          // Fallback to direct window navigation
          const fallbackUrl = safeData?.cadence_id 
            ? `/outreach/automated-sequence?cadence_id=${safeData.cadence_id}`
            : '/outreach/automated-sequence';
          window.location.href = fallbackUrl;
        }
      };

      // Add a delay for better UX
      setTimeout(navigateToSequence, 1500);
    } catch (error) {
      console.error('Failed to navigate:', error);
      setIsRedirecting(false);
      // Show error to user
      alert('Failed to navigate to sequence editor. Please try manually navigating to the Automated Sequence page.');
    }
  };

  const handleCancel = () => {
    setShowRedirectModal(false);
  };

  // Partial success state UI (cadence created but with some issues)
  if (hasPartialSuccess) {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-orange-900 font-semibold">Cadence Created with Issues</h3>
          </div>
          <p className="text-orange-700 mt-2">
            {safeData.message || message || "Your cadence was created but some steps had issues."}
          </p>
          {safeData.error && (
            <p className="text-orange-600 text-sm mt-2 bg-orange-100 p-2 rounded border">
              <strong>Issues encountered:</strong> {safeData.error}
            </p>
          )}
        </div>

        {/* Cadence details */}
        {safeData?.cadence_id && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 className="text-gray-900 font-semibold mb-3">Cadence Details</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex">
                <span className="font-medium text-gray-900 w-24">Cadence ID:</span>
                <span className="text-gray-700">{safeData.cadence_id}</span>
              </div>
              <div className="flex">
                <span className="font-medium text-gray-900 w-24">Status:</span>
                <span className="text-orange-700 capitalize font-medium">{safeData.status || 'Partial Success'}</span>
              </div>
              {safeData.details?.name && (
                <div className="flex">
                  <span className="font-medium text-gray-900 w-24">Name:</span>
                  <span className="text-gray-700">{safeData.details.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleSwitchTab}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center space-x-1.5 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-200"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Check Sequence Editor</span>
          </button>
        </div>
      </div>
    );
  }

  // Error state UI
  if (hasError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-red-900 font-semibold">Cadence Creation Failed</h3>
          </div>
          <p className="text-red-700 mt-2">
            {safeData.message || message || "There was an error creating your cadence. Please try again."}
          </p>
          {safeData.error && (
            <p className="text-red-600 text-sm mt-2 bg-red-100 p-2 rounded border">
              <strong>Error details:</strong> {safeData.error}
            </p>
          )}
        </div>

        {/* Retry action button */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center space-x-1.5 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Enhanced fallback UI when data is missing or invalid
  if (!hasValidData) {
    // Check if we have absolutely no data
    if (hasNoData) {
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900 font-semibold">No Cadence Data Available</h3>
            </div>
            <p className="text-gray-700 mt-2">
              {message || "No cadence information was returned. The operation may have completed but details are unavailable."}
            </p>
          </div>

          {/* Show action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSwitchTab}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center space-x-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Go to Sequence Editor</span>
            </button>
          </div>
        </div>
      );
    }

    // We have some data but it's not clearly successful
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
            <h3 className="text-yellow-900 font-semibold">Cadence Creation Status</h3>
          </div>
          <p className="text-yellow-700 mt-2">
            {message || "Cadence operation completed. Please check the sequence editor for details."}
          </p>
          {safeData && Object.keys(safeData).length > 0 && (
            <div className="mt-3 p-2 bg-yellow-100 rounded border text-sm">
              <details>
                <summary className="cursor-pointer text-yellow-800 font-medium">View Raw Data</summary>
                <pre className="mt-2 text-xs text-yellow-700 overflow-auto">
                  {JSON.stringify(safeData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Show action buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleSwitchTab}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center space-x-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Go to Sequence Editor</span>
          </button>
        </div>
      </div>
    );
  }

  // Success state UI
  return (
    <div className="space-y-4">
      {/* Success message */}
      <div className="bg-green-50 border border-green-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-green-900 font-semibold">Cadence Created Successfully</h3>
        </div>
        <p className="text-green-700 mt-2">{message || "Your cadence has been created successfully."}</p>
      </div>

      {/* Cadence details */}
      {safeData?.cadence_id && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-gray-900 font-semibold mb-3">Cadence Details</h4>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex">
              <span className="font-medium text-gray-900 w-24">Cadence ID:</span>
              <span className="text-gray-700">{safeData.cadence_id}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-900 w-24">Status:</span>
              <span className="text-green-700 capitalize font-medium">{safeData.status || 'Created'}</span>
            </div>
            {safeData.details?.name && (
              <div className="flex">
                <span className="font-medium text-gray-900 w-24">Name:</span>
                <span className="text-gray-700">{safeData.details.name}</span>
              </div>
            )}
            {safeData.details?.tags && safeData.details.tags.length > 0 && (
              <div className="flex">
                <span className="font-medium text-gray-900 w-24">Tags:</span>
                <span className="text-gray-700">{safeData.details.tags.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Redirect Modal with better error handling */}
      {showRedirectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            {!isRedirecting ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Cadence Created!
                  </h3>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Your email cadence has been created successfully. Would you like to go to the automated sequence editor to add email content and configure the timing?
                  </p>
                  {safeData?.cadence_id && (
                    <p className="text-sm text-gray-500 mt-2">
                      Cadence ID: <span className="font-mono text-gray-700">{safeData.cadence_id}</span>
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleSwitchTab}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    disabled={isRedirecting}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-medium">Go to Editor</span>
                  </button>

                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200 font-medium"
                    disabled={isRedirecting}
                  >
                    Stay on Chat
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Redirecting...
                </h3>
                <p className="text-gray-600">
                  Taking you to automated sequence editor
                </p>
                <button
                  onClick={() => {
                    setIsRedirecting(false);
                    handleCancel();
                  }}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional actions */}
      <div className="flex space-x-3 pt-2">
        <button
          onClick={handleSwitchTab}
          className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1.5 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-200"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Edit Sequence</span>
        </button>
      </div>
    </div>
  );
};