import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function PressPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.press.title', 'Press & Media')}
      subtitle={t('pages.press.subtitle', 'News, resources, and media information about MoogShip')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.press.intro', 'Welcome to MoogShip\'s press and media center. Here you\'ll find the latest news, press releases, media resources, and contact information for media inquiries.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.press.contact.title', 'Media Contact')}
          </h2>
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <p className="font-medium">{t('pages.press.contact.name', 'Media Relations Team')}</p>
            <p>{t('pages.press.contact.email', 'press@moogship.com')}</p>
            <p>{t('pages.press.contact.phone', '+90 212 555 4567')}</p>
            <p className="mt-2 text-sm text-gray-600">{t('pages.press.contact.response', 'For media inquiries, we aim to respond within 24 hours.')}</p>
          </div>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.press.releases.title', 'Press Releases')}
          </h2>
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-5">
              <p className="text-sm text-gray-500 mb-1">{t('pages.press.releases.release1.date', 'April 15, 2025')}</p>
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.press.releases.release1.title', 'MoogShip Expands Operations to 10 New Countries Across Europe')}</h3>
              <p className="mt-2">{t('pages.press.releases.release1.summary', 'MoogShip announces expansion of its global shipping platform to 10 additional European countries, providing e-commerce sellers with enhanced international shipping capabilities.')}</p>
            </div>
            
            <div className="border-b border-gray-200 pb-5">
              <p className="text-sm text-gray-500 mb-1">{t('pages.press.releases.release2.date', 'February 28, 2025')}</p>
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.press.releases.release2.title', 'MoogShip Partners with Major E-commerce Platforms to Streamline Cross-Border Shipping')}</h3>
              <p className="mt-2">{t('pages.press.releases.release2.summary', 'New integrations with leading e-commerce platforms will help sellers automatically fulfill international orders and manage customs documentation with ease.')}</p>
            </div>
            
            <div className="border-b border-gray-200 pb-5">
              <p className="text-sm text-gray-500 mb-1">{t('pages.press.releases.release3.date', 'January 10, 2025')}</p>
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.press.releases.release3.title', 'MoogShip Secures $12M in Series A Funding to Accelerate Growth')}</h3>
              <p className="mt-2">{t('pages.press.releases.release3.summary', 'Funding will be used to enhance technology platform, expand market reach, and grow the team to support increasing demand for global shipping solutions.')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.press.resources.title', 'Media Resources')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <h3 className="font-medium">{t('pages.press.resources.logos.title', 'Brand Assets')}</h3>
              <p className="text-sm text-gray-600 mt-1">{t('pages.press.resources.logos.description', 'Download MoogShip logos, product screenshots, and brand guidelines.')}</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <h3 className="font-medium">{t('pages.press.resources.factsheet.title', 'Company Fact Sheet')}</h3>
              <p className="text-sm text-gray-600 mt-1">{t('pages.press.resources.factsheet.description', 'Key facts and figures about MoogShip\'s operations and market position.')}</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <h3 className="font-medium">{t('pages.press.resources.bios.title', 'Executive Bios')}</h3>
              <p className="text-sm text-gray-600 mt-1">{t('pages.press.resources.bios.description', 'Profiles and photos of MoogShip\'s leadership team.')}</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <h3 className="font-medium">{t('pages.press.resources.casestudies.title', 'Case Studies')}</h3>
              <p className="text-sm text-gray-600 mt-1">{t('pages.press.resources.casestudies.description', 'Customer success stories and detailed use cases.')}</p>
            </div>
          </div>
          
          <div className="mt-10 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">{t('pages.press.clippings.title', 'MoogShip in the News')}</h2>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-blue-600 hover:underline">
                  {t('pages.press.clippings.item1', '"How MoogShip is Transforming Cross-Border E-commerce" - TechCrunch')}
                </a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:underline">
                  {t('pages.press.clippings.item2', '"MoogShip Named in Top 50 Logistics Startups to Watch" - Forbes')}
                </a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:underline">
                  {t('pages.press.clippings.item3', '"The Future of Global Shipping: Interview with MoogShip CEO" - Bloomberg')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      }
    />
  );
}