import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCw, ZoomIn, ZoomOut, Download, X, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EnhancedLabelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: number;
  shipmentNumber: string;
  labelType?: 'carrier' | 'moogship';
}

interface LabelFormat {
  format: 'pdf' | 'png';
  hasLabel: boolean;
  isEcoService: boolean;
  selectedService: string | null;
  providerServiceCode: string | null;
}

interface CarrierLabelData {
  carrierLabelPdf?: string;
  carrierLabelUrl?: string;
}

export function EnhancedLabelPreviewModal({ 
  isOpen, 
  onClose, 
  shipmentId, 
  shipmentNumber, 
  labelType = 'carrier' 
}: EnhancedLabelPreviewModalProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [labelFormat, setLabelFormat] = useState<LabelFormat | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [carrierLabelData, setCarrierLabelData] = useState<CarrierLabelData | null>(null);

  // Debug logging for enhanced modal
  console.log('🚀 Enhanced Modal Props:', { isOpen, shipmentId, shipmentNumber, labelType });
  
  // Additional debug for modal state changes
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎯 Enhanced Modal OPENED for shipment:', shipmentId, 'Type:', labelType);
    } else {
      console.log('❌ Enhanced Modal CLOSED');
    }
  }, [isOpen, shipmentId, labelType]);

  // Fetch label format and carrier data when modal opens
  useEffect(() => {
    if (isOpen && shipmentId) {
      setRotation(0);
      setZoom(1);
      setIsLoading(true);
      setFormatError(null);
      setCarrierLabelData(null);
      
      // Fetch label format information
      fetch(`/api/shipments/${shipmentId}/label-format`)
        .then(response => response.json())
        .then(data => {
          console.log('🎯 Label format detected:', data);
          setLabelFormat(data);
          
          // For ECO services requesting carrier labels, check if they actually have carrier label data
          if (labelType === 'carrier' && data.isEcoService) {
            console.log('⚠️ ECO service requested as carrier label - checking for actual carrier data');
            // Continue to fetch carrier data to see if this ECO service has a real carrier label
            // Some ECO services (like DHL E-Commerce) do have separate carrier labels
          }
          
          if (labelType === 'carrier') {
            return apiRequest('GET', `/api/shipments/${shipmentId}`)
              .then(response => response.json())
              .then(shipmentData => {
                console.log('🏷️ Raw shipment data received:', {
                  id: shipmentData.id,
                  tracking_number: shipmentData.tracking_number,
                  carrier_label_pdf: shipmentData.carrier_label_pdf ? 'HAS_DATA' : 'NO_DATA',
                  carrier_label_url: shipmentData.carrier_label_url,
                  carrierLabelPdf: shipmentData.carrierLabelPdf ? 'HAS_DATA' : 'NO_DATA',
                  carrierLabelUrl: shipmentData.carrierLabelUrl,
                  carrier_label_pdf_length: shipmentData.carrier_label_pdf?.length || 0,
                  carrier_label_pdf_sample: shipmentData.carrier_label_pdf?.substring(0, 20) || 'NONE'
                });
                
                const pdfData = shipmentData.carrier_label_pdf || shipmentData.carrierLabelPdf;
                const urlData = shipmentData.carrier_label_url || shipmentData.carrierLabelUrl;
                
                // Validate PNG data for carrier labels
                const isValidPNG = pdfData?.startsWith('iVBORw0KGgo') || false;
                
                console.log('🎯 Final carrier label data to store:', {
                  hasPdfData: !!pdfData,
                  hasUrlData: !!urlData,
                  pdfDataLength: pdfData?.length || 0,
                  pdfDataSample: pdfData?.substring(0, 20) || 'NONE',
                  isValidPNG,
                  dataURL: pdfData ? `data:image/png;base64,${pdfData}`.substring(0, 50) + '...' : 'NONE',
                  rawShipmentKeys: Object.keys(shipmentData),
                  hasCarrierLabelPdf: !!shipmentData.carrier_label_pdf,
                  hasCarrierLabelUrl: !!shipmentData.carrier_label_url
                });
                
                // Always set carrier data if we have any PNG data (valid or not)
                // The rendering logic will handle validation
                console.log('🎉 Setting carrier label data from authenticated response');
                setCarrierLabelData({
                  carrierLabelPdf: pdfData,
                  carrierLabelUrl: urlData
                });
              });
          }
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch(error => {
          console.error('❌ Error fetching label data:', error);
          setFormatError('Unable to load label data');
          setLabelFormat({ format: 'pdf', hasLabel: false, isEcoService: false, selectedService: null, providerServiceCode: null });
          setIsLoading(false);
        });
    }
  }, [isOpen, shipmentId, labelType]);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (labelFormat?.format === 'png') {
      link.href = `/api/shipments/${shipmentId}/label-png`;
      link.download = `${shipmentNumber}_eco_label.png`;
    } else {
      link.href = `/api/shipments/${shipmentId}/label-pdf`;
      link.download = `${shipmentNumber}_label.pdf`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    console.error('🚨 Label loading failed:', error);
    console.error('🚨 Shipment ID:', shipmentId);
    console.error('🚨 Label format:', labelFormat);
    setFormatError(`Failed to load ${labelFormat?.format?.toUpperCase()} label`);
  };

  // No longer using metadata since we're directly serving PDFs

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[99vw] h-[99vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <DialogTitle className="text-lg font-semibold">
                {labelFormat?.isEcoService ? 'DHL E-Commerce Label' : 
                 labelType === 'carrier' ? 'Authentic Carrier Label' : 'MoogShip Label'} - {shipmentNumber}
                {labelFormat?.isEcoService && (
                  <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    PNG Format
                  </span>
                )}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Rotate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="flex items-center gap-2"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="flex items-center gap-2"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!shipmentId}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-gray-50 overflow-auto">
          <div className="h-full flex items-center justify-center p-4">
            {isLoading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading authentic label...</span>
              </div>
            )}
            
            {formatError && (
              <div className="flex items-center justify-center text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>{formatError}</span>
              </div>
            )}

            {!formatError && labelFormat && !labelFormat.hasLabel && (
              <div className="flex items-center justify-center text-gray-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>No label available for this shipment</span>
              </div>
            )}

            {!formatError && labelFormat?.hasLabel && !isLoading && (
              <div 
                className="transform transition-transform duration-200 border bg-white shadow-lg"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {(() => {
                  console.log('🔍 Modal rendering decision:', {
                    format: labelFormat.format,
                    labelType,
                    isEcoService: labelFormat.isEcoService,
                    hasCarrierData: !!carrierLabelData?.carrierLabelPdf,
                    carrierDataLength: carrierLabelData?.carrierLabelPdf?.length,
                    isPngCarrier: labelFormat.format === 'png' && labelType === 'carrier',
                    isPngCarrierNotEco: labelFormat.format === 'png' && labelType === 'carrier' && !labelFormat.isEcoService,
                    willUsePngPath: labelFormat.format === 'png' && labelType === 'carrier' && carrierLabelData?.carrierLabelPdf,
                    selectedService: labelFormat.selectedService,
                    providerServiceCode: labelFormat.providerServiceCode
                  });
                  
                  // Log which rendering path will be taken
                  if (labelFormat.format === 'png' && labelType === 'carrier' && carrierLabelData?.carrierLabelPdf) {
                    console.log('🎯 Will render: PNG carrier label (has carrier data)');
                  } else if (labelFormat.format === 'png') {
                    console.log('🎯 Will render: Regular PNG label');
                  } else {
                    console.log('🎯 Will render: PDF label');
                  }
                  
                  return null;
                })()}
                {labelFormat.format === 'png' && labelType === 'carrier' && carrierLabelData?.carrierLabelPdf ? (
                  <img
                    src={
                      // If we have external PNG URL, use it directly (prioritize external URLs)
                      carrierLabelData?.carrierLabelUrl && carrierLabelData.carrierLabelUrl.includes('.png') ? 
                        carrierLabelData.carrierLabelUrl :
                      // Otherwise if we have stored PNG data, use local endpoint
                      carrierLabelData?.carrierLabelPdf ? 
                        `/api/shipments/${shipmentId}/label/png?type=carrier` :
                      // Fallback to local endpoint
                      `/api/shipments/${shipmentId}/label/png?type=carrier`
                    }
                    alt={`Carrier label for shipment ${shipmentNumber}`}
                    className="block max-w-full max-h-full object-contain"
                    onLoad={() => {
                      console.log('🎉 PNG carrier label loaded successfully', {
                        usedExternal: !!(carrierLabelData?.carrierLabelUrl && carrierLabelData.carrierLabelUrl.includes('.png')),
                        usedLocal: !!(carrierLabelData?.carrierLabelPdf && (!carrierLabelData?.carrierLabelUrl || !carrierLabelData.carrierLabelUrl.includes('.png'))),
                        externalUrl: carrierLabelData?.carrierLabelUrl,
                        hasLocalData: !!carrierLabelData?.carrierLabelPdf
                      });
                      setIsLoading(false);
                    }}
                    onError={(e) => {
                      console.error('❌ PNG carrier label failed to load:', {
                        error: e.type,
                        src: e.currentTarget.src,
                        naturalWidth: e.currentTarget.naturalWidth,
                        naturalHeight: e.currentTarget.naturalHeight,
                        hasLocalData: !!carrierLabelData?.carrierLabelPdf,
                        hasExternalUrl: !!carrierLabelData?.carrierLabelUrl
                      });
                      setIsLoading(false);
                      setFormatError('Failed to load PNG carrier label');
                    }}
                  />
                ) : labelFormat.format === 'png' ? (
                  <img
                    src={`/api/shipments/${shipmentId}/label-png`}
                    alt={`DHL E-Commerce label for shipment ${shipmentNumber}`}
                    className="block max-w-full max-h-full object-contain"
                    onLoad={handleLoad}
                    onError={handleError}
                  />
                ) : (
                  <embed
                    src={`/api/shipments/${shipmentId}/label-pdf`}
                    type="application/pdf"
                    width={800}
                    height={1400}
                    onLoad={handleLoad}
                    onError={handleError}
                    className="block"
                    style={{
                      minWidth: '800px',
                      minHeight: '1400px',
                    }}
                  />
                )}
              </div>
            )}

            {/* Label info panel removed - using direct PDF serving */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}