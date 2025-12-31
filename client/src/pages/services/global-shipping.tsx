import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function GlobalShippingPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.globalShipping.title', 'Global Shipping Solutions')}
      subtitle={t('pages.globalShipping.subtitle', 'Seamless international shipping for businesses of all sizes')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.globalShipping.intro', 'MoogShip provides comprehensive global shipping solutions that enable businesses to reach customers worldwide. Our platform simplifies international shipping with transparent pricing, reliable delivery, and easy customs handling.')}
          </p>
          
          <div className="bg-blue-50 p-6 rounded-lg my-8">
            <h2 className="text-xl font-bold mb-3">{t('pages.globalShipping.highlights.title', 'Service Highlights')}</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{t('pages.globalShipping.highlights.item1', 'Ship to over 220 countries and territories worldwide')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{t('pages.globalShipping.highlights.item2', 'Competitive rates with no hidden fees')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{t('pages.globalShipping.highlights.item3', 'End-to-end tracking and delivery confirmation')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{t('pages.globalShipping.highlights.item4', 'Automated customs documentation')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{t('pages.globalShipping.highlights.item5', 'Integration with major e-commerce platforms')}</span>
              </li>
            </ul>
          </div>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.globalShipping.services.title', 'Our Shipping Services')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.globalShipping.services.express.title', 'Express Shipping')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.globalShipping.services.express.description', 'Fast, reliable delivery for time-sensitive shipments. Typically 2-5 business days worldwide, with full tracking and insurance options.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.globalShipping.services.express.feature1', 'Priority handling and routing')}</li>
                <li>• {t('pages.globalShipping.services.express.feature2', 'Delivery time guarantees for most destinations')}</li>
                <li>• {t('pages.globalShipping.services.express.feature3', 'Available for packages up to 70kg')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.globalShipping.services.standard.title', 'Standard Shipping')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.globalShipping.services.standard.description', 'Cost-effective solution for non-urgent deliveries. Typically 5-12 business days depending on destination.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.globalShipping.services.standard.feature1', 'Economical rates for larger shipments')}</li>
                <li>• {t('pages.globalShipping.services.standard.feature2', 'Full tracking and delivery confirmation')}</li>
                <li>• {t('pages.globalShipping.services.standard.feature3', 'Ideal for regular inventory replenishment')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.globalShipping.services.ecommerce.title', 'E-commerce Shipping')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.globalShipping.services.ecommerce.description', 'Specialized solutions for online retailers with seamless platform integrations.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.globalShipping.services.ecommerce.feature1', 'Direct integration with major marketplaces')}</li>
                <li>• {t('pages.globalShipping.services.ecommerce.feature2', 'Automated label generation and customs forms')}</li>
                <li>• {t('pages.globalShipping.services.ecommerce.feature3', 'Batch processing for high-volume sellers')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.globalShipping.services.bulk.title', 'Bulk Freight Shipping')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.globalShipping.services.bulk.description', 'Efficient solutions for larger shipments, pallets, and bulk orders.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.globalShipping.services.bulk.feature1', 'Air, sea, and ground transportation options')}</li>
                <li>• {t('pages.globalShipping.services.bulk.feature2', 'Consolidation services for multiple shipments')}</li>
                <li>• {t('pages.globalShipping.services.bulk.feature3', 'Custom solutions for oversized or specialty items')}</li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.globalShipping.regions.title', 'Global Coverage')}
          </h2>
          
          <p className="mb-4">
            {t('pages.globalShipping.regions.description', 'We offer comprehensive shipping solutions to virtually every corner of the world, with specialized services for key regions:')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.europe.title', 'Europe')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.europe.description', 'Fast shipping throughout the EU with streamlined customs handling for post-Brexit UK shipments.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.northAmerica.title', 'North America')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.northAmerica.description', 'Expedited services to the US and Canada with full compliance support for regulated goods.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.asia.title', 'Asia-Pacific')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.asia.description', 'Comprehensive coverage across Asia with specialized routes to major markets in China, Japan, and Australia.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.middleEast.title', 'Middle East')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.middleEast.description', 'Reliable shipping to all Gulf countries with expertise in local regulations and requirements.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.southAmerica.title', 'South America')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.southAmerica.description', 'Strategic routes to major South American markets with customs expertise for complex regulatory environments.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.globalShipping.regions.africa.title', 'Africa')}</h3>
              <p className="text-sm text-gray-600">{t('pages.globalShipping.regions.africa.description', 'Growing network covering major African markets with specialized knowledge of regional requirements.')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.globalShipping.tools.title', 'Shipping Tools & Resources')}
          </h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <h3 className="font-semibold text-gray-900">{t('pages.globalShipping.tools.calculator.title', 'Shipping Cost Calculator')}</h3>
              <p className="text-gray-600">{t('pages.globalShipping.tools.calculator.description', 'Get instant price quotes for shipments to any destination worldwide.')}</p>
              <a href="/marketing-price-calculator" className="text-blue-600 text-sm hover:underline">
                {t('pages.globalShipping.tools.tryNow', 'Try now')} →
              </a>
            </div>
            
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <h3 className="font-semibold text-gray-900">{t('pages.globalShipping.tools.tracking.title', 'Package Tracking')}</h3>
              <p className="text-gray-600">{t('pages.globalShipping.tools.tracking.description', 'Real-time tracking for all your shipments in one place.')}</p>
              <a href="#" className="text-blue-600 text-sm hover:underline">
                {t('pages.globalShipping.tools.learnMore', 'Learn more')} →
              </a>
            </div>
            
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <h3 className="font-semibold text-gray-900">{t('pages.globalShipping.tools.customsGuide.title', 'Customs Documentation Guide')}</h3>
              <p className="text-gray-600">{t('pages.globalShipping.tools.customsGuide.description', 'Country-specific requirements and documentation guidelines.')}</p>
              <a href="#" className="text-blue-600 text-sm hover:underline">
                {t('pages.globalShipping.tools.download', 'Download guide')} →
              </a>
            </div>
            
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <h3 className="font-semibold text-gray-900">{t('pages.globalShipping.tools.api.title', 'API Documentation')}</h3>
              <p className="text-gray-600">{t('pages.globalShipping.tools.api.description', 'Technical resources for integrating MoogShip with your systems.')}</p>
              <a href="#" className="text-blue-600 text-sm hover:underline">
                {t('pages.globalShipping.tools.viewDocs', 'View documentation')} →
              </a>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg mt-10">
            <h2 className="text-xl font-bold mb-3">{t('pages.globalShipping.getStarted.title', 'Ready to Ship Globally?')}</h2>
            <p className="mb-4">{t('pages.globalShipping.getStarted.description', 'Create an account today to access our global shipping platform, or contact our sales team for a customized solution for your business needs.')}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                {t('pages.globalShipping.getStarted.createAccount', 'Create Account')}
              </a>
              <a href="/company/contact" className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                {t('pages.globalShipping.getStarted.contactSales', 'Contact Sales')}
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}