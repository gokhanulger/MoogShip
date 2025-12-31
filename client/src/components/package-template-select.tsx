import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from '@/hooks/use-toast';

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

interface PackageTemplateSelectProps {
  onSelect: (template: PackageTemplate) => void;
  userId: number;
}

export function PackageTemplateSelect({ onSelect, userId }: PackageTemplateSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PackageTemplate | null>(null);

  // Fetch package templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['/api/package-templates', userId],
    enabled: !!userId, // Only fetch if userId is provided
  });

  // Select a template and close the popover
  const handleSelect = (template: PackageTemplate) => {
    setSelectedTemplate(template);
    onSelect(template);
    setOpen(false);
  };

  // If there's an error, show a toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading templates",
        description: "Failed to load package templates. Please try again.",
        variant: "destructive"
      });
    }
  }, [error]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTemplate ? selectedTemplate.name : t('products.packageDialog.selectTemplate')}
            <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" side="bottom" sideOffset={5}>
          <Command>
            <CommandInput placeholder={t('products.packageDialog.searchTemplates')} />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">{t('products.packageDialog.noTemplates')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('products.packageDialog.createTemplates')}
                    </p>
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {templates?.map((template: PackageTemplate) => (
                  <CommandItem
                    key={template.id}
                    value={template.id.toString()}
                    onSelect={() => handleSelect(template)}
                    className="cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{template.name}</span>
                        {template.isDefault && (
                          <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
{t('products.packageDialog.default')}
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {template.length}×{template.width}×{template.height} cm | {template.weight} kg
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedTemplate && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <p><strong>{t('products.packageDialog.dimensions')}:</strong> {selectedTemplate.length}×{selectedTemplate.width}×{selectedTemplate.height} cm</p>
          <p><strong>{t('products.packageDialog.weight')}:</strong> {selectedTemplate.weight} kg</p>
        </div>
      )}
    </div>
  );
}