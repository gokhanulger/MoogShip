import { useState, useRef, useEffect } from 'react';
import moogshipLogo from '@/assets/moogship-logo.png.jpeg';

// Session storage key for tracking video playback
const VIDEO_PLAYED_KEY = 'moogship_sidebar_video_played';

// Utility function to reset video for new session (useful for logout)
export const resetSidebarVideo = () => {
  sessionStorage.removeItem(VIDEO_PLAYED_KEY);
};

interface SidebarVideoLogoProps {
  isExpanded: boolean;
}

export default function SidebarVideoLogo({ isExpanded }: SidebarVideoLogoProps) {
  // Check if video has already been played in this session
  const hasVideoPlayed = sessionStorage.getItem(VIDEO_PLAYED_KEY) === 'true';
  
  const [showVideo, setShowVideo] = useState(!hasVideoPlayed);
  const [videoError, setVideoError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLogo, setShowLogo] = useState(hasVideoPlayed);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      
      // Mark video as played in session storage
      sessionStorage.setItem(VIDEO_PLAYED_KEY, 'true');
      
      setIsTransitioning(true);
      // Start fuzzy transition - video blurs out
      setTimeout(() => {
        setShowVideo(false);
        // Start showing logo with blur-in effect
        setTimeout(() => {
          setShowLogo(true);
          setIsTransitioning(false);
        }, 100); // Small delay before logo starts appearing
      }, 500); // 500ms video blur-out duration
    };

    const handleVideoError = () => {
      console.warn('Sidebar video failed to load, showing logo');
      setVideoError(true);
      setShowVideo(false);
    };

    const handleCanPlay = () => {
      
      video.play().catch(handleVideoError);
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Reset video when sidebar expands/collapses (only if video hasn't been played yet)
  useEffect(() => {
    const hasPlayed = sessionStorage.getItem(VIDEO_PLAYED_KEY) === 'true';
    
    if (!videoError && !hasPlayed) {
      setShowVideo(true);
      setShowLogo(false);
      setIsTransitioning(false);
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {
          setVideoError(true);
          setShowVideo(false);
          setShowLogo(true);
        });
      }
    } else if (hasPlayed) {
      // If video has already been played, just show the logo
      setShowVideo(false);
      setShowLogo(true);
      setIsTransitioning(false);
    }
  }, [isExpanded, videoError]);

  return (
    <div className="relative">
      {/* Video Element */}
      {showVideo && !videoError && (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className={`object-contain object-center transition-all duration-500 ${
            isExpanded ? 'h-40 w-auto' : 'h-10 w-10'
          } ${isTransitioning ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}
          style={{
            borderRadius: '8px',
            filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
            transition: 'filter 500ms ease-in-out, opacity 500ms ease-in-out',
          }}
        >
          <source src="/sidebar-video.mp4" type="video/mp4" />
          <source src="/moogship-logo-video.mp4" type="video/mp4" />
        </video>
      )}
      
      {/* Static Logo */}
      {((!showVideo && showLogo) || videoError) && (
        <img 
          src={moogshipLogo} 
          alt="Moogship Logo" 
          className={`object-contain object-center transition-all duration-700 ${
            isExpanded ? 'h-40 w-auto' : 'h-10 w-10'
          } ${showLogo || videoError ? 'blur-0 opacity-100' : 'blur-lg opacity-0'}`}
          style={{
            filter: showLogo || videoError ? 'blur(0px)' : 'blur(8px)',
            transition: 'filter 700ms ease-in-out, opacity 700ms ease-in-out',
          }}
        />
      )}
    </div>
  );
}