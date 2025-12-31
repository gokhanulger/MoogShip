import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Announcement, AnnouncementPriority, AnnouncementPriorityColors } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
          data-testid="video-player-admin"
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
          data-testid="video-iframe-admin"
        />
      </div>
    </div>
  );
};

// Create a form schema for announcements
const announcementFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  priority: z.string().default(AnnouncementPriority.NORMAL),
  isActive: z.boolean().default(true),
  showOnLogin: z.boolean().default(false),
  expiresAt: z.date().nullable().optional()
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

interface AnnouncementFormProps {
  announcement?: Announcement;
  onSuccess: () => void;
  onCancel: () => void;
}

const AnnouncementForm = ({ announcement, onSuccess, onCancel }: AnnouncementFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!announcement;

  // Initialize form with existing announcement data or defaults
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: announcement?.title || "",
      content: announcement?.content || "",
      videoUrl: announcement?.videoUrl || "",
      priority: announcement?.priority || AnnouncementPriority.NORMAL,
      isActive: announcement?.isActive ?? true,
      showOnLogin: announcement?.showOnLogin ?? false,
      expiresAt: announcement?.expiresAt ? new Date(announcement.expiresAt) : null
    }
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<AnnouncementFormValues, 'expiresAt'> & { expiresAt: string | null }) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement created",
        description: "The announcement has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create announcement",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Omit<AnnouncementFormValues, 'expiresAt'> & { expiresAt: string | null }) => {
      const response = await apiRequest("PUT", `/api/announcements/${announcement?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement updated",
        description: "The announcement has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update announcement",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: AnnouncementFormValues) => {
    // Make sure expiresAt is properly formatted as ISO string if it exists
    const formattedData = {
      ...data,
      // If expiresAt is not null, convert to ISO string
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null
    };
    
    if (isEditing) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Announcement title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Announcement content" 
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." 
                  {...field} 
                  data-testid="input-video-url"
                />
              </FormControl>
              <FormDescription>
                Add a YouTube, Vimeo, or direct video link to display with the announcement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={AnnouncementPriority.LOW}>Low</SelectItem>
                  <SelectItem value={AnnouncementPriority.NORMAL}>Normal</SelectItem>
                  <SelectItem value={AnnouncementPriority.HIGH}>High</SelectItem>
                  <SelectItem value={AnnouncementPriority.URGENT}>Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Make this announcement visible to users
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showOnLogin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Show as Login Popup</FormLabel>
                <FormDescription>
                  Display this announcement as a popup when users log in
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiration Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>No expiration date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={(date) => field.onChange(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => field.onChange(null)}
                    >
                      Clear date
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                When this announcement should expire and no longer be shown
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? "Update" : "Create"} Announcement
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export const AnnouncementManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Fetch all announcements
  const { data: announcements, isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/all"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/all");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json();
    }
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/announcements/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Announcement deleted",
        description: "The announcement has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete announcement",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (announcement: Announcement) => {
    if (confirm(`Are you sure you want to delete "${announcement.title}"?`)) {
      deleteMutation.mutate(announcement.id);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
  };

  const closeEditDialog = () => {
    setEditingAnnouncement(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading announcements...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-red-500">Error loading announcements</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-announcement">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Create announcement dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement to be displayed to users on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm 
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit announcement dialog */}
      {editingAnnouncement && (
        <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>
                Edit the announcement details.
              </DialogDescription>
            </DialogHeader>
            <AnnouncementForm 
              announcement={editingAnnouncement}
              onSuccess={closeEditDialog}
              onCancel={closeEditDialog}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* List of announcements */}
      <div className="grid gap-4">
        {announcements && announcements.length > 0 ? (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="overflow-hidden">
              <div className={`h-1 ${AnnouncementPriorityColors[(announcement.priority || AnnouncementPriority.NORMAL) as keyof typeof AnnouncementPriorityColors]}`} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="mb-1">{announcement.title}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={announcement.isActive ? "default" : "outline"}>
                        {announcement.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={AnnouncementPriorityColors[(announcement.priority || AnnouncementPriority.NORMAL) as keyof typeof AnnouncementPriorityColors]}
                      >
                        {announcement.priority || AnnouncementPriority.NORMAL}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleEdit(announcement)}
                      data-testid={`button-edit-announcement-${announcement.id}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDelete(announcement)}
                      data-testid={`button-delete-announcement-${announcement.id}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs pt-1">
                  {announcement.createdAt && `Created: ${format(new Date(announcement.createdAt), "PPP")}`}
                  {announcement.expiresAt && ` • Expires: ${format(new Date(announcement.expiresAt), "PPP")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{announcement.content}</p>
                {announcement.videoUrl && <VideoEmbed url={announcement.videoUrl} />}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No announcements found. Create one to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};