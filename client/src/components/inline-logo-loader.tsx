import { motion } from "framer-motion";
import moogshipLogoPath from "@/assets/moogship-logo.png";
import { useEffect, useState } from "react";

interface InlineLogoLoaderProps {
  message?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function InlineLogoLoader({ 
  message = "Loading...", 
  size = "sm",
  className = ""
}: InlineLogoLoaderProps) {
  const [dots, setDots] = useState("");

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8", 
    md: "w-12 h-12"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Animated logo */}
      <div className="relative">
        {/* Rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{
            width: size === "xs" ? "28px" : size === "sm" ? "36px" : "52px",
            height: size === "xs" ? "28px" : size === "sm" ? "36px" : "52px",
            margin: "-2px"
          }}
        />
        
        {/* Logo */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden`}
          animate={{ 
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <img 
            src={moogshipLogoPath} 
            alt="MoogShip" 
            className="w-2/3 h-2/3 object-contain"
          />
        </motion.div>
      </div>
      
      {/* Loading text */}
      <span className={`text-gray-600 ${textSizeClasses[size]}`}>
        {message}{dots}
      </span>
    </div>
  );
}

export default InlineLogoLoader;