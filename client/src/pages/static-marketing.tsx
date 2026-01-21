import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SiWhatsapp, SiInstagram } from 'react-icons/si';
import { MiniLanguageSwitcher } from '../components/language-switcher';
import { LazyLoadingWrapper } from '../components/lazy-loading-wrapper';
import { CriticalCSSLoader } from '../components/critical-css-loader';
// Import logos - header and footer use the same logo
import moogshipLogoPath from '../assets/moogship-logo.jpg';
const moogshipFooterLogoPath = moogshipLogoPath;
import { clearTranslationCache } from '../i18n';
import { getAuthUrl, redirectToAuth } from '../lib/mobile-auth-redirect';

// Lazy load non-critical components for faster initial load
const MarketingBannerSlider = lazy(() => import('../components/marketing-banner-slider').then(module => ({ default: module.MarketingBannerSlider })));

// Loading fallback for lazy components
const ComponentSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-lg`}>
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Loading...</div>
    </div>
  </div>
);

export default function StaticMarketing(props: any) {
  const { t, i18n, ready } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // Redirect to mobile-auth if running in Capacitor native app
  useEffect(() => {
    const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isCapacitorApp) {
      window.location.href = '/mobile-auth';
    }
  }, []);

  // Force re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language);
      // Force re-render by updating state
      setMobileMenuOpen(false);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  
  // If translations are not ready, show loading
  if (!ready) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-500">Loading translations...</div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-white">
      <CriticalCSSLoader />
      {/* Mobile Navigation - Fixed at top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
        <nav className="flex flex-wrap justify-between items-center py-1 px-2">
          {/* Mobile navigation content will be moved here */}
          {/* Mobile Navigation - Reorganized with 3-dot menu on left */}
          <div className="flex items-center justify-between w-full">
            {/* Left side with menu toggle */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                {/* Mobile menu with dropdown - positioned on left */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {mobileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-25 z-40"
                      onClick={() => setMobileMenuOpen(false)}
                    ></div>
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.features', 'Features')}
                      </a>
                      <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.benefits', 'Benefits')}
                      </a>
                      <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.pricing', 'Pricing')}
                      </a>
                      <div className="border-t border-gray-100 my-1"></div>
                      <a href={getAuthUrl()} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                        {t('marketing.hero.startShipping', 'Start Shipping')}
                      </a>
                    </div>
                  </>
                )}
              </div>
              
              {/* Logo in the mobile nav bar */}
              <div className="flex items-center">
                <img src={moogshipLogoPath} alt="Moogship Logo" className="h-8 w-auto bg-blue-50 rounded-lg" />
              </div>
            </div>

            {/* Right side with WhatsApp, language and auth */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('https://wa.me/905407447911?text=Merhaba,%20Moogship%20hakkında%20bilgi%20almak%20istiyorum.', '_blank')}
                className="flex items-center justify-center w-9 h-9 bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:shadow-xl transform hover:scale-110 transition-all duration-200"
              >
                <SiWhatsapp className="h-4 w-4 text-white" />
              </button>
              <MiniLanguageSwitcher />
              
              <span onClick={() => redirectToAuth()} 
                className="inline-flex items-center py-2 px-3 bg-blue-600 text-white text-sm hover:bg-blue-700 rounded transition-colors cursor-pointer"
              >
                <span>{t('marketing.hero.signup', 'Üye Ol')}</span>
              </span>
            </div>
          </div>
        </nav>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 md:py-10 pt-16 md:pt-10">
          {/* Desktop Navigation Menu */}
          <header className="mb-2 hidden md:block">
            <nav className="flex flex-wrap justify-between items-center relative bg-gradient-to-br from-blue-50 to-blue-100 py-4 px-0">
              {/* Logo section - only shown on desktop */}
              <div className="flex items-center">
                <img src={moogshipLogoPath} alt="Moogship Logo" className="h-12 w-auto bg-blue-50 rounded-xl" />
                <div className="ml-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent relative">
                  <span className="absolute -inset-1 bg-blue-100 blur-sm opacity-30 rounded"></span>
                  <span className="relative">MoogShip</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-6">
                  <a 
                    href="#features" 
                    className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.features', 'Features')}
                  </a>
                  <a 
                    href="#benefits" 
                    className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.benefits', 'Benefits')}
                  </a>
                  <button 
                    onClick={() => window.location.href = '/marketing-price-calculator'}
                    className="inline-block py-2 px-3 text-blue-600 bg-blue-50 font-medium rounded transition-all border border-blue-200 hover:bg-orange-500 hover:text-white hover:border-orange-500"
                    style={{"--hover-bg": "#f18a00"} as React.CSSProperties}
                  >
                    {i18n.language === 'tr' ? 'Fiyat Al' : 'Get Quote'}
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      const phoneNumber = "905407447911";
                      const message = "Merhaba, Moogship hakkında bilgi almak istiyorum.";
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="flex items-center justify-center w-10 h-10 text-green-600 bg-white border border-green-200 rounded-lg shadow-sm hover:bg-green-600 hover:text-white transition-colors"
                  >
                    <SiWhatsapp className="h-5 w-5" />
                  </button>
                  <MiniLanguageSwitcher />
                  <a 
                    href="/auth" 
                    className="inline-block py-2 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors z-10"
                  >
                    {t('auth.signUp', 'Sign Up')}
                  </a>
                </div>
              </div>
            </nav>
          </header>
          
          {/* Marketing Banner Slider - Temporarily Disabled */}
          {/* <div className="mb-8">
            <LazyLoadingWrapper 
              fallback={<ComponentSkeleton height="h-48" />}
              componentName="MarketingBannerSlider"
              priority="medium"
            >
              <Suspense fallback={<ComponentSkeleton height="h-48" />}>
                <MarketingBannerSlider />
              </Suspense>
            </LazyLoadingWrapper>
          </div> */}
          
          {/* Hero Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
                dangerouslySetInnerHTML={{ __html: t('marketing.hero.title') }}
              >
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                {t('marketing.hero.subtitle')}
              </p>
              
              {/* NEW: Etsy Integration Banner */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 rounded-full text-sm font-semibold mb-6 border border-orange-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>{t('marketing.etsy.heroBanner', 'NEW: Etsy Integration - Automate your entire shipping workflow!')}</span>
              </div>
              
              {/* Hero CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <span 
                  onClick={() => redirectToAuth()}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium text-center w-full sm:w-auto transition-colors cursor-pointer"
                >
                  {t('marketing.hero.startShipping', 'Start Shipping')}
                </span>
                <span 
                  onClick={() => {
                    const featuresSection = document.getElementById('features');
                    if (featuresSection) featuresSection.scrollIntoView({behavior: 'smooth'});
                  }}
                  className="inline-block border border-blue-300 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg text-lg font-medium text-center w-full sm:w-auto transition-colors cursor-pointer"
                >
                  {t('marketing.hero.learnMore', 'Learn More')}
                </span>
              </div>
              

            </div>
            
            {/* Dashboard Preview Image */}
            <div className="hidden md:block relative">
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none"></div>
              <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none"></div>
              {/* Enhanced Dashboard Preview with realistic UI elements - No Shipping Assistant */}
              <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Dashboard Header with Navigation */}
                <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
                  <div className="font-medium bg-gradient-to-r from-blue-100 to-white bg-clip-text text-transparent">{t('marketing.dashboard.preview', 'MoogShip Dashboard')}</div>
                  <div className="flex space-x-3">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: t('marketing.dashboard.shipments', 'Shipments'), value: '284', color: 'bg-blue-100 text-blue-600' },
                      { label: t('marketing.dashboard.savings', 'Savings'), value: '$2,450', color: 'bg-green-100 text-green-600' },
                      { label: t('marketing.dashboard.countries', 'Countries'), value: '48', color: 'bg-purple-100 text-purple-600' }
                    ].map((stat, index) => (
                      <div key={index} className={`${stat.color} rounded-lg p-3 text-center`}>
                        <div className="text-xl font-bold">{stat.value}</div>
                        <div className="text-xs">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart Visualization */}
                  <div className="relative bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-600 mb-2">{t('marketing.dashboard.monthlyShipments', 'Monthly Shipments')}</div>
                    <div className="h-24 flex items-end space-x-2">
                      {[35, 45, 30, 60, 75, 65, 55, 85, 70, 65, 80, 90].map((height, i) => (
                        <div 
                          key={i} 
                          className="bg-blue-500 rounded-t w-full"
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-400">
                      <span>{t('marketing.dashboard.jan', 'Jan')}</span>
                      <span>{t('marketing.dashboard.dec', 'Dec')}</span>
                    </div>
                  </div>
                  
                  {/* Recent Shipments Table */}
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-700">
                      {t('marketing.dashboard.recentShipments', 'Recent Shipments')}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="px-4 py-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm text-gray-800">MOG-{10000 + item}</span>
                          </div>
                          <div className="text-xs text-gray-500">{t('marketing.dashboard.routeExample', 'New York → Istanbul')}</div>
                          <div className="text-xs font-medium text-blue-600">{t('marketing.dashboard.details', 'Details →')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* NEW: Featured Etsy Integration Section */}
      <section className="py-20 bg-gradient-to-r from-orange-50 to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold mb-4">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {t('marketing.etsy.badge', 'NEW INTEGRATION')}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('marketing.etsy.title', 'Supercharge Your Etsy Store with MoogShip')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('marketing.etsy.subtitle', 'Connect your Etsy store and automate your entire shipping workflow. Save time, reduce costs, and delight your customers with our powerful Etsy Integration.')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('marketing.etsy.feature1Title', 'Seamless Order Import')}</h3>
              <p className="text-gray-600">
                {t('marketing.etsy.feature1Desc', 'Automatically import all your Etsy orders with a single click. No manual data entry, no copy-paste errors.')}
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('marketing.etsy.feature2Title', 'Bulk Shipping Actions')}</h3>
              <p className="text-gray-600">
                {t('marketing.etsy.feature2Desc', 'Process multiple orders at once. Set customs values, GTIP codes, and package dimensions in seconds.')}
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('marketing.etsy.feature3Title', 'Instant Price Calculation')}</h3>
              <p className="text-gray-600">
                {t('marketing.etsy.feature3Desc', 'Get real-time shipping quotes for all your Etsy orders. Compare carriers and choose the best option.')}
              </p>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <a 
              href="/etsy-integration"
              className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {t('marketing.etsy.cta', 'Connect Your Etsy Store Now')}
            </a>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <LazyLoadingWrapper 
        fallback={<ComponentSkeleton height="h-96" />}
        componentName="FeaturesSection"
        priority="high"
      >
        <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('marketing.features.title', 'Powerful Features for Global Shipping')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('marketing.features.subtitle', 'Our platform combines advanced technology with logistics expertise to streamline your international shipping operations.')}
            </p>
          </div>
          
          {/* Feature Cards with Icons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Global Shipping Management */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature1.title', 'Global Shipping Management')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature1.description', 'Track and manage international shipments across 190+ countries with real-time updates and complete visibility throughout the delivery process.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature1.item1', 'Simplified customs documentation')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature1.item2', 'Real-time shipment tracking')}</span>
                </li>
              </ul>
            </div>

            {/* Multi-Carrier Integration */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature2.title', 'Multi-Carrier Integration')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature2.description', 'Compare rates and services from leading global shipping providers to find the most cost-effective option for your international packages.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature2.item1', 'Side-by-side rate comparison')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature2.item2', 'Single interface for all carriers')}</span>
                </li>
              </ul>
            </div>

            {/* Customized Shipping Labels */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature3.title', 'Automated Label Generation')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature3.description', 'Create and print compliant shipping labels with one click. Our system automatically generates all required documentation for customs clearance.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature3.item1', 'PDF label storage and printing')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature3.item2', 'Automated customs documentation')}</span>
                </li>
              </ul>
            </div>

            {/* Recipient Management */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature4.title', 'Recipient Management')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature4.description', 'Store and manage an unlimited number of recipients with detailed address verification and smart suggestions for faster data entry.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature4.item1', 'Address book with search')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature4.item2', 'CSV bulk import capability')}</span>
                </li>
              </ul>
            </div>

            {/* Product Catalog */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature5.title', 'Product Catalog Management')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature5.description', 'Build and manage your product catalog with comprehensive details including SKUs, dimensions, weights, and customs information for faster shipping.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature5.item1', 'Product templates for quick shipping')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature5.item2', 'Automatic customs value calculation')}</span>
                </li>
              </ul>
            </div>

            {/* Multi-language Support */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.features.feature6.title', 'Multi-language Support')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.features.feature6.description', 'Use the platform in your preferred language with support for English, Russian, Turkish, Ukrainian, German, French, Arabic, and Spanish.')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature6.item1', 'Complete translation of UI elements')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-600 text-sm">{t('marketing.features.feature6.item2', 'Language-specific shipping documentation')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature Highlight - Dashboard Preview */}
          <div className="mt-20 bg-gray-50 rounded-2xl overflow-hidden shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="inline-block bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-sm font-medium mb-4">
                  {t('marketing.features.highlight.tag', 'Featured Capability')}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                  {t('marketing.features.highlight.title', 'Comprehensive Dashboard')}
                </h3>
                <p className="text-gray-600 mb-6 lg:pr-10">
                  {t('marketing.features.highlight.description', 'Get a bird\'s-eye view of all your shipping operations with our intuitive dashboard. Monitor shipment status, track expenses, and identify opportunities to optimize your logistics operations.')}
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">
                      {t('marketing.features.highlight.point1', 'Real-time shipment status updates')}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">
                      {t('marketing.features.highlight.point2', 'Detailed cost analysis and savings reports')}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">
                      {t('marketing.features.highlight.point3', 'Interactive analytics with exportable reports')}
                    </span>
                  </li>
                </ul>
                <span 
                  onClick={() => redirectToAuth()}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium text-center w-full sm:w-auto transition-colors cursor-pointer"
                >
                  {t('marketing.features.highlight.cta', 'Try the Dashboard')}
                </span>
              </div>
              {/* Secondary Dashboard Preview - No Shipping Assistant */}
              <div className="bg-gray-100 p-6 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-md p-4 w-full max-w-lg">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
                    <div className="font-medium bg-gradient-to-r from-blue-100 to-white bg-clip-text text-transparent">{t('marketing.dashboard.preview', 'MoogShip Dashboard')}</div>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">84</div>
                        <div className="text-xs text-gray-600">{t('marketing.dashboard.activeShipments', 'Active Shipments')}</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">$1,820</div>
                        <div className="text-xs text-gray-600">{t('marketing.dashboard.monthlySavings', 'Monthly Savings')}</div>
                      </div>
                    </div>
                    <div className="h-32 bg-gray-50 rounded-lg mb-4 p-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">{t('marketing.dashboard.shippingVolume', 'Shipping Volume (Last 6 months)')}</div>
                      <div className="h-20 flex items-end space-x-1">
                        {[40, 60, 45, 70, 85, 75].map((height, i) => (
                          <div 
                            key={i} 
                            className="bg-blue-500 rounded-t w-full"
                            style={{ height: `${height}%` }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-medium">{t('marketing.dashboard.recentActivity', 'Recent Activity')}</div>
                      <div className="divide-y divide-gray-100 text-sm">
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-gray-800">{t('marketing.dashboard.newShipmentCreated', 'New shipment created')}</span>
                          <span className="text-gray-500">{t('marketing.dashboard.fiveMinutesAgo', '5m ago')}</span>
                        </div>
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-gray-800">{t('marketing.dashboard.labelGenerated', 'Label generated')}</span>
                          <span className="text-gray-500">{t('marketing.dashboard.eighteenMinutesAgo', '18m ago')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>
      </LazyLoadingWrapper>
      
      {/* Benefits Section */}
      <LazyLoadingWrapper 
        fallback={<ComponentSkeleton height="h-96" />}
        componentName="BenefitsSection"
        priority="low"
      >
        <section id="benefits" className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{t('marketing.benefits.title', 'Why Choose MoogShip?')}</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('marketing.benefits.subtitle', 'Our platform was built to solve the complex challenges of international shipping and logistics management.')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cost Savings Benefit */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="h-14 w-14 text-blue-600 mb-5 flex items-center justify-center bg-blue-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.benefits.benefit1.title', 'Save Up to 70% on Shipping')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.benefits.benefit1.description', 'Access exclusive discounted rates from leading global carriers that traditional shipping platforms cannot match.')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit1.item1', 'Pre-negotiated discounts with major carriers')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit1.item2', 'No monthly subscription fees or minimums')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit1.item3', 'Transparent pricing with no hidden charges')}
                  </span>
                </li>
              </ul>
            </div>
            
            {/* Global Reach Benefit */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="h-14 w-14 text-indigo-600 mb-5 flex items-center justify-center bg-indigo-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.benefits.benefit2.title', 'Ship to 190+ Countries')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.benefits.benefit2.description', 'Expand your business globally with our extensive carrier network and streamlined international shipping process.')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit2.item1', 'Automated customs documentation')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit2.item2', 'Built-in compliance with international regulations')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit2.item3', 'Local pickup options in major countries')}
                  </span>
                </li>
              </ul>
            </div>
            
            {/* Ease of Use Benefit */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
              <div className="h-14 w-14 text-emerald-600 mb-5 flex items-center justify-center bg-emerald-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('marketing.benefits.benefit3.title', 'Simplify Your Workflow')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('marketing.benefits.benefit3.description', 'Save time with our intuitive platform designed to make international shipping as easy as domestic.')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit3.item1', 'One-click label generation and printing')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit3.item2', 'Bulk shipment creation and tracking')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    {t('marketing.benefits.benefit3.item3', 'Seamless integration with major e-commerce platforms')}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        </section>
      </LazyLoadingWrapper>
      
      {/* Testimonials section hidden as requested */}
      {/* CTA Section */}
      <LazyLoadingWrapper 
        fallback={<ComponentSkeleton height="h-64" />}
        componentName="CTASection"
        priority="low"
      >
        <section id="pricing" className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t('marketing.cta.title', 'Ready to Reduce Your Shipping Costs?')}
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            {t('marketing.cta.subtitle', 'Join Amazon, Etsy, Walmart, and Wayfair sellers who save on every shipment with ')}
            <span className="bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent font-bold">MoogShip</span>
            {t('marketing.cta.subtitle', '\'s exclusive rates.').split('MoogShip\'s exclusive rates.')[1]}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <span 
              onClick={() => redirectToAuth()}
              className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('marketing.cta.getStarted', 'Get Started')}
            </span>
            <span 
              onClick={() => window.location.href = '/marketing-price-calculator'}
              className="inline-block border border-blue-300 text-white hover:bg-blue-500 px-8 py-3 text-lg font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('marketing.cta.getQuote', 'Get a Rate Quote')}
            </span>
          </div>
        </div>
        </section>
      </LazyLoadingWrapper>
      
      {/* Footer */}
      <LazyLoadingWrapper 
        fallback={<ComponentSkeleton height="h-48" />}
        componentName="Footer"
        priority="low"
      >
        <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src={moogshipFooterLogoPath} 
                  alt="Moogship Logo" 
                  className="h-10 w-auto max-w-none opacity-100 block"
                  style={{
                    display: 'block',
                    height: '40px',
                    width: 'auto',
                    opacity: 1,
                    visibility: 'visible'
                  }}
                />
              </div>
              <p className="text-gray-400 mb-4">
                {t('marketing.footer.description')}
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open('https://www.instagram.com/moogship/', '_blank')}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
                >
                  <SiInstagram className="h-5 w-5 text-white" />
                  <span className="sr-only">Instagram</span>
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.companyTitle')}</h3>
              <ul className="space-y-2">
                <li>
                  <span 
                    onClick={() => window.location.href = '/hakkimizda'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.company.about')}</span>
                </li>
                <li>
                  <span 
                    onClick={() => window.location.href = '/ekibimiz'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.company.team')}</span>
                </li>
                <li>
                  <span 
                    onClick={() => window.location.href = '/kariyer'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.company.career')}</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.servicesTitle')}</h3>
              <ul className="space-y-2">
                <li>
                  <span 
                    onClick={() => window.location.href = '/kuresel-kargo'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.services.global')}</span>
                </li>
                <li>
                  <span 
                    onClick={() => window.location.href = '/takip'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.services.tracking')}</span>
                </li>
                <li>
                  <span 
                    onClick={() => window.location.href = '/destek'} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >{t('marketing.footer.services.support')}</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.contactOffices')}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇺🇸 United States</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>6825 176th Ave NE Ste 135</p>
                    <p>Redmond, WA 98052</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇹🇷 Turkiye</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>HALİL RIFAT PAŞA MAH. YÜZER HAVUZ SK. PERPA TİC MER B BLOK NO: 1/1 İÇ KAPI NO: 159</p>
                    <p>İstanbul, Turkiye 34384</p>
                    <p>+90 540 744 79 11</p>
                    <p>info@moogship.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2025 <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">MoogShip</span>. {t('marketing.footer.allRightsReserved')}
              <span 
                className="ml-2 opacity-30 hover:opacity-100 cursor-pointer transition-opacity text-xs"
                title="Clear translations cache"
                onClick={clearTranslationCache}
              >
                ↻
              </span>
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <span onClick={() => window.location.href = '/legal/terms'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.terms')}</span>
              <span onClick={() => window.location.href = '/legal/privacy'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.privacy')}</span>
              <span onClick={() => window.location.href = '/legal/cookies'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.cookies')}</span>
            </div>
          </div>
        </div>
        </footer>
      </LazyLoadingWrapper>
    </div>
  );
}