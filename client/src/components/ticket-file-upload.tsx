import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  Loader2,
  AlertTriangle 
} from "lucide-react";

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'image' | 'pdf' | 'excel' | 'csv' | 'text';
  file?: File;
  url?: string;
}

interface TicketFileUploadProps {
  onFilesChange: (files: FileAttachment[]) => void;
  maxFiles?: number;
  existingFiles?: FileAttachment[];
  disabled?: boolean;
}

const ALLOWED_TYPES = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
  'text/csv': 'csv',
  'text/plain': 'text'
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getFileIcon = (category: string) => {
  switch (category) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    case 'excel':
    case 'csv':
      return <File className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function TicketFileUpload({ 
  onFilesChange, 
  maxFiles = 5, 
  existingFiles = [], 
  disabled = false 
}: TicketFileUploadProps) {
  const [files, setFiles] = useState<FileAttachment[]>(existingFiles);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateFiles = (newFiles: FileAttachment[]) => {
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
      return `File type ${file.type} is not supported. Please upload images, PDFs, Excel files, CSV files, or text files.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    return null;
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      const newFiles: FileAttachment[] = [];
      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Validate file
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          continue;
        }

        // Check if we've reached max files limit
        if (files.length + newFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          break;
        }

        const fileAttachment: FileAttachment = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          category: ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES],
          file
        };

        newFiles.push(fileAttachment);
      }

      if (errors.length > 0) {
        toast({
          title: "File Upload Issues",
          description: errors.join('; '),
          variant: "destructive"
        });
      }

      if (newFiles.length > 0) {
        updateFiles([...files, ...newFiles]);
        toast({
          title: "Files Added",
          description: `${newFiles.length} file(s) added successfully`,
          variant: "default"
        });
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    const newFiles = files.filter(f => f.id !== fileId);
    updateFiles(newFiles);
  };

  return (
    <div className="space-y-4" data-testid="ticket-file-upload">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading || files.length >= maxFiles}
          data-testid="file-input"
        />
        
        <div className="flex flex-col items-center space-y-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading || files.length >= maxFiles}
              data-testid="upload-button"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </>
              )}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Upload images, PDFs, Excel files, CSV, or text files
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, up to {formatFileSize(MAX_FILE_SIZE)} each
          </p>
          
          {files.length >= maxFiles && (
            <div className="flex items-center text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              File limit reached
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Attached Files ({files.length}/{maxFiles})</h4>
              
              <div className="space-y-2">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-2 border rounded-md"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFileIcon(file.category)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {file.category.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`remove-file-${file.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}