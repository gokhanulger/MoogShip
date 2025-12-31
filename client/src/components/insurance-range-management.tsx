import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { InsuranceRange } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  Form
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Trash2, RefreshCw, Edit, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const insuranceRangeSchema = z.object({
  minValue: z.coerce.number()
    .min(0, "Minimum value must be at least 0")
    .max(1000000, "Value too high"),
  maxValue: z.coerce.number()
    .min(1, "Maximum value must be at least 1")
    .max(1000000, "Value too high"),
  insuranceCost: z.coerce.number()
    .min(0, "Insurance cost must be at least 0")
    .max(100000, "Cost too high"),
}).refine(data => data.maxValue > data.minValue, {
  message: "Maximum value must be greater than minimum value",
  path: ["maxValue"]
});

type InsuranceRangeFormValues = z.infer<typeof insuranceRangeSchema>;

export function InsuranceRangeManagement() {
  const [isAddingRange, setIsAddingRange] = useState(false);
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [rangeToEdit, setRangeToEdit] = useState<InsuranceRange | null>(null);
  const [rangeToDelete, setRangeToDelete] = useState<InsuranceRange | null>(null);
  const { toast } = useToast();

  const { data: insuranceRanges, isLoading, isError, refetch } = useQuery<InsuranceRange[]>({
    queryKey: ['/api/insurance-ranges'],
    retry: 3, // Increase retries
    staleTime: 0, // Data is immediately stale, ensuring it will be refetched when needed
    onSuccess: (data) => {
      console.log("Successfully loaded insurance ranges:", data);
    },
    onError: (error) => {
      console.error("Error loading insurance ranges:", error);
    }
  });
  
  // Add debug log to check what's happening when rendering
  React.useEffect(() => {
    console.log("Current insurance ranges:", insuranceRanges);
  }, [insuranceRanges]);

  const addRangeMutation = useMutation({
    mutationFn: async (rangeData: InsuranceRangeFormValues) => {
      console.log("Adding range with data:", rangeData);
      const res = await apiRequest('POST', '/api/insurance-ranges', {
        minValue: Math.round(rangeData.minValue * 100), // Convert to cents and ensure integer
        maxValue: Math.round(rangeData.maxValue * 100), // Convert to cents and ensure integer
        insuranceCost: Math.round(rangeData.insuranceCost * 100), // Convert to cents and ensure integer
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add insurance range');
      }
      return await res.json();
    },
    onSuccess: () => {
      // First invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['/api/insurance-ranges'] });
      // Then explicitly trigger a refetch
      setTimeout(() => refetch(), 300);
      
      toast({
        title: "Success",
        description: "Insurance range added successfully",
      });
      setIsAddingRange(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Add mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to add insurance range: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (rangeId: number) => {
      console.log("Deleting range with ID:", rangeId);
      const res = await apiRequest('DELETE', `/api/insurance-ranges/${rangeId}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        throw new Error(errorText);
      }
      return res.ok;
    },
    onSuccess: () => {
      // First invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['/api/insurance-ranges'] });
      // Then explicitly trigger a refetch
      setTimeout(() => refetch(), 300);
      
      toast({
        title: "Success",
        description: "Insurance range deleted successfully",
      });
      setRangeToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to delete insurance range: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const toggleRangeActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      console.log("Toggling range active status:", { id, isActive });
      const res = await apiRequest('PATCH', `/api/insurance-ranges/${id}`, {
        isActive
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update range status');
      }
      return await res.json();
    },
    onSuccess: () => {
      // First invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['/api/insurance-ranges'] });
      // Then explicitly trigger a refetch
      setTimeout(() => refetch(), 300);
      
      toast({
        title: "Success",
        description: "Insurance range status updated",
      });
    },
    onError: (error: Error) => {
      console.error("Toggle active mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to update insurance range: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const editRangeMutation = useMutation({
    mutationFn: async (data: { id: number, values: InsuranceRangeFormValues }) => {
      console.log("Editing range with data:", data);
      const res = await apiRequest('PATCH', `/api/insurance-ranges/${data.id}`, {
        minValue: Math.round(data.values.minValue * 100), // Convert to cents and ensure integer
        maxValue: Math.round(data.values.maxValue * 100), // Convert to cents and ensure integer
        insuranceCost: Math.round(data.values.insuranceCost * 100), // Convert to cents and ensure integer
        // Include isActive to ensure it's preserved during update
        isActive: rangeToEdit?.isActive
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update insurance range');
      }
      return await res.json();
    },
    onSuccess: () => {
      // First invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['/api/insurance-ranges'] });
      // Then explicitly trigger a refetch
      setTimeout(() => refetch(), 300);
      
      toast({
        title: "Success",
        description: "Insurance range updated successfully",
      });
      setIsEditingRange(false);
      setRangeToEdit(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      console.error("Edit mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to update insurance range: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const form = useForm<InsuranceRangeFormValues>({
    resolver: zodResolver(insuranceRangeSchema),
    defaultValues: {
      minValue: 0,
      maxValue: 0,
      insuranceCost: 0,
    },
  });
  
  const editForm = useForm<InsuranceRangeFormValues>({
    resolver: zodResolver(insuranceRangeSchema),
    defaultValues: {
      minValue: 0,
      maxValue: 0,
      insuranceCost: 0,
    },
  });
  
  // Function to set up the edit form when an existing range is selected
  function setupEditForm(range: InsuranceRange) {
    setRangeToEdit(range);
    setIsEditingRange(true);
    editForm.reset({
      minValue: range.minValue / 100, // Convert from cents
      maxValue: range.maxValue / 100, // Convert from cents
      insuranceCost: range.insuranceCost / 100, // Convert from cents
    });
  }

  function onSubmit(data: InsuranceRangeFormValues) {
    addRangeMutation.mutate(data);
  }
  
  function onEditSubmit(data: InsuranceRangeFormValues) {
    if (rangeToEdit) {
      editRangeMutation.mutate({ 
        id: rangeToEdit.id, 
        values: data 
      });
    }
  }

  function handleDeleteConfirm() {
    if (rangeToDelete) {
      deleteRangeMutation.mutate(rangeToDelete.id);
    }
  }

  function toggleRangeActive(range: InsuranceRange) {
    toggleRangeActiveMutation.mutate({
      id: range.id,
      isActive: !range.isActive
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insurance Ranges</CardTitle>
          <CardDescription>Loading insurance ranges...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insurance Ranges</CardTitle>
          <CardDescription>Error loading insurance ranges</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Insurance Ranges</CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>Define value ranges and insurance costs for shipments</span>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardDescription>
        </div>
        <Button 
          onClick={() => setIsAddingRange(!isAddingRange)}
          variant={isAddingRange ? "outline" : "default"}
        >
          {isAddingRange ? "Cancel" : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Range
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isAddingRange && (
          <Card className="mb-6 border-dashed">
            <CardHeader>
              <CardTitle>New Insurance Range</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="minValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="100.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="5.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={addRangeMutation.isPending}
                    >
                      {addRangeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Insurance Range
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {isEditingRange && rangeToEdit && (
          <Card className="mb-6 border-dashed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Edit Insurance Range</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsEditingRange(false);
                  setRangeToEdit(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="minValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="maxValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="100.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="insuranceCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="5.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Button
                      type="button" 
                      variant="outline"
                      onClick={() => toggleRangeActive(rangeToEdit)}
                      disabled={toggleRangeActiveMutation.isPending}
                    >
                      {rangeToEdit.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={editRangeMutation.isPending}
                    >
                      {editRangeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Insurance Range
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {insuranceRanges && insuranceRanges.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Value Range</TableHead>
                <TableHead>Insurance Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insuranceRanges.map((range) => (
                <TableRow key={range.id} className={!range.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    {formatCurrency(range.minValue / 100)} - {formatCurrency(range.maxValue / 100)}
                  </TableCell>
                  <TableCell>{formatCurrency(range.insuranceCost / 100)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${range.isActive 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"}`}>
                      {range.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setupEditForm(range)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRangeToDelete(range)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Insurance Range</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the insurance range for values between {formatCurrency(range.minValue / 100)} and {formatCurrency(range.maxValue / 100)}?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRangeToDelete(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm}>
                              {deleteRangeMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No insurance ranges defined yet.</p>
            {!isAddingRange && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddingRange(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first insurance range
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InsuranceRangeManagement;