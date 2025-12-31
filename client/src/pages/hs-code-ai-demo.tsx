import React, { useState } from 'react';
// import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Package, 
  ArrowLeft,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { HSCodeInputAI } from '@/components/hs-code-input-ai';

export default function HSCodeAIDemo() {
  const { t } = useTranslation();
  const [productData, setProductData] = useState({
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium over-ear wireless headphones with noise cancellation',
    material: 'Plastic and metal',
    category: 'Electronics',
    value: 150,
    weight: 0.3,
    dimensions: {
      length: 20,
      width: 18,
      height: 8
    }
  });
  const [hsCode, setHsCode] = useState('');

  const sampleProducts = [
    {
      name: 'Wireless Bluetooth Headphones',
      description: 'Premium over-ear wireless headphones with noise cancellation',
      material: 'Plastic and metal',
      category: 'Electronics',
      value: 150,
      weight: 0.3
    },
    {
      name: 'Cotton T-Shirt',
      description: '100% organic cotton casual t-shirt',
      material: 'Cotton',
      category: 'Clothing',
      value: 25,
      weight: 0.2
    },
    {
      name: 'Ceramic Coffee Mug',
      description: 'Handmade ceramic mug with handle',
      material: 'Ceramic',
      category: 'Kitchenware',
      value: 15,
      weight: 0.4
    },
    {
      name: 'LED Desk Lamp',
      description: 'Adjustable LED desk lamp with USB charging',
      material: 'Metal and plastic',
      category: 'Electronics',
      value: 45,
      weight: 0.8
    }
  ];

  const loadSampleProduct = (product: any) => {
    setProductData({ ...product, dimensions: { length: 20, width: 15, height: 10 } });
    setHsCode('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/marketing">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Feature
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              AI HS Code Assistant
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Get intelligent HS code suggestions powered by ChatGPT for accurate customs classification
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Details Input */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={productData.name}
                      onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={productData.category}
                      onChange={(e) => setProductData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Product category"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productData.description}
                    onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={productData.material}
                      onChange={(e) => setProductData(prev => ({ ...prev, material: e.target.value }))}
                      placeholder="Primary material"
                    />
                  </div>
                  <div>
                    <Label htmlFor="value">Value ($)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={productData.value}
                      onChange={(e) => setProductData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      placeholder="Product value"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={productData.weight}
                      onChange={(e) => setProductData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      placeholder="Weight in kg"
                    />
                  </div>
                </div>

                <div>
                  <Label>Dimensions (cm)</Label>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <Input
                      type="number"
                      value={productData.dimensions.length}
                      onChange={(e) => setProductData(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, length: parseInt(e.target.value) || 0 }
                      }))}
                      placeholder="Length"
                    />
                    <Input
                      type="number"
                      value={productData.dimensions.width}
                      onChange={(e) => setProductData(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, width: parseInt(e.target.value) || 0 }
                      }))}
                      placeholder="Width"
                    />
                    <Input
                      type="number"
                      value={productData.dimensions.height}
                      onChange={(e) => setProductData(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, height: parseInt(e.target.value) || 0 }
                      }))}
                      placeholder="Height"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI HS Code Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI HS Code Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HSCodeInputAI
                  value={hsCode}
                  onChange={setHsCode}
                  placeholder="AI will suggest HS code based on product details"
                  productName={productData.name}
                  productDescription={productData.description}
                  material={productData.material}
                  category={productData.category}
                  productValue={productData.value}
                  weight={productData.weight}
                  dimensions={productData.dimensions}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sample Products & Info */}
          <div className="space-y-6">
            {/* Sample Products */}
            <Card>
              <CardHeader>
                <CardTitle>Try Sample Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleProducts.map((product, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => loadSampleProduct(product)}
                    >
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                      <div className="text-xs text-gray-500">${product.value} • {product.weight}kg</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How AI Suggestions Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <div className="font-medium">Product Analysis</div>
                    <div className="text-gray-600">AI analyzes your product name, description, and materials</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <div className="font-medium">Smart Matching</div>
                    <div className="text-gray-600">Compares against global HS code database using advanced reasoning</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <div className="font-medium">Confidence Rating</div>
                    <div className="text-gray-600">Provides confidence scores and alternative suggestions</div>
                  </div>
                </div>

                <Separator />
                
                <div className="text-xs text-gray-500">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Powered by ChatGPT-5 for accurate international trade classification
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}