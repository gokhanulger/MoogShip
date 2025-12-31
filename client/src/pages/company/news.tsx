import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function NewsPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.news.title', 'Latest News')}
      subtitle={t('pages.news.subtitle', 'Updates, announcements, and stories from MoogShip')}
      content={
        <div>
          <div className="space-y-10">
            {/* Featured Article */}
            <div className="border-b border-gray-200 pb-8">
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400">
                {t('pages.news.featured.imageAlt', 'Featured image')}
              </div>
              <p className="text-sm text-gray-500 mb-2">{t('pages.news.featured.date', 'April 20, 2025')}</p>
              <h2 className="text-2xl font-bold mb-3">
                {t('pages.news.featured.title', 'MoogShip Introduces Real-Time Shipment Tracking with Enhanced Analytics')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('pages.news.featured.excerpt', 'Our new tracking system provides minute-by-minute updates and comprehensive analytics to help e-commerce sellers better manage their international shipping operations.')}
              </p>
              <a href="#" className="text-blue-600 font-medium hover:underline">
                {t('pages.news.readMore', 'Read more')} →
              </a>
            </div>
            
            {/* Recent Articles */}
            <h3 className="text-xl font-semibold mb-4">{t('pages.news.recent.title', 'Recent Updates')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article1.date', 'April 15, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article1.title', 'New Partnership with European Customs Authorities Streamlines Cross-Border Shipping')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article1.excerpt', 'MoogShip announces a strategic partnership with European customs authorities to expedite customs clearance for e-commerce shipments.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
              
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article2.date', 'April 3, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article2.title', 'MoogShip Opens New Operations Center in Berlin')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article2.excerpt', 'The new facility will serve as a hub for European operations, improving delivery times and customer service for sellers across the continent.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
              
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article3.date', 'March 22, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article3.title', 'MoogShip\'s Sustainability Initiative Reduces Carbon Footprint by 30%')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article3.excerpt', 'Through optimized routing and carbon offset programs, MoogShip has significantly reduced the environmental impact of international shipping.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
              
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article4.date', 'March 10, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article4.title', 'MoogShip API 2.0 Released with Enhanced Integration Capabilities')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article4.excerpt', 'The updated API offers new features for seamless integration with e-commerce platforms, marketplaces, and warehouse management systems.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
              
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article5.date', 'February 28, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article5.title', 'MoogShip Named "Shipping Solution of the Year" at E-commerce Awards')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article5.excerpt', 'Industry recognition highlights MoogShip\'s innovation and excellence in providing global shipping solutions for online sellers.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
              
              <div className="border-b border-gray-100 pb-6">
                <p className="text-sm text-gray-500 mb-2">{t('pages.news.article6.date', 'February 15, 2025')}</p>
                <h3 className="text-lg font-bold mb-2">
                  {t('pages.news.article6.title', 'MoogShip Launches Small Business Support Program')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('pages.news.article6.excerpt', 'New initiative provides special rates and resources to help small e-commerce businesses expand internationally.')}
                </p>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  {t('pages.news.readMore', 'Read more')} →
                </a>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <button className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                {t('pages.news.loadMore', 'Load more news')}
              </button>
            </div>
            
            <div className="mt-12 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">{t('pages.news.subscribe.title', 'Stay Updated')}</h3>
              <p className="mb-4">{t('pages.news.subscribe.description', 'Subscribe to our newsletter to receive the latest news and updates from MoogShip.')}</p>
              <div className="flex space-x-2">
                <input 
                  type="email" 
                  placeholder={t('pages.news.subscribe.placeholder', 'Your email address')} 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors">
                  {t('pages.news.subscribe.button', 'Subscribe')}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}