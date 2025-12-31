import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Check, Package, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

// Define the schema for package templates
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  length: z.coerce.number().min(1, "Length must be at least 1 cm"),
  width: z.coerce.number().min(1, "Width must be at least 1 cm"),
  height: z.coerce.number().min(1, "Height must be at least 1 cm"),
  // Weight is removed from user input but still stored in database with a default value
  weight: z.coerce.number().default(0.1), // Default minimal weight
  isDefault: z.boolean().default(false)
});

// Type for the template from the API
interface PackageTemplate {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  isDefault: boolean;
  userId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function PackageTemplates() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  // Debug translations
  useEffect(() => {
    console.log("Current language:", i18n.language);
    console.log("Package Templates title translation:", t("packageTemplates.pageTitle"));
    console.log("Translation exists:", i18n.exists("packageTemplates.pageTitle"));
  }, [i18n.language, t]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<PackageTemplate | null>(null);
  
  // Query to fetch all package templates
  const { data: templates, isLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/package-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/package-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });
  
  // Query to fetch the default template
  const { data: defaultTemplate } = useQuery({
    queryKey: ['/api/package-templates/default'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/package-templates/default');
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch default template');
      }
      return response.status === 200 ? response.json() : null;
    }
  });
  
  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateSchema>) => {
      const response = await apiRequest('POST', '/api/package-templates', data);
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates/default'] });
      refetchTemplates(); // Explicitly refetch templates after successful creation
      toast({
        title: t("common.success"),
        description: t("packageTemplates.alerts.createSuccess"),
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("packageTemplates.alerts.error.create"),
        variant: "destructive",
      });
    }
  });
  
  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof templateSchema> }) => {
      const response = await apiRequest('PUT', `/api/package-templates/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates/default'] });
      refetchTemplates(); // Explicitly refetch templates after successful update
      toast({
        title: t("common.success"),
        description: t("packageTemplates.alerts.updateSuccess"),
      });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("packageTemplates.alerts.error.update"),
        variant: "destructive",
      });
    }
  });
  
  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/package-templates/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates/default'] });
      refetchTemplates(); // Explicitly refetch templates after successful deletion
      toast({
        title: t("common.success"),
        description: t("packageTemplates.alerts.deleteSuccess"),
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("packageTemplates.alerts.error.delete"),
        variant: "destructive",
      });
    }
  });
  
  // Set default template mutation
  const setDefaultTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/package-templates/${id}/set-default`);
      if (!response.ok) {
        throw new Error('Failed to set default template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/package-templates/default'] });
      refetchTemplates(); // Explicitly refetch templates after setting default
      toast({
        title: t("common.success"),
        description: t("packageTemplates.alerts.defaultUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("packageTemplates.alerts.error.setDefault"),
        variant: "destructive",
      });
    }
  });
  
  // Form setup for creating a template
  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      weight: 0.5,
      length: 20,
      width: 15,
      height: 10,
      isDefault: false,
    },
  });
  
  // Form setup for editing a template
  const editForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      isDefault: false,
    },
  });
  
  // Handle template creation form submission
  function onSubmit(values: z.infer<typeof templateSchema>) {
    createTemplateMutation.mutate(values);
  }
  
  // Handle template update form submission
  function onEditSubmit(values: z.infer<typeof templateSchema>) {
    if (currentTemplate) {
      updateTemplateMutation.mutate({ id: currentTemplate.id, data: values });
    }
  }
  
  // Set the form values when editing a template
  function openEditDialog(template: PackageTemplate) {
    setCurrentTemplate(template);
    editForm.reset({
      name: template.name,
      description: template.description || "",
      weight: template.weight,
      length: template.length,
      width: template.width,
      height: template.height,
      isDefault: template.isDefault,
    });
    setIsEditDialogOpen(true);
  }
  
  // Open the delete confirmation dialog
  function openDeleteDialog(template: PackageTemplate) {
    setCurrentTemplate(template);
    setIsDeleteDialogOpen(true);
  }
  
  // Handle setting a template as default
  function setAsDefault(templateId: number) {
    setDefaultTemplateMutation.mutate(templateId);
  }
  
  // Calculate volume in cubic centimeters
  function calculateVolume(length: number, width: number, height: number) {
    return length * width * height;
  }
  
  // Calculate volumetric weight
  function calculateVolumetricWeight(length: number, width: number, height: number) {
    // Volumetric weight formula: (L × W × H in cm) ÷ 5000 = Volumetric weight in kg
    return (length * width * height) / 5000;
  }
  
  // Format dimensions as LxWxH
  function formatDimensions(length: number, width: number, height: number) {
    return `${length} × ${width} × ${height} cm`;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t("packageTemplates.pageTitle")}</h1>
            <p className="text-muted-foreground">
              {t("packageTemplates.pageDescription")}
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("packageTemplates.actions.newTemplate")}
          </Button>
        </div>
        
        <Separator className="my-6" />
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : templates && templates.length > 0 ? (
          <div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t("packageTemplates.table.name")}</TableHead>
                    <TableHead>{t("packageTemplates.table.dimensions")}</TableHead>
                    {/* Weight column removed per requirements */}
                    <TableHead>{t("packageTemplates.table.volume")}</TableHead>
                    <TableHead>{t("packageTemplates.table.volumetricWeight")}</TableHead>
                    <TableHead className="text-right w-[120px]">{t("packageTemplates.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: PackageTemplate) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {template.isDefault && (
                            <Star className="h-4 w-4 text-amber-500 mr-2" />
                          )}
                          <span>{template.name}</span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                      </TableCell>
                      <TableCell>{formatDimensions(template.length, template.width, template.height)}</TableCell>
                      {/* Weight column cell removed */}
                      <TableCell>{calculateVolume(template.length, template.width, template.height)} cm³</TableCell>
                      <TableCell>{calculateVolumetricWeight(template.length, template.width, template.height).toFixed(2)} kg</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => openEditDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => openDeleteDialog(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {!template.isDefault && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setAsDefault(template.id)}
                              title={t("packageTemplates.actions.setAsDefault")}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <Card className="w-full">
            <CardHeader className="text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground" />
              <CardTitle>{t("packageTemplates.empty.title")}</CardTitle>
              <CardDescription>
                {t("packageTemplates.empty.description")}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("packageTemplates.actions.createTemplate")}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Create Template Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{t("packageTemplates.dialogs.create.title")}</DialogTitle>
              <DialogDescription>
                {t("packageTemplates.dialogs.create.description")}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("packageTemplates.form.namePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.description")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("packageTemplates.form.descriptionPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packageTemplates.form.length")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packageTemplates.form.width")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.height")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Weight field is hidden but still included in the form submission with a default value */}
                
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("packageTemplates.form.isDefault")}</FormLabel>
                        <FormDescription>
                          {t("packageTemplates.form.isDefaultDescription")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></div>
                        {t("common.creating")}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("packageTemplates.actions.createTemplate")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{t("packageTemplates.dialogs.edit.title")}</DialogTitle>
              <DialogDescription>
                {t("packageTemplates.dialogs.edit.description")}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("packageTemplates.form.namePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.description")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("packageTemplates.form.descriptionPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packageTemplates.form.length")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packageTemplates.form.width")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packageTemplates.form.height")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Weight field is hidden but still included in the form submission with current value */}
                
                <FormField
                  control={editForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("packageTemplates.form.isDefault")}</FormLabel>
                        <FormDescription>
                          {t("packageTemplates.form.isDefaultDescription")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></div>
                        {t("common.updating")}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t("packageTemplates.actions.updateTemplate")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>{t("packageTemplates.dialogs.delete.title")}</DialogTitle>
              <DialogDescription>
                {t("packageTemplates.dialogs.delete.description")}
              </DialogDescription>
            </DialogHeader>
            
            {currentTemplate && (
              <div className="py-4">
                <div className="font-medium">{currentTemplate.name}</div>
                {currentTemplate.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentTemplate.description}
                  </div>
                )}
                <div className="mt-2 text-sm">
                  <div>{t("packageTemplates.dimensions")}: {formatDimensions(currentTemplate.length, currentTemplate.width, currentTemplate.height)}</div>
                  {/* Weight information removed from display */}
                </div>
                {currentTemplate.isDefault && (
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">{t("packageTemplates.defaultTemplateBadge")}</Badge>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => currentTemplate && deleteTemplateMutation.mutate(currentTemplate.id)}
                disabled={deleteTemplateMutation.isPending}
              >
                {deleteTemplateMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></div>
                    {t("common.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("packageTemplates.actions.deleteTemplate")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}