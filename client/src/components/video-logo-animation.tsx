import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VideoLogoAnimationProps {
  message?: string;
  size?: "small" | "medium" | "large";
  showBackground?: boolean;
  videoSrc?: string;
}

export function VideoLogoAnimation({ 
  message = "Loading...", 
  size = "medium",
  showBackground = true,
  videoSrc = "/moogship-logo-video.mp4"
}: VideoLogoAnimationProps) {
  const [dots, setDots] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(true);

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    small: "w-32 h-32",
    medium: "w-48 h-48", 
    large: "w-64 h-64"
  };

  const containerClasses = {
    small: "gap-2",
    medium: "gap-4",
    large: "gap-6"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${showBackground ? 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50' : ''}`}>
      {/* Video container with fallback */}
      <div className="relative">
        {/* Pulsing outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-200 to-orange-200 opacity-20"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          style={{
            width: size === "small" ? "144px" : size === "medium" ? "208px" : "272px",
            height: size === "small" ? "144px" : size === "medium" ? "208px" : "272px",
            margin: "-8px"
          }}
        />
        
        {/* Video with gentle bounce */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full bg-white shadow-xl flex items-center justify-center`}
          animate={{ 
            y: [0, -8, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          {!videoError ? (
            <video 
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain rounded-full"
              style={{
                clipPath: 'circle(50% at 50% 50%)',
                objectPosition: 'center'
              }}
              onError={(e) => {
                console.warn('Video failed to load:', e);
                setVideoError(true);
              }}
              onLoadStart={() => {}}
              onCanPlay={() => setVideoLoaded(true)}
              onLoadedData={() => setVideoLoaded(true)}
            >
              {/* Try multiple formats for better browser compatibility */}
              <source src={videoSrc} type="video/mp4" />
              <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
              <source src={videoSrc.replace('.mp4', '.mov')} type="video/quicktime" />
              Your browser does not support the video tag.
            </video>
          ) : (
            // Fallback to animated MoogShip logo if video fails
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-orange-100 rounded-full">
              <motion.div
                className="w-3/4 h-3/4 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold"
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{
                  fontSize: size === "small" ? "1.5rem" : size === "medium" ? "2rem" : "2.5rem"
                }}
              >
                M
              </motion.div>
            </div>
          )}
        </motion.div>
        
        {/* Loading indicator ring - only show when video is not loaded */}
        {!videoLoaded && !videoError && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-orange-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
            width: size === "small" ? "144px" : size === "medium" ? "208px" : "272px",
            height: size === "small" ? "144px" : size === "medium" ? "208px" : "272px",
            margin: "-8px"
          }}
        />
        )}
      </div>
      
      {/* Loading text with animated dots */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h3 className={`font-semibold text-gray-700 ${
          size === "small" ? "text-sm" : size === "medium" ? "text-base" : "text-lg"
        }`}>
          {message}{dots}
        </h3>
        <p className={`text-gray-500 mt-1 ${
          size === "small" ? "text-xs" : size === "medium" ? "text-sm" : "text-base"
        }`}>
          MoogShip Global Shipping
        </p>
      </motion.div>
      
      {/* Progress bar animation */}
      <motion.div
        className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-orange-500 rounded-full"
          animate={{ 
            x: ["-100%", "100%"]
          }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </motion.div>
    </div>
  );
}

// Page transition wrapper with video
export function VideoPageTransitionLoader({ 
  isLoading = true,
  message = "Loading page...",
  videoSrc
}: {
  isLoading?: boolean;
  message?: string;
  videoSrc?: string;
}) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm"
    >
      <VideoLogoAnimation 
        message={message}
        size="large"
        showBackground={false}
        videoSrc={videoSrc}
      />
    </motion.div>
  );
}

export default VideoLogoAnimation;