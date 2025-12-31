import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Announcement, AnnouncementPriority, AnnouncementPriorityColors } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Info, AlertTriangle } from "lucide-react";

const AnnouncementPriorityIconColors = {
  [AnnouncementPriority.LOW]: "text-blue-800",
  [AnnouncementPriority.NORMAL]: "text-gray-800",
  [AnnouncementPriority.HIGH]: "text-yellow-800",
  [AnnouncementPriority.URGENT]: "text-red-800",
} as const;

const getVideoEmbedUrl = (url: string): string | null => {
  // YouTube URL patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo URL patterns
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // For direct video links, return as is
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }

  return null;
};

const VideoEmbed = ({ url }: { url: string }) => {
  const embedUrl = getVideoEmbedUrl(url);

  if (!embedUrl) return null;

  // Check if it's a direct video file
  if (embedUrl.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <div className="my-4 rounded-lg overflow-hidden">
        <video 
          controls 
          className="w-full max-h-[400px]"
          data-testid="video-player-popup"
        >
          <source src={embedUrl} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // For YouTube and Vimeo embeds
  return (
    <div className="my-4 rounded-lg overflow-hidden">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          className="absolute top-0 left-0 w-full h-full"
          allowFullScreen
          data-testid="video-iframe-popup"
        />
      </div>
    </div>
  );
};

interface LoginAnnouncementPopupProps {
  isAuthenticated: boolean;
  onAllPopupsViewed?: () => void;
}

export const LoginAnnouncementPopup = ({ 
  isAuthenticated,
  onAllPopupsViewed 
}: LoginAnnouncementPopupProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch login popup announcements
  const { data: announcements, isLoading, refetch } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/login-popups"],
    enabled: isAuthenticated,
  });

  // Debug logging
  useEffect(() => {
    console.log('[LOGIN POPUP] Component mounted/updated:', { 
      isAuthenticated, 
      isLoading, 
      hasAnnouncements: !!announcements, 
      announcementCount: announcements?.length 
    });
  }, [isAuthenticated, isLoading, announcements]);

  // Trigger refetch when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[LOGIN POPUP] User authenticated, fetching announcements');
      refetch();
    }
  }, [isAuthenticated, refetch]);

  // Mark announcement as viewed mutation
  const markViewedMutation = useMutation({
    mutationFn: async (announcementId: number) => {
      await apiRequest("POST", `/api/announcements/${announcementId}/viewed`, {});
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Show popup when announcements are loaded and there are announcements to show
  useEffect(() => {
    if (announcements && announcements.length > 0 && currentIndex < announcements.length) {
      setIsOpen(true);
    } else if (announcements && currentIndex >= announcements.length) {
      setIsOpen(false);
      if (onAllPopupsViewed) {
        onAllPopupsViewed();
      }
    }
  }, [announcements, currentIndex, onAllPopupsViewed]);

  const handleClose = async () => {
    if (!announcements || announcements.length === 0) return;

    const currentAnnouncement = announcements[currentIndex];
    
    // Mark current announcement as viewed
    await markViewedMutation.mutateAsync(currentAnnouncement.id);

    // Move to next announcement or close
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
      if (onAllPopupsViewed) {
        onAllPopupsViewed();
      }
    }
  };

  if (isLoading || !announcements || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  if (!currentAnnouncement) return null;

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case AnnouncementPriority.URGENT:
        return <AlertCircle className="h-5 w-5" />;
      case AnnouncementPriority.HIGH:
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const priority = currentAnnouncement.priority as AnnouncementPriority;
  const priorityClasses: string = AnnouncementPriorityColors[priority] || AnnouncementPriorityColors[AnnouncementPriority.NORMAL];
  const priorityIconColor: string = AnnouncementPriorityIconColors[priority] || AnnouncementPriorityIconColors[AnnouncementPriority.NORMAL];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={priorityIconColor}>
              {getPriorityIcon(currentAnnouncement.priority)}
            </div>
            <DialogTitle className="flex-1">{currentAnnouncement.title}</DialogTitle>
            <Badge variant="outline" className={priorityClasses}>
              {currentAnnouncement.priority}
            </Badge>
          </div>
        </DialogHeader>
        <DialogDescription asChild>
          <div className="text-foreground py-4 max-h-[60vh] overflow-y-auto">
            <div className="whitespace-pre-wrap">{currentAnnouncement.content}</div>
            {currentAnnouncement.videoUrl && <VideoEmbed url={currentAnnouncement.videoUrl} />}
          </div>
        </DialogDescription>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {announcements.length}
          </div>
          <Button 
            onClick={handleClose}
            disabled={markViewedMutation.isPending}
            data-testid="button-close-announcement"
          >
            {currentIndex < announcements.length - 1 ? "Sonraki" : "Anladım"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
