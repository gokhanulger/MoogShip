import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { VideoLogoAnimation } from '@/components/video-logo-animation';

export default function TrackRedirectPage() {
  const { trackingNumber } = useParams<{ trackingNumber: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return;

    const handleRedirect = async () => {
      try {
        // If user is admin, try to find the shipment and redirect to edit page
        if (user && user.role === 'admin') {
          // Query the backend to find shipment by tracking number
          const response = await fetch(`/api/shipments/find-by-tracking/${encodeURIComponent(trackingNumber)}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.shipmentId) {
              // Redirect to shipment edit page
              setLocation(`/shipment-edit/${data.shipmentId}`);
              return;
            }
          }
          
          // If no shipment found, fall back to regular tracking page
          window.location.href = `https://www.moogship.com/takip?track=${encodeURIComponent(trackingNumber)}`;
        } else {
          // For regular users or not logged in users, redirect to main tracking page
          window.location.href = `https://www.moogship.com/takip?track=${encodeURIComponent(trackingNumber)}`;
        }
      } catch (error) {
        console.error('Error in track redirect:', error);
        // On error, redirect to main tracking page
        window.location.href = `https://www.moogship.com/takip?track=${encodeURIComponent(trackingNumber)}`;
      }
    };

    if (trackingNumber) {
      handleRedirect();
    } else {
      // If no tracking number provided, redirect to main tracking page
      window.location.href = 'https://www.moogship.com/takip';
    }
  }, [trackingNumber, user, isLoading, setLocation]);

  // Show loading animation while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <VideoLogoAnimation 
        message="Redirecting to tracking page..." 
        size="large" 
        showBackground={true}
        videoSrc="/moogship-logo-video.mp4"
      />
    </div>
  );
}