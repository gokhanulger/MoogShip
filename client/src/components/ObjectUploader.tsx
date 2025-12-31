import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
// import "@uppy/core/dist/style.min.css";
// import "@uppy/dashboard/dist/style.min.css";
import XHRUpload from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file: {
    name: string;
    type: string;
    size: number;
  }) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

// Allowed file types aligned with server policy
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', // Images
  'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel' // Documents
];

// MIME type normalization to handle common aliases
function normalizeMimeType(mimeType: string): string {
  const normalizedTypes: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'application/x-pdf': 'application/pdf',
    'application/vnd.ms-excel.sheet.macroEnabled.12': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return normalizedTypes[mimeType] || mimeType;
}

// Maximum file size (10MB) - aligned with server policy
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = MAX_FILE_SIZE, // Use aligned policy limit
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ALLOWED_FILE_TYPES, // Enforce file type restrictions
      },
      autoProceed: false,
    })
      .use(XHRUpload, {
        endpoint: "placeholder", // Will be set per-file
        method: "PUT",
        formData: false
      })
      .on("file-added", async (file) => {
        console.log("File added to uppy:", file.name);
        const type = normalizeMimeType((file.type as string) || "application/octet-stream");
        const params = await onGetUploadParameters({
          name: file.name || "unknown",
          type,
          size: file.size || 0
        });
        
        console.log("Upload parameters received:", params);
        
        uppy.setFileState(file.id, {
          xhrUpload: {
            endpoint: params.url,
            method: params.method,
            headers: {
              "Content-Type": type,
              ...(params.headers || {})
            },
            formData: false,
            fieldName: "file"
          }
        });
      })
      .on("upload-success", (file, response) => {
        console.log("Upload successful for file:", file?.name, response);
      })
      .on("complete", (result) => {
        console.log("All uploads complete, calling onComplete with result:", result);
        onComplete?.(result);
      })
      .on("upload-error", (file, error) => {
        console.error("Upload error for file:", file?.name, error);
      })
  );

  // Cleanup Uppy instance on component unmount
  useEffect(() => {
    return () => {
      uppy.destroy();
    };
  }, [uppy]);

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}