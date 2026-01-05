// Utility function to handle mobile authentication redirects

// Check if running in Capacitor native app
function isCapacitorApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function redirectToAuth() {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);

  // In Capacitor app, always use internal /auth route
  if (isCapacitorApp()) {
    window.location.href = '/auth';
  } else if (isMobile) {
    window.location.href = 'https://www.moogship.com/mobile-auth';
  } else {
    window.location.href = '/auth';
  }
}

export function getAuthUrl() {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);

  // In Capacitor app, always use internal /auth route
  if (isCapacitorApp()) {
    return '/auth';
  } else if (isMobile) {
    return 'https://www.moogship.com/mobile-auth';
  } else {
    return '/auth';
  }
}
