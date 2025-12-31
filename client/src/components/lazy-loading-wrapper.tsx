import { useState, useEffect, useRef, ReactNode } from 'react';
import { performanceOptimizer } from '../lib/performance-optimizer';

interface LazyLoadingWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  componentName?: string;
  priority?: 'low' | 'medium' | 'high';
}

export function LazyLoadingWrapper({
  children,
  fallback = <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />,
  threshold = 0.01,
  rootMargin = '100px',
  componentName = 'LazyComponent',
  priority = 'low'
}: LazyLoadingWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(performance.now());

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible && !isLoaded) {
      // Load immediately without artificial delays for better performance
      setIsLoaded(true);
      // Only measure performance in development
      if (process.env.NODE_ENV === 'development') {
        const loadTime = performance.now() - startTime.current;
        if (loadTime > 100) {
          console.warn(`⚠️ Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
        }
      }
    }
  }, [isVisible, isLoaded, componentName, priority]);

  return (
    <div ref={elementRef} data-lazy-component={componentName}>
      {isLoaded ? children : fallback}
    </div>
  );
}

// Higher-order component for easier usage
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<LazyLoadingWrapperProps, 'children'>
) {
  return function LazyComponent(props: P) {
    return (
      <LazyLoadingWrapper {...options}>
        <Component {...props} />
      </LazyLoadingWrapper>
    );
  };
}