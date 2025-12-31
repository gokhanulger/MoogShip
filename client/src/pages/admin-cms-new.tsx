import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SimpleAdminLayout from "@/components/layouts/simple-admin-layout";
import { MarketingBannerManagement } from "@/components/marketing-banner-management";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Globe, Code, FileText, Images } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const pageSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
});

const translationSchema = z.object({
  content: z.string().min(1, "Content is required"),
  languageCode: z.string().min(2, "Language is required"),
});

export default function AdminCmsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<string>("pages");
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false);
  const [isEditPageDialogOpen, setIsEditPageDialogOpen] = useState(false);
  const [isDeletePageDialogOpen, setIsDeletePageDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const queryClient = useQueryClient();

  // Available languages
  const languages = [
    { code: "en", name: "English" },
    { code: "tr", name: "Turkish" },
    { code: "ru", name: "Russian" },
    { code: "de", name: "German" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
    { code: "ar", name: "Arabic" },
    { code: "uk", name: "Ukrainian" },
  ];

  // Page types
  const pageTypes = [
    { value: "page", label: "Regular Page" },
    { value: "marketing", label: "Marketing Page" },
    { value: "legal", label: "Legal Document" },
    { value: "company", label: "Company Info" },
    { value: "service", label: "Service Page" },
  ];

  // Fetch all content pages
  const {
    data: pages,
    isLoading: isPagesLoading,
    isError: isPagesError,
  } = useQuery({
    queryKey: ["/api/cms/pages"],
    queryFn: async () => {
      const response = await fetch("/api/cms/pages");
      if (!response.ok) {
        throw new Error(t("cms.failedToFetchPages"));
      }
      return response.json();
    },
  });

  // Fetch translations for selected page
  const {
    data: translations,
    isLoading: isTranslationsLoading,
    isError: isTranslationsError,
  } = useQuery({
    queryKey: ["/api/cms/pages", selectedPage?.id, "translations"],
    queryFn: async () => {
      if (!selectedPage) return [];
      const response = await fetch(`/api/cms/pages/${selectedPage.id}/translations`);
      if (!response.ok) {
        throw new Error(t("cms.failedToFetchTranslations"));
      }
      return response.json();
    },
    enabled: !!selectedPage,
  });

  // Create new page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pageSchema>) => {
      const response = await apiRequest("POST", "/api/cms/pages", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create page");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      setIsNewPageDialogOpen(false);
      toast({
        title: t("cms.success"),
        description: t("cms.pageCreated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("cms.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update page mutation
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof pageSchema> }) => {
      const response = await apiRequest("PATCH", `/api/cms/pages/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update page");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      setSelectedPage(data);
      setIsEditPageDialogOpen(false);
      toast({
        title: t("cms.success"),
        description: t("cms.pageUpdated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("cms.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/cms/pages/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete page");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      setSelectedPage(null);
      setIsDeletePageDialogOpen(false);
      toast({
        title: t("cms.success"),
        description: t("cms.pageDeleted"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("cms.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create or update translation mutation
  const saveTranslationMutation = useMutation({
    mutationFn: async ({ pageId, languageCode, content }: { pageId: number; languageCode: string; content: string }) => {
      const response = await apiRequest("POST", `/api/cms/pages/${pageId}/translations/${languageCode}`, { content });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("cms.failedToSaveTranslation"));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages", selectedPage?.id, "translations"] });
      setIsTranslationDialogOpen(false);
      toast({
        title: t("cms.success"),
        description: t("cms.translationSaved"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("cms.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // New page form
  const newPageForm = useForm<z.infer<typeof pageSchema>>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      slug: "",
      title: "",
      description: "",
      type: "page",
    },
  });

  // Edit page form
  const editPageForm = useForm<z.infer<typeof pageSchema>>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      slug: selectedPage?.slug || "",
      title: selectedPage?.title || "",
      description: selectedPage?.description || "",
      type: selectedPage?.type || "page",
    },
  });

  // Translation form
  const translationForm = useForm<z.infer<typeof translationSchema>>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      content: "",
      languageCode: selectedLanguage,
    },
  });

  // Update edit form when selected page changes
  useEffect(() => {
    if (selectedPage) {
      editPageForm.reset({
        slug: selectedPage.slug,
        title: selectedPage.title,
        description: selectedPage.description || "",
        type: selectedPage.type,
      });
    }
  }, [selectedPage, editPageForm]);

  // Update translation form when selected language changes
  useEffect(() => {
    if (translations && selectedLanguage) {
      const translation = translations.find((t: any) => t.languageCode === selectedLanguage);
      translationForm.reset({
        content: translation?.content || "",
        languageCode: selectedLanguage,
      });
    }
  }, [translations, selectedLanguage, translationForm]);

  // Handle form submissions
  const onCreatePageSubmit = (data: z.infer<typeof pageSchema>) => {
    createPageMutation.mutate(data);
  };

  const onEditPageSubmit = (data: z.infer<typeof pageSchema>) => {
    if (selectedPage) {
      updatePageMutation.mutate({ id: selectedPage.id, data });
    }
  };

  const onDeletePage = () => {
    if (selectedPage) {
      deletePageMutation.mutate(selectedPage.id);
    }
  };

  const onSaveTranslation = (data: z.infer<typeof translationSchema>) => {
    if (selectedPage) {
      saveTranslationMutation.mutate({
        pageId: selectedPage.id,
        languageCode: data.languageCode,
        content: data.content,
      });
    }
  };

  // Helper function to get translation status for a page
  const getTranslationStatus = (pageId: number) => {
    if (!translations) return 0;
    return translations.length;
  };

  // Reset forms when dialogs close
  const handleNewPageDialogClose = () => {
    setIsNewPageDialogOpen(false);
    newPageForm.reset();
  };

  const handleEditPageDialogClose = () => {
    setIsEditPageDialogOpen(false);
  };

  const handleDeletePageDialogClose = () => {
    setIsDeletePageDialogOpen(false);
  };

  const handleTranslationDialogClose = () => {
    setIsTranslationDialogOpen(false);
  };

  // Render loading state
  if (isPagesLoading) {
    return (
      <SimpleAdminLayout>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">{t("cms.title")}</h1>
          <p>{t("Loading content pages...")}</p>
        </div>
      </SimpleAdminLayout>
    );
  }

  // Render error state
  if (isPagesError) {
    return (
      <SimpleAdminLayout>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">{t("cms.title")}</h1>
          <p className="text-red-500">{t("Error loading content pages")}</p>
        </div>
      </SimpleAdminLayout>
    );
  }

  return (
    <SimpleAdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t("cms.title")}</h1>
          <Button onClick={() => setIsNewPageDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("New Page")}
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pages">
              <FileText className="mr-2 h-4 w-4" /> {t("Pages")}
            </TabsTrigger>
            <TabsTrigger value="translations" disabled={!selectedPage}>
              <Globe className="mr-2 h-4 w-4" /> {t("Translations")}
            </TabsTrigger>
            <TabsTrigger value="marketing-banners">
              <Images className="mr-2 h-4 w-4" /> {t("Marketing Banners")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {pages && pages.map((page: any) => (
                <Card 
                  key={page.id} 
                  className={`cursor-pointer ${selectedPage?.id === page.id ? 'border-primary' : ''}`}
                  onClick={() => setSelectedPage(page)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{page.title}</CardTitle>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPage(page);
                            setIsEditPageDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPage(page);
                            setIsDeletePageDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-sm flex items-center">
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs mr-2">
                        {pageTypes.find(type => type.value === page.type)?.label || page.type}
                      </span>
                      <span>/{page.slug}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">{page.description || t("No description")}</p>
                  </CardContent>
                  <CardFooter className="pt-1 border-t text-xs text-gray-500">
                    <div className="flex justify-between w-full">
                      <span>
                        {t("Created")}: {new Date(page.createdAt).toLocaleDateString()}
                      </span>
                      <span>
                        {t("Translations")}: {getTranslationStatus(page.id)}/{languages.length}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
              {pages && pages.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <p className="mb-4">{t("No content pages found")}</p>
                    <Button onClick={() => setIsNewPageDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> {t("Create your first page")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="translations">
            {selectedPage && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>{selectedPage.title}</CardTitle>
                    <CardDescription>/{selectedPage.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedPage.description || t("No description")}</p>
                  </CardContent>
                </Card>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {languages.map((language) => {
                    const translation = translations?.find((t: any) => t.languageCode === language.code);
                    return (
                      <Card key={language.code}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full mr-2 text-sm">
                              {language.code.toUpperCase()}
                            </span>
                            {language.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="text-sm">
                            {translation 
                              ? t("Last updated: {{date}}", { date: new Date(translation.updatedAt).toLocaleDateString() })
                              : t("No translation yet")}
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            variant={translation ? "outline" : "default"}
                            onClick={() => {
                              setSelectedLanguage(language.code);
                              setIsTranslationDialogOpen(true);
                            }}
                            className="w-full"
                          >
                            {translation ? t("Edit Translation") : t("Add Translation")}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="marketing-banners">
            <div className="grid gap-6 grid-cols-1">
              <div className="w-full">
                <MarketingBannerManagement />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Page Dialog */}
        <Dialog open={isNewPageDialogOpen} onOpenChange={handleNewPageDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("Create New Page")}</DialogTitle>
              <DialogDescription>
                {t("Add a new content page to manage site content.")}
              </DialogDescription>
            </DialogHeader>
            <Form {...newPageForm}>
              <form onSubmit={newPageForm.handleSubmit(onCreatePageSubmit)} className="space-y-4">
                <FormField
                  control={newPageForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Title")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("Page Title")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPageForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Slug")}</FormLabel>
                      <FormControl>
                        <Input placeholder="page-slug" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("This will be used in the URL: /page-slug")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Description")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("Page description (optional)")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPageForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Page Type")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Select page type")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pageTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createPageMutation.isPending}>
                    {createPageMutation.isPending ? t("Creating...") : t("Create Page")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Page Dialog */}
        <Dialog open={isEditPageDialogOpen} onOpenChange={handleEditPageDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("Edit Page")}</DialogTitle>
              <DialogDescription>
                {t("Update page properties.")}
              </DialogDescription>
            </DialogHeader>
            <Form {...editPageForm}>
              <form onSubmit={editPageForm.handleSubmit(onEditPageSubmit)} className="space-y-4">
                <FormField
                  control={editPageForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Title")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("Page Title")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPageForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Slug")}</FormLabel>
                      <FormControl>
                        <Input placeholder="page-slug" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("This will be used in the URL: /page-slug")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Description")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("Page description (optional)")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPageForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Page Type")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Select page type")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pageTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updatePageMutation.isPending}>
                    {updatePageMutation.isPending ? t("Updating...") : t("Update Page")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Page Dialog */}
        <Dialog open={isDeletePageDialogOpen} onOpenChange={setIsDeletePageDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("Delete Page")}</DialogTitle>
              <DialogDescription>
                {t("Are you sure you want to delete this page? This action cannot be undone.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">{t("Page")}: <strong>{selectedPage?.title}</strong></p>
              <p className="text-sm">{t("Slug")}: /{selectedPage?.slug}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleDeletePageDialogClose}>
                {t("Cancel")}
              </Button>
              <Button 
                variant="destructive" 
                onClick={onDeletePage}
                disabled={deletePageMutation.isPending}
              >
                {deletePageMutation.isPending ? t("Deleting...") : t("Delete Page")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Translation Dialog */}
        <Dialog open={isTranslationDialogOpen} onOpenChange={handleTranslationDialogClose}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {t("Translate to {{language}}", { language: languages.find(l => l.code === selectedLanguage)?.name })}
              </DialogTitle>
              <DialogDescription>
                {selectedPage && (
                  <span>{t("Page")}: {selectedPage.title} (/{selectedPage.slug})</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <Form {...translationForm}>
              <form onSubmit={translationForm.handleSubmit(onSaveTranslation)} className="space-y-4">
                <FormField
                  control={translationForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Content")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t("Enter content in {{language}}", { language: languages.find(l => l.code === selectedLanguage)?.name })} 
                          {...field} 
                          className="min-h-[300px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <input type="hidden" {...translationForm.register("languageCode")} />
                <DialogFooter>
                  <Button type="submit" disabled={saveTranslationMutation.isPending}>
                    {saveTranslationMutation.isPending ? t("Saving...") : t("Save Translation")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </SimpleAdminLayout>
  );
}