import { useTranslation } from 'react-i18next';
import { MiniLanguageSwitcher } from './language-switcher';
import moogshipLogoPath from '../assets/moogship-logo.jpg';

interface TurkishPageLayoutProps {
  children: React.ReactNode;
}

export function TurkishPageLayout({ children }: TurkishPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
        <nav className="flex justify-between items-center py-4 px-6 max-w-7xl mx-auto">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img src={moogshipLogoPath} alt="MoogShip" className="h-8 w-auto" />
            </a>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <a href="/#features" className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              {t('marketing.navigation.features', 'Features')}
            </a>
            <a href="/#benefits" className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              {t('marketing.navigation.benefits', 'Benefits')}
            </a>
            <a href="/marketing-price-calculator" className="inline-block py-2 px-3 text-white bg-orange-500 hover:bg-orange-600 hover:text-white hover:border-orange-600 rounded transition-all border border-orange-500">
              {t('marketing.navigation.pricing', 'Fiyat Al')}
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            <MiniLanguageSwitcher />
            <a href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              {t('marketing.header.login', 'Giriş Yap')}
            </a>
          </div>
        </nav>
      </header>

      {/* Page Content */}
      {children}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <img src={moogshipLogoPath} alt="MoogShip" className="h-8 w-auto" />
              </div>
              <p className="text-gray-300 mb-4">
                {t('marketing.footer.description', 'Küresel kargo ve lojistik çözümlerinde güvenilir ortağınız.')}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('marketing.footer.company.title', 'Şirket')}</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="/hakkimizda" className="hover:text-white transition-colors">{t('marketing.footer.company.about', 'Hakkımızda')}</a></li>
                <li><a href="/ekibimiz" className="hover:text-white transition-colors">{t('marketing.footer.company.team', 'Ekibimiz')}</a></li>
                <li><a href="/kariyer" className="hover:text-white transition-colors">{t('marketing.footer.company.careers', 'Kariyer')}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('marketing.footer.services.title', 'Hizmetler')}</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="/kuresel-kargo" className="hover:text-white transition-colors">{t('marketing.footer.services.shipping', 'Küresel Kargo')}</a></li>
                <li><a href="/takip" className="hover:text-white transition-colors">{t('marketing.footer.services.tracking', 'Takip')}</a></li>
                <li><a href="/destek" className="hover:text-white transition-colors">{t('marketing.footer.services.support', 'Destek')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2025 MoogShip. {t('marketing.footer.rights', 'Tüm hakları saklıdır.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}