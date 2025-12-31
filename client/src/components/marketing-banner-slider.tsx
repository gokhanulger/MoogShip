import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketingBanner } from '@shared/schema';

export function MarketingBannerSlider() {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Function to fetch banners (extracted to be reusable)
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing-banners', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // Use default cache behavior for better performance
        cache: 'default'
      });
      if (response.ok) {
        const data = await response.json();
       
        setBanners(data);
      } else {
        console.error('Failed to fetch marketing banners');
        setError('Failed to load banner content');
      }
    } catch (err) {
      console.error('Error fetching marketing banners:', err);
      setError('An error occurred while loading banner content');
    } finally {
      setLoading(false);
    }
  };

  // Fetch banners on initial mount
  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    // Auto-rotate banners every 5 seconds if there are multiple banners
    if (banners.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [banners.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
    
    // Reset the timer when manually changing slides
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000);
    }
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    
    // Reset the timer when manually changing slides
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000);
    }
  };

  // Don't render anything if there are no banners
  if (!banners || banners.length === 0) {
    if (loading) {
      return (
        <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
          <span className="text-gray-400">{t('common.loading', 'Loading...')}</span>
        </div>
      );
    }
    
    if (error) {
      return null; // Don't show errors to the user, just silently fail
    }
    
    return null; // Don't render anything if no banners are available
  }

  const currentBanner = banners[currentIndex];
  
  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-lg mb-10">
      <div 
        className="w-full h-64 md:h-80 lg:h-96 relative"
        style={{ 
          backgroundColor: currentBanner.backgroundColor || '#f0f9ff'
        }}
      >
        {/* Banner content */}
        <div className="absolute inset-0 flex items-center p-6 md:p-10 mt-6 md:mt-8">
          <div className="w-1/2 z-10">
            <h2 
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2"
              style={{ color: currentBanner.textColor || '#000000' }}
            >
              {currentBanner.title}
            </h2>
            {currentBanner.subtitle && (
              <p 
                className="text-base md:text-lg mb-4 max-w-md"
                style={{ color: currentBanner.textColor || '#000000' }}
              >
                {currentBanner.subtitle}
              </p>
            )}
            {currentBanner.buttonText && currentBanner.buttonUrl && (
              <a 
                href={currentBanner.buttonUrl}
                className="inline-block px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                {currentBanner.buttonText}
              </a>
            )}
          </div>
          
          {/* Banner image */}
          {currentBanner.imageUrl && (
            <div className="w-1/2 h-full flex items-center justify-end">
              <img 
                src={currentBanner.imageUrl} 
                alt={currentBanner.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation controls (only show if multiple banners) */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 text-gray-800 p-2 rounded-full hover:bg-white transition-colors"
            aria-label="Previous banner"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 text-gray-800 p-2 rounded-full hover:bg-white transition-colors"
            aria-label="Next banner"
          >
            <ChevronRight size={20} />
          </button>
          
          {/* Indicator dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}