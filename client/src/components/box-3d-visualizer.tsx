import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Eye,
  EyeOff,
  Package,
  Layers,
  Move3D,
  Grid3X3
} from 'lucide-react';

interface BoxItem {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  position: { x: number; y: number; z: number };
  color: string;
  weight: number;
  fragile?: boolean;
}

interface Box3DVisualizerProps {
  boxDimensions: { length: number; width: number; height: number };
  items: BoxItem[];
  currentStep?: number;
  onItemClick?: (item: BoxItem) => void;
}

export function Box3DVisualizer({ 
  boxDimensions, 
  items, 
  currentStep = 0,
  onItemClick 
}: Box3DVisualizerProps) {
  const [rotation, setRotation] = useState({ x: -20, y: 45, z: 0 });
  const [zoom, setZoom] = useState(1);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate scaling factor to fit the box in the viewport
  const maxDimension = Math.max(boxDimensions.length, boxDimensions.width, boxDimensions.height);
  const scale = (200 / maxDimension) * zoom;

  // Convert 3D coordinates to 2D isometric projection
  const project3D = (x: number, y: number, z: number) => {
    const rad = Math.PI / 180;
    const cosX = Math.cos(rotation.x * rad);
    const sinX = Math.sin(rotation.x * rad);
    const cosY = Math.cos(rotation.y * rad);
    const sinY = Math.sin(rotation.y * rad);
    const cosZ = Math.cos(rotation.z * rad);
    const sinZ = Math.sin(rotation.z * rad);

    // 3D rotation matrix
    const x1 = x * cosY * cosZ - y * cosY * sinZ + z * sinY;
    const y1 = x * (sinX * sinY * cosZ + cosX * sinZ) + y * (cosX * cosZ - sinX * sinY * sinZ) - z * sinX * cosY;
    const z1 = x * (sinX * sinZ - cosX * sinY * cosZ) + y * (cosX * sinY * sinZ + sinX * cosZ) + z * cosX * cosY;

    return {
      x: x1 * scale,
      y: y1 * scale,
      z: z1 * scale
    };
  };

  // Generate box vertices
  const getBoxVertices = () => {
    const { length, width, height } = boxDimensions;
    return [
      { x: 0, y: 0, z: 0 },
      { x: length, y: 0, z: 0 },
      { x: length, y: width, z: 0 },
      { x: 0, y: width, z: 0 },
      { x: 0, y: 0, z: height },
      { x: length, y: 0, z: height },
      { x: length, y: width, z: height },
      { x: 0, y: width, z: height }
    ].map(v => project3D(v.x, v.y, v.z));
  };

  // Generate grid lines
  const generateGrid = () => {
    const lines = [];
    const { length, width, height } = boxDimensions;
    const step = Math.max(length, width, height) / 10;

    // Bottom grid
    for (let x = 0; x <= length; x += step) {
      lines.push([
        project3D(x, 0, 0),
        project3D(x, width, 0)
      ]);
    }
    for (let y = 0; y <= width; y += step) {
      lines.push([
        project3D(0, y, 0),
        project3D(length, y, 0)
      ]);
    }

    return lines;
  };

  // Generate box edges
  const getBoxEdges = () => {
    const vertices = getBoxVertices();
    return [
      [vertices[0], vertices[1]], [vertices[1], vertices[2]], [vertices[2], vertices[3]], [vertices[3], vertices[0]], // Bottom face
      [vertices[4], vertices[5]], [vertices[5], vertices[6]], [vertices[6], vertices[7]], [vertices[7], vertices[4]], // Top face
      [vertices[0], vertices[4]], [vertices[1], vertices[5]], [vertices[2], vertices[6]], [vertices[3], vertices[7]]  // Vertical edges
    ];
  };

  // Auto-rotate animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => ({
        ...prev,
        y: (prev.y + 0.5) % 360
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Animate items placement based on current step
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationStep(currentStep);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleItemClick = (item: BoxItem) => {
    setSelectedItem(item.id === selectedItem ? null : item.id);
    onItemClick?.(item);
  };

  const resetView = () => {
    setRotation({ x: -20, y: 45, z: 0 });
    setZoom(1);
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              3D Packing Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWireframe(!showWireframe)}
              >
                {showWireframe ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zoom</label>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rotation X</label>
              <Slider
                value={[rotation.x]}
                onValueChange={([value]) => setRotation(prev => ({ ...prev, x: value }))}
                min={-90}
                max={90}
                step={5}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rotation Y</label>
              <Slider
                value={[rotation.y]}
                onValueChange={([value]) => setRotation(prev => ({ ...prev, y: value }))}
                min={0}
                max={360}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          {/* 3D Visualization */}
          <div 
            ref={containerRef}
            className="relative h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden border"
            style={{ perspective: '1000px' }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="-300 -200 600 400"
              className="absolute inset-0"
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                </pattern>
                
                {/* Gradients for 3D effect */}
                <linearGradient id="boxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.9"/>
                </linearGradient>
                
                {items.map(item => (
                  <linearGradient key={`gradient-${item.id}`} id={`gradient-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={item.color} stopOpacity="0.8"/>
                    <stop offset="100%" stopColor={item.color} stopOpacity="0.6"/>
                  </linearGradient>
                ))}
              </defs>

              {/* Grid */}
              {showGrid && (
                <g opacity="0.3">
                  {generateGrid().map((line, index) => (
                    <line
                      key={`grid-${index}`}
                      x1={line[0].x}
                      y1={line[0].y}
                      x2={line[1].x}
                      y2={line[1].y}
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  ))}
                </g>
              )}

              {/* Box outline */}
              <g>
                {getBoxEdges().map((edge, index) => (
                  <line
                    key={`edge-${index}`}
                    x1={edge[0].x}
                    y1={edge[0].y}
                    x2={edge[1].x}
                    y2={edge[1].y}
                    stroke={showWireframe ? "#475569" : "#94a3b8"}
                    strokeWidth={showWireframe ? "2" : "1"}
                    strokeDasharray={showWireframe ? "5,5" : "none"}
                  />
                ))}
              </g>

              {/* Items */}
              <AnimatePresence>
                {items.map((item, index) => {
                  const isVisible = index <= animationStep;
                  const isSelected = selectedItem === item.id;
                  
                  if (!isVisible) return null;

                  // Calculate item's 3D position and size
                  const itemCenter = project3D(
                    item.position.x + item.dimensions.length / 2,
                    item.position.y + item.dimensions.width / 2,
                    item.position.z + item.dimensions.height / 2
                  );

                  const itemSize = {
                    width: item.dimensions.length * scale,
                    height: item.dimensions.width * scale
                  };

                  return (
                    <motion.g
                      key={item.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ 
                        delay: index * 0.2,
                        duration: 0.5,
                        ease: "backOut"
                      }}
                    >
                      {/* Item shadow */}
                      <ellipse
                        cx={itemCenter.x + 10}
                        cy={itemCenter.y + 10}
                        rx={Math.max(itemSize.width / 2, 15)}
                        ry={Math.max(itemSize.height / 2, 10)}
                        fill="rgba(0,0,0,0.1)"
                      />
                      
                      {/* Item body */}
                      <rect
                        x={itemCenter.x - itemSize.width / 2}
                        y={itemCenter.y - itemSize.height / 2}
                        width={itemSize.width}
                        height={itemSize.height}
                        fill={`url(#gradient-${item.id})`}
                        stroke={isSelected ? "#3b82f6" : item.color}
                        strokeWidth={isSelected ? "3" : "1"}
                        rx="4"
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => handleItemClick(item)}
                      />
                      
                      {/* Fragile indicator */}
                      {item.fragile && (
                        <text
                          x={itemCenter.x}
                          y={itemCenter.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="12"
                          fill="#ef4444"
                          fontWeight="bold"
                        >
                          ⚠
                        </text>
                      )}
                      
                      {/* Item label */}
                      <text
                        x={itemCenter.x}
                        y={itemCenter.y + (item.fragile ? 15 : 5)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fill="#374151"
                        fontWeight="500"
                      >
                        {item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name}
                      </text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>

            {/* Overlay controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Item Legend */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: index <= animationStep ? 1 : 0.3,
                  y: 0 
                }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                  selectedItem === item.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleItemClick(item)}
              >
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.weight}kg
                    {item.fragile && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        Fragile
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}