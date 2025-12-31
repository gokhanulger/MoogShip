import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCw, ZoomIn, ZoomOut, Download, X } from "lucide-react";
import { useSecureLabels } from "@/hooks/useSecureLabels";

interface SimpleLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: number;
  shipmentNumber: string;
  labelType?: 'carrier' | 'moogship';
  selectedService?: string;
}

export function SimpleLabelModal({ 
  isOpen, 
  onClose, 
  shipmentId, 
  shipmentNumber, 
  labelType = 'carrier',
  selectedService
}: SimpleLabelModalProps) {
  const { openMoogshipLabel, openCarrierLabel, isAnyLoading: isSecureLabelsLoading } = useSecureLabels();
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging - Only log when modal state changes
  React.useEffect(() => {
    
  }, [isOpen, shipmentId, shipmentNumber, labelType, selectedService]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load label');
  };

  const handleDownload = () => {
    if (labelType === 'carrier') {
      openCarrierLabel(shipmentId);
    } else {
      openMoogshipLabel(shipmentId);
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {labelType === 'carrier' ? 'Carrier Label' : 'MoogShip Label'} - {shipmentNumber}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isSecureLabelsLoading}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading label...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          )}

          {!error && (
            <div className="max-w-full max-h-full overflow-auto text-center p-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">Secure Label Access</h3>
                <p className="text-gray-600 mb-4">
                  For security, label preview is not available. 
                  Please use the download button to access your {labelType === 'carrier' ? 'carrier' : 'MoogShip'} label.
                </p>
                <Button onClick={handleDownload} disabled={isSecureLabelsLoading} className="mt-2">
                  <Download className="h-4 w-4 mr-2" />
                  Download {labelType === 'carrier' ? 'Carrier' : 'MoogShip'} Label
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}