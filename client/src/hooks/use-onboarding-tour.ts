import { useState, useEffect, useCallback } from 'react';

// Create a custom event name for tour triggering
const TOUR_START_EVENT = 'moogship-start-onboarding-tour';

// Centralized hook to manage onboarding tour state
export function useOnboardingTour() {
  const [runTour, setRunTour] = useState(false);

  // Function to start the tour
  const startTour = useCallback(() => {
    setRunTour(true);
    // Also dispatch a global event for any other listening components
    const tourEvent = new CustomEvent(TOUR_START_EVENT);
    document.dispatchEvent(tourEvent);
  }, []);

  // Listen for global start tour events
  useEffect(() => {
    const handleTourStart = () => {
      setRunTour(true);
    };

    // Add event listener
    document.addEventListener(TOUR_START_EVENT, handleTourStart);

    // Cleanup
    return () => {
      document.removeEventListener(TOUR_START_EVENT, handleTourStart);
    };
  }, []);

  // Function to end the tour
  const endTour = useCallback(() => {
    setRunTour(false);
  }, []);

  // Function to check if the tour has been completed before
  const hasCompletedTour = useCallback(() => {
    return localStorage.getItem('onboardingTourComplete') === 'true';
  }, []);

  // Function to mark the tour as completed
  const markTourAsCompleted = useCallback(() => {
    localStorage.setItem('onboardingTourComplete', 'true');
  }, []);

  // Function to reset tour completion status (for testing)
  const resetTourCompletion = useCallback(() => {
    localStorage.removeItem('onboardingTourComplete');
  }, []);

  return {
    runTour,
    startTour,
    endTour,
    hasCompletedTour,
    markTourAsCompleted,
    resetTourCompletion,
  };
}

// Export a function to start the tour from anywhere without the hook
export function startOnboardingTour() {
  const tourEvent = new CustomEvent(TOUR_START_EVENT);
  document.dispatchEvent(tourEvent);
}

export default useOnboardingTour;