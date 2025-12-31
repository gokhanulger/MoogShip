import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Layers,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Maximize2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PackageItem {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  fragile?: boolean;
  quantity: number;
}

interface PackingStep {
  id: number;
  title: string;
  description: string;
  items: string[];
  tip?: string;
  warning?: string;
  duration: number;
}

interface AnimatedPackingGuideProps {
  items: PackageItem[];
  boxDimensions: { length: number; width: number; height: number };
  onOptimizationComplete?: (instructions: PackingStep[]) => void;
}

export function AnimatedPackingGuide({ 
  items, 
  boxDimensions, 
  onOptimizationComplete 
}: AnimatedPackingGuideProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [packingSteps, setPackingSteps] = useState<PackingStep[]>([]);
  const [optimization, setOptimization] = useState({
    efficiency: 0,
    weightDistribution: 'optimal',
    estimatedTime: 0
  });

  // Generate optimized packing instructions
  useEffect(() => {
    const generatePackingInstructions = () => {
      const steps: PackingStep[] = [];
      let stepId = 1;

      // Step 1: Prepare materials
      steps.push({
        id: stepId++,
        title: 'Prepare Packaging Materials',
        description: 'Gather your box, protective materials, and items to be packed',
        items: ['Box', 'Bubble wrap', 'Packing paper', 'Tape'],
        tip: 'Having all materials ready will make packing more efficient',
        duration: 30
      });

      // Step 2: Sort items by fragility and size
      const fragileItems = items.filter(item => item.fragile);
      const regularItems = items.filter(item => !item.fragile);
      
      if (fragileItems.length > 0) {
        steps.push({
          id: stepId++,
          title: 'Prepare Fragile Items',
          description: 'Wrap fragile items individually with protective material',
          items: fragileItems.map(item => item.name),
          warning: 'Use extra cushioning for fragile items',
          duration: 60 * fragileItems.length
        });
      }

      // Step 3: Place heavy items at bottom
      const heavyItems = [...items].sort((a, b) => b.weight - a.weight).slice(0, Math.ceil(items.length / 3));
      if (heavyItems.length > 0) {
        steps.push({
          id: stepId++,
          title: 'Place Heavy Items First',
          description: 'Position heavy items at the bottom of the box for stability',
          items: heavyItems.map(item => item.name),
          tip: 'Heavy items at the bottom prevent crushing and improve balance',
          duration: 45 * heavyItems.length
        });
      }

      // Step 4: Fill middle layer
      const mediumItems = [...items].sort((a, b) => b.weight - a.weight).slice(
        Math.ceil(items.length / 3), 
        Math.ceil(items.length * 2 / 3)
      );
      if (mediumItems.length > 0) {
        steps.push({
          id: stepId++,
          title: 'Add Medium Items',
          description: 'Place medium-weight items in the middle layer',
          items: mediumItems.map(item => item.name),
          duration: 30 * mediumItems.length
        });
      }

      // Step 5: Top layer with light items
      const lightItems = [...items].sort((a, b) => b.weight - a.weight).slice(Math.ceil(items.length * 2 / 3));
      if (lightItems.length > 0) {
        steps.push({
          id: stepId++,
          title: 'Finish with Light Items',
          description: 'Place lightest items on top',
          items: lightItems.map(item => item.name),
          tip: 'Light items on top prevent damage to items below',
          duration: 20 * lightItems.length
        });
      }

      // Step 6: Fill gaps and cushioning
      steps.push({
        id: stepId++,
        title: 'Fill Empty Spaces',
        description: 'Add cushioning material to fill any gaps and prevent movement',
        items: ['Bubble wrap', 'Packing peanuts', 'Air pillows'],
        tip: 'Items should not move when the box is gently shaken',
        duration: 45
      });

      // Step 7: Final sealing
      steps.push({
        id: stepId++,
        title: 'Seal the Package',
        description: 'Close and secure the box with proper taping technique',
        items: ['Packing tape'],
        tip: 'Use the H-tape method for maximum security',
        duration: 30
      });

      setPackingSteps(steps);

      // Calculate optimization metrics
      const totalVolume = items.reduce((sum, item) => 
        sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height * item.quantity), 0
      );
      const boxVolume = boxDimensions.length * boxDimensions.width * boxDimensions.height;
      const efficiency = Math.min((totalVolume / boxVolume) * 100, 100);
      
      const totalTime = steps.reduce((sum, step) => sum + step.duration, 0);

      setOptimization({
        efficiency: Math.round(efficiency),
        weightDistribution: efficiency > 80 ? 'optimal' : efficiency > 60 ? 'good' : 'fair',
        estimatedTime: totalTime
      });

      onOptimizationComplete?.(steps);
    };

    if (items.length > 0) {
      generatePackingInstructions();
    }
  }, [items, boxDimensions]);

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && packingSteps.length > 0) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < packingSteps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 3000); // 3 seconds per step
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, packingSteps.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleNext = () => {
    if (currentStep < packingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (packingSteps.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Add items to generate packing instructions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStepData = packingSteps[currentStep];
  const progress = ((currentStep + 1) / packingSteps.length) * 100;

  return (
    <div className="w-full space-y-6">
      {/* Optimization Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Packing Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{optimization.efficiency}%</div>
              <div className="text-sm text-muted-foreground">Space Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 capitalize">{optimization.weightDistribution}</div>
              <div className="text-sm text-muted-foreground">Weight Distribution</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatTime(optimization.estimatedTime)}</div>
              <div className="text-sm text-muted-foreground">Estimated Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Packing Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step {currentStep + 1} of {packingSteps.length}
            </CardTitle>
            <Badge variant="outline">
              {formatTime(currentStepData.duration)}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step Animation Area */}
          <div className="relative h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-center p-6">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="bg-white rounded-xl p-6 shadow-lg max-w-md"
                  >
                    <h3 className="text-xl font-semibold mb-3">{currentStepData.title}</h3>
                    <p className="text-gray-600 mb-4">{currentStepData.description}</p>
                    
                    {/* Animated Items */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentStepData.items.map((item, index) => (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + (index * 0.1), duration: 0.3 }}
                        >
                          <Badge variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tips and Warnings */}
          <div className="space-y-3">
            {currentStepData.tip && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Tip</h4>
                  <p className="text-sm text-yellow-700">{currentStepData.tip}</p>
                </div>
              </motion.div>
            )}

            {currentStepData.warning && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Important</h4>
                  <p className="text-sm text-red-700">{currentStepData.warning}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={handlePlayPause}
              className="px-8"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNext}
              disabled={currentStep === packingSteps.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {currentStep === packingSteps.length - 1 && (
              <Button variant="default" className="ml-4">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {packingSteps.map((step, index) => (
              <motion.div
                key={step.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={index === currentStep ? "default" : "outline"}
                  className="w-full h-auto p-3 flex flex-col items-start"
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono">
                      {index + 1}
                    </span>
                    {index < currentStep && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  <span className="text-xs text-left leading-tight">
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(step.duration)}
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}