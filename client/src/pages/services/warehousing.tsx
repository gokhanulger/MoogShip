import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function WarehousingPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.warehousing.title', 'Warehousing & Fulfillment Services')}
      subtitle={t('pages.warehousing.subtitle', 'Strategic storage and distribution solutions for global businesses')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.warehousing.intro', 'MoogShip provides flexible warehousing and fulfillment solutions that help businesses optimize their inventory management and order processing. Our global network of strategically located facilities enables efficient distribution, reduced shipping times, and lower transportation costs.')}
          </p>
          
          <div className="bg-blue-50 p-6 rounded-lg my-8">
            <h2 className="text-xl font-bold mb-3">{t('pages.warehousing.highlights.title', 'Service Highlights')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.warehousing.highlights.global.title', 'Global Warehouse Network')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.warehousing.highlights.global.description', 'Strategic facilities in key markets worldwide')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.warehousing.highlights.tech.title', 'Advanced Technology')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.warehousing.highlights.tech.description', 'Modern WMS with real-time inventory visibility')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.warehousing.highlights.fulfillment.title', 'Integrated Fulfillment')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.warehousing.highlights.fulfillment.description', 'Seamless order processing and shipping')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.warehousing.highlights.flexible.title', 'Flexible Solutions')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.warehousing.highlights.flexible.description', 'Customizable services for businesses of all sizes')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.warehousing.services.title', 'Our Warehousing Services')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.storage.title', 'Storage Solutions')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.storage.description', 'Secure and flexible warehouse space for your inventory needs.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.storage.feature1', 'Short and long-term storage options')}</li>
                <li>• {t('pages.warehousing.services.storage.feature2', 'Climate-controlled facilities')}</li>
                <li>• {t('pages.warehousing.services.storage.feature3', 'Secure storage with 24/7 monitoring')}</li>
                <li>• {t('pages.warehousing.services.storage.feature4', 'Specialized storage for sensitive goods')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.distribution.title', 'Distribution Services')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.distribution.description', 'Strategic distribution solutions to optimize your supply chain.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.distribution.feature1', 'Global distribution network')}</li>
                <li>• {t('pages.warehousing.services.distribution.feature2', 'Cross-docking capabilities')}</li>
                <li>• {t('pages.warehousing.services.distribution.feature3', 'Inventory positioning optimization')}</li>
                <li>• {t('pages.warehousing.services.distribution.feature4', 'Multi-channel distribution')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.fulfillment.title', 'E-commerce Fulfillment')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.fulfillment.description', 'End-to-end order processing for online retailers.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.fulfillment.feature1', 'Order receipt and processing')}</li>
                <li>• {t('pages.warehousing.services.fulfillment.feature2', 'Pick, pack, and ship services')}</li>
                <li>• {t('pages.warehousing.services.fulfillment.feature3', 'Custom packaging options')}</li>
                <li>• {t('pages.warehousing.services.fulfillment.feature4', 'Returns management')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.inventory.title', 'Inventory Management')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.inventory.description', 'Advanced inventory control and optimization services.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.inventory.feature1', 'Real-time inventory visibility')}</li>
                <li>• {t('pages.warehousing.services.inventory.feature2', 'Stock level monitoring and alerts')}</li>
                <li>• {t('pages.warehousing.services.inventory.feature3', 'Lot and batch tracking')}</li>
                <li>• {t('pages.warehousing.services.inventory.feature4', 'Inventory reporting and analytics')}</li>
              </ul>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.valueAdded.title', 'Value-Added Services')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.valueAdded.description', 'Additional services to enhance your product offering.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.valueAdded.feature1', 'Product kitting and assembly')}</li>
                <li>• {t('pages.warehousing.services.valueAdded.feature2', 'Labeling and re-labeling')}</li>
                <li>• {t('pages.warehousing.services.valueAdded.feature3', 'Quality inspection')}</li>
                <li>• {t('pages.warehousing.services.valueAdded.feature4', 'Gift wrapping and custom packaging')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.warehousing.services.technology.title', 'Warehouse Technology')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.warehousing.services.technology.description', 'Modern systems for efficient warehouse operations.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.services.technology.feature1', 'Advanced warehouse management system')}</li>
                <li>• {t('pages.warehousing.services.technology.feature2', 'Integration with e-commerce platforms')}</li>
                <li>• {t('pages.warehousing.services.technology.feature3', 'Barcode scanning and RFID tracking')}</li>
                <li>• {t('pages.warehousing.services.technology.feature4', 'Automated reporting and analytics')}</li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.warehousing.facilities.title', 'Our Warehouse Network')}
          </h2>
          
          <p className="mb-6">
            {t('pages.warehousing.facilities.description', 'MoogShip operates a global network of modern warehousing facilities, strategically located to support efficient distribution to major markets worldwide:')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.warehousing.facilities.eu.title', 'European Facilities')}</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.facilities.eu.location1', 'Istanbul, Turkey')}</li>
                <li>• {t('pages.warehousing.facilities.eu.location2', 'Berlin, Germany')}</li>
                <li>• {t('pages.warehousing.facilities.eu.location3', 'Rotterdam, Netherlands')}</li>
                <li>• {t('pages.warehousing.facilities.eu.location4', 'Warsaw, Poland')}</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.warehousing.facilities.na.title', 'North American Facilities')}</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.facilities.na.location1', 'New York, USA')}</li>
                <li>• {t('pages.warehousing.facilities.na.location2', 'Los Angeles, USA')}</li>
                <li>• {t('pages.warehousing.facilities.na.location3', 'Toronto, Canada')}</li>
                <li>• {t('pages.warehousing.facilities.na.location4', 'Mexico City, Mexico')}</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.warehousing.facilities.asia.title', 'Asia-Pacific Facilities')}</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.warehousing.facilities.asia.location1', 'Singapore')}</li>
                <li>• {t('pages.warehousing.facilities.asia.location2', 'Hong Kong')}</li>
                <li>• {t('pages.warehousing.facilities.asia.location3', 'Tokyo, Japan')}</li>
                <li>• {t('pages.warehousing.facilities.asia.location4', 'Sydney, Australia')}</li>
              </ul>
            </div>
          </div>
          
          <p className="text-gray-600 mb-8">
            {t('pages.warehousing.facilities.expansion', 'Our network continues to expand to meet the evolving needs of our global customers, with new facilities planned in emerging markets and strategic shipping hubs.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.warehousing.benefits.title', 'Benefits of MoogShip Warehousing')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a1.93 1.93 0 0 0-.97 1.68v4.62a1.93 1.93 0 0 0 .97 1.68l3.65 1.89a1.93 1.93 0 0 0 1.81 0l.2-.1"></path>
                  <path d="M22 17.65a.6.6 0 0 1-.34.54l-3.67 1.93a.6.6 0 0 1-.56 0l-3.67-1.93a.6.6 0 0 1-.34-.54v-3.9a.6.6 0 0 1 .34-.54l3.67-1.93a.6.6 0 0 1 .56 0l3.67 1.93a.6.6 0 0 1 .34.54Z"></path>
                  <path d="M14.44 5.06 20 8.18"></path>
                  <path d="M14.44 7.06 20 10.18"></path>
                  <path d="M14.44 9.06 20 12.18"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('pages.warehousing.benefits.cost.title', 'Cost Optimization')}</h3>
                <p className="text-gray-600">{t('pages.warehousing.benefits.cost.description', 'Reduce capital investment in warehouse infrastructure, convert fixed costs to variable costs, and optimize transportation expenses through strategic inventory positioning.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('pages.warehousing.benefits.speed.title', 'Faster Delivery Times')}</h3>
                <p className="text-gray-600">{t('pages.warehousing.benefits.speed.description', 'Position inventory closer to your customers for reduced transit times, enabling faster order fulfillment and improved customer satisfaction.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="m17 5-5-3-5 3"></path>
                  <path d="m17 19-5 3-5-3"></path>
                  <path d="M2 12h20"></path>
                  <path d="m5 7-3 5 3 5"></path>
                  <path d="m19 7 3 5-3 5"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('pages.warehousing.benefits.scale.title', 'Scalability & Flexibility')}</h3>
                <p className="text-gray-600">{t('pages.warehousing.benefits.scale.description', 'Easily adapt to business growth, seasonal fluctuations, and market changes without the constraints of fixed warehouse space and staffing.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"></path>
                  <path d="M14 4.5V9h4.5"></path>
                  <path d="m16 18-2-2v4"></path>
                  <path d="M18 16V8M6 18V4M12 14v4"></path>
                  <path d="M12 14c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('pages.warehousing.benefits.tech.title', 'Advanced Technology')}</h3>
                <p className="text-gray-600">{t('pages.warehousing.benefits.tech.description', 'Leverage our investment in cutting-edge warehouse management systems, providing real-time visibility, efficient operations, and valuable analytics.')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg mt-10">
            <h2 className="text-xl font-bold mb-3">{t('pages.warehousing.cta.title', 'Transform Your Storage and Distribution')}</h2>
            <p className="mb-4">{t('pages.warehousing.cta.description', 'Contact MoogShip today to discuss your warehousing and fulfillment needs. Our experts will design a customized solution that optimizes your inventory management and enhances your distribution capabilities.')}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                {t('pages.warehousing.cta.getStarted', 'Get Started')}
              </a>
              <a href="/company/contact" className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                {t('pages.warehousing.cta.contactSales', 'Contact Sales')}
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}