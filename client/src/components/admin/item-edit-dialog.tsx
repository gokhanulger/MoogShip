import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface ItemEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  shipmentId: number;
  onItemUpdated: () => void;
}

export function ItemEditDialog({ isOpen, onClose, item, shipmentId, onItemUpdated }: ItemEditDialogProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    hsCode: item?.hsCode || '',
    quantity: item?.quantity || 1,
    weight: item?.weight || 0,
    price: item?.price || 0,
    countryOfOrigin: item?.countryOfOrigin || 'TR',
    length: item?.length || 0,
    width: item?.width || 0,
    height: item?.height || 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item || !shipmentId) {
      toast({
        title: "Error",
        description: "Missing item or shipment information",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert numeric fields
      const dataToSubmit = {
        ...formData,
        quantity: Number(formData.quantity),
        weight: Number(formData.weight),
        price: Number(formData.price),
        length: Number(formData.length),
        width: Number(formData.width),
        height: Number(formData.height)
      };
      
      // Send update request
      const response = await apiRequest('/api/shipments/' + shipmentId + '/items/' + item.id, 'PUT', dataToSubmit);
      
      toast({
        title: "Item Updated",
        description: "The package item has been successfully updated",
      });
      
      onItemUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update the package item",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Package Item</DialogTitle>
          <DialogDescription>
            Make changes to the package item details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hsCode" className="text-right">
                HS Code
              </Label>
              <Input
                id="hsCode"
                name="hsCode"
                value={formData.hsCode}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="countryOfOrigin" className="text-right">
                Origin Country
              </Label>
              <Input
                id="countryOfOrigin"
                name="countryOfOrigin"
                value={formData.countryOfOrigin}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="TR"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid grid-cols-1 items-center gap-2">
                <Label htmlFor="quantity" className="text-center">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 items-center gap-2">
                <Label htmlFor="weight" className="text-center">
                  Weight (kg)
                </Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  min="0"
                  step="0.001"
                  value={formData.weight}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-1 items-center gap-2">
                <Label htmlFor="price" className="text-center">
                  Price (¢)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label className="text-center font-medium">Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid grid-cols-1 items-center gap-2">
                  <Label htmlFor="length" className="text-center text-xs">
                    Length
                  </Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.length}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 items-center gap-2">
                  <Label htmlFor="width" className="text-center text-xs">
                    Width
                  </Label>
                  <Input
                    id="width"
                    name="width"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.width}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 items-center gap-2">
                  <Label htmlFor="height" className="text-center text-xs">
                    Height
                  </Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.height}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}