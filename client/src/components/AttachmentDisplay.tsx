import { useState } from "react";
import { Download, FileText, Image as ImageIcon, X, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TicketAttachment } from "@shared/schema";

interface AttachmentDisplayProps {
  attachments: TicketAttachment[];
  className?: string;
}

interface AttachmentItemProps {
  attachment: TicketAttachment;
}

// Format file size in human readable format
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file type icon based on file type and MIME type
function getFileIcon(fileType: string, mimeType: string) {
  switch (fileType) {
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'pdf':
      return <FileText className="w-4 h-4 text-red-600" />;
    case 'excel':
    case 'csv':
      return <FileText className="w-4 h-4 text-green-600" />;
    default:
      // Fallback based on MIME type
      if (mimeType.startsWith('image/')) {
        return <ImageIcon className="w-4 h-4" />;
      } else if (mimeType === 'application/pdf') {
        return <FileText className="w-4 h-4 text-red-600" />;
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return <FileText className="w-4 h-4 text-green-600" />;
      } else {
        return <FileText className="w-4 h-4" />;
      }
  }
}

// Get protected URL for attachment access
function getProtectedUrl(filePath: string): string {
  // The filePath is stored in database as `/objects/uploads/...` 
  // We need to use the API endpoint `/api/objects/...`
  if (filePath.startsWith('/objects/')) {
    const pathAfterObjects = filePath.replace('/objects/', '');
    return `/api/objects/${pathAfterObjects}`;
  }
  
  // Handle full GCS URLs (fallback)
  if (filePath.includes('googleapis.com')) {
    const urlParts = filePath.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes('replit-objstore'));
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      const pathAfterBucket = urlParts.slice(bucketIndex + 1).join('/');
      return `/api/objects/${pathAfterBucket}`;
    }
  }
  
  // Fallback: remove leading slash and use as-is
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  return `/api/objects/${cleanPath}`;
}

// Component for individual attachment display
function AttachmentItem({ attachment }: AttachmentItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isImage = attachment.fileType === 'image' || attachment.mimeType.startsWith('image/');
  const protectedUrl = getProtectedUrl(attachment.filePath);

  const handleDownload = async () => {
    try {
      const response = await fetch(protectedUrl, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isImage && !imageError) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800" data-testid={`attachment-${attachment.id}`}>
        <div className="flex-shrink-0">
          {getFileIcon(attachment.fileType, attachment.mimeType)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {attachment.originalFileName}
            </p>
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(attachment.fileSize)}
            </Badge>
          </div>
          
          <div className="mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative cursor-pointer group">
                  <img
                    src={protectedUrl}
                    alt={attachment.originalFileName}
                    className="max-w-32 max-h-24 object-cover rounded border"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setIsLoading(false);
                    }}
                    data-testid={`img-preview-${attachment.id}`}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </DialogTrigger>
              
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    {attachment.originalFileName}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex justify-center p-4">
                  <img
                    src={protectedUrl}
                    alt={attachment.originalFileName}
                    className="max-w-full max-h-[70vh] object-contain"
                    data-testid={`img-fullview-${attachment.id}`}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            data-testid={`button-download-${attachment.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // For non-images or images that failed to load
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800" data-testid={`attachment-${attachment.id}`}>
      <div className="flex-shrink-0">
        {getFileIcon(attachment.fileType, attachment.mimeType)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {attachment.originalFileName}
          </p>
          <Badge variant="secondary" className="text-xs">
            {formatFileSize(attachment.fileSize)}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {attachment.fileType.toUpperCase()} • {attachment.mimeType}
        </p>
        {imageError && (
          <p className="text-xs text-red-500 mt-1">Failed to load image preview</p>
        )}
      </div>
      
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          data-testid={`button-download-${attachment.id}`}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AttachmentDisplay({ attachments, className = "" }: AttachmentDisplayProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.fileSize, 0);
  const imageCount = attachments.filter(a => a.fileType === 'image' || a.mimeType.startsWith('image/')).length;
  const documentCount = attachments.length - imageCount;

  return (
    <div className={`space-y-3 ${className}`} data-testid="attachment-display">
      {/* Header with attachment summary */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium" data-testid="text-attachment-count">
          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
        </span>
        <span>•</span>
        <span data-testid="text-attachment-size">{formatFileSize(totalSize)}</span>
        {(imageCount > 0 || documentCount > 0) && (
          <>
            <span>•</span>
            <span data-testid="text-attachment-breakdown">
              {imageCount > 0 && `${imageCount} image${imageCount !== 1 ? 's' : ''}`}
              {imageCount > 0 && documentCount > 0 && ', '}
              {documentCount > 0 && `${documentCount} document${documentCount !== 1 ? 's' : ''}`}
            </span>
          </>
        )}
      </div>
      
      {/* Attachment list */}
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <AttachmentItem key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}