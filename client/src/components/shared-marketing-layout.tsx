import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SiWhatsapp, SiInstagram } from 'react-icons/si';
import { MiniLanguageSwitcher } from './language-switcher';
// import { MarketingBannerSlider } from './marketing-banner-slider';
import moogshipLogoPath from '../assets/moogship-logo.jpg';
import { getAuthUrl, redirectToAuth } from '../lib/mobile-auth-redirect';

interface SharedMarketingLayoutProps {
  children: React.ReactNode;
}

export function SharedMarketingLayout({ children }: SharedMarketingLayoutProps) {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Translation system ready

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Navigation - Fixed at top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
        <nav className="flex flex-wrap justify-between items-center py-1 px-2">
          <div className="flex items-center justify-between w-full">
            {/* Left side with menu toggle */}
            <div className="flex items-center space-x-4">
              <div className="relative">
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
                      <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.features', 'Features')}
                      </a>
                      <a href="/#benefits" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.benefits', 'Benefits')}
                      </a>
                      <a href="/marketing-price-calculator" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        {t('marketing.navigation.pricing', 'Fiyat Al')}
                      </a>
                      <div className="border-t border-gray-100 my-1"></div>
                      <a href={getAuthUrl()} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                        {t('marketing.hero.startShipping', 'Start Shipping')}
                      </a>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center">
                <a href="/">
                  <img src={moogshipLogoPath} alt="Moogship Logo" className="h-8 w-auto bg-blue-50 rounded-lg" />
                </a>
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

      {/* Desktop Navigation */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 md:py-10 pt-4 md:pt-10">
          <header className="mb-2 hidden md:block">
            <nav className="flex flex-wrap justify-between items-center relative bg-gradient-to-br from-blue-50 to-blue-100 py-4 px-0">
              <div className="flex items-center">
                <a href="/">
                  <img src={moogshipLogoPath} alt="Moogship Logo" className="h-12 w-auto bg-blue-50 rounded-xl" />
                </a>
                <div className="ml-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent relative">
                  <span className="absolute -inset-1 bg-blue-100 blur-sm opacity-30 rounded"></span>
                  <span className="relative">MoogShip</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-6">
                  <a 
                    href="/#features"
                    className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = '/#features';
                    }}
                  >
                    {t('marketing.navigation.features', 'Features')}
                  </a>
                  <a 
                    href="/#benefits"
                    className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = '/#benefits';
                    }}
                  >
                    {t('marketing.navigation.benefits', 'Benefits')}
                  </a>
                  <button 
                    onClick={() => window.location.href = '/marketing-price-calculator'}
                    className="inline-block py-2 px-3 text-white bg-orange-500 hover:bg-orange-600 hover:text-white hover:border-orange-600 rounded transition-all border border-orange-500"
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
                  
                  <span 
                    onClick={() => redirectToAuth()}
                    className="inline-flex items-center py-2 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t('marketing.hero.signup', 'Üye Ol')}</span>
                  </span>
                </div>
              </div>
            </nav>
          </header>
        </div>
      </div>

      {/* Page Content */}
      <div className="pt-16 md:pt-0">
        {children}
      </div>

      {/* Footer */}
      <footer key={i18n.language} className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src={moogshipLogoPath}
                  alt="MoogShip"
                  className="h-8 w-auto mr-3 cursor-pointer"
                  onClick={() => window.location.href = '/'}
                />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {i18n.language === 'tr' ? 'Global kargo ve lojistik çözümlerinde güvenilir ortağınız. 190+ ülkeye güvenli teslimat.' : 'Your trusted partner for global shipping solutions. We simplify international commerce with reliable, efficient, and cost-effective logistics services.'}
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open('https://wa.me/905407447911?text=Merhaba,%20Moogship%20hakkında%20bilgi%20almak%20istiyorum.', '_blank')}
                  className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                >
                  <SiWhatsapp className="h-5 w-5" />
                </button>
                <button
                  onClick={() => window.open('https://instagram.com/moogship', '_blank')}
                  className="w-10 h-10 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors"
                >
                  <SiInstagram className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">{i18n.language === 'tr' ? 'Hizmetler' : 'Services'}</h4>
              <ul className="space-y-2 text-sm">
                <li><span onClick={() => window.location.href = '/kuresel-kargo'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Küresel Kargo' : 'Global Shipping'}</span></li>
                <li><span onClick={() => window.location.href = '/marketing-price-calculator'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Fiyat Hesaplayıcı' : 'Price Calculator'}</span></li>
                <li><span onClick={() => window.location.href = '/takip'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Paket Takibi' : 'Package Tracking'}</span></li>
                <li><span onClick={() => window.location.href = '/destek'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Destek' : 'Support'}</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">{i18n.language === 'tr' ? 'Şirket' : 'Company'}</h4>
              <ul className="space-y-2 text-sm">
                <li><span onClick={() => window.location.href = '/hakkimizda'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Hakkımızda' : 'About Us'}</span></li>
                <li><span onClick={() => window.location.href = '/ekibimiz'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Ekibimiz' : 'Our Team'}</span></li>
                <li><span onClick={() => window.location.href = '/kariyer'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'Kariyer' : 'Careers'}</span></li>
                <li><span onClick={() => window.location.href = '/destek'} className="text-gray-400 hover:text-white cursor-pointer">{i18n.language === 'tr' ? 'İletişim & Destek' : 'Contact & Support'}</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">{i18n.language === 'tr' ? 'İletişim & Ofisler' : 'Contact & Offices'}</h4>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇺🇸 {i18n.language === 'tr' ? 'Amerika Birleşik Devletleri' : 'United States'}</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>6825 176th Ave NE Ste 135</p>
                    <p>Redmond, WA 98052</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">🇹🇷 {i18n.language === 'tr' ? 'Türkiye' : 'Turkey'}</h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>HALİL RIFAT PAŞA MAH. YÜZER HAVUZ SK. PERPA TİC MER B BLOK NO: 1/1 İÇ KAPI NO: 159</p>
                    <p>İstanbul, Türkiye 34384</p>
                    <p>+90 540 744 79 11</p>
                    <p>info@moogship.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2025 <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">MoogShip</span>. {i18n.language === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <span onClick={() => window.location.href = '/legal/terms'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{i18n.language === 'tr' ? 'Şartlar' : 'Terms'}</span>
              <span onClick={() => window.location.href = '/legal/privacy'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{i18n.language === 'tr' ? 'Gizlilik' : 'Privacy'}</span>
              <span onClick={() => window.location.href = '/legal/cookies'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{i18n.language === 'tr' ? 'Çerezler' : 'Cookies'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}