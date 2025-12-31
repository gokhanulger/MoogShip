// Bundle optimization for faster initial loads
// Implements code splitting and preloading strategies

export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private preloadedModules: Set<string> = new Set();
  private criticalModules: string[] = [
    'react',
    'react-dom',
    'wouter'
  ];

  static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  constructor() {
    this.initializeBundleOptimization();
  }

  private initializeBundleOptimization() {
    // 1. Preload critical modules
    this.preloadCriticalModules();
    
    // 2. Setup dynamic import optimization
    this.optimizeDynamicImports();
    
    // 3. Implement resource hints
    this.addResourceHints();
    
    console.log('🎯 Bundle Optimizer initialized');
  }

  private preloadCriticalModules() {
    // Preload modules that will definitely be needed
    const criticalPaths = [
      '/src/hooks/use-auth-simplified.tsx',
      '/src/lib/queryClient.ts',
      '/src/components/ui/toaster.tsx'
    ];

    criticalPaths.forEach(path => {
      if (!this.preloadedModules.has(path)) {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = path;
        document.head.appendChild(link);
        this.preloadedModules.add(path);
      }
    });
  }

  private optimizeDynamicImports() {
    // Override dynamic imports to add prefetch behavior
    const originalImport = (window as any).__vitePreload;
    if (originalImport) {
      (window as any).__vitePreload = (...args: any[]) => {
        // Add prefetch hint for better performance
        const result = originalImport(...args);
        this.addPrefetchHint(args[0]);
        return result;
      };
    }
  }

  private addResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // Preconnect to same-origin
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = window.location.origin;
    document.head.appendChild(preconnect);
  }

  private addPrefetchHint(modulePath: string) {
    if (!this.preloadedModules.has(modulePath)) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = modulePath;
      document.head.appendChild(link);
      this.preloadedModules.add(modulePath);
    }
  }

  // Public method to preload specific routes
  public preloadRoute(routePath: string) {
    const routeMapping: Record<string, string[]> = {
      '/auth': ['/src/pages/auth-page-temp.tsx'],
      '/dashboard': ['/src/pages/dashboard.tsx'],
      '/shipments': ['/src/pages/shipment-list.tsx'],
      '/create': ['/src/pages/shipment-create.tsx']
    };

    const modules = routeMapping[routePath];
    if (modules) {
      modules.forEach(module => {
        this.addPrefetchHint(module);
      });
    }
  }

  // Get optimization metrics
  public getMetrics(): { preloadedModules: number; criticalModules: number } {
    return {
      preloadedModules: this.preloadedModules.size,
      criticalModules: this.criticalModules.length
    };
  }
}

// Initialize optimizer
export const bundleOptimizer = BundleOptimizer.getInstance();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bundleOptimizer;
  });
} else {
  bundleOptimizer;
}