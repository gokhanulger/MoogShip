import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Layers, 
  Play, 
  BarChart3, 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Maximize2,
  Download,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedPackingGuide } from './animated-packing-guide';
import { Box3DVisualizer } from './box-3d-visualizer';

interface PackageItem {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  value: number;
  fragile?: boolean;
  quantity: number;
}

interface OptimizedItem extends PackageItem {
  position: { x: number; y: number; z: number };
  color: string;
  layer: number;
}

interface PackingOptimizationSuiteProps {
  items: PackageItem[];
  boxDimensions?: { length: number; width: number; height: number };
  onOptimizationComplete?: (optimizedItems: OptimizedItem[]) => void;
  onPackingGuideStart?: () => void;
}

export function PackingOptimizationSuite({ 
  items, 
  boxDimensions = { length: 30, width: 20, height: 15 },
  onOptimizationComplete,
  onPackingGuideStart
}: PackingOptimizationSuiteProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('guide');
  const [optimization, setOptimization] = useState({
    efficiency: 0,
    weightDistribution: 'calculating',
    estimatedCost: 0,
    recommendations: [] as string[]
  });

  // Generate colors for items
  const itemColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6366f1', '#14b8a6', '#eab308'
  ];

  // Optimize item placement using a simple bin packing algorithm
  const optimizedItems = useMemo(() => {
    if (items.length === 0) return [];

    const optimized: OptimizedItem[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;
    let maxHeightInLayer = 0;
    let layer = 0;

    // Sort items by volume (largest first) for better packing
    const sortedItems = [...items].sort((a, b) => {
      const volumeA = a.dimensions.length * a.dimensions.width * a.dimensions.height;
      const volumeB = b.dimensions.length * b.dimensions.width * b.dimensions.height;
      return volumeB - volumeA;
    });

    sortedItems.forEach((item, index) => {
      const { length, width, height } = item.dimensions;
      
      // Check if item fits in current position
      if (currentX + length > boxDimensions.length) {
        // Move to next row
        currentX = 0;
        currentY += maxHeightInLayer || width;
        
        // Check if we need a new layer
        if (currentY + width > boxDimensions.width) {
          currentY = 0;
          currentZ += maxHeightInLayer || height;
          maxHeightInLayer = 0;
          layer++;
        }
      }

      const optimizedItem: OptimizedItem = {
        ...item,
        position: { x: currentX, y: currentY, z: currentZ },
        color: itemColors[index % itemColors.length],
        layer
      };

      optimized.push(optimizedItem);

      // Update position for next item
      currentX += length;
      maxHeightInLayer = Math.max(maxHeightInLayer, height);
    });

    return optimized;
  }, [items, boxDimensions]);

  // Calculate optimization metrics
  useEffect(() => {
    if (optimizedItems.length === 0) return;

    const totalItemVolume = optimizedItems.reduce((sum, item) => 
      sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height * item.quantity), 0
    );
    
    const boxVolume = boxDimensions.length * boxDimensions.width * boxDimensions.height;
    const efficiency = Math.min((totalItemVolume / boxVolume) * 100, 100);
    
    const totalWeight = optimizedItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalValue = optimizedItems.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    
    // Generate recommendations
    const recommendations = [];
    if (efficiency < 60) {
      recommendations.push('Consider using a smaller box to save on shipping costs');
    }
    if (totalWeight > 20) {
      recommendations.push('Heavy package - consider weight distribution');
    }
    if (optimizedItems.some(item => item.fragile)) {
      recommendations.push('Extra cushioning recommended for fragile items');
    }
    if (efficiency > 90) {
      recommendations.push('Excellent space utilization!');
    }

    setOptimization({
      efficiency: Math.round(efficiency),
      weightDistribution: efficiency > 80 ? 'optimal' : efficiency > 60 ? 'good' : 'fair',
      estimatedCost: Math.round(totalWeight * 2.5 + totalValue * 0.01), // Simple cost calculation
      recommendations
    });

    onOptimizationComplete?.(optimizedItems);
  }, [optimizedItems, boxDimensions]);

  const handleStartPacking = () => {
    setIsDialogOpen(true);
    onPackingGuideStart?.();
  };

  const downloadPackingList = () => {
    const packingData = {
      boxDimensions,
      items: optimizedItems,
      optimization,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(packingData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packing-instructions-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Items to Pack</h3>
          <p className="text-muted-foreground text-center">
            Add items to your shipment to see packing optimization and 3D visualization
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Packing Optimization Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPackingList}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleStartPacking}>
                <Play className="h-4 w-4 mr-2" />
                Start Packing
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{optimization.efficiency}%</div>
              <div className="text-sm text-muted-foreground">Space Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 capitalize">{optimization.weightDistribution}</div>
              <div className="text-sm text-muted-foreground">Distribution</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{optimizedItems.length}</div>
              <div className="text-sm text-muted-foreground">Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">${optimization.estimatedCost}</div>
              <div className="text-sm text-muted-foreground">Est. Cost</div>
            </div>
          </div>

          {/* Recommendations */}
          {optimization.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Recommendations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {optimization.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-blue-800">{rec}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle>Items Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {optimizedItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height}cm • {item.weight}kg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${item.value}</div>
                    {item.fragile && (
                      <Badge variant="destructive" className="text-xs">
                        Fragile
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mini 3D Preview */}
        <Card>
          <CardHeader>
            <CardTitle>3D Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Box3DVisualizer
                boxDimensions={boxDimensions}
                items={optimizedItems}
                currentStep={optimizedItems.length}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Packing Guide Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Interactive Packing Guide
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guide">Step-by-Step Guide</TabsTrigger>
              <TabsTrigger value="3d">3D Visualization</TabsTrigger>
            </TabsList>
            
            <TabsContent value="guide" className="space-y-4">
              <AnimatedPackingGuide
                items={optimizedItems}
                boxDimensions={boxDimensions}
              />
            </TabsContent>
            
            <TabsContent value="3d" className="space-y-4">
              <Box3DVisualizer
                boxDimensions={boxDimensions}
                items={optimizedItems}
                currentStep={currentStep}
                onItemClick={(item) => {
                  console.log('Item clicked:', item);
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}