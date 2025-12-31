import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/language-switcher';
import moogshipLogoPath from '../assets/moogship-logo.jpg';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function GenericPageTemplate({ 
  title, 
  subtitle,
  content
}: { 
  title: string, 
  subtitle?: string,
  content: React.ReactNode 
}) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
  const navigate = (path: string) => {
    setLocation(path);
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <button 
                onClick={() => navigate("/marketing")} 
                className="flex items-center"
              >
                <img src={moogshipLogoPath} alt="Moogship Logo" className="h-10 w-auto" />
              </button>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => navigate("/marketing#features")}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t('marketing.navigation.features', 'Features')}
                </button>
                <button 
                  onClick={() => navigate("/marketing#benefits")}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t('marketing.navigation.benefits', 'Benefits')}
                </button>
                <button 
                  onClick={() => navigate("/marketing#testimonials")}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t('marketing.navigation.testimonials', 'Testimonials')}
                </button>
                <button 
                  onClick={() => navigate("/marketing#pricing")}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t('marketing.navigation.pricing', 'Pricing')}
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => navigate("/marketing-price-calculator")}
                  className="bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm"
                >
                  {t('marketing.navigation.priceCalculator', 'Price Calculator')}
                </Button>
                
                <Button
                  onClick={() => navigate("/auth")}
                  className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {t('marketing.navigation.login', 'Login')}
                </Button>
                
                <LanguageSwitcher size="sm" variant="outline" />
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <span className="sr-only">Open main menu</span>
                <svg 
                  className="block h-6 w-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h1>
            {subtitle && (
              <p className="text-xl text-gray-600 mb-8">{subtitle}</p>
            )}
            <div className="prose prose-blue max-w-none">
              {content}
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <section className="bg-blue-50 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('marketing.cta.title', 'Ready to streamline your global shipping?')}
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('marketing.cta.subtitle', 'Start shipping smarter with MoogShip. Sign up today and experience the difference.')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => navigate('/auth')}
                className="bg-blue-600 text-white hover:bg-blue-700 text-lg px-8 py-3 h-auto"
                size="lg"
              >
                {t('marketing.cta.getStarted', 'Get Started')}
              </Button>
              <Button
                onClick={() => navigate('/marketing-price-calculator')}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 text-lg px-8 py-3 h-auto"
                size="lg"
              >
                {t('marketing.cta.calculatePrice', 'Calculate Price')}
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={moogshipLogoPath} alt="Moogship Logo" className="h-10 w-auto bg-white p-1 rounded" />
              </div>
              <p className="text-gray-400 mb-4">
                {t('marketing.footer.description')}
              </p>
              <div className="flex space-x-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <span 
                    key={social} 
                    onClick={() => window.open(`https://www.${social}.com/moogship`, '_blank')}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-sm">{social[0].toUpperCase()}</span>
                    </div>
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.company')}</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate("/company/about")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.about', 'About Us')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/company/careers")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.careers', 'Careers')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/company/press")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.press', 'Press')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/company/news")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.news', 'News')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/company/contact")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.contact', 'Contact')}
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.services')}</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate("/services/global-shipping")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.global', 'Global Shipping')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/services/customs-clearance")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.customs', 'Customs Clearance')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/services/freight-forwarding")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.freight', 'Freight Forwarding')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/services/warehousing")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.warehousing', 'Warehousing')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/services/supply-chain")} 
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    {t('marketing.footer.supplyChain', 'Supply Chain')}
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Contact & Offices</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇺🇸 United States</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>6825 176th Ave NE Ste 135</p>
                    <p>Redmond, WA 98052</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇹🇷 Turkey</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>Esenler Mahallesi</p>
                    <p>İstanbul, Turkey 34220</p>
                    <p>turkey@moogship.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025. {t('marketing.footer.allRightsReserved')}</p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <button 
                onClick={() => navigate("/legal/terms")} 
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t('marketing.footer.terms')}
              </button>
              <button 
                onClick={() => navigate("/legal/privacy")} 
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t('marketing.footer.privacy')}
              </button>
              <button 
                onClick={() => navigate("/legal/cookies")} 
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t('marketing.footer.cookies')}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}