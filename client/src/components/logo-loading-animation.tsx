import { motion } from "framer-motion";
import moogshipLogoPath from "@/assets/moogship-logo.png";
import { useEffect, useState } from "react";

interface LogoLoadingAnimationProps {
  message?: string;
  size?: "small" | "medium" | "large";
  showBackground?: boolean;
}

export function LogoLoadingAnimation({ 
  message = "Loading...", 
  size = "medium",
  showBackground = true 
}: LogoLoadingAnimationProps) {
  const [dots, setDots] = useState("");

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24", 
    large: "w-32 h-32"
  };

  const containerClasses = {
    small: "gap-2",
    medium: "gap-4",
    large: "gap-6"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${showBackground ? 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50' : ''}`}>
      {/* Animated logo container */}
      <div className="relative">
        {/* Rotating ring behind logo */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-orange-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: size === "small" ? "80px" : size === "medium" ? "112px" : "144px",
            height: size === "small" ? "80px" : size === "medium" ? "112px" : "144px",
            margin: "-8px"
          }}
        />
        
        {/* Pulsing outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-200 to-orange-200 opacity-20"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          style={{
            width: size === "small" ? "80px" : size === "medium" ? "112px" : "144px",
            height: size === "small" ? "80px" : size === "medium" ? "112px" : "144px",
            margin: "-8px"
          }}
        />
        
        {/* Logo with gentle bounce */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden`}
          animate={{ 
            y: [0, -8, 0],
            rotateY: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <img 
            src={moogshipLogoPath} 
            alt="MoogShip Logo" 
            className="w-3/4 h-3/4 object-contain"
            style={{
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
            }}
          />
        </motion.div>
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

// Page transition wrapper
export function PageTransitionLoader({ 
  isLoading = true,
  message = "Loading page..."
}: {
  isLoading?: boolean;
  message?: string;
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
      <LogoLoadingAnimation 
        message={message}
        size="large"
        showBackground={false}
      />
    </motion.div>
  );
}

// Full screen overlay loader
export function FullScreenLoader({ 
  message = "Loading...",
  isVisible = true 
}: {
  message?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50"
    >
      <LogoLoadingAnimation 
        message={message}
        size="large"
        showBackground={false}
      />
    </motion.div>
  );
}

export default LogoLoadingAnimation;