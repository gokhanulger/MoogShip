import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import videoPath from "@assets/WhatsApp Video 2025-05-30 at 12.18.50.mp4";

interface VideoLoaderProps {
  message?: string;
  subtitle?: string;
  className?: string;
  size?: "small" | "medium" | "large";
  showText?: boolean;
}

export function VideoLoader({ 
  message = "Loading...",
  subtitle = "Please wait",
  className = "",
  size = "medium",
  showText = true
}: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        setVideoError(true);
      });
    }
  }, []);

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <div className={`${sizeClasses[size]} mb-4 rounded-lg overflow-hidden shadow-lg`}>
        {!videoError ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
          >
            <source src={videoPath} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          // Fallback to spinning loader if video fails
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{message}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

// Full-screen loading overlay with video
export function VideoLoadingOverlay({ 
  message = "Loading...",
  subtitle = "Please wait while we process your request",
  isVisible = true 
}: {
  message?: string;
  subtitle?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <VideoLoader 
        message={message}
        subtitle={subtitle}
        size="large"
        className="max-w-md mx-auto px-6"
      />
    </motion.div>
  );
}

// Page transition loader
export function PageTransitionLoader({ 
  isLoading = true,
  message = "Loading page..."
}: {
  isLoading?: boolean;
  message?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <VideoLoader 
        message={message}
        subtitle="Please wait while we load the content"
        size="large"
      />
    </div>
  );
}

export default VideoLoader;