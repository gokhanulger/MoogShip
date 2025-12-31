import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface UploadedFile {
  id: string;
  file: File;
  originalFileName: string;
  fileType: string;
  fileSize: number;
}

interface FileUploaderProps {
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemoved: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  uploadedFiles: UploadedFile[];
  className?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

export function FileUploader({
  onFilesAdded,
  onFileRemoved,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ACCEPTED_TYPES,
  uploadedFiles,
  className = ''
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-600" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-600" />;
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      return <File className="w-4 h-4 text-green-600" />;
    }
    return <File className="w-4 h-4 text-gray-600" />;
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use images (.jpg, .png, .gif) or documents (.pdf, .xlsx, .xls).`;
    }
    if (file.size > maxFileSize) {
      return `File size ${Math.round(file.size / 1024)}KB exceeds maximum allowed size of ${Math.round(maxFileSize / 1024)}KB.`;
    }
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }
    return null;
  };

  const processFiles = (files: FileList) => {
    console.log("Processing", files.length, "files");
    const validFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        toast({
          title: "File Upload Error",
          description: error,
          variant: "destructive",
        });
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };
      
      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
      toast({
        title: "Files Added",
        description: `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} ready to upload.`,
      });
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("🔧 [DEBUG] FileUploader handleFileSelect called");
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (fileId: string) => {
    onFileRemoved(fileId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />
        
        <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        
        <div className="space-y-2">
          <p className={`text-sm font-medium ${isDragging ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
            {isDragging ? 'Drop files here' : 'Drop files here or browse files'}
          </p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling to parent div
              handleBrowseClick();
            }}
            data-testid="browse-button"
          >
            Browse Files
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Supported: Images (.jpg, .png, .gif), Documents (.pdf, .xlsx, .xls)<br />
          Max {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)}MB each
        </p>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 font-medium">
            📎 Selected Files ({uploadedFiles.length}):
          </p>
          {uploadedFiles.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
              data-testid={`file-item-${file.id}`}
            >
              <div className="flex items-center gap-2">
                {getFileIcon(file.fileType)}
                <span className="text-sm font-medium">{file.originalFileName}</span>
                <span className="text-xs text-gray-500">
                  ({Math.round(file.fileSize / 1024)}KB)
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  ✓ Ready
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(file.id)}
                className="text-red-600 hover:text-red-800"
                data-testid={`remove-file-${file.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}