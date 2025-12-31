import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calculator, Loader2, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout';
import { withAuth } from '@/lib/with-auth';
import { COUNTRIES } from '@/lib/countries';
import { usePriceCalculator } from '@/hooks/use-price-calculator';

interface Country {
  name: string;
  code: string;
}

enum ServiceLevel {
  EXPRESS = 'express'
}

interface PriceCalculatorProps {
  user: any;
}

function PriceCalculatorContent({ user }: PriceCalculatorProps) {
  const { t } = useTranslation();
  
  const {
    packageDetails,
    directBillableWeight,
    useBillableWeightDirect,
    volumetricWeight,
    billableWeight,
    priceResult,
    isCalculating,
    handleInputChange,
    handleCountryChange,
    handleDirectBillableWeightChange,
    toggleBillableWeightMode,
    calculatePrice,
    setPriceResult
  } = usePriceCalculator();

  return (
    <Layout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {t('priceCalculator.title')}
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t('priceCalculator.subtitle')}
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Calculator Card - Takes up 2/3 of the space on large screens */}
                <Card className="lg:col-span-2 shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-50 border-b border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">{t('priceCalculator.calculateShippingCost')}</CardTitle>
                        <CardDescription className="text-gray-600 mt-1">
                          {t('priceCalculator.enterPackageDetails')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left side - Package Dimensions or Direct Billable Weight */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 rounded-lg">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {useBillableWeightDirect ? t('priceCalculator.directBillableWeight') : t('priceCalculator.packageDimensions')}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="billable-weight-toggle" className="text-sm text-gray-600 font-medium">
                                {useBillableWeightDirect ? t('priceCalculator.useDimensions') : t('priceCalculator.useDirectWeight')}
                              </Label>
                              <Switch
                                id="billable-weight-toggle"
                                checked={useBillableWeightDirect}
                                onCheckedChange={toggleBillableWeightMode}
                              />
                            </div>
                          </div>
                          
                          {/* Show package dimensions input fields if not using direct billable weight */}
                          {!useBillableWeightDirect ? (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="packageLength">{t('priceCalculator.lengthCm')}</Label>
                                  <Input
                                    id="packageLength"
                                    name="length"
                                    placeholder={t('priceCalculator.lengthCm')}
                                    value={packageDetails.length}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="packageWidth">{t('priceCalculator.widthCm')}</Label>
                                  <Input
                                    id="packageWidth"
                                    name="width"
                                    placeholder={t('priceCalculator.widthCm')}
                                    value={packageDetails.width}
                                    onChange={handleInputChange}
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="packageHeight">{t('priceCalculator.heightCm')}</Label>
                                  <Input
                                    id="packageHeight"
                                    name="height"
                                    placeholder={t('priceCalculator.heightCm')}
                                    value={packageDetails.height}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="packageWeight">{t('priceCalculator.weightKg')}</Label>
                                  <Input
                                    id="packageWeight"
                                    name="weight"
                                    placeholder={t('priceCalculator.weightKg')}
                                    value={packageDetails.weight}
                                    onChange={handleInputChange}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            // Show direct billable weight input field
                            <div className="mt-3">
                              <Label htmlFor="directBillableWeight">{t('priceCalculator.billableWeightKg')}</Label>
                              <Input
                                id="directBillableWeight"
                                value={directBillableWeight}
                                onChange={handleDirectBillableWeightChange}
                                placeholder={t('priceCalculator.enterBillableWeight')}
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                {t('priceCalculator.billableWeightDescription')}
                              </p>
                            </div>
                          )}
                          
                          {/* Weight calculations info card */}
                          <div className="border rounded-md p-4 bg-gray-50 mt-4">
                            <h3 className="text-sm font-medium mb-2">{t('priceCalculator.weightCalculation')}</h3>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-600">{t('priceCalculator.actualWeight')}</span>
                              <span>{packageDetails.weight ? `${packageDetails.weight} kg` : "-"}</span>
                              
                              <span className="text-gray-600">{t('priceCalculator.volumetricWeight')}</span>
                              <span>{volumetricWeight ? `${volumetricWeight} kg` : "-"}</span>
                              
                              <span className="text-gray-600 font-medium">{t('priceCalculator.billableWeight')}</span>
                              <span className="font-medium">
                                {useBillableWeightDirect && directBillableWeight 
                                  ? `${parseFloat(directBillableWeight).toFixed(2)} kg (${t('priceCalculator.manual')})` 
                                  : billableWeight 
                                    ? `${billableWeight} kg` 
                                    : "-"}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-2">
                              {t('priceCalculator.billableWeightNote')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side - Destination & Service Details */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{t('priceCalculator.shippingDetails')}</h3>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="receiverCountry" className="text-sm font-medium text-gray-700">{t('priceCalculator.destinationCountry')}</Label>
                              <Select 
                                value={packageDetails.receiverCountry} 
                                onValueChange={handleCountryChange}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder={t('priceCalculator.selectCountry')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((country: Country) => (
                                    <SelectItem key={country.code} value={country.code}>
                                      {country.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Service Level selection is hidden and fixed to Express */}
                            <div className="hidden">
                              <input 
                                type="hidden" 
                                value={ServiceLevel.EXPRESS} 
                                id="serviceLevel"
                              />
                            </div>
                            
                            {/* Show MoogShip pricing options after calculation */}
                            {priceResult && priceResult.success && priceResult.options && (
                              <div className="mt-6 space-y-4">
                                <div className="text-center mb-6">
                                  <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your MoogShip Service</h3>
                                  <p className="text-sm text-gray-600">Select the shipping option that best fits your needs</p>
                                </div>
                                
                                <div className="grid gap-4">
                                  {priceResult.options.map((option: any, index: number) => {
                                    const isEconomy = option.displayName.toLowerCase().includes('eco');
                                    const isExpress = option.displayName.toLowerCase().includes('express');
                                    const isGLS = option.displayName.toLowerCase().includes('gls');
                                    const isStandard = !isEconomy && !isExpress && !isGLS;
                                    
                                    let badgeColor = 'bg-blue-100 text-blue-800';
                                    let borderColor = 'border-gray-200 hover:border-blue-300';
                                    let bgGradient = 'bg-white hover:bg-gray-50';
                                    
                                    if (isEconomy) {
                                      badgeColor = 'bg-green-100 text-green-800';
                                      borderColor = 'border-green-200 hover:border-green-300';
                                      bgGradient = 'bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-gray-50';
                                    } else if (isExpress) {
                                      badgeColor = 'bg-red-100 text-red-800';
                                      borderColor = 'border-red-200 hover:border-red-300';
                                      bgGradient = 'bg-gradient-to-r from-red-50 to-white hover:from-red-100 hover:to-gray-50';
                                    } else if (isGLS) {
                                      badgeColor = 'bg-indigo-100 text-indigo-800';
                                      borderColor = 'border-indigo-200 hover:border-indigo-300';
                                      bgGradient = 'bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100 hover:to-gray-50';
                                    } else if (isStandard) {
                                      badgeColor = 'bg-blue-100 text-blue-800';
                                      borderColor = 'border-blue-200 hover:border-blue-300';
                                      bgGradient = 'bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-gray-50';
                                    }
                                    
                                    return (
                                      <div
                                        key={`${option.id}-${index}`}
                                        className={`relative border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer ${borderColor} ${bgGradient} shadow-sm hover:shadow-md`}
                                      >
                                        {/* Service type badge */}
                                        <div className="absolute top-4 right-4">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                            {isEconomy ? 'Economy' : isExpress ? 'Express' : isGLS ? 'GLS' : 'Standard'}
                                          </span>
                                        </div>
                                        
                                        <div className="pr-16">
                                          <h4 className="text-xl font-bold text-gray-900 mb-2">{option.displayName}</h4>
                                          <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm font-medium text-gray-700">{option.deliveryTime}</p>
                                          </div>
                                          {option.description && (
                                            <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                                          )}
                                        </div>
                                        
                                        {/* Price section */}
                                        <div className="border-t pt-4 mt-4">
                                          <div className="flex items-end justify-between">
                                            <div>
                                              <p className="text-sm text-gray-600 mb-1">Total Price</p>
                                              <p className="text-3xl font-bold text-primary">${(option.totalPrice / 100).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right text-sm text-gray-500">
                                              <p>Base: ${(option.cargoPrice / 100).toFixed(2)}</p>
                                              <p>Fuel: ${(option.fuelCost / 100).toFixed(2)}</p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Selection indicator */}
                                        <div className="absolute inset-0 rounded-xl border-2 border-transparent hover:border-primary/50 transition-colors pointer-events-none"></div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Shipping route information */}
                                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                  <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-800">
                                      <h4 className="font-semibold mb-2">Shipping Route Details</h4>
                                      <div className="space-y-1">
                                        <p><span className="font-medium">Origin:</span> Istanbul, Turkey</p>
                                        <p><span className="font-medium">Destination:</span> {
                                          packageDetails.receiverCountry ? 
                                            COUNTRIES.find((c: Country) => c.code === packageDetails.receiverCountry)?.name : 
                                            'Selected Country'
                                        }</p>
                                        {billableWeight && (
                                          <p><span className="font-medium">Billable Weight:</span> {billableWeight.toFixed(2)} kg</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={calculatePrice} 
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('priceCalculator.calculating')}
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          {t('priceCalculator.calculatePrice')}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Important Note Card - Takes up 1/3 of the space on large screens, placed alongside the calculator */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{t('priceCalculator.importantNote')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm overflow-auto max-h-[500px]">
                    <div className="space-y-3">
                      <p>
                        {t('priceCalculator.girthExceeding')}
                      </p>
                      
                      <div className="ml-2">
                        <p className="font-medium mb-1">{t('priceCalculator.girthCalculation')}</p>
                        <p className="bg-gray-50 p-2 rounded border text-sm">{t('priceCalculator.girthFormula')}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium mb-1">{t('priceCalculator.upsShipments')}</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                          <li>{t('priceCalculator.upsRule1')}</li>
                          <li>{t('priceCalculator.upsRule2')}</li>
                          <li>{t('priceCalculator.upsRule3')}</li>
                          <li>{t('priceCalculator.upsRule4')}</li>
                          <li>{t('priceCalculator.upsRule5')}</li>
                          <li>{t('priceCalculator.upsRule6')}</li>
                        </ul>
                      </div>
                      
                      <p>{t('priceCalculator.profitabilityCalculator')} <a href="/profitability-calculator" className="text-primary hover:underline font-medium">{t('priceCalculator.here')}</a>.</p>
                      
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                        <p className="font-medium text-blue-800 mb-1 text-sm">{t('priceCalculator.additionalInformation')}</p>
                        <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                          <li>{t('priceCalculator.ecoServiceNote')}</li>
                          <li>{t('priceCalculator.ecoFallbackNote')}</li>
                          <li>{t('priceCalculator.customsNote')}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* After calculation, add action buttons directly */}
              {priceResult && (
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setPriceResult(null);
                    }}
                  >
                    Calculate Another
                  </Button>
                  <Button asChild>
                    <a href="/shipment-create">
                      Create Shipment <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(PriceCalculatorContent);