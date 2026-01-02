import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calculator, Loader2, ArrowRight, HelpCircle, Check, ChevronsUpDown } from 'lucide-react';
import Layout from '@/components/layout';
import { withAuth } from '@/lib/with-auth';
import { COUNTRIES } from '@/lib/countries';
import { usePriceCalculator } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';


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
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  
  const priceCalculator = usePriceCalculator();
  const {
    packageDetails,
    directBillableWeight,
    useBillableWeightDirect,
    volumetricWeight,
    billableWeight,
    priceResult,
    validationError,
    isCalculating,
    handleInputChange,
    handleCountryChange,
    handleDirectBillableWeightChange,
    toggleBillableWeightMode,
    calculatePrice,
    setPriceResult,
    setValidationError
  } = priceCalculator;

  return (
    <TooltipProvider>
      <Layout user={user}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto py-8 px-4">
            <div className="max-w-6xl mx-auto">

              
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto">
                {/* Calculator Card - Full width with tooltip help */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-50 border-b border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl text-gray-900">{t('priceCalculator.calculateShippingCost')}</CardTitle>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md p-4 max-h-80 overflow-y-auto">
                              <div className="space-y-3 text-sm">
                                <p className="font-medium">
                                  {t('priceCalculator.importantNote')}
                                </p>
                                <p>
                                  {t('priceCalculator.girthExceeding')}
                                </p>
                                
                                <div>
                                  <p className="font-medium mb-1">{t('priceCalculator.girthCalculation')}</p>
                                  <p className="bg-gray-50 p-2 rounded border text-xs">{t('priceCalculator.girthFormula')}</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium mb-1">{t('priceCalculator.upsShipments')}</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>{t('priceCalculator.upsRule1')}</li>
                                    <li>{t('priceCalculator.upsRule2')}</li>
                                    <li>{t('priceCalculator.upsRule3')}</li>
                                    <li>{t('priceCalculator.upsRule4')}</li>
                                    <li>{t('priceCalculator.upsRule5')}</li>
                                    <li>{t('priceCalculator.upsRule6')}</li>
                                  </ul>
                                </div>
                                
                                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                  <p className="font-medium text-blue-800 mb-1 text-xs">{t('priceCalculator.additionalInformation')}</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                                    <li>{t('priceCalculator.ecoServiceNote')}</li>
                                    <li>{t('priceCalculator.ecoFallbackNote')}</li>
                                    <li>{t('priceCalculator.customsNote')}</li>
                                  </ul>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <CardDescription className="text-gray-600 mt-1">
                          {t('priceCalculator.enterPackageDetails')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* All inputs in same row: Destination | Length | Width | Height | Weight */}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Destination Country - spans full width on small screens, 2 cols on medium, 1 col on large */}
                            <div className="sm:col-span-2 lg:col-span-1">
                              <Label htmlFor="receiverCountry" className="text-sm font-medium text-gray-700">{t('priceCalculator.destinationCountry')}</Label>
                              <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={countrySearchOpen}
                                    className="mt-1 h-10 w-full justify-between"
                                  >
                                    {packageDetails.receiverCountry 
                                      ? COUNTRIES.find((country) => country.code === packageDetails.receiverCountry)?.name
                                      : t('priceCalculator.selectCountry')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search countries..." />
                                    <CommandEmpty>No country found.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-auto">
                                      {COUNTRIES.map((country: Country) => (
                                        <CommandItem
                                          key={country.code}
                                          value={country.name}
                                          onSelect={() => {
                                            handleCountryChange(country.code);
                                            setCountrySearchOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              packageDetails.receiverCountry === country.code ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {country.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            {/* Length */}
                            <div>
                              <Label htmlFor="packageLength">{t('priceCalculator.lengthCm')}</Label>
                              <Input
                                id="packageLength"
                                name="packageLength"
                                type="text"
                                placeholder={t('priceCalculator.lengthCm')}
                                value={packageDetails.packageLength || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleInputChange('packageLength', value);
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                            
                            {/* Width */}
                            <div>
                              <Label htmlFor="packageWidth">{t('priceCalculator.widthCm')}</Label>
                              <Input
                                id="packageWidth"
                                name="packageWidth"
                                type="text"
                                placeholder={t('priceCalculator.widthCm')}
                                value={packageDetails.packageWidth || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleInputChange('packageWidth', value);
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                            
                            {/* Height */}
                            <div>
                              <Label htmlFor="packageHeight">{t('priceCalculator.heightCm')}</Label>
                              <Input
                                id="packageHeight"
                                name="packageHeight"
                                type="text"
                                placeholder={t('priceCalculator.heightCm')}
                                value={packageDetails.packageHeight || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleInputChange('packageHeight', value);
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                            
                            {/* Weight */}
                            <div>
                              <Label htmlFor="packageWeight">{t('priceCalculator.weightKg')}</Label>
                              <Input
                                id="packageWeight"
                                name="packageWeight"
                                type="text"
                                placeholder={t('priceCalculator.weightKg')}
                                value={packageDetails.packageWeight || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleInputChange('packageWeight', value);
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        ) : (
                          // Show direct billable weight input field with destination
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Destination Country */}
                            <div>
                              <Label htmlFor="receiverCountry" className="text-sm font-medium text-gray-700">{t('priceCalculator.destinationCountry')}</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="mt-1 h-10 w-full justify-between"
                                  >
                                    {packageDetails.receiverCountry
                                      ? COUNTRIES.find((country: Country) => country.code === packageDetails.receiverCountry)?.name
                                      : t('priceCalculator.selectCountry')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder={t('priceCalculator.searchCountry')} />
                                    <CommandList>
                                      <CommandEmpty>{t('priceCalculator.noCountryFound')}</CommandEmpty>
                                      <CommandGroup>
                                        {COUNTRIES.map((country: Country) => (
                                          <CommandItem
                                            key={country.code}
                                            value={country.name}
                                            onSelect={() => {
                                              handleCountryChange(country.code);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                packageDetails.receiverCountry === country.code ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {country.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            {/* Direct Billable Weight */}
                            <div>
                              <Label htmlFor="directBillableWeight">{t('priceCalculator.billableWeightKg')}</Label>
                              <Input
                                id="directBillableWeight"
                                type="text"
                                value={directBillableWeight || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numeric input with decimal point
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleDirectBillableWeightChange(value);
                                  }
                                }}
                                placeholder={t('priceCalculator.enterBillableWeight')}
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                {t('priceCalculator.billableWeightDescription')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Weight Information Row - Directly under input fields */}
                        {!useBillableWeightDirect && (
                          (typeof packageDetails.packageWeight === 'string' ? parseFloat(packageDetails.packageWeight) || 0 : packageDetails.packageWeight) > 0 || 
                          (typeof packageDetails.packageLength === 'string' ? parseFloat(packageDetails.packageLength) || 0 : packageDetails.packageLength) > 0 || 
                          (typeof packageDetails.packageWidth === 'string' ? parseFloat(packageDetails.packageWidth) || 0 : packageDetails.packageWidth) > 0 || 
                          (typeof packageDetails.packageHeight === 'string' ? parseFloat(packageDetails.packageHeight) || 0 : packageDetails.packageHeight) > 0
                        ) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {/* Weight Values Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                              {/* Actual Weight */}
                              <div className="flex items-center justify-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                <div className="p-0.5 bg-green-100 rounded">
                                  <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9" />
                                  </svg>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-green-800">{t('priceCalculator.actualWeight')}</span>
                                  <span className="text-sm font-bold text-green-900">
                                    {packageDetails.packageWeight ? `${packageDetails.packageWeight} kg` : "-"}
                                  </span>
                                </div>
                              </div>

                              {/* Volumetric Weight */}
                              <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="p-0.5 bg-blue-100 rounded">
                                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-blue-800">{t('priceCalculator.volumetricWeight')}</span>
                                  <span className="text-sm font-bold text-blue-900">
                                    {volumetricWeight ? `${volumetricWeight.toFixed(2)} kg` : "-"}
                                  </span>
                                </div>
                              </div>

                              {/* Billable Weight */}
                              <div className="flex items-center justify-center gap-2 p-2 bg-purple-50 rounded border-2 border-purple-300">
                                <div className="p-0.5 bg-purple-100 rounded">
                                  <svg className="w-2.5 h-2.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-purple-800">{t('priceCalculator.billableWeight')}</span>
                                  <span className="text-sm font-bold text-purple-900">
                                    {billableWeight ? `${billableWeight.toFixed(2)} kg` : "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Calculation Explanations as Tooltip */}
                            <div className="flex justify-center mt-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Ağırlık hesaplama detayları
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm p-3">
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-green-700">Gerçek Ağırlık:</span> Girilen ağırlık
                                    </div>
                                    <div>
                                      <span className="font-medium text-blue-700">Hacimsel Ağırlık:</span> U × G × Y ÷ 5000
                                      {packageDetails.packageLength && packageDetails.packageWidth && packageDetails.packageHeight && (
                                        <div className="text-gray-600 mt-1">
                                          {packageDetails.packageLength} × {packageDetails.packageWidth} × {packageDetails.packageHeight} ÷ 5000 = {volumetricWeight?.toFixed(2)} kg
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-medium text-purple-700">Faturalandırılabilir Ağırlık:</span> Gerçek ağırlık ve hacimsel ağırlığın yüksek olanı
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )}
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
                        <div className="mt-6 space-y-3">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('priceCalculator.chooseService')}</h3>
                            <p className="text-xs text-gray-600">{t('priceCalculator.selectBestOption')}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {priceResult.options.map((option: any, index: number) => {
                              // Detect service type from display name - use correct backend data
                              const displayName = option.displayName.toLowerCase();
                              const isEco = displayName.includes('eco');
                              const isExpress = displayName.includes('express');
                              const isUPS = displayName.includes('ups');
                              const isDHL = displayName.includes('dhl');
                              const isFedEx = displayName.includes('fedex');
                              const isGLS = displayName.includes('gls');
                              const isAramex = displayName.includes('aramex');
                              const isWidect = displayName.includes('standard') && !isExpress;
                              

                              
                              let badgeColor = 'bg-blue-100 text-blue-800';
                              let borderColor = 'border-gray-200 hover:border-blue-300';
                              let bgGradient = 'bg-white hover:bg-gray-50';
                              
                              if (isEco) {
                                badgeColor = 'bg-green-100 text-green-800';
                                borderColor = 'border-green-200 hover:border-green-300';
                                bgGradient = 'bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-gray-50';
                              } else if (isExpress) {
                                badgeColor = 'bg-orange-100 text-orange-800';
                                borderColor = 'border-orange-200 hover:border-orange-300';
                                bgGradient = 'bg-gradient-to-r from-orange-50 to-white hover:from-orange-100 hover:to-gray-50';
                              } else if (isUPS) {
                                badgeColor = 'bg-yellow-100 text-yellow-800';
                                borderColor = 'border-yellow-200 hover:border-yellow-300';
                                bgGradient = 'bg-gradient-to-r from-yellow-50 to-white hover:from-yellow-100 hover:to-gray-50';
                              } else if (isDHL) {
                                badgeColor = 'bg-red-100 text-red-800';
                                borderColor = 'border-red-200 hover:border-red-300';
                                bgGradient = 'bg-gradient-to-r from-red-50 to-white hover:from-red-100 hover:to-gray-50';
                              } else if (isFedEx) {
                                badgeColor = 'bg-purple-100 text-purple-800';
                                borderColor = 'border-purple-200 hover:border-purple-300';
                                bgGradient = 'bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-gray-50';
                              } else if (isAramex) {
                                badgeColor = 'bg-rose-100 text-rose-800';
                                borderColor = 'border-rose-200 hover:border-rose-300';
                                bgGradient = 'bg-gradient-to-r from-rose-50 to-white hover:from-rose-100 hover:to-gray-50';
                              } else if (isGLS) {
                                badgeColor = 'bg-indigo-100 text-indigo-800';
                                borderColor = 'border-indigo-200 hover:border-indigo-300';
                                bgGradient = 'bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100 hover:to-gray-50';
                              } else if (isWidect) {
                                badgeColor = 'bg-blue-100 text-blue-800';
                                borderColor = 'border-blue-200 hover:border-blue-300';
                                bgGradient = 'bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-gray-50';
                              }
                              
                              return (
                                <div
                                  key={`${option.id}-${index}`}
                                  className={`relative border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer ${borderColor} ${bgGradient} shadow-sm hover:shadow-md`}
                                >
                                  {/* Service type badge */}
                                  <div className="absolute top-2 right-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                      {isEco ? 'Eco' : isExpress ? 'Express' : isUPS ? 'UPS' : isDHL ? 'DHL' : isFedEx ? 'FedEx' : isAramex ? 'Aramex' : isGLS ? 'GLS' : isWidect ? 'Standard' : 'Standard'}
                                    </span>
                                  </div>
                                  
                                  <div className="pr-14">
                                    {/* Carrier Logo and Service Name */}
                                    <div className="flex items-center gap-2 mb-1">
                                      
                                      
                                      
                                      <h4 className="text-sm font-bold text-gray-900">
                                        {option.displayName}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <p className="text-xs text-gray-700">{option.deliveryTime}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Price section */}
                                  <div className="border-t pt-2 mt-2">
                                    {/* DAP/DDP Selector for US destinations */}
                                    {packageDetails.receiverCountry === 'US' && (priceResult?.duties?.available || (priceResult?.duties && (priceResult.duties.duty > 0 || priceResult.duties.total > 0))) && (
                                      <div className="mb-3 p-2 bg-gray-50 rounded border">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="p-0.5 bg-blue-100 rounded">
                                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                            </svg>
                                          </div>
                                          <span className="text-xs font-medium text-gray-700">Shipping Terms</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            className={`p-2 text-xs rounded border transition-all ${
                                              (packageDetails.shippingTerms || 'dap') === 'dap'
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                            }`}
                                            onClick={() => handleInputChange('shippingTerms', 'dap')}
                                          >
                                            <div className="font-medium">DAP</div>
                                            <div className="text-xs opacity-80">Receiver pays</div>
                                          </button>
                                          <button
                                            type="button"
                                            className={`p-2 text-xs rounded border transition-all ${
                                              packageDetails.shippingTerms === 'ddp'
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                            }`}
                                            onClick={() => handleInputChange('shippingTerms', 'ddp')}
                                          >
                                            <div className="font-medium">DDP</div>
                                            <div className="text-xs opacity-80">Sender pays</div>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Admin Cost View */}
                                    {user?.role === 'admin' && option.originalTotalPrice && (
                                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium text-red-700">Cost (Base):</span>
                                          <span className="font-bold text-red-800">${(option.originalTotalPrice / 100).toFixed(2)}</span>
                                        </div>
                                        {option.originalTotalPrice !== option.totalPrice && (
                                          <div className="flex justify-between items-center mt-1">
                                            <span className="font-medium text-green-700">Margin:</span>
                                            <span className="font-bold text-green-800">
                                              ${((option.totalPrice - option.originalTotalPrice) / 100).toFixed(2)}
                                              <span className="text-green-600 ml-1">
                                                ({(((option.totalPrice - option.originalTotalPrice) / option.originalTotalPrice) * 100).toFixed(1)}%)
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-end justify-between">
                                      <div>
                                        <p className="text-xs text-gray-600 mb-0.5">Total Shipment Cost</p>
                                        {(() => {
                                          // Calculate total based on shipping terms for US destinations
                                          const basePriceCents = option.totalPrice;
                                          const dutiesData = priceResult?.duties;
                                          
                                          if (packageDetails.receiverCountry === 'US' && (dutiesData?.available || (dutiesData && (dutiesData.duty > 0 || dutiesData.total > 0)))) {
                                            const dutyAmount = dutiesData.duty || dutiesData.total || 0;
                                            // Check if ECO shipping based on displayName
                                            const isEcoShipping = option.displayName && 
                                              (option.displayName.toLowerCase().includes('eco') || option.displayName.toLowerCase().includes('eko'));
                                            const ddpProcessingFee = packageDetails.shippingTerms === 'ddp' ? 
                                              (isEcoShipping ? 45 : 450) : 0; // ECO: $0.45, Standard: $4.50
                                            
                                            if (packageDetails.shippingTerms === 'ddp') {
                                              // DDP: Include duties + processing fee in total
                                              const totalWithDuties = basePriceCents + dutyAmount + ddpProcessingFee;
                                              return (
                                                <div>
                                                  <p className="text-lg font-bold text-primary">${(totalWithDuties / 100).toFixed(2)}</p>
                                                  <p className="text-xs text-gray-500">Includes duties + ${(ddpProcessingFee / 100).toFixed(2)} processing fee</p>
                                                </div>
                                              );
                                            } else {
                                              // DAP: Show base price, duties for info only
                                              return (
                                                <div>
                                                  <p className="text-lg font-bold text-primary">${(basePriceCents / 100).toFixed(2)}</p>
                                                  <p className="text-xs text-orange-600">+ ${(dutyAmount / 100).toFixed(2)} duties (paid by receiver)</p>
                                                </div>
                                              );
                                            }
                                          } else {
                                            // Non-US or no duties: Show base price only
                                            return <p className="text-lg font-bold text-primary">${(basePriceCents / 100).toFixed(2)}</p>;
                                          }
                                        })()}
                                      </div>
                                      <div className="text-right text-xs text-gray-500">
                                        <p>{t('priceCalculator.base')}: ${(option.cargoPrice / 100).toFixed(2)}</p>
                                        <p>{t('priceCalculator.fuel')}: ${(option.fuelCost / 100).toFixed(2)}</p>
                                        {option.additionalFee && option.additionalFee > 0 && (
                                          <p>{t('priceCalculator.additionalFee', 'Additional Fee')}: ${(option.additionalFee / 100).toFixed(2)}</p>
                                        )}
                                        {packageDetails.receiverCountry === 'US' && (priceResult?.duties?.available || (priceResult?.duties && (priceResult.duties.duty > 0 || priceResult.duties.total > 0))) && packageDetails.shippingTerms === 'ddp' && (
                                          <>
                                            <p className="text-blue-600">Duties: ${((priceResult.duties.duty || priceResult.duties.total || 0) / 100).toFixed(2)}</p>
                                            <p className="text-blue-600">DDP Fee: ${((option.displayName && 
                                              (option.displayName.toLowerCase().includes('eco') || option.displayName.toLowerCase().includes('eko')) ? 45 : 450) / 100).toFixed(2)}</p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Selection indicator */}
                                  <div className="absolute inset-0 rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors pointer-events-none"></div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Shipping route information */}
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="text-xs text-blue-800">
                                <h4 className="font-semibold mb-1">{t('priceCalculator.shippingRouteDetails')}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                  <p><span className="font-medium">{t('priceCalculator.origin')}:</span> Turkey</p>
                                  <p><span className="font-medium">{t('priceCalculator.destination')}:</span> {
                                    packageDetails.receiverCountry ? 
                                      COUNTRIES.find((c: Country) => c.code === packageDetails.receiverCountry)?.name : 
                                      t('priceCalculator.selectedCountry')
                                  }</p>
                                  {billableWeight > 0 && (
                                    <p><span className="font-medium">{t('priceCalculator.billableWeightLabel')}:</span> {billableWeight.toFixed(2)} kg</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Duty and Tax Information */}
                      {priceResult?.options?.length > 0 && packageDetails.receiverCountry && packageDetails.receiverCountry !== 'TR' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-red-100 rounded-lg">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Estimated Duties & Taxes</h3>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-md p-3">
                                <p className="text-sm">
                                  Estimated import duties and taxes for international shipments. 
                                  Final amounts may vary based on customs inspection and actual product classification.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Check if duties data is available from API response */}
                          {(() => {
                            // Get duties from the API response - stored in options or direct duties field
                            const dutiesData = priceResult.duties || priceResult.options?.[0]?.duties;
                            
                            if (dutiesData?.available) {
                              return (
                                <div className="space-y-3">
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                    <div className="flex items-start gap-3">
                                      <div className="p-1 bg-blue-100 rounded">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-blue-900 text-sm">
                                          {dutiesData.provider === 'USITC' ? 'Official US Duty Rates' : `${dutiesData.provider} Estimate`}
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2 text-xs">
                                          {dutiesData.provider === 'USITC' && (
                                            <>
                                              <div>
                                                <span className="text-blue-700 font-medium">Base Duty:</span>
                                                <p className="text-blue-800 font-semibold">
                                                  {dutiesData.baseDutyFormatted || `$${((dutiesData.baseDutyAmount || 0) / 100).toFixed(2)}`}
                                                </p>
                                                <p className="text-blue-600 text-xs">
                                                  {dutiesData.baseDutyRate ? `${(dutiesData.baseDutyRate * 100).toFixed(1)}%` : '0%'}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-blue-700 font-medium">Trump Tariff:</span>
                                                <p className="text-blue-800 font-semibold">
                                                  {dutiesData.trumpTariffFormatted || `$${((dutiesData.trumpTariffAmount || 0) / 100).toFixed(2)}`}
                                                </p>
                                                <p className="text-blue-600 text-xs">15.0%</p>
                                              </div>
                                              <div>
                                                <span className="text-blue-700 font-medium">Total Rate:</span>
                                                <p className="text-blue-800 font-semibold">
                                                  {dutiesData.totalDutyRate ? `${(dutiesData.totalDutyRate * 100).toFixed(1)}%` : 'N/A'}
                                                </p>
                                              </div>
                                            </>
                                          )}
                                          <div>
                                            <span className="text-blue-700 font-medium">Total Duties:</span>
                                            <p className="text-blue-800 font-bold text-sm">
                                              {dutiesData.dutyFormatted || dutiesData.totalFormatted || `$${((dutiesData.duty || dutiesData.total || 0) / 100).toFixed(2)}`}
                                            </p>
                                          </div>
                                        </div>
                                        {dutiesData.message && (
                                          <p className="text-blue-700 text-xs mt-2">{dutiesData.message}</p>
                                        )}
                                        {dutiesData.hsCode && (
                                          <p className="text-blue-600 text-xs mt-1">
                                            HS Code: {dutiesData.hsCode} | Customs Value: ${dutiesData.customsValue}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 italic">
                                    {dutiesData.note || 'Estimates only - final amounts determined by customs'}
                                  </p>
                                </div>
                              );
                            } else if (dutiesData?.available === false) {
                              return (
                                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-yellow-800">Duty calculation not available</p>
                                      <p className="text-xs text-yellow-700 mt-1">
                                        {dutiesData.message || 'Unable to calculate duties for this destination or product'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-gray-600">
                                      Add product information above to calculate duties and taxes
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Product Information Section - for duty calculations */}
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Product Information</h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md p-3">
                              <p className="text-sm">
                                Product details help calculate accurate customs duties and taxes for international shipments. 
                                HS codes provide the most precise duty calculations.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Product Name */}
                          <div>
                            <Label htmlFor="productName" className="text-sm font-medium text-gray-700">Product Name</Label>
                            <Input
                              id="productName"
                              name="productName"
                              type="text"
                              placeholder="e.g., Wireless Headphones"
                              value={packageDetails.productName || ''}
                              onChange={(e) => handleInputChange('productName', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          
                          {/* HS Code */}
                          <div>
                            <Label htmlFor="hsCode" className="text-sm font-medium text-gray-700">HS Code (Optional)</Label>
                            <Input
                              id="hsCode"
                              name="hsCode"
                              type="text"
                              placeholder="e.g., 8518.30.00"
                              value={packageDetails.hsCode || ''}
                              onChange={(e) => handleInputChange('hsCode', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          
                          {/* Customs Value */}
                          <div>
                            <Label htmlFor="customsValue" className="text-sm font-medium text-gray-700">Customs Value ($USD)</Label>
                            <Input
                              id="customsValue"
                              name="customsValue"
                              type="text"
                              placeholder="e.g., 150"
                              value={packageDetails.customsValue || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  handleInputChange('customsValue', value ? parseFloat(value) : undefined);
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        {/* Product Description */}
                        <div className="mt-4">
                          <Label htmlFor="productDescription" className="text-sm font-medium text-gray-700">Product Description (Optional)</Label>
                          <Input
                            id="productDescription"
                            name="productDescription"
                            type="text"
                            placeholder="e.g., Bluetooth wireless over-ear headphones with noise cancellation"
                            value={packageDetails.productDescription || ''}
                            onChange={(e) => handleInputChange('productDescription', e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        {/* Shipping Terms for US destinations */}
                        {packageDetails.receiverCountry === 'US' && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-blue-100 rounded-lg">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Shipping Terms</h3>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md p-3">
                                  <p className="text-sm">
                                    Choose who pays customs duties:<br/>
                                    • <strong>DAP</strong>: Receiver pays duties at delivery<br/>
                                    • <strong>DDP</strong>: Sender pays duties (includes processing fee)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div 
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  (packageDetails.shippingTerms || 'dap') === 'dap' 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleInputChange('shippingTerms', 'dap')}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border-2 ${
                                    (packageDetails.shippingTerms || 'dap') === 'dap' 
                                      ? 'border-blue-500 bg-blue-500' 
                                      : 'border-gray-300'
                                  }`}>
                                    {(packageDetails.shippingTerms || 'dap') === 'dap' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">DAP (Delivered at Place)</h4>
                                    <p className="text-sm text-gray-600">Receiver pays duties at delivery</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div 
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  packageDetails.shippingTerms === 'ddp' 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleInputChange('shippingTerms', 'ddp')}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border-2 ${
                                    packageDetails.shippingTerms === 'ddp' 
                                      ? 'border-blue-500 bg-blue-500' 
                                      : 'border-gray-300'
                                  }`}>
                                    {packageDetails.shippingTerms === 'ddp' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">DDP (Delivered Duty Paid)</h4>
                                    <p className="text-sm text-gray-600">Sender pays duties + processing fee</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Validation Error Display */}
                  {validationError && (
                    <div className="px-6 pb-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 mb-1">
                            {t('priceCalculator.validationErrorTitle')}
                          </p>
                          <p className="text-sm text-red-700">
                            {(() => {
                              if (!validationError) return '';
                              
                              if (validationError.includes(',')) {
                                // Multiple fields
                                const fields = validationError.split(', ').map(field => 
                                  t(`priceCalculator.validationFields.${field}`, field)
                                ).join(', ');
                                return `${t('priceCalculator.validationError')}: ${fields}`;
                              } else {
                                // Single field
                                const translatedField = t(`priceCalculator.validationFields.${validationError}`, validationError);
                                return `${t('priceCalculator.validationError')}: ${translatedField}`;
                              }
                            })()}
                          </p>
                        </div>
                        <button 
                          onClick={() => setValidationError(null)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  
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
                    {t('priceCalculator.calculateAnother')}
                  </Button>
                  <Button asChild>
                    <a href="/shipment-create">
                      {t('priceCalculator.createShipment')} <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
    </TooltipProvider>
  );
}

export default withAuth(PriceCalculatorContent);