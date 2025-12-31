// Mobile & Chrome Performance Optimizer for MoogShip
// Single, focused optimization replacing multiple conflicting optimizers

class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer;
  private isChrome: boolean = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
  private isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  private activeRequests = 0;
  private maxConcurrentRequests = this.isMobile ? 4 : 8; // Increased limits for better performance
  private requestQueue: Array<() => void> = [];
  private initialized = false;

  static getInstance(): MobilePerformanceOptimizer {
    if (!MobilePerformanceOptimizer.instance) {
      MobilePerformanceOptimizer.instance = new MobilePerformanceOptimizer();
    }
    return MobilePerformanceOptimizer.instance;
  }

  constructor() {
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }
  }

  private initialize() {
    // 1. Optimize network requests for mobile
    this.optimizeNetworkRequests();
    
    // 2. Reduce memory usage
    this.optimizeMemoryUsage();
    
    // 3. Improve rendering performance
    this.optimizeRendering();
    
    console.log(`🚀 Mobile Performance Optimizer activated (Chrome: ${this.isChrome}, Mobile: ${this.isMobile})`);
  }

  private optimizeNetworkRequests() {
    const originalFetch = window.fetch;
    
    // Create request limiter to prevent mobile browser overload
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Execute request immediately if under limit
      if (this.activeRequests < this.maxConcurrentRequests) {
        this.activeRequests++;
        try {
          const response = await originalFetch(input, init);
          return response;
        } finally {
          this.activeRequests--;
          this.processRequestQueue();
        }
      }

      // Queue request if over limit
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          this.activeRequests++;
          try {
            const response = await originalFetch(input, init);
            resolve(response);
          } catch (error) {
            reject(error);
          } finally {
            this.activeRequests--;
            this.processRequestQueue();
          }
        });
      });
    };
  }

  private processRequestQueue() {
    if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  private optimizeMemoryUsage() {
    // Clear unused cache periodically on mobile
    if (this.isMobile) {
      const clearCache = () => {
        try {
          // Clear React Query cache older than 5 minutes on mobile
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.includes('tanstack') || key.includes('react-query')) {
              try {
                const data = localStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  if (parsed.timestamp && Date.now() - parsed.timestamp > 5 * 60 * 1000) {
                    localStorage.removeItem(key);
                  }
                }
              } catch {
                localStorage.removeItem(key);
              }
            }
          });
          
          // Force garbage collection on Chrome mobile
          if (this.isChrome && 'gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
          }
        } catch (error) {
          console.warn('Cache cleanup failed:', error);
        }
      };

      // More frequent cleanup on mobile (every 10 minutes)
      setInterval(clearCache, 10 * 60 * 1000);
      clearCache(); // Initial cleanup
    }
  }

  private optimizeRendering() {
    // Reduce animation frame rate on mobile to save battery and improve performance
    if (this.isMobile) {
      let lastFrame = 0;
      const targetFPS = 30; // Lower FPS for mobile
      const frameInterval = 1000 / targetFPS;

      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        return originalRAF((time: number) => {
          if (time - lastFrame >= frameInterval) {
            lastFrame = time;
            callback(time);
          }
        });
      };
    }

    // Enable content-visibility for off-screen elements
    const style = document.createElement('style');
    style.innerHTML = `
      .mobile-optimized {
        content-visibility: auto;
        contain-intrinsic-size: 0 200px;
      }
      
      @media (max-width: 768px) {
        * {
          -webkit-tap-highlight-color: transparent;
        }
        img {
          max-width: 100%;
          height: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Public methods for component optimization
  public optimizeComponent(element: HTMLElement) {
    if (this.isMobile) {
      element.classList.add('mobile-optimized');
    }
  }

  public deferExecution(fn: () => void, priority: 'high' | 'low' = 'low') {
    const delay = this.isMobile ? (priority === 'high' ? 100 : 500) : (priority === 'high' ? 0 : 200);
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: delay + 1000 });
    } else {
      setTimeout(fn, delay);
    }
  }

  public preloadCriticalResource(url: string) {
    // Only preload most critical resources on mobile
    if (!this.isMobile || url.includes('/api/user') || url.includes('/api/auth')) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  public getMetrics() {
    return {
      isChrome: this.isChrome,
      isMobile: this.isMobile,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }
}

// Export singleton instance
export const mobileOptimizer = MobilePerformanceOptimizer.getInstance();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mobileOptimizer; // Trigger initialization
  });
} else {
  mobileOptimizer; // Trigger initialization
}