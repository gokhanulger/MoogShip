import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Trash2, 
  Box,
  Sparkles,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
// import { PackingOptimizationSuite } from '@/components/packing-optimization-suite';

interface DemoItem {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  value: number;
  fragile?: boolean;
  quantity: number;
}

export default function PackingDemo() {
  const { t } = useTranslation();
  const [items, setItems] = useState<DemoItem[]>([
    {
      id: '1',
      name: 'Laptop',
      dimensions: { length: 35, width: 25, height: 3 },
      weight: 2.5,
      value: 1200,
      fragile: true,
      quantity: 1
    },
    {
      id: '2',
      name: 'Mouse',
      dimensions: { length: 12, width: 8, height: 4 },
      weight: 0.2,
      value: 50,
      fragile: false,
      quantity: 1
    },
    {
      id: '3',
      name: 'Keyboard',
      dimensions: { length: 45, width: 15, height: 3 },
      weight: 1.0,
      value: 150,
      fragile: false,
      quantity: 1
    }
  ]);

  const [boxDimensions, setBoxDimensions] = useState({
    length: 50,
    width: 30,
    height: 20
  });

  const [newItem, setNewItem] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    value: '',
    fragile: false
  });

  const addItem = () => {
    if (!newItem.name || !newItem.length || !newItem.width || !newItem.height || !newItem.weight || !newItem.value) {
      return;
    }

    const item: DemoItem = {
      id: Date.now().toString(),
      name: newItem.name,
      dimensions: {
        length: parseFloat(newItem.length),
        width: parseFloat(newItem.width),
        height: parseFloat(newItem.height)
      },
      weight: parseFloat(newItem.weight),
      value: parseFloat(newItem.value),
      fragile: newItem.fragile,
      quantity: 1
    };

    setItems([...items, item]);
    setNewItem({
      name: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      value: '',
      fragile: false
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const resetDemo = () => {
    setItems([
      {
        id: '1',
        name: 'Laptop',
        dimensions: { length: 35, width: 25, height: 3 },
        weight: 2.5,
        value: 1200,
        fragile: true,
        quantity: 1
      },
      {
        id: '2',
        name: 'Mouse',
        dimensions: { length: 12, width: 8, height: 4 },
        weight: 0.2,
        value: 50,
        fragile: false,
        quantity: 1
      },
      {
        id: '3',
        name: 'Keyboard',
        dimensions: { length: 45, width: 15, height: 3 },
        weight: 1.0,
        value: 150,
        fragile: false,
        quantity: 1
      }
    ]);
    setBoxDimensions({ length: 50, width: 30, height: 20 });
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                New Feature
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Smart Packing Assistant
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Interactive 3D packing optimization with step-by-step instructions
            </p>
          </div>
          <Button variant="outline" onClick={resetDemo}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Demo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Box Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Box Dimensions (cm)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="boxLength">Length</Label>
                    <Input
                      id="boxLength"
                      type="number"
                      value={boxDimensions.length}
                      onChange={(e) => setBoxDimensions(prev => ({
                        ...prev,
                        length: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="boxWidth">Width</Label>
                    <Input
                      id="boxWidth"
                      type="number"
                      value={boxDimensions.width}
                      onChange={(e) => setBoxDimensions(prev => ({
                        ...prev,
                        width: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="boxHeight">Height</Label>
                    <Input
                      id="boxHeight"
                      type="number"
                      value={boxDimensions.height}
                      onChange={(e) => setBoxDimensions(prev => ({
                        ...prev,
                        height: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Item Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter item name"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Length (cm)</Label>
                    <Input
                      type="number"
                      value={newItem.length}
                      onChange={(e) => setNewItem(prev => ({ ...prev, length: e.target.value }))}
                      placeholder="L"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Width (cm)</Label>
                    <Input
                      type="number"
                      value={newItem.width}
                      onChange={(e) => setNewItem(prev => ({ ...prev, width: e.target.value }))}
                      placeholder="W"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height (cm)</Label>
                    <Input
                      type="number"
                      value={newItem.height}
                      onChange={(e) => setNewItem(prev => ({ ...prev, height: e.target.value }))}
                      placeholder="H"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="itemWeight">Weight (kg)</Label>
                    <Input
                      id="itemWeight"
                      type="number"
                      step="0.1"
                      value={newItem.weight}
                      onChange={(e) => setNewItem(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemValue">Value ($)</Label>
                    <Input
                      id="itemValue"
                      type="number"
                      value={newItem.value}
                      onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fragile"
                    checked={newItem.fragile}
                    onChange={(e) => setNewItem(prev => ({ ...prev, fragile: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="fragile">Fragile item</Label>
                </div>

                <Button onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            {/* Items List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height}cm
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.weight}kg • ${item.value}
                          {item.fragile && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Fragile
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Packing Interface */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Packing Optimization Suite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Feature Coming Soon</h3>
                  <p className="text-gray-600">The interactive packing feature is being tested and will be available shortly.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Use Smart Packing?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Optimize Space</h3>
                <p className="text-sm text-gray-600">
                  Maximize box utilization and reduce shipping costs with intelligent item placement
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Prevent Damage</h3>
                <p className="text-sm text-gray-600">
                  Smart placement suggestions protect fragile items and ensure safe delivery
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Box className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Visual Guidance</h3>
                <p className="text-sm text-gray-600">
                  Step-by-step 3D instructions make packing simple and efficient
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}