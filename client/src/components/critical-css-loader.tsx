import { useEffect } from 'react';

// Critical CSS that must load immediately for above-the-fold content
const CRITICAL_CSS = `
/* Critical styles for immediate render */
.hero-section {
  display: block;
  min-height: 60vh;
}

.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  height: 3rem;
  width: auto;
}

.mobile-menu-hidden {
  display: none;
}

.gradient-bg {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin-top: 1rem;
}

.cta-button {
  background: #2563eb;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: background-color 0.2s;
}

.cta-button:hover {
  background: #1d4ed8;
}

/* Mobile responsiveness for critical content */
@media (max-width: 768px) {
  .mobile-nav {
    display: block;
  }
  
  .desktop-nav {
    display: none;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .mobile-menu-open {
    display: block !important;
  }
}

/* Loading states */
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Content visibility optimization */
.content-auto {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
`;

export function CriticalCSSLoader() {
  useEffect(() => {
    // Only inject if not already present
    if (!document.querySelector('#critical-css')) {
      const style = document.createElement('style');
      style.id = 'critical-css';
      style.innerHTML = CRITICAL_CSS;
      
      // Insert at the beginning of head for highest priority
      document.head.insertBefore(style, document.head.firstChild);
    }
  }, []);

  return null; // This component doesn't render anything
}