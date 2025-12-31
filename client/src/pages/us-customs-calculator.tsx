import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Globe, DollarSign, FileText, Info, ChevronRight } from 'lucide-react';
import { withAuth } from '@/lib/with-auth';
import { Link } from 'wouter';
import { HSCodeInput } from '@/components/hs-code-input';

const customsCalculatorSchema = z.object({
  hsCode: z.string().min(6, 'HS Code must be at least 6 digits').max(10, 'HS Code must be at most 10 digits'),
  customsValue: z.coerce.number().min(1, 'Customs value must be at least $1').max(1000000, 'Customs value must be less than $1,000,000'),
  shippingTerms: z.enum(['dap', 'ddp'], {
    required_error: 'Please select shipping terms'
  }),
  shippingMethod: z.enum(['standard', 'eco'], {
    required_error: 'Please select shipping method'
  }).default('standard'),
});

type CustomsCalculatorForm = z.infer<typeof customsCalculatorSchema>;

interface CustomsResult {
  hsCode: string;
  description: string;
  dutyRate: {
    text: string;
    percentage: number;
  };
  calculation: {
    customsValue: number;
    baseDutyAmount: number;
    trumpTariffAmount: number;
    totalDutyAmount: number;
    ddpProcessingFee?: number;
    totalWithProcessingFee?: number;
  };
  shippingTerms: string;
}

function USCustomsCalculatorContent({ user }: { user: any }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CustomsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CustomsCalculatorForm>({
    resolver: zodResolver(customsCalculatorSchema),
    defaultValues: {
      shippingTerms: 'dap',
      shippingMethod: 'standard',
    },
  });

  const onSubmit = async (data: CustomsCalculatorForm) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/duty-rates/usitc?hsCode=${data.hsCode}&customsValue=${data.customsValue}`);
      const dutyData = await response.json();

      if (!response.ok || !dutyData.success) {
        throw new Error(dutyData.message || 'Failed to calculate customs duties');
      }

      // Calculate DDP processing fee if selected
      // ECO shipping: $0.45, Standard shipping: $4.50
      const ddpProcessingFee = data.shippingTerms === 'ddp' ? 
        (data.shippingMethod === 'eco' ? 45 : 450) : 0; // 45 cents for ECO, $4.50 for standard
      const totalWithProcessingFee = dutyData.calculation.totalDutyAmount + ddpProcessingFee;

      setResult({
        hsCode: dutyData.hsCode,
        description: dutyData.description,
        dutyRate: dutyData.dutyRate,
        calculation: {
          ...dutyData.calculation,
          ddpProcessingFee: ddpProcessingFee,
          totalWithProcessingFee: totalWithProcessingFee,
        },
        shippingTerms: data.shippingTerms,
      });
    } catch (error) {
      console.error('Error calculating customs duties:', error);
      setError(error instanceof Error ? error.message : 'Failed to calculate customs duties');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout user={user}>
      <div className="container mx-auto py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-primary">
              {t('customsCalculator.breadcrumb.dashboard')}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>{t('customsCalculator.title')}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {t('customsCalculator.title')}
              </h1>
              <p className="mt-1 text-lg text-gray-600">
                {t('customsCalculator.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Information Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {t('customsCalculator.description')}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>{t('customsCalculator.form.calculate')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="hsCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customsCalculator.form.hsCode')}</FormLabel>
                        <FormControl>
                          <HSCodeInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('customsCalculator.form.hsCodePlaceholder')}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t('customsCalculator.form.hsCodeHelp')}
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customsValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customsCalculator.form.customsValue')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              placeholder={t('customsCalculator.form.customsValuePlaceholder')}
                              {...field}
                              className="pl-10"
                              step="0.01"
                              min="1"
                              max="1000000"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t('customsCalculator.form.customsValueHelp')}
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customsCalculator.form.shippingMethod')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('customsCalculator.form.shippingMethodPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">
                              <div className="flex flex-col">
                                <span className="font-medium">{t('customsCalculator.form.standard')}</span>
                                <span className="text-xs text-muted-foreground">{t('customsCalculator.form.standardDescription')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="eco">
                              <div className="flex flex-col">
                                <span className="font-medium">{t('customsCalculator.form.eco')}</span>
                                <span className="text-xs text-muted-foreground">{t('customsCalculator.form.ecoDescription')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customsCalculator.form.shippingTerms')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('customsCalculator.form.shippingTermsPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="dap">
                              <div className="flex flex-col">
                                <span className="font-medium">{t('customsCalculator.form.dap')}</span>
                                <span className="text-xs text-muted-foreground">{t('customsCalculator.form.dapDescription')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="ddp">
                              <div className="flex flex-col">
                                <span className="font-medium">{t('customsCalculator.form.ddp')}</span>
                                <span className="text-xs text-muted-foreground">{t('customsCalculator.form.ddpDescription')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('customsCalculator.form.calculating') : t('customsCalculator.form.calculate')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{t('customsCalculator.results.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {result && (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">{t('customsCalculator.results.productInfo')}</h3>
                    <p className="text-sm"><strong>{t('customsCalculator.results.hsCode')}:</strong> {result.hsCode}</p>
                    <p className="text-sm"><strong>{t('customsCalculator.results.description')}:</strong> {result.description}</p>
                    <p className="text-sm"><strong>{t('customsCalculator.results.dutyRate')}:</strong> {result.dutyRate.text}</p>
                    <p className="text-sm"><strong>{t('customsCalculator.results.shippingTerms')}:</strong> {result.shippingTerms.toUpperCase()}</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">{t('customsCalculator.results.breakdown')}</h3>
                    
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm">{t('customsCalculator.results.customsValue')}:</span>
                      <span className="text-sm font-medium">
                        ${result.calculation.customsValue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm">{t('customsCalculator.results.baseDuty')} ({(result.dutyRate.percentage * 100).toFixed(1)}%):</span>
                      <span className="text-sm font-medium">
                        ${(result.calculation.baseDutyAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm">{t('customsCalculator.results.trumpTariff')}:</span>
                      <span className="text-sm font-medium">
                        ${(result.calculation.trumpTariffAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b font-semibold">
                      <span className="text-sm">{t('customsCalculator.results.totalDuties')}:</span>
                      <span className="text-sm">
                        ${(result.calculation.totalDutyAmount / 100).toFixed(2)}
                      </span>
                    </div>

                    {result.shippingTerms === 'ddp' && result.calculation.ddpProcessingFee && (
                      <>
                        <div className="flex justify-between py-2 border-b text-blue-600">
                          <span className="text-sm">{t('customsCalculator.results.ddpProcessingFee')}:</span>
                          <span className="text-sm font-medium">
                            ${(result.calculation.ddpProcessingFee / 100).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg border border-blue-200 font-bold text-blue-800">
                          <span>{t('customsCalculator.results.totalWithFee')}:</span>
                          <span>
                            ${(result.calculation.totalWithProcessingFee! / 100).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800">
                      {t('customsCalculator.results.note')}
                    </p>
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="text-center text-gray-500 py-8">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('customsCalculator.results.placeholder')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(USCustomsCalculatorContent);