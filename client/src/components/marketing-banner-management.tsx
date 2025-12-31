import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Edit, Trash, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MarketingBanner } from '@shared/schema';

// Form validation schema for banner creation and editing
const bannerFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().min(1, 'Image URL is required'),
  buttonText: z.string().optional().nullable(),
  buttonUrl: z.string().optional().nullable().refine(
    (val) => !val || val.startsWith('http') || val.startsWith('/'), 
    { message: 'URL must be absolute or start with /' }
  ),
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#000000'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable()
});

type BannerFormValues = z.infer<typeof bannerFormSchema>;

export function MarketingBannerManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<MarketingBanner | null>(null);

  // Fetch all marketing banners
  const { data: banners = [], isLoading, error } = useQuery({
    queryKey: ['/api/marketing-banners/all'],
    queryFn: async () => {
      const response = await fetch('/api/marketing-banners/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch marketing banners');
      }
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: BannerFormValues) => {
      // Convert dates to ISO strings for backend consumption
      const payload = {
        ...data,
        // Ensure dates are properly formatted as ISO strings
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null
      };
      
      console.log('Submitting banner data:', payload);
      
      const response = await fetch('/api/marketing-banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include' // Add this to include cookies (session)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create banner error:', errorData);
        throw new Error(errorData.message || 'Failed to create banner');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Banner created',
        description: 'The marketing banner has been created successfully.',
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-banners/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create banner',
        variant: 'destructive',
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BannerFormValues }) => {
      // Convert dates to ISO strings for backend consumption
      const payload = {
        ...data,
        // Ensure dates are properly formatted as ISO strings
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null
      };
      
      console.log('Updating banner data:', payload);
      
      const response = await fetch(`/api/marketing-banners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include' // Add this to include cookies (session)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update banner error:', errorData);
        throw new Error(errorData.message || 'Failed to update banner');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Banner updated',
        description: 'The marketing banner has been updated successfully.',
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-banners/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update banner',
        variant: 'destructive',
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/marketing-banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Add this to include cookies (session)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete banner error:', errorData);
        throw new Error(errorData.message || 'Failed to delete banner');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Banner deleted',
        description: 'The marketing banner has been deleted successfully.',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-banners/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive',
      });
    }
  });

  // Create form
  const createForm = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      imageUrl: '',
      buttonText: '',
      buttonUrl: '',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      sortOrder: 0,
      isActive: true,
      startDate: null,
      endDate: null
    }
  });

  // Edit form
  const editForm = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      imageUrl: '',
      buttonText: '',
      buttonUrl: '',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      sortOrder: 0,
      isActive: true,
      startDate: null,
      endDate: null
    }
  });

  const handleCreateSubmit = (data: BannerFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: BannerFormValues) => {
    if (selectedBanner) {
      updateMutation.mutate({ id: selectedBanner.id, data });
    }
  };

  const handleDeleteBanner = () => {
    if (selectedBanner) {
      deleteMutation.mutate(selectedBanner.id);
    }
  };

  const handleEditClick = (banner: MarketingBanner) => {
    setSelectedBanner(banner);
    editForm.reset({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      buttonText: banner.buttonText || '',
      buttonUrl: banner.buttonUrl || '',
      backgroundColor: banner.backgroundColor || '#ffffff',
      textColor: banner.textColor || '#000000',
      sortOrder: banner.sortOrder || 0,
      isActive: banner.isActive,
      startDate: banner.startDate ? new Date(banner.startDate) : null,
      endDate: banner.endDate ? new Date(banner.endDate) : null
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (banner: MarketingBanner) => {
    setSelectedBanner(banner);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.marketingBanners.title', 'Marketing Banners')}</CardTitle>
          <CardDescription>{t('admin.marketingBanners.description', 'Manage the banner slider on the marketing page')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p>{t('common.loading', 'Loading...')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.marketingBanners.title', 'Marketing Banners')}</CardTitle>
          <CardDescription>{t('admin.marketingBanners.description', 'Manage the banner slider on the marketing page')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.marketingBanners.title', 'Marketing Banners')}</CardTitle>
        <CardDescription>{t('admin.marketingBanners.description', 'Manage the banner slider on the marketing page')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button
            onClick={() => {
              createForm.reset();
              setIsCreateDialogOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('admin.marketingBanners.createButton', 'Create Banner')}
          </Button>
        </div>

        {banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 border border-dashed rounded-md">
            <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-500">{t('admin.marketingBanners.empty', 'No marketing banners found. Click the Create Banner button to add one.')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{banner.title}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span>Order: {banner.sortOrder}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(banner)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteClick(banner)}>
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('admin.marketingBanners.createTitle', 'Create Marketing Banner')}</DialogTitle>
            <DialogDescription>
              {t('admin.marketingBanners.createDescription', 'Add a new banner to the slider on the marketing page')}
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>URL to the banner image</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormDescription>Lower numbers appear first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="buttonUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                        <Input 
                          {...field} 
                          placeholder="#ffffff" 
                          className="flex-grow"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                        <Input 
                          {...field} 
                          placeholder="#000000" 
                          className="flex-grow"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When this banner starts showing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When this banner stops showing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active
                      </FormLabel>
                      <FormDescription>
                        Display this banner on the marketing page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Banner'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('admin.marketingBanners.editTitle', 'Edit Marketing Banner')}</DialogTitle>
            <DialogDescription>
              {t('admin.marketingBanners.editDescription', 'Modify existing banner details')}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>URL to the banner image</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormDescription>Lower numbers appear first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="buttonUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                        <Input 
                          {...field} 
                          placeholder="#ffffff" 
                          className="flex-grow"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                        <Input 
                          {...field} 
                          placeholder="#000000" 
                          className="flex-grow"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When this banner starts showing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When this banner stops showing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active
                      </FormLabel>
                      <FormDescription>
                        Display this banner on the marketing page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.marketingBanners.deleteTitle', 'Delete Marketing Banner')}</DialogTitle>
            <DialogDescription>
              {t('admin.marketingBanners.deleteDescription', 'Are you sure you want to delete this banner? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteBanner}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}