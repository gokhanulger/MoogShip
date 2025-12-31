import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, HelpCircle, BookOpen, MessageSquare, Package2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import just the component, not the function
import OnboardingTour from "../components/onboarding-tour";
import Layout from "@/components/layout";
import { useTranslation } from "react-i18next";

export default function GettingStartedPage() {
  // Create state to control the tour directly
  const [runTour, setRunTour] = useState(false);
  const { t } = useTranslation();
  
  // Start the interactive tour - only use one method to prevent duplicate tours
  const handleStartTour = () => {
    console.log('Getting Started page tour button clicked');
    
    // Only use the event method, not the local state
    // Using both methods was causing the tour to start twice
    const tourEvent = new CustomEvent('start-onboarding-tour');
    document.dispatchEvent(tourEvent);
    
    // Don't use setRunTour to avoid duplicate tours
    // setRunTour(true);
  };

  return (
    <Layout>
      {/* No longer needed - OnboardingTour is now centralized in App.tsx */}
      {/* Added more top padding (pt-8) to prevent overlap with the balance display */}
      <div className="space-y-6 pt-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('gettingStarted.title')}</h1>
          <p className="text-muted-foreground">
            {t('gettingStarted.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="overview">{t('gettingStarted.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="guides">{t('gettingStarted.tabs.guides')}</TabsTrigger>
            <TabsTrigger value="faq">{t('gettingStarted.tabs.faq')}</TabsTrigger>
          </TabsList>
        
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('gettingStarted.overview.welcomeTitle')}</CardTitle>
                <CardDescription>
                  {t('gettingStarted.overview.welcomeSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p>
                  {t('gettingStarted.overview.description')}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
                        <Package2 size={20} />
                      </div>
                      <CardTitle className="text-lg">{t('gettingStarted.overview.features.createShipments.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {t('gettingStarted.overview.features.createShipments.description')}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
                        <BookOpen size={20} />
                      </div>
                      <CardTitle className="text-lg">{t('gettingStarted.overview.features.trackOrders.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {t('gettingStarted.overview.features.trackOrders.description')}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
                        <MessageSquare size={20} />
                      </div>
                      <CardTitle className="text-lg">{t('gettingStarted.overview.features.getSupport.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {t('gettingStarted.overview.features.getSupport.description')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <InfoIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">{t('gettingStarted.overview.features.interactiveTour.title')}</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          {t('gettingStarted.overview.features.interactiveTour.description')}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button onClick={handleStartTour} variant="secondary" size="sm">
                          {t('gettingStarted.overview.features.interactiveTour.button')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Guides Tab */}
          <TabsContent value="guides" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('gettingStarted.guides.title')}</CardTitle>
                <CardDescription>
                  {t('gettingStarted.guides.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium text-gray-900">{t('gettingStarted.guides.sections.firstShipment.title')}</h3>
                    <ol className="mt-2 ml-5 list-decimal text-sm text-gray-700 space-y-1">
                      {t('gettingStarted.guides.sections.firstShipment.steps', { returnObjects: true }).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium text-gray-900">{t('gettingStarted.guides.sections.balance.title')}</h3>
                    <ol className="mt-2 ml-5 list-decimal text-sm text-gray-700 space-y-1">
                      {t('gettingStarted.guides.sections.balance.steps', { returnObjects: true }).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium text-gray-900">{t('gettingStarted.guides.sections.tracking.title')}</h3>
                    <ol className="mt-2 ml-5 list-decimal text-sm text-gray-700 space-y-1">
                      {t('gettingStarted.guides.sections.tracking.steps', { returnObjects: true }).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium text-gray-900">{t('gettingStarted.guides.sections.support.title')}</h3>
                    <ol className="mt-2 ml-5 list-decimal text-sm text-gray-700 space-y-1">
                      {t('gettingStarted.guides.sections.support.steps', { returnObjects: true }).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faq" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('gettingStarted.faq.title')}</CardTitle>
                <CardDescription>
                  {t('gettingStarted.faq.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-5">
                  {t('gettingStarted.faq.questions', { returnObjects: true }).map((faq, index) => (
                    <div key={index}>
                      <h3 className="font-medium text-gray-900">{faq.question}</h3>
                      <p className="mt-1 text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}