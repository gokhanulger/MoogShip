import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Box, Save, Package, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PackageTemplate {
  id: number | string;
  name: string;
  description?: string | null;
  length: number;
  width: number;
  height: number;
  weight: number;
  isDefault?: boolean;
  userId?: number;
  createdAt?: Date | string | null;
  source?: 'database' | 'localStorage';
}

interface PackageTemplateSelectorProps {
  userId: number;
  onTemplateSelect: (template: PackageTemplate) => void;
  showSaveCurrentDimensions?: boolean;
  currentDimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  selectedTemplateName?: string; // Track which template is currently selected
}

// Default templates for all users
const defaultTemplates: PackageTemplate[] = [
  { id: 'default-1', name: 'Small Package', length: 15, width: 10, height: 5, weight: 0.5, source: 'localStorage' },
  { id: 'default-2', name: 'Medium Package', length: 25, width: 20, height: 15, weight: 1.0, source: 'localStorage' },
  { id: 'default-3', name: 'Large Package', length: 40, width: 30, height: 25, weight: 2.0, source: 'localStorage' },
  { id: 'default-4', name: 'Jewelry Box', length: 8, width: 6, height: 3, weight: 0.1, source: 'localStorage' },
  { id: 'default-5', name: 'Clothing Item', length: 30, width: 25, height: 5, weight: 0.3, source: 'localStorage' },
  { id: 'default-6', name: 'Electronics', length: 20, width: 15, height: 10, weight: 1.5, source: 'localStorage' },
  { id: 'default-7', name: 'Book/Document', length: 25, width: 20, height: 2, weight: 0.2, source: 'localStorage' }
];

export function PackageTemplateSelector({ userId, onTemplateSelect, showSaveCurrentDimensions = false, currentDimensions, selectedTemplateName }: PackageTemplateSelectorProps) {
  const { t } = useTranslation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [userCreatedTemplates, setUserCreatedTemplates] = useState<PackageTemplate[]>([]);

  // Fetch database-stored package templates
  const { data: databaseTemplates, isLoading } = useQuery({
    queryKey: ['/api/package-templates', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/package-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const templates = await response.json();
      return templates.map((template: PackageTemplate) => ({
        ...template,
        source: 'database' as const
      }));
    },
    enabled: !!userId,
  });

  // Load user-created templates from localStorage
  useEffect(() => {
    const loadUserTemplates = () => {
      try {
        const stored = localStorage.getItem('userPackageTemplates');
        if (stored) {
          const templates = JSON.parse(stored);
          setUserCreatedTemplates(templates.map((template: PackageTemplate) => ({
            ...template,
            source: 'localStorage' as const
          })));
        }
      } catch (error) {
        console.error('Error loading user templates:', error);
      }
    };

    loadUserTemplates();
  }, []);

  // Save template to localStorage
  const saveTemplate = () => {
    if (!templateName.trim() || !currentDimensions) {
      toast({
        title: "Validation Error",
        description: "Please enter a template name and ensure dimensions are set",
        variant: "destructive"
      });
      return;
    }

    const newTemplate: PackageTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      description: templateDescription.trim() || null,
      length: currentDimensions.length,
      width: currentDimensions.width,
      height: currentDimensions.height,
      weight: currentDimensions.weight,
      createdAt: new Date().toISOString(),
      source: 'localStorage'
    };

    try {
      const existingTemplates = userCreatedTemplates;
      const updatedTemplates = [...existingTemplates, newTemplate];
      
      localStorage.setItem('userPackageTemplates', JSON.stringify(updatedTemplates));
      setUserCreatedTemplates(updatedTemplates);
      
      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      
      toast({
        title: "Template Saved",
        description: `"${newTemplate.name}" template has been saved successfully`
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Save Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Combine all templates
  const allTemplates = [
    ...defaultTemplates,
    ...(databaseTemplates || []),
    ...userCreatedTemplates
  ];

  const handleTemplateSelect = (templateId: string) => {
    console.log('🚀🚀🚀 PackageTemplateSelector handleTemplateSelect called with:', templateId);
    const template = allTemplates.find(t => t.id.toString() === templateId);
    console.log('🚀🚀🚀 Found template:', template);
    if (template) {
      console.log('🚀🚀🚀 Calling onTemplateSelect with template:', template);
      onTemplateSelect(template);
    } else {
      console.log('❌❌❌ Template not found for ID:', templateId);
    }
  };

  return (
    <div className="space-y-3">
      {/* Template Selector */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="h-9">
              {selectedTemplateName ? (
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-600 font-medium text-xs">
                    {selectedTemplateName.length > 15 ? `${selectedTemplateName.substring(0, 15)}...` : selectedTemplateName}
                  </span>
                </div>
              ) : (
                <SelectValue placeholder={`📦 ${t('packageTemplates.selectTemplate')}`} />
              )}
            </SelectTrigger>
            <SelectContent className="w-[300px]">
              {/* Default Templates Section */}
              <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100">
                {t('packageTemplates.defaultTemplates')}
              </div>
              {defaultTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {template.length}×{template.width}×{template.height}cm, {template.weight}kg
                    </span>
                  </div>
                </SelectItem>
              ))}

              {/* Database Templates Section */}
              {databaseTemplates && databaseTemplates.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100 mt-1">
                    {t('packageTemplates.myDatabaseTemplates')}
                  </div>
                  {databaseTemplates.map((template: PackageTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {template.length}×{template.width}×{template.height}cm, {template.weight}kg
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {/* User Created Templates Section */}
              {userCreatedTemplates.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100 mt-1">
                    {t('packageTemplates.mySavedTemplates')}
                  </div>
                  {userCreatedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {template.length}×{template.width}×{template.height}cm, {template.weight}kg
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {/* Actions Section */}
              {showSaveCurrentDimensions && currentDimensions && (
                currentDimensions.length > 0 || currentDimensions.width > 0 || 
                currentDimensions.height > 0 || currentDimensions.weight > 0
              ) && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100 mt-1">
                    {t('packageTemplates.actions')}
                  </div>
                  <div 
                    className="px-2 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    <Save className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {t('packageTemplates.saveCurrentDimensions')}
                    </span>
                  </div>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('packageTemplates.savePackageTemplate')}
            </DialogTitle>
            <DialogDescription>
              {t('packageTemplates.saveTemplateDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {currentDimensions && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium mb-1">{t('packageTemplates.currentDimensions')}:</div>
                <div className="text-sm text-gray-600">
                  {currentDimensions.length}×{currentDimensions.width}×{currentDimensions.height} cm, {currentDimensions.weight} kg
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="templateName">{t('packageTemplates.templateName')} *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t('packageTemplates.templateNamePlaceholder')}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="templateDescription">{t('packageTemplates.description')} ({t('packageTemplates.optional')})</Label>
              <Input
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder={t('packageTemplates.descriptionPlaceholder')}
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              {t('packageTemplates.saveTemplate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}