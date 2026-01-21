import moogshipLogo from '@/assets/moogship-logo.jpg';

// Utility function to reset video for new session (useful for logout)
export const resetSidebarVideo = () => {
  // No-op since we're not using video anymore
};

interface SidebarVideoLogoProps {
  isExpanded: boolean;
}

// Simplified component - just show the logo directly (video files not deployed)
export default function SidebarVideoLogo({ isExpanded }: SidebarVideoLogoProps) {
  return (
    <div className="relative">
      <img
        src={moogshipLogo}
        alt="Moogship Logo"
        className={`object-contain object-center transition-all duration-300 ${
          isExpanded ? 'h-40 w-auto' : 'h-10 w-10'
        }`}
        style={{
          borderRadius: '8px',
        }}
      />
    </div>
  );
}