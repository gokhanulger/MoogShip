// Image optimization utilities for better Chrome performance

export class ImageOptimizer {
  private static observer: IntersectionObserver | null = null;
  private static isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);

  static initialize() {
    if (!this.isChrome || this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    // Apply to existing images
    this.optimizeExistingImages();
    
    // Setup mutation observer for new images
    this.setupMutationObserver();
  }

  private static optimizeExistingImages() {
    document.querySelectorAll('img').forEach(img => {
      this.optimizeImage(img);
    });
  }

  private static setupMutationObserver() {
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLImageElement) {
            this.optimizeImage(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach(img => {
              this.optimizeImage(img);
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

  static optimizeImage(img: HTMLImageElement) {
    if (!this.isChrome) return;

    // Add Chrome optimizations
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // Convert to lazy loading if src exists
    if (img.src && !img.dataset.src) {
      img.dataset.src = img.src;
      img.src = 'data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%27100%27%20height=%2750%27/%3e';
      
      if (this.observer) {
        this.observer.observe(img);
      }
    }
  }

  private static loadImage(img: HTMLImageElement) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      
      // Add fade-in effect
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease';
      
      img.onload = () => {
        img.style.opacity = '1';
      };
    }
  }

  // Public method for manual optimization
  static optimizeImageElement(img: HTMLImageElement) {
    this.optimizeImage(img);
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ImageOptimizer.initialize();
  });
} else {
  ImageOptimizer.initialize();
}

export default ImageOptimizer;