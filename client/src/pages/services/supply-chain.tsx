import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function SupplyChainPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.supplyChain.title', 'Supply Chain Solutions')}
      subtitle={t('pages.supplyChain.subtitle', 'End-to-end supply chain management for global businesses')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.supplyChain.intro', 'MoogShip offers comprehensive supply chain solutions that integrate seamlessly with your business operations. Our end-to-end approach combines transportation, warehousing, technology, and consulting services to optimize your entire supply chain, reduce costs, and improve customer satisfaction.')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="10" x="3" y="8" rx="2"></rect>
                  <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path>
                  <path d="M12 14v.01"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.supplyChain.pillars.planning.title', 'Planning')}</h3>
              <p className="text-gray-600 text-sm">{t('pages.supplyChain.pillars.planning.description', 'Strategic supply chain design and optimization')}</p>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  <path d="M8 14H2"></path>
                  <path d="M22 14h-6"></path>
                  <path d="M10 2v8"></path>
                  <path d="M10 14v8"></path>
                  <path d="M14 2v8"></path>
                  <path d="M14 14v8"></path>
                  <path d="M2 10h8"></path>
                  <path d="M14 10h8"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.supplyChain.pillars.sourcing.title', 'Sourcing')}</h3>
              <p className="text-gray-600 text-sm">{t('pages.supplyChain.pillars.sourcing.description', 'Supplier selection and procurement support')}</p>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="16" height="16" x="4" y="4" rx="2"></rect>
                  <path d="M12 4v16"></path>
                  <path d="M4 12h16"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.supplyChain.pillars.execution.title', 'Execution')}</h3>
              <p className="text-gray-600 text-sm">{t('pages.supplyChain.pillars.execution.description', 'Freight, warehousing, and fulfillment operations')}</p>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="m2 6 20 12"></path>
                  <path d="M2 18 22 6"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.supplyChain.pillars.analytics.title', 'Analytics')}</h3>
              <p className="text-gray-600 text-sm">{t('pages.supplyChain.pillars.analytics.description', 'Visibility, insights, and continuous improvement')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.supplyChain.services.title', 'Comprehensive Supply Chain Services')}
          </h2>
          
          <div className="space-y-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.supplyChain.services.strategy.title', 'Supply Chain Strategy')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.services.strategy.description', 'Strategic planning and design services to optimize your supply chain network.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.supplyChain.services.strategy.feature1', 'Network design and optimization')}</li>
                <li>• {t('pages.supplyChain.services.strategy.feature2', 'Inventory positioning strategies')}</li>
                <li>• {t('pages.supplyChain.services.strategy.feature3', 'Supply chain risk assessment')}</li>
                <li>• {t('pages.supplyChain.services.strategy.feature4', 'Cost reduction and efficiency planning')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.supplyChain.services.integrated.title', 'Integrated Logistics')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.services.integrated.description', 'Seamless coordination of freight, warehousing, and distribution services.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.supplyChain.services.integrated.feature1', 'Multi-modal transportation management')}</li>
                <li>• {t('pages.supplyChain.services.integrated.feature2', 'Warehouse and distribution center operations')}</li>
                <li>• {t('pages.supplyChain.services.integrated.feature3', 'Cross-border logistics coordination')}</li>
                <li>• {t('pages.supplyChain.services.integrated.feature4', 'Last-mile delivery optimization')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.supplyChain.services.inventory.title', 'Inventory Management')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.services.inventory.description', 'Advanced solutions to optimize inventory levels and improve working capital.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.supplyChain.services.inventory.feature1', 'Demand forecasting and planning')}</li>
                <li>• {t('pages.supplyChain.services.inventory.feature2', 'Safety stock optimization')}</li>
                <li>• {t('pages.supplyChain.services.inventory.feature3', 'Inventory visibility and control')}</li>
                <li>• {t('pages.supplyChain.services.inventory.feature4', 'Obsolescence and slow-moving stock management')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.supplyChain.services.technology.title', 'Supply Chain Technology')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.services.technology.description', 'Digital solutions to enhance visibility, control, and efficiency.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.supplyChain.services.technology.feature1', 'Supply chain visibility platforms')}</li>
                <li>• {t('pages.supplyChain.services.technology.feature2', 'Transportation management systems')}</li>
                <li>• {t('pages.supplyChain.services.technology.feature3', 'Warehouse management technology')}</li>
                <li>• {t('pages.supplyChain.services.technology.feature4', 'Business intelligence and analytics')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.supplyChain.services.sustainable.title', 'Sustainable Supply Chain')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.services.sustainable.description', 'Environmental and social responsibility initiatives for your supply chain.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.supplyChain.services.sustainable.feature1', 'Carbon footprint reduction strategies')}</li>
                <li>• {t('pages.supplyChain.services.sustainable.feature2', 'Green transportation options')}</li>
                <li>• {t('pages.supplyChain.services.sustainable.feature3', 'Sustainable packaging solutions')}</li>
                <li>• {t('pages.supplyChain.services.sustainable.feature4', 'Supply chain ethical standards implementation')}</li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.supplyChain.industries.title', 'Industry Solutions')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
              <div className="bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.supplyChain.industries.retail.title', 'Retail & E-commerce')}</h3>
              </div>
              <div className="p-4 flex-grow">
                <p className="text-gray-600 text-sm mb-3">{t('pages.supplyChain.industries.retail.description', 'Specialized solutions for multichannel retail operations.')}</p>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• {t('pages.supplyChain.industries.retail.feature1', 'Omnichannel distribution strategies')}</li>
                  <li>• {t('pages.supplyChain.industries.retail.feature2', 'E-commerce fulfillment optimization')}</li>
                  <li>• {t('pages.supplyChain.industries.retail.feature3', 'Returns management')}</li>
                  <li>• {t('pages.supplyChain.industries.retail.feature4', 'Peak season scaling')}</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
              <div className="bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.supplyChain.industries.manufacturing.title', 'Manufacturing')}</h3>
              </div>
              <div className="p-4 flex-grow">
                <p className="text-gray-600 text-sm mb-3">{t('pages.supplyChain.industries.manufacturing.description', 'Integrated supply chain solutions for manufacturing operations.')}</p>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• {t('pages.supplyChain.industries.manufacturing.feature1', 'Inbound logistics optimization')}</li>
                  <li>• {t('pages.supplyChain.industries.manufacturing.feature2', 'Just-in-time inventory management')}</li>
                  <li>• {t('pages.supplyChain.industries.manufacturing.feature3', 'Production support logistics')}</li>
                  <li>• {t('pages.supplyChain.industries.manufacturing.feature4', 'Finished goods distribution')}</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
              <div className="bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.supplyChain.industries.healthcare.title', 'Healthcare & Pharmaceuticals')}</h3>
              </div>
              <div className="p-4 flex-grow">
                <p className="text-gray-600 text-sm mb-3">{t('pages.supplyChain.industries.healthcare.description', 'Compliant supply chain solutions for sensitive healthcare products.')}</p>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• {t('pages.supplyChain.industries.healthcare.feature1', 'Temperature-controlled logistics')}</li>
                  <li>• {t('pages.supplyChain.industries.healthcare.feature2', 'Regulatory compliance management')}</li>
                  <li>• {t('pages.supplyChain.industries.healthcare.feature3', 'Track and trace capabilities')}</li>
                  <li>• {t('pages.supplyChain.industries.healthcare.feature4', 'Medical device distribution')}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.supplyChain.technology.title', 'Supply Chain Technology Platform')}
          </h2>
          
          <p className="mb-6">
            {t('pages.supplyChain.technology.description', 'MoogShip\'s digital supply chain platform provides end-to-end visibility and control over your entire supply chain:')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('pages.supplyChain.technology.visibility.title', 'Real-time Visibility')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.technology.visibility.description', 'Track inventory and shipments across your entire supply chain network with real-time updates and alerts.')}</p>
              <div className="flex justify-center mt-4">
                <div className="h-24 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                  {t('pages.supplyChain.technology.visibility.imageAlt', 'Dashboard visualization')}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('pages.supplyChain.technology.analytics.title', 'Advanced Analytics')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.technology.analytics.description', 'Leverage data-driven insights to identify optimization opportunities, forecast demand, and improve performance.')}</p>
              <div className="flex justify-center mt-4">
                <div className="h-24 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                  {t('pages.supplyChain.technology.analytics.imageAlt', 'Analytics charts')}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('pages.supplyChain.technology.integration.title', 'Seamless Integration')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.technology.integration.description', 'Connect with your ERP, WMS, and other business systems for synchronized operations and data flow.')}</p>
              <div className="flex justify-center mt-4">
                <div className="h-24 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                  {t('pages.supplyChain.technology.integration.imageAlt', 'Systems integration')}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('pages.supplyChain.technology.mobile.title', 'Mobile Access')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.supplyChain.technology.mobile.description', 'Manage your supply chain from anywhere with our mobile application, enabling on-the-go decision making.')}</p>
              <div className="flex justify-center mt-4">
                <div className="h-24 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                  {t('pages.supplyChain.technology.mobile.imageAlt', 'Mobile application')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg mt-10">
            <h2 className="text-xl font-bold mb-3">{t('pages.supplyChain.cta.title', 'Optimize Your Supply Chain with MoogShip')}</h2>
            <p className="mb-4">{t('pages.supplyChain.cta.description', 'Contact our supply chain experts today to discuss how MoogShip can transform your logistics operations, reduce costs, and improve customer satisfaction.')}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                {t('pages.supplyChain.cta.getStarted', 'Get Started')}
              </a>
              <a href="/company/contact" className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                {t('pages.supplyChain.cta.contactSales', 'Contact Our Experts')}
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}