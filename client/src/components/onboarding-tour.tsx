import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Create a global reference to store the function to start the tour
// This allows us to call it from anywhere in the application
let globalStartTour: (() => void) | null = null;

interface OnboardingTourProps {
  // If true, the tour will start automatically
  autoStart?: boolean;
}

/**
 * OnboardingTour - A guided tour for new users to learn the application
 * 
 * This component uses react-joyride to create a step-by-step walkthrough
 * of the application's key features. It stores the user's progress in
 * localStorage to avoid showing the tour on every visit.
 */
export function OnboardingTour({ autoStart = false }: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Set up global access to the tour start function and event listeners
  useEffect(() => {
    // Store the function to start the tour in the global reference
    const startFunction = () => setRunTour(true);
    globalStartTour = startFunction;
    
    // Listen for custom start-tour events as a fallback mechanism
    const handleStartTour = () => {
      console.log('Tour event received');
      setRunTour(true);
    };
    
    // Add event listener for the custom event
    document.addEventListener('start-onboarding-tour', handleStartTour);
    
    // Clean up when component unmounts
    return () => {
      document.removeEventListener('start-onboarding-tour', handleStartTour);
      if (globalStartTour === startFunction) {
        globalStartTour = null;
      }
    };
  }, []);

  // Function to ensure a target exists before showing a step
  const getElementIfExists = (selector: string): string | Element | null => {
    if (selector === 'body') return document.body;
    return document.querySelector(selector);
  };

  // Define the steps for the walkthrough tour with more reliable selectors
  const steps: Step[] = [
    // Introduction
    {
      target: 'body',
      content: t('tour.steps.intro', 'Welcome to MoogShip! Let\'s take a comprehensive tour to help you navigate our global shipping platform efficiently.'),
      placement: 'center',
      disableBeacon: true,
    },
    // Sidebar/Navigation - Using more specific selector
    {
      target: 'aside',
      content: t('tour.steps.navigation', 'This is your main navigation menu. You can access all features of the platform from here, including shipment creation, tracking, and account management.'),
      placement: 'right',
    },
    // Dashboard - Main area
    {
      target: 'main',
      content: t('tour.steps.dashboard', 'This is your personalized dashboard that provides a real-time overview of your shipping activities, recent transactions, and important announcements.'),
      placement: 'bottom',
    },
    // Create Shipment - Using specific button in navigation
    {
      target: 'a[href="/shipment-create"]',
      content: t('tour.steps.createShipment', 'Click here to create a new shipment. You\'ll be able to enter sender and recipient information, package details, and choose shipping options.'),
      placement: 'left',
    },
    // Price Calculator
    {
      target: 'a[href="/price-calculator"]',
      content: t('tour.steps.priceCalculator', 'Use our price calculator to estimate shipping costs before creating shipments. Enter package details and destinations to get accurate quotes.'),
      placement: 'left',
    },
    // Bulk Upload
    {
      target: 'a[href="/bulk-upload"]',
      content: t('tour.steps.bulkUpload', 'For multiple shipments, use our bulk upload feature. You can import Excel files with multiple orders to create shipments in batch.'),
      placement: 'left',
    },
    // Track Shipments
    {
      target: 'a[href="/approved-shipments"]',
      content: t('tour.steps.trackShipments', 'Track all your approved shipments here. You can monitor their status, view detailed information, and download shipping labels and documentation.'),
      placement: 'left',
    },
    // My Balance
    {
      target: 'a[href="/my-balance"]',
      content: t('tour.steps.balance', 'Here you can view your current account balance. This shows the funds available for creating new shipments and managing your logistics needs.'),
      placement: 'left',
    },
    // Product Templates
    {
      target: 'a[href="/products"]',
      content: t('tour.steps.products', 'Manage your product catalog here. Creating product templates helps you quickly select accurate item details when creating shipments.'),
      placement: 'left',
    },
    // Support Ticket
    {
      target: 'a[href="/support-ticket"]',
      content: t('tour.steps.supportTicket', 'Need help? Our support system allows you to create tickets, track responses, and get assistance from our customer service team.'),
      placement: 'left',
    },
    // My Tickets
    {
      target: 'a[href="/my-tickets"]',
      content: t('tour.steps.myTickets', 'View and manage your existing support tickets here. You can track the status of your inquiries and continue conversations with our support team.'),
      placement: 'left',
    },
    // Getting Started
    {
      target: 'a[href="/getting-started"]',
      content: t('tour.steps.gettingStarted', 'Visit our Getting Started page anytime to access comprehensive guides, FAQs, and detailed instructions for using MoogShip\'s features.'),
      placement: 'left',
    },
    // Tour Completion
    {
      target: 'body',
      content: t('tour.steps.completion', 'That\'s it! You\'re now ready to use MoogShip\'s global shipping platform. Remember that you can restart this tutorial anytime from the Help section in the sidebar.'),
      placement: 'center',
    },
  ];

  // Watch for changes to the autoStart prop and start the tour when it becomes true
  useEffect(() => {
    if (autoStart) {
      console.log('Auto starting tour from prop change');
      setRunTour(true);
    }
  }, [autoStart]);
  
  // Check if this is the user's first visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('onboardingTourComplete');
    if (!hasSeenTour && window.location.pathname === '/') {
      // Wait a bit for the UI to fully render before starting the tour on first visit
      console.log('First time visitor - starting tour automatically');
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle tour callback events and debugging
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    
    // Log detailed information about tour steps for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group('Joyride Event');
      console.log('Action:', action);
      console.log('Index:', index);
      console.log('Status:', status);
      console.log('Type:', type);
      
      if (type === 'error:target_not_found') {
        console.error('Target element not found:', steps[index || 0].target);
      }
      console.groupEnd();
    }
    
    // Handle different tour events
    if (type === 'step:after') {
      // Log step completion in development
      console.log(`Tour step ${index} completed`);
    }
    
    // Check if the tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      // Mark the tour as completed in localStorage
      localStorage.setItem('onboardingTourComplete', 'true');
      
      // Show a detailed toast when the tour is completed
      toast({
        title: status === STATUS.FINISHED 
          ? t('tour.toast.completedTitle', 'Tour Completed Successfully!') 
          : t('tour.toast.skippedTitle', 'Tour Skipped'),
        description: t('tour.toast.description', 'You can always restart the tour from the Help section in the sidebar or the Getting Started page if you need guidance later.'),
        variant: "default",
        duration: 6000, // Extended duration for better readability
      });
    }
  };

  // Function to manually start the tour
  const startTour = () => {
    setRunTour(true);
  };

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={runTour}
        scrollToFirstStep
        scrollOffset={100}
        showProgress
        showSkipButton
        steps={steps}
        disableScrolling={false}
        spotlightClicks={false}
        disableOverlayClose={true}
        disableScrollParentFix={true}
        floaterProps={{
          disableAnimation: false,
        }}
        locale={{
          back: t('tour.controls.back', 'Previous'),
          close: t('tour.controls.close', 'Close'),
          last: t('tour.controls.last', 'Finish'),
          next: t('tour.controls.next', 'Next'),
          skip: t('tour.controls.skip', 'Skip Tour')
        }}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#3B82F6', // blue-500 in tailwind
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            beaconSize: 36,
          },
          tooltipContainer: {
            textAlign: 'left',
            fontSize: '15px',
          },
          tooltip: {
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          buttonNext: {
            backgroundColor: '#3B82F6',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '8px 16px',
          },
          buttonBack: {
            marginRight: 10,
            color: '#4B5563',
            fontWeight: 500,
          },
          buttonSkip: {
            color: '#6B7280',
          },
          spotlight: {
            borderRadius: '8px',
          }
        }}
      />
      {/* We don't render any visible content by default, just the tour functionality */}
    </>
  );
}

/**
 * Function to start the onboarding tour from anywhere in the application
 * This can be imported and called from any component
 */
export function startOnboardingTour() {
  console.log('Starting tour from function call');
  
  // Method 1: Use the global reference if available
  if (globalStartTour) {
    console.log('Using global function reference');
    globalStartTour();
  }
  
  // Method 2: Always dispatch an event as a fallback
  // This is particularly useful if the component has been unmounted and remounted
  console.log('Dispatching custom event');
  const tourEvent = new CustomEvent('start-onboarding-tour');
  document.dispatchEvent(tourEvent);
}

export default OnboardingTour;