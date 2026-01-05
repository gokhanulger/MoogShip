import { useQuery } from "@tanstack/react-query";
import { Announcement, AnnouncementPriority, AnnouncementPriorityColors } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertCircle, AlertOctagon, BellRing, Info } from "lucide-react";
import { getApiUrl, getAuthHeaders } from "@/lib/queryClient";

const getPriorityIcon = (priority: string | null) => {
  switch (priority) {
    case AnnouncementPriority.URGENT:
      return <AlertOctagon className="h-5 w-5" />;
    case AnnouncementPriority.HIGH:
      return <AlertCircle className="h-5 w-5" />;
    case AnnouncementPriority.NORMAL:
      return <BellRing className="h-5 w-5" />;
    case AnnouncementPriority.LOW:
    default:
      return <Info className="h-5 w-5" />;
  }
};

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
          data-testid="video-player"
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
          data-testid="video-iframe"
        />
      </div>
    </div>
  );
};

interface AnnouncementsDisplayProps {
  maxItems?: number;
  showTitle?: boolean;
  className?: string;
}

export const AnnouncementsDisplay = ({ 
  maxItems = 3, 
  showTitle = true,
  className
}: AnnouncementsDisplayProps) => {
  // Fetch active announcements
  const { data: announcements, isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/announcements"), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="py-2">Loading announcements...</div>;
  }

  if (error || !announcements) {
    return null; // Don't show errors on the display component
  }

  if (announcements.length === 0) {
    return null; // Don't show anything if there are no announcements
  }

  // Take only the specified number of announcements
  const displayAnnouncements = announcements.slice(0, maxItems);

  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && (
        <h3 className="text-xl font-semibold">Duyurular</h3>
      )}
      
      {displayAnnouncements.map((announcement) => (
        <Card 
          key={announcement.id} 
          className={cn(
            "border-l-4 hover:bg-accent/50 transition-colors", 
            announcement.priority === AnnouncementPriority.URGENT 
              ? "border-l-destructive" 
              : announcement.priority === AnnouncementPriority.HIGH 
                ? "border-l-amber-500" 
                : announcement.priority === AnnouncementPriority.NORMAL 
                  ? "border-l-blue-500" 
                  : "border-l-green-500"
          )}
        >
          <CardHeader className="py-3 pb-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-foreground",
                announcement.priority === AnnouncementPriority.URGENT 
                  ? "text-destructive" 
                  : announcement.priority === AnnouncementPriority.HIGH 
                    ? "text-amber-500" 
                    : announcement.priority === AnnouncementPriority.NORMAL 
                      ? "text-blue-500" 
                      : "text-green-500"
              )}>
                {getPriorityIcon(announcement.priority)}
              </span>
              <CardTitle className="text-lg">{announcement.title}</CardTitle>
            </div>
            {announcement.createdAt && (
              <CardDescription className="text-xs pt-1">
                Posted: {format(new Date(announcement.createdAt), "PPP")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="py-3">
            <div className="whitespace-pre-line">{announcement.content}</div>
            {announcement.videoUrl && <VideoEmbed url={announcement.videoUrl} />}
          </CardContent>
        </Card>
      ))}
      
      {announcements.length > maxItems && (
        <div className="text-sm text-muted-foreground text-center">
          + {announcements.length - maxItems} more announcements
        </div>
      )}
    </div>
  );
};