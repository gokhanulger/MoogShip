// Chrome-specific performance optimizations for MoogShip
// Addresses Chrome loading speed issues and memory management

export class ChromeSpeedOptimizer {
  private static instance: ChromeSpeedOptimizer;
  private isChrome: boolean;
  private preloadQueue: Set<string> = new Set();
  private deferredTasks: Array<() => void> = [];

  constructor() {
    this.isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    if (this.isChrome) {
      this.initializeOptimizations();
    }
  }

  static getInstance(): ChromeSpeedOptimizer {
    if (!ChromeSpeedOptimizer.instance) {
      ChromeSpeedOptimizer.instance = new ChromeSpeedOptimizer();
    }
    return ChromeSpeedOptimizer.instance;
  }

  private initializeOptimizations() {
    // 1. Preload critical resources
    this.preloadCriticalResources();
    
    // 2. Optimize images
    this.setupLazyImageLoading();
    
    // 3. Reduce layout thrashing
    this.optimizeLayoutUpdates();
    
    // 4. Setup connection optimizations
    this.optimizeConnections();
    
    // 5. Reduce script parsing time
    this.deferNonCriticalScripts();

    console.log('🚀 Chrome Speed Optimizer activated');
  }

  private preloadCriticalResources() {
    const criticalResources = [
      '/api/user',
      '/api/marketing-banners',
      // Add only most critical endpoints to avoid overwhelming Chrome
    ];

    criticalResources.forEach(url => {
      if (!this.preloadQueue.has(url)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'fetch';
        link.crossOrigin = 'same-origin';
        document.head.appendChild(link);
        this.preloadQueue.add(url);
      }
    });
  }

  private setupLazyImageLoading() {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading before entering viewport
        threshold: 0.01
      }
    );

    // Apply to existing images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Setup for future images
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLImageElement && node.dataset.src) {
            imageObserver.observe(node);
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll('img[data-src]').forEach(img => {
              imageObserver.observe(img);
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private optimizeLayoutUpdates() {
    let rafId: number;
    let pendingUpdates: Array<() => void> = [];

    const flushUpdates = () => {
      const updates = pendingUpdates.slice();
      pendingUpdates = [];
      
      // Batch DOM reads
      const reads: Array<() => void> = [];
      const writes: Array<() => void> = [];
      
      updates.forEach(update => {
        // Simple heuristic: functions with 'get', 'measure', 'compute' are reads
        if (update.toString().match(/(get|measure|compute|scroll|offset|client)/i)) {
          reads.push(update);
        } else {
          writes.push(update);
        }
      });
      
      // Execute all reads first, then all writes
      reads.forEach(read => read());
      writes.forEach(write => write());
    };

    // Expose batched update scheduler
    (window as any).__chromeOptimizer = {
      scheduleUpdate: (fn: () => void) => {
        pendingUpdates.push(fn);
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = 0;
            flushUpdates();
          });
        }
      }
    };
  }

  private optimizeConnections() {
    // DNS prefetch for external resources
    const externalDomains = [
      '//fonts.googleapis.com',
      '//fonts.gstatic.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // Preconnect to same-origin API
    const preconnectLink = document.createElement('link');
    preconnectLink.rel = 'preconnect';
    preconnectLink.href = window.location.origin;
    document.head.appendChild(preconnectLink);
  }

  private deferNonCriticalScripts() {
    // Defer heavy operations until after page load
    const deferUntilIdle = (fn: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 100);
      }
    };

    window.addEventListener('load', () => {
      deferUntilIdle(() => {
        // Process deferred tasks
        this.deferredTasks.forEach(task => {
          try {
            task();
          } catch (e) {
            console.warn('Deferred task failed:', e);
          }
        });
        this.deferredTasks = [];
      });
    });
  }

  // Public methods for components to use
  public deferTask(task: () => void) {
    if (this.isChrome) {
      this.deferredTasks.push(task);
    } else {
      task(); // Execute immediately on non-Chrome browsers
    }
  }

  public preloadResource(url: string) {
    if (this.isChrome && !this.preloadQueue.has(url)) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
      this.preloadQueue.add(url);
    }
  }

  public optimizeImage(img: HTMLImageElement) {
    if (this.isChrome && img.src) {
      // Convert to lazy loading if not already
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // Add decode hint
      img.decoding = 'async';
    }
  }
}

// Initialize optimizer
export const chromeOptimizer = ChromeSpeedOptimizer.getInstance();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chromeOptimizer;
  });
} else {
  chromeOptimizer;
}