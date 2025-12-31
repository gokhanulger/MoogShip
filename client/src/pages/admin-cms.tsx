import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAdmin } from "@/hooks/use-admin";
import AdminLayout from "@/components/layouts/admin-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

import { Loader2, Plus, Pencil, Trash, Globe, FileText } from "lucide-react";

// Language options
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'uk', label: 'Ukrainian' }
];

// Page type options
const PAGE_TYPES = [
  { value: 'page', label: 'Standard Page' },
  { value: 'marketing', label: 'Marketing Page' },
  { value: 'company', label: 'Company Page' },
  { value: 'legal', label: 'Legal Page' },
  { value: 'services', label: 'Services Page' },
];

// Schema for creating/editing pages
const pageFormSchema = z.object({
  slug: z.string().min(2, "Slug must be at least 2 characters").max(100),
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  description: z.string().optional(),
  type: z.string().min(1, "Page type is required")
});

// Schema for translation content
const translationFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

type ContentPage = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type ContentTranslation = {
  pageId: number;
  languageCode: string;
  content: string;
  updatedAt: string;
  updatedById: number | null;
};

function AdminCmsPage() {
  // Hooks
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedPageType, setSelectedPageType] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [editMode, setEditMode] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [translationDialogOpen, setTranslationDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Check admin status - happens automatically in the useAdmin hook
  useEffect(() => {
    // Admin check happens in the useAdmin hook
  }, []);

  // Form setup for page creation/editing
  const pageForm = useForm<z.infer<typeof pageFormSchema>>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      slug: "",
      title: "",
      description: "",
      type: "page"
    }
  });

  // Form setup for translation editing
  const translationForm = useForm<z.infer<typeof translationFormSchema>>({
    resolver: zodResolver(translationFormSchema),
    defaultValues: {
      content: "{}",
    }
  });

  // Query to get all content pages
  const { 
    data: pages = [], 
    isLoading: pagesLoading, 
    error: pagesError 
  } = useQuery<ContentPage[]>({
    queryKey: ['/api/cms/pages'],
  });

  // Query to get pages by type
  const { 
    data: filteredPages = [], 
    isLoading: filteredPagesLoading 
  } = useQuery<ContentPage[]>({
    queryKey: ['/api/cms/pages/type', selectedPageType],
    enabled: selectedPageType !== "all",
  });

  // Get the current list of pages based on filter
  const currentPages = selectedPageType === "all" ? pages : filteredPages;

  // Query to get translations for a selected page
  const { 
    data: translations = [], 
    isLoading: translationsLoading,
    refetch: refetchTranslations
  } = useQuery<ContentTranslation[]>({
    queryKey: ['/api/cms/pages', selectedPageId, 'translations'],
    enabled: !!selectedPageId,
  });

  // Query to get a specific translation
  const { 
    data: selectedTranslation, 
    isLoading: translationLoading,
    refetch: refetchTranslation
  } = useQuery<ContentTranslation>({
    queryKey: ['/api/cms/pages', selectedPageId, 'translations', selectedLanguage],
    enabled: !!selectedPageId && !!selectedLanguage
  });
  
  // Handle translation data changes
  useEffect(() => {
    if (selectedTranslation) {
      try {
        // Format JSON for readability before setting it in the form
        const parsedContent = JSON.parse(selectedTranslation.content);
        const formattedContent = JSON.stringify(parsedContent, null, 2);
        translationForm.setValue('content', formattedContent);
      } catch (e) {
        // In case the JSON is invalid, just use the raw content
        translationForm.setValue('content', selectedTranslation.content);
      }
    } else if (selectedPageId && selectedLanguage && !translationLoading) {
      translationForm.setValue('content', '{}');
    }
  }, [selectedTranslation, translationLoading, translationForm, selectedPageId, selectedLanguage]);

  // Query to get a specific page for editing
  const {
    data: selectedPage,
    isLoading: selectedPageLoading,
  } = useQuery<ContentPage>({
    queryKey: ['/api/cms/pages/id', selectedPageId],
    enabled: !!selectedPageId && editMode
  });
  
  // Handle selected page data changes for editing
  useEffect(() => {
    if (selectedPage && editMode) {
      pageForm.reset({
        slug: selectedPage.slug,
        title: selectedPage.title,
        description: selectedPage.description || "",
        type: selectedPage.type
      });
    }
  }, [selectedPage, editMode, pageForm]);

  // Mutation to create a new page
  const createPageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pageFormSchema>) => {
      return apiRequest('POST', '/api/cms/pages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/pages'] });
      toast({
        title: "Success",
        description: "Page created successfully",
      });
      setCreateDialogOpen(false);
      pageForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create page",
        variant: "destructive",
      });
    }
  });

  // Mutation to update a page
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof pageFormSchema> }) => {
      return apiRequest('PATCH', `/api/cms/pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/pages'] });
      if (selectedPageType !== "all") {
        queryClient.invalidateQueries({ queryKey: ['/api/cms/pages/type', selectedPageType] });
      }
      toast({
        title: "Success",
        description: "Page updated successfully",
      });
      setCreateDialogOpen(false);
      setEditMode(false);
      pageForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update page",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a page
  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/cms/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/pages'] });
      if (selectedPageType !== "all") {
        queryClient.invalidateQueries({ queryKey: ['/api/cms/pages/type', selectedPageType] });
      }
      toast({
        title: "Success",
        description: "Page deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setSelectedPageId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete page",
        variant: "destructive",
      });
    }
  });

  // Mutation to update a translation
  const updateTranslationMutation = useMutation({
    mutationFn: async ({ 
      pageId, 
      languageCode, 
      content 
    }: { 
      pageId: number, 
      languageCode: string, 
      content: string 
    }) => {
      // Validate that the content is valid JSON
      try {
        JSON.parse(content);
      } catch (e) {
        throw new Error("Content must be valid JSON");
      }
      
      return apiRequest('POST', `/api/cms/pages/${pageId}/translations/${languageCode}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/pages', selectedPageId, 'translations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cms/pages', selectedPageId, 'translations', selectedLanguage] });
      toast({
        title: "Success",
        description: "Translation updated successfully",
      });
      setTranslationDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update translation",
        variant: "destructive",
      });
    }
  });

  // Handle page form submission
  const onPageSubmit = (values: z.infer<typeof pageFormSchema>) => {
    if (editMode && selectedPageId) {
      updatePageMutation.mutate({ id: selectedPageId, data: values });
    } else {
      createPageMutation.mutate(values);
    }
  };

  // Handle translation form submission
  const onTranslationSubmit = (values: z.infer<typeof translationFormSchema>) => {
    if (selectedPageId) {
      updateTranslationMutation.mutate({
        pageId: selectedPageId,
        languageCode: selectedLanguage,
        content: values.content
      });
    }
  };

  // Handle edit page button click
  const handleEditPage = (page: ContentPage) => {
    setSelectedPageId(page.id);
    setEditMode(true);
    setCreateDialogOpen(true);
  };

  // Handle delete page button click
  const handleDeletePage = (page: ContentPage) => {
    setSelectedPageId(page.id);
    setDeleteConfirmOpen(true);
  };

  // Reset form and state when dialog closes
  const handleDialogClose = () => {
    if (!createPageMutation.isPending && !updatePageMutation.isPending) {
      pageForm.reset();
      setEditMode(false);
    }
  };

  // Handle page selection for translations
  const handlePageSelect = (page: ContentPage) => {
    setSelectedPageId(page.id);
    refetchTranslations();
  };

  // Handle language selection for translation editing
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    refetchTranslation();
  };

  return (
    <AdminLayout title="Content Management System" subtitle="Manage website content across multiple languages">
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Title and subtitle are already in the AdminLayout */}
          </div>
          <Button 
            onClick={() => {
              setEditMode(false);
              setCreateDialogOpen(true);
              pageForm.reset({
                slug: "",
                title: "",
                description: "",
                type: "page"
              });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Page
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pages List Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle>Pages</CardTitle>
              <CardDescription>Select a page to manage its content</CardDescription>
              <div className="mt-2">
                <Select
                  value={selectedPageType}
                  onValueChange={(value) => setSelectedPageType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Page Types</SelectItem>
                    {PAGE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {pagesLoading || filteredPagesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : currentPages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pages found
                </div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                  {currentPages.map((page) => (
                    <div 
                      key={page.id}
                      className={`p-3 border rounded-md ${selectedPageId === page.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} 
                        cursor-pointer transition-all duration-150 ease-in-out`}
                      onClick={() => handlePageSelect(page)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{page.title}</h3>
                          <p className="text-sm text-gray-500">{page.slug}</p>
                          <div className="mt-1 flex items-center">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {PAGE_TYPES.find(t => t.value === page.type)?.label || page.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPage(page);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(page);
                            }}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Translations Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedPageId ? (
                  <>
                    Translations for{" "}
                    <span className="text-blue-600">
                      {currentPages.find(p => p.id === selectedPageId)?.title || "Selected Page"}
                    </span>
                  </>
                ) : (
                  "Page Translations"
                )}
              </CardTitle>
              <CardDescription>
                {selectedPageId 
                  ? "Select a language to edit its content" 
                  : "Select a page from the list to manage its translations"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedPageId ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Page Selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select a page from the list to view or edit its translations
                  </p>
                </div>
              ) : translationsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div>
                  <Tabs defaultValue={selectedLanguage} onValueChange={handleLanguageSelect}>
                    <TabsList className="mb-4 flex flex-wrap">
                      {LANGUAGES.map((lang) => (
                        <TabsTrigger key={lang.value} value={lang.value} className="flex items-center">
                          <Globe className="mr-2 h-4 w-4" />
                          {lang.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {LANGUAGES.map((lang) => (
                      <TabsContent key={lang.value} value={lang.value}>
                        <div className="bg-gray-50 p-4 rounded-md mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">
                              {lang.label} Translation
                            </h3>
                            <div className="flex items-center text-sm text-gray-500">
                              {translations.some(t => t.languageCode === lang.value) ? (
                                <span className="flex items-center text-green-600">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  Translation exists
                                </span>
                              ) : (
                                <span className="flex items-center text-yellow-600">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                  No translation
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => {
                              setSelectedLanguage(lang.value);
                              setTranslationDialogOpen(true);
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            {translations.some(t => t.languageCode === lang.value)
                              ? "Edit Translation"
                              : "Add Translation"
                            }
                          </Button>
                        </div>
                        
                        {translations.some(t => t.languageCode === lang.value) && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Preview Content Structure:</h4>
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
                              <pre className="text-xs">
                                {translations.find(t => t.languageCode === lang.value)?.content
                                  ? JSON.stringify(JSON.parse(translations.find(t => t.languageCode === lang.value)?.content || '{}'), null, 2)
                                  : '{}'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Page Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) handleDialogClose();
        }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Page" : "Create New Page"}</DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Update the page details. The slug is used in the URL path."
                  : "Enter the page details. The slug is used in the URL path."
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...pageForm}>
              <form onSubmit={pageForm.handleSubmit(onPageSubmit)} className="space-y-4">
                <FormField
                  control={pageForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Page Title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pageForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="page-slug" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used in the URL: /page/{field.value}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the page"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pageForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select page type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAGE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={createPageMutation.isPending || updatePageMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createPageMutation.isPending || updatePageMutation.isPending}
                  >
                    {(createPageMutation.isPending || updatePageMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editMode ? "Update Page" : "Create Page"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Translation Edit Dialog */}
        <Dialog open={translationDialogOpen} onOpenChange={setTranslationDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                Edit {LANGUAGES.find(l => l.value === selectedLanguage)?.label} Translation
              </DialogTitle>
              <DialogDescription>
                Enter the content in JSON format. This will be used to render the page content.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...translationForm}>
              <form onSubmit={translationForm.handleSubmit(onTranslationSubmit)} className="space-y-4">
                <FormField
                  control={translationForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (JSON format)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='{
  "title": "Page Title",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Section content..."
    }
  ]
}'
                          className="font-mono h-[400px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use valid JSON format. Structure depends on the page template.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTranslationDialogOpen(false)}
                    disabled={updateTranslationMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateTranslationMutation.isPending}
                  >
                    {updateTranslationMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Translation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this page? This action cannot be undone
                and will also delete all associated translations.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> Deleting a page that is referenced by the application may cause
                errors. Make sure this page is not used in any critical path.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletePageMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedPageId && deletePageMutation.mutate(selectedPageId)}
                disabled={deletePageMutation.isPending}
              >
                {deletePageMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default AdminCmsPage;