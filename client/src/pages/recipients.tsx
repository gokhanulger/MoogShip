import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil, Check, Trash2, Star, Smartphone, Mail, MapPin, Upload, LayoutGrid, List, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useFedExErrorTranslation } from "@/utils/fedexErrorMapping";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";

// Recipient form validation schema
const getRecipientFormSchema = (t: any) => z.object({
  name: z.string().min(2, { message: t("validation.recipientName") }),
  address: z.string().min(5, { message: t("validation.address") }),
  suite: z.string().optional(),
  city: z.string().min(2, { message: t("validation.city") }),
  state: z.string().optional(),
  postalCode: z.string().min(1, { message: t("validation.postalCode") }),
  country: z.string().min(2, { message: t("validation.country") }),
  phone: z.string().optional(),
  email: z.string().email({ message: t("validation.email") }).optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
});

// Define RecipientFormValues type using a sample schema
const sampleSchema = z.object({
  name: z.string(),
  address: z.string(),
  suite: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
});

type RecipientFormValues = z.infer<typeof sampleSchema>;

// FedEx validation response interfaces
interface FedExAddressValidationResponse {
  isValid: boolean;
  classification?: 'RESIDENTIAL' | 'BUSINESS' | 'UNKNOWN';
  deliverability?: 'DELIVERABLE' | 'UNDELIVERABLE' | 'UNKNOWN';
  originalAddress: {
    streetLines: string[];
    city: string;
    stateOrProvinceCode?: string;
    postalCode?: string;
    countryCode: string;
  };
  standardizedAddress?: {
    streetLines: string[];
    city: string;
    stateOrProvinceCode?: string;
    postalCode?: string;
    countryCode: string;
  };
  suggestions?: any[];
  errors?: string[];
  warnings?: string[];
}

interface FedExPostalCodeValidationResponse {
  isValid: boolean;
  postalCode: string;
  countryCode: string;
  city?: string;
  stateOrProvinceCode?: string;
  errors?: string[];
}

export default function RecipientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { translateFedExError, getValidationStatusText } = useFedExErrorTranslation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRecipient, setCurrentRecipient] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // FedEx validation states
  const [addressValidationResult, setAddressValidationResult] = useState<FedExAddressValidationResponse | null>(null);
  const [postalCodeValidationResult, setPostalCodeValidationResult] = useState<FedExPostalCodeValidationResponse | null>(null);
  const [editAddressValidationResult, setEditAddressValidationResult] = useState<FedExAddressValidationResponse | null>(null);
  const [editPostalCodeValidationResult, setEditPostalCodeValidationResult] = useState<FedExPostalCodeValidationResponse | null>(null);

  // Fetch recipients
  const { data: recipients, isLoading } = useQuery({
    queryKey: ['/api/recipients'],
    queryFn: async () => {
      const response = await fetch('/api/recipients', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recipients');
      }
      return response.json();
    }
  });

  // Create recipient mutation
  const createRecipientMutation = useMutation({
    mutationFn: async (data: RecipientFormValues) => {
      return await apiRequest('POST', '/api/recipients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipients'] });
      toast({
        title: t("common.success"),
        description: t("recipientsData.alerts.createSuccess"),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("recipientsData.alerts.error.create"),
        variant: "destructive",
      });
    }
  });

  // Update recipient mutation
  const updateRecipientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RecipientFormValues }) => {
      return await apiRequest('PUT', `/api/recipients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipients'] });
      toast({
        title: t("common.success"),
        description: t("recipientsData.alerts.updateSuccess"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("recipientsData.alerts.error.update"),
        variant: "destructive",
      });
    }
  });

  // Delete recipient mutation
  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipients'] });
      toast({
        title: t("common.success"),
        description: t("recipientsData.alerts.deleteSuccess"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("recipientsData.alerts.error.delete"),
        variant: "destructive",
      });
    }
  });

  // Set default recipient mutation
  const setDefaultRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/recipients/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipients'] });
      toast({
        title: t("common.success"),
        description: t("recipientsData.alerts.defaultUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("recipientsData.alerts.error.setDefault"),
        variant: "destructive",
      });
    }
  });

  // FedEx address validation mutation
  const validateAddressMutation = useMutation<FedExAddressValidationResponse, Error, {
    streetLines: string[];
    city: string;
    stateOrProvinceCode?: string;
    postalCode?: string;
    countryCode: string;
  }>({
    mutationFn: async (addressData) => {
      const response = await apiRequest('POST', '/api/fedex/validate-address', addressData);
      const data = await response.json();
      return data as FedExAddressValidationResponse;
    },
    onSuccess: (data, variables) => {
      // Determine which form this validation is for based on context
      const isEditContext = isEditDialogOpen;
      const currentForm = isEditContext ? editForm : addForm;
      
      if (isEditContext) {
        setEditAddressValidationResult(data);
      } else {
        setAddressValidationResult(data);
      }
      
      if (data.isValid) {
        // Clear any form errors for address field when validation succeeds
        currentForm.clearErrors('address');
        
        if (data.standardizedAddress) {
          // Auto-populate form with standardized address
          const standardized = data.standardizedAddress;
          currentForm.setValue('address', standardized.streetLines.join(', '));
          currentForm.setValue('city', standardized.city);
          if (standardized.stateOrProvinceCode) {
            currentForm.setValue('state', standardized.stateOrProvinceCode);
          }
          if (standardized.postalCode) {
            // For USA addresses, only use 5-digit postal codes (strip -#### extension)
            let formattedPostalCode = standardized.postalCode;
            if (standardized.countryCode === 'US' && formattedPostalCode.includes('-')) {
              formattedPostalCode = formattedPostalCode.split('-')[0];
            }
            // Use setValue with trigger: false to prevent triggering postal code validation loop
            currentForm.setValue('postalCode', formattedPostalCode, { shouldValidate: false });
          }
        }
        
        toast({
          title: t("recipientsData.validation.addressValidated"),
          description: data.deliverability === 'DELIVERABLE' ? 
            t("recipientsData.validation.addressDeliverable") : 
            t("recipientsData.validation.addressValid"),
        });
      } else {
        // Set form error when validation fails
        currentForm.setError('address', {
          type: 'manual',
          message: translateFedExError(data.errors?.[0] || '') || t("recipientsData.validation.addressInvalid")
        });
        
        toast({
          title: t("recipientsData.validation.addressValidation"),
          description: translateFedExError(data.errors?.[0] || '') || t("recipientsData.validation.addressInvalid"),
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("recipientsData.validation.validationError"),
        description: translateFedExError(error.message) || t("recipientsData.validation.addressValidationFailed"),
        variant: "destructive",
      });
    }
  });

  // FedEx postal code validation mutation
  const validatePostalCodeMutation = useMutation<FedExPostalCodeValidationResponse, Error, {
    postalCode: string;
    countryCode: string;
    stateOrProvinceCode?: string;
    carrierCode?: 'FDXE' | 'FDXG';
  }>({
    mutationFn: async (postalData) => {
      const response = await apiRequest('POST', '/api/fedex/validate-postal-code', postalData);
      const data = await response.json();
      return data as FedExPostalCodeValidationResponse;
    },
    onSuccess: (data) => {
      // Determine which form this validation is for based on context
      const isEditContext = isEditDialogOpen;
      const currentForm = isEditContext ? editForm : addForm;
      
      if (isEditContext) {
        setEditPostalCodeValidationResult(data);
      } else {
        setPostalCodeValidationResult(data);
      }
      
      if (data.isValid) {
        // Auto-populate city and state if provided by validation
        if (data.city) {
          currentForm.setValue('city', data.city);
        }
        if (data.stateOrProvinceCode) {
          currentForm.setValue('state', data.stateOrProvinceCode);
        }
        
        toast({
          title: t("recipientsData.validation.postalCodeValidated"),
          description: data.city ? 
            t("recipientsData.validation.postalCodeValidForCity", { city: data.city, state: data.stateOrProvinceCode || '' }) :
            t("recipientsData.validation.postalCodeValid"),
        });
      } else {
        toast({
          title: t("recipientsData.validation.postalCodeValidation"),
          description: translateFedExError(data.errors?.[0] || '') || t("recipientsData.validation.postalCodeInvalid"),
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("recipientsData.validation.validationError"),
        description: translateFedExError(error.message) || t("recipientsData.validation.postalCodeValidationFailed"),
        variant: "destructive",
      });
    }
  });

  // Helper functions for FedEx validation
  const validateCurrentAddress = (formData: any, isEditForm = false) => {
    const { address, city, state, postalCode, country } = formData;
    
    if (address && city && country) {
      const streetLines = [address].filter(line => line.trim().length > 0);
      
      validateAddressMutation.mutate({
        streetLines,
        city: city.trim(),
        stateOrProvinceCode: state?.trim(),
        postalCode: postalCode?.trim(),
        countryCode: country.trim().toUpperCase()
      });
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in address, city, and country before validating",
        variant: "destructive",
      });
    }
  };

  const validateCurrentPostalCode = (formData: any, isEditForm = false) => {
    const { postalCode, country, state } = formData;
    
    if (postalCode && country) {
      validatePostalCodeMutation.mutate({
        postalCode: postalCode.trim(),
        countryCode: country.trim().toUpperCase(),
        stateOrProvinceCode: state?.trim().toUpperCase() || undefined, // Include state for US/CA
        carrierCode: 'FDXE'
      });
    }
  };

  // Helper function to get validation icon
  const getValidationIcon = (validationResult: any, isLoading: boolean) => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (!validationResult) {
      return null;
    }
    if (validationResult.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  // Clear validation results when dialogs close
  const handleAddDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setAddressValidationResult(null);
      setPostalCodeValidationResult(null);
      addForm.reset();
    }
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditAddressValidationResult(null);
      setEditPostalCodeValidationResult(null);
      setCurrentRecipient(null);
    }
  };

  // Create schema with translations
  const recipientSchema = getRecipientFormSchema(t);
  
  // Form for adding a new recipient
  const addForm = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    mode: "onSubmit", // Only validate on submit, not on every change
    defaultValues: {
      name: "",
      address: "",
      suite: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phone: "",
      email: "",
      isDefault: false,
    },
  });

  // Form for editing an existing recipient
  const editForm = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    mode: "onSubmit", // Only validate on submit, not on every change
    defaultValues: {
      name: "",
      address: "",
      suite: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phone: "",
      email: "",
      isDefault: false,
    },
  });

  // Watch form fields for automatic validation
  const watchedPostalCode = addForm.watch("postalCode");
  const watchedCountry = addForm.watch("country");
  const watchedState = addForm.watch("state");
  const watchedAddress = addForm.watch("address");
  const watchedCity = addForm.watch("city");
  
  const editWatchedPostalCode = editForm.watch("postalCode");
  const editWatchedCountry = editForm.watch("country");
  const editWatchedState = editForm.watch("state");
  const editWatchedAddress = editForm.watch("address");
  const editWatchedCity = editForm.watch("city");

  // Auto-validate postal code when country, state, and postal code are filled
  useEffect(() => {
    if (watchedPostalCode && watchedCountry && 
        watchedPostalCode.trim() && watchedCountry.trim()) {
      const timer = setTimeout(() => {
        validateCurrentPostalCode({
          postalCode: watchedPostalCode,
          country: watchedCountry,
          state: watchedState
        }, false);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timer);
    }
  }, [watchedPostalCode, watchedCountry, watchedState]);

  // Auto-validate for edit form
  useEffect(() => {
    if (editWatchedPostalCode && editWatchedCountry && 
        editWatchedPostalCode.trim() && editWatchedCountry.trim()) {
      const timer = setTimeout(() => {
        validateCurrentPostalCode({
          postalCode: editWatchedPostalCode,
          country: editWatchedCountry,
          state: editWatchedState
        }, true);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timer);
    }
  }, [editWatchedPostalCode, editWatchedCountry, editWatchedState]);

  // Auto-validate address when address, city, and country are filled (Add form)
  useEffect(() => {
    if (watchedAddress && watchedCity && watchedCountry && 
        watchedAddress.trim() && watchedCity.trim() && watchedCountry.trim()) {
      const timer = setTimeout(() => {
        validateCurrentAddress({
          address: watchedAddress,
          city: watchedCity,
          country: watchedCountry,
          state: watchedState,
          postalCode: watchedPostalCode
        }, false);
      }, 1500); // Debounce for 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [watchedAddress, watchedCity, watchedCountry, watchedState, watchedPostalCode]);

  // Auto-validate address when address, city, and country are filled (Edit form)
  useEffect(() => {
    if (editWatchedAddress && editWatchedCity && editWatchedCountry && 
        editWatchedAddress.trim() && editWatchedCity.trim() && editWatchedCountry.trim()) {
      const timer = setTimeout(() => {
        validateCurrentAddress({
          address: editWatchedAddress,
          city: editWatchedCity,
          country: editWatchedCountry,
          state: editWatchedState,
          postalCode: editWatchedPostalCode
        }, true);
      }, 1500); // Debounce for 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [editWatchedAddress, editWatchedCity, editWatchedCountry, editWatchedState, editWatchedPostalCode]);

  function onAddSubmit(data: RecipientFormValues) {
    createRecipientMutation.mutate(data);
  }

  function onEditSubmit(data: RecipientFormValues) {
    if (currentRecipient) {
      updateRecipientMutation.mutate({ id: currentRecipient.id, data });
    }
  }

  function handleEditRecipient(recipient: any) {
    setCurrentRecipient(recipient);
    editForm.reset({
      name: recipient.name,
      address: recipient.address,
      suite: recipient.suite || "",
      city: recipient.city,
      state: recipient.state || "",
      postalCode: recipient.postalCode,
      country: recipient.country,
      phone: recipient.phone || "",
      email: recipient.email || "",
      isDefault: recipient.isDefault,
    });
    setIsEditDialogOpen(true);
  }

  function handleDeleteRecipient(id: number) {
    if (window.confirm(t("recipientsData.dialogs.delete.description"))) {
      deleteRecipientMutation.mutate(id);
    }
  }

  function handleSetDefaultRecipient(id: number) {
    setDefaultRecipientMutation.mutate(id);
  }
  
  // Function to export recipients to CSV file
  function exportRecipientsToCSV() {
    if (!recipients || recipients.length === 0) {
      toast({
        title: t("common.error"),
        description: t("recipientsData.alerts.noExportData"),
        variant: "destructive",
      });
      return;
    }
    
    // CSV header
    const csvHeader = [
      t("recipientsData.table.name"),
      t("recipientsData.table.address"),
      t("recipientsData.table.city"),
      t("recipientsData.table.state"),
      t("recipientsData.table.country"),
      t("recipientsData.table.postalCode"),
      t("recipientsData.table.phone"),
      t("recipientsData.table.email"),
      t("recipientsData.defaultRecipientBadge"),
    ].join(",");
    
    // Convert recipients to CSV rows
    const csvRows = recipients.map((recipient: any) => {
      // Escape fields that might contain commas
      const escapeCsvField = (field: string | null | undefined) => {
        if (field == null) return '';
        // If field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
        if (field.includes('"') || field.includes(',') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };
      
      const row = [
        escapeCsvField(recipient.name),
        escapeCsvField(recipient.address),
        escapeCsvField(recipient.city),
        escapeCsvField(recipient.state),
        escapeCsvField(recipient.country),
        escapeCsvField(recipient.postalCode),
        escapeCsvField(recipient.phone),
        escapeCsvField(recipient.email),
        recipient.isDefault ? t("common.yes") : t("common.no"),
      ];
      
      return row.join(",");
    });
    
    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join("\n");
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Set up download attributes
    link.setAttribute("href", url);
    link.setAttribute("download", "recipients.csv");
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: t("common.success"),
      description: t("recipientsData.alerts.exportSuccess"),
    });
  }

  return (
    <Layout>
    <div className="container mx-auto py-8">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("recipientsData.pageTitle")}</h1>
          <p className="text-gray-600">{t("recipientsData.pageDescription")}</p>
        </div>
        <div className="flex space-x-4 items-center">
          {/* View Toggle */}
          <div className="mr-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'table')}>
              <ToggleGroupItem value="grid" aria-label="Grid View" title="Grid View">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table View" title="Table View">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Link href="/recipients/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              {t("recipientsData.actions.importRecipients")}
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={exportRecipientsToCSV}
            disabled={!recipients || recipients.length === 0}
          >
            <Download className="h-4 w-4" />
            {t("recipientsData.actions.exportRecipients")}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("recipientsData.actions.addRecipient")}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("recipientsData.dialogs.add.title")}</DialogTitle>
              <DialogDescription>
                {t("recipientsData.dialogs.add.description")}
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.name")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        {t("recipientsData.form.address")}
                        <div className="flex items-center gap-2">
                          {getValidationIcon(addressValidationResult, validateAddressMutation.isPending)}
                          {validateAddressMutation.isPending && (
                            <span className="text-xs text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                          )}
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.address")} {...field} />
                      </FormControl>
                      <FormMessage />
                      {addressValidationResult && (
                        <div className={`text-xs mt-1 ${addressValidationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {addressValidationResult.isValid 
                            ? `✓ ${addressValidationResult.classification || 'Valid address'} - ${addressValidationResult.deliverability || 'Deliverable'}`
                            : `✗ ${addressValidationResult.errors?.[0] || 'Invalid address'}`
                          }
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="suite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suite/Apt/Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite, apartment or unit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientsData.form.city")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.city")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientsData.form.state")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.state")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          {t("recipientsData.form.postalCode")}
                          <div className="flex items-center gap-2">
                            {getValidationIcon(postalCodeValidationResult, validatePostalCodeMutation.isPending)}
                            {validatePostalCodeMutation.isPending && (
                              <span className="text-xs text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                            )}
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.postalCode")} {...field} />
                        </FormControl>
                        <FormMessage />
                        {postalCodeValidationResult && (
                          <div className={`text-xs mt-1 ${postalCodeValidationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {getValidationStatusText(
                              postalCodeValidationResult.isValid,
                              validatePostalCodeMutation.isPending,
                              postalCodeValidationResult.city,
                              postalCodeValidationResult.errors
                            )}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientsData.form.country")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.country")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientsData.form.phone")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.phone")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("recipientsData.form.email")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("recipientsData.placeholders.email")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={addForm.control}
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
                        <FormLabel>{t("recipientsData.form.defaultRecipient")}</FormLabel>
                        <FormDescription>
                          {t("recipientsData.form.defaultRecipientDescription")}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createRecipientMutation.isPending}>
                    {createRecipientMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("recipientsData.buttons.saveRecipient")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : !recipients || recipients.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="text-lg font-medium text-gray-700">{t("recipientsData.empty.title")}</h3>
          <p className="text-gray-500 mt-2">
            {t("recipientsData.empty.description")}
          </p>
          <Button
            className="mt-4 gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("recipientsData.actions.addRecipient")}
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead>{t("recipientsData.table.name")}</TableHead>
                <TableHead>{t("recipientsData.table.address")}</TableHead>
                <TableHead>{t("recipientsData.table.city")}</TableHead>
                <TableHead>{t("recipientsData.table.country")}</TableHead>
                <TableHead>{t("recipientsData.table.contact")}</TableHead>
                <TableHead className="text-right">{t("recipientsData.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((recipient: any) => (
                <TableRow key={recipient.id} className={recipient.isDefault ? 'bg-blue-50' : ''}>
                  <TableCell className="text-center">
                    {recipient.isDefault && <Star className="h-4 w-4 text-blue-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="font-medium">{recipient.name}</TableCell>
                  <TableCell>
                    {recipient.address}
                    {recipient.postalCode && <span className="text-xs text-gray-500 block">{recipient.postalCode}</span>}
                  </TableCell>
                  <TableCell>{recipient.city}{recipient.state && `, ${recipient.state}`}</TableCell>
                  <TableCell>{recipient.country}</TableCell>
                  <TableCell>
                    {recipient.email && <span className="text-xs block">{recipient.email}</span>}
                    {recipient.phone && <span className="text-xs block">{recipient.phone}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      {!recipient.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefaultRecipient(recipient.id)}
                          title={t("recipientsData.buttons.setAsDefault")}
                          className="h-8 w-8"
                        >
                          <Star className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRecipient(recipient)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRecipient(recipient.id)}
                        disabled={deleteRecipientMutation.isPending}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipients.map((recipient: any) => (
            <Card key={recipient.id} className={`overflow-hidden ${
              recipient.isDefault ? 'border-blue-400 shadow-md' : ''
            }`}>
              {recipient.isDefault && (
                <div className="bg-blue-500 text-white text-xs py-1 px-3 font-medium flex items-center justify-center">
                  <Star className="h-3 w-3 mr-1" /> {t("recipientsData.defaultRecipientBadge")}
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{recipient.name}</span>
                  <div className="flex items-center space-x-1">
                    {!recipient.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefaultRecipient(recipient.id)}
                        title={t("recipientsData.buttons.setAsDefault")}
                      >
                        <Star className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRecipient(recipient)}
                    >
                      <Pencil className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRecipient(recipient.id)}
                      disabled={deleteRecipientMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-gray-700">
                  {recipient.country}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm">{recipient.address}</p>
                      <p className="text-sm">{recipient.city}, {recipient.state} {recipient.postalCode}</p>
                    </div>
                  </div>
                  {recipient.phone && (
                    <div className="flex items-center">
                      <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                      <p className="text-sm">{recipient.phone}</p>
                    </div>
                  )}
                  {recipient.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <p className="text-sm">{recipient.email}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Copy recipient info to clipboard
                    const text = `${recipient.name}\n${recipient.address}\n${recipient.city}, ${recipient.state} ${recipient.postalCode}\n${recipient.country}\nPhone: ${recipient.phone || 'N/A'}\nEmail: ${recipient.email || 'N/A'}`;
                    navigator.clipboard.writeText(text);
                    toast({
                      title: t("recipientsData.notifications.copied.title"),
                      description: t("recipientsData.notifications.copied.description"),
                      duration: 2000,
                    });
                  }}
                >
                  {t("recipientsData.buttons.copyAddress")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("recipientsData.dialogs.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("recipientsData.dialogs.edit.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipientsData.form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("recipientsData.placeholders.name")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      {t("recipientsData.form.address")}
                      <div className="flex items-center gap-2">
                        {getValidationIcon(editAddressValidationResult, validateAddressMutation.isPending)}
                        {validateAddressMutation.isPending && (
                          <span className="text-xs text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                        )}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t("recipientsData.placeholders.address")} {...field} />
                    </FormControl>
                    <FormMessage />
                    {editAddressValidationResult && (
                      <div className={`text-xs mt-1 ${editAddressValidationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {editAddressValidationResult.isValid 
                          ? `✓ ${editAddressValidationResult.classification || 'Valid address'} - ${editAddressValidationResult.deliverability || 'Deliverable'}`
                          : `✗ ${editAddressValidationResult.errors?.[0] || 'Invalid address'}`
                        }
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="suite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suite/Apt/Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite, apartment or unit number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.city")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.city")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.state")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.state")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        {t("recipientsData.form.postalCode")}
                        <div className="flex items-center gap-2">
                          {getValidationIcon(editPostalCodeValidationResult, validatePostalCodeMutation.isPending)}
                          {validatePostalCodeMutation.isPending && (
                            <span className="text-xs text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                          )}
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.postalCode")} {...field} />
                      </FormControl>
                      <FormMessage />
                      {editPostalCodeValidationResult && (
                        <div className={`text-xs mt-1 ${editPostalCodeValidationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {getValidationStatusText(
                            editPostalCodeValidationResult.isValid,
                            validatePostalCodeMutation.isPending,
                            editPostalCodeValidationResult.city,
                            editPostalCodeValidationResult.errors
                          )}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.country")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.country")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.phone")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.phone")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipientsData.form.email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("recipientsData.placeholders.email")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                      <FormLabel>{t("recipientsData.form.defaultRecipient")}</FormLabel>
                      <FormDescription>
                        {t("recipientsData.form.defaultRecipientDescription")}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateRecipientMutation.isPending}>
                  {updateRecipientMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("recipientsData.buttons.updateRecipient")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}