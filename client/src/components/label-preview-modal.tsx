import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LabelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  shipmentId: number;
  labelType?: 'moogship' | 'carrier';
  shipmentTrackingNumber?: string;
}

export default function LabelPreviewModal({
  open,
  onClose,
  shipmentId,
  labelType = 'moogship',
  shipmentTrackingNumber
}: LabelPreviewModalProps) {
  const [labelUrl, setLabelUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Generate the label URL
  const generateLabelUrl = () => {
    return `/api/shipments/${shipmentId}/label?type=${labelType}&v=${Date.now()}`;
  };

  // Load label when modal opens
  useEffect(() => {
    if (open && shipmentId) {
      setIsLoading(true);
      setError('');
      setLabelUrl(generateLabelUrl());
      setZoom(100);
      setRotation(0);
    }
  }, [open, shipmentId, labelType]);

  const handleDownload = async () => {
    try {
      const url = generateLabelUrl();
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to download label');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${labelType}-label-${shipmentTrackingNumber || shipmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Success",
        description: "Label downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download label",
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(generateLabelUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFrameLoad = () => {
    setIsLoading(false);
  };

  const handleFrameError = () => {
    setIsLoading(false);
    setError('Failed to load label preview');
  };

  const labelTitle = labelType === 'carrier' ? 'Carrier Label' : 'MoogShip Label';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[99vw] max-h-[99vh] w-full h-full flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {labelTitle} Preview
            {shipmentTrackingNumber && (
              <span className="text-sm font-normal text-muted-foreground">
                ({shipmentTrackingNumber})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 py-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[60px] text-center">
            {zoom}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Label Preview */}
        <div className="flex-1 relative bg-gray-50 rounded-lg" style={{ overflow: 'auto' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading label preview...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button variant="outline" onClick={handleOpenInNewTab}>
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}

          {labelUrl && !error && (
            <div 
              className="w-full flex-1 p-4"
              style={{
                // Enable scrolling for carrier labels that exceed modal dimensions
                overflowX: 'auto',
                overflowY: 'auto',
                height: 'auto'
              }}
            >
              <div 
                className="flex items-start justify-center"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.2s ease-in-out',
                  minWidth: 'fit-content',
                  minHeight: 'fit-content',
                  width: 'max-content'
                }}
              >
                <embed
                  src={labelUrl}
                  type="application/pdf"
                  className="border-0 rounded shadow-lg bg-white"
                  style={{
                    // Let PDF determine its own size, no constraints
                    width: labelType === 'carrier' ? '800px' : '600px',
                    height: labelType === 'carrier' ? '1400px' : '800px',
                    minWidth: labelType === 'carrier' ? '800px' : '600px',
                    minHeight: labelType === 'carrier' ? '1400px' : '800px',
                    maxWidth: 'none',
                    maxHeight: 'none'
                  }}
                  title={`${labelTitle} Preview`}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}