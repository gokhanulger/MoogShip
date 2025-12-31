import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Retry configuration
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper to sleep for a given duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to retry a failed import
async function retry<T>(
  fn: () => Promise<T>,
  retriesLeft: number = MAX_RETRY_COUNT,
  interval: number = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retriesLeft > 0) {
      console.log(`Import failed, retrying... (${retriesLeft} retries left)`);
      await sleep(interval);
      return retry(fn, retriesLeft - 1, interval);
    }
    
    // If all retries failed, throw a more descriptive error
    throw new Error(
      `Failed to load module after ${MAX_RETRY_COUNT} attempts. ` +
      `Original error: ${error?.message || 'Unknown error'}`
    );
  }
}

// Enhanced lazy loading with retry logic
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() => retry(componentImport));
}

// Export a function to preload critical routes
export function preloadRoute(componentImport: () => Promise<{ default: any }>) {
  // Attempt to preload the component in the background
  retry(componentImport).catch(error => {
    console.warn('Failed to preload route:', error);
  });
}