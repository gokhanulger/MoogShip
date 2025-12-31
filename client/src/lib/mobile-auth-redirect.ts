// Utility function to handle mobile authentication redirects
export function redirectToAuth() {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  if (isMobile) {
    window.location.href = 'https://www.moogship.com/mobile-auth';
  } else {
    window.location.href = '/auth';
  }
}

export function getAuthUrl() {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  if (isMobile) {
    return 'https://www.moogship.com/mobile-auth';
  } else {
    return '/auth';
  }
}