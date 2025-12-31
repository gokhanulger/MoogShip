import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function PrivacyPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.privacy.title', 'Privacy Policy')}
      subtitle={t('pages.privacy.subtitle', 'How we collect, use, and protect your information')}
      content={
        <div className="text-gray-700">
          <p className="mb-4">
            {t('pages.privacy.lastUpdated', 'Last Updated: April 30, 2025')}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.introduction.title', '1. Introduction')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.introduction.p1', 'MoogShip Logistics Inc. ("MoogShip", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and services (collectively, the "Services").')}
              </p>
              <p>
                {t('pages.privacy.sections.introduction.p2', 'Please read this Privacy Policy carefully. By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy. If you do not agree, please do not access or use our Services.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.collection.title', '2. Information We Collect')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.collection.p1', 'We collect several types of information from and about users of our Services:')}
              </p>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.privacy.sections.collection.personal.title', 'Personal Information')}</h3>
              <p className="mb-3">
                {t('pages.privacy.sections.collection.personal.p1', 'When you register for an account, use our Services, or contact us, we may collect personal information that can be used to identify you, such as:')}
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>{t('pages.privacy.sections.collection.personal.name', 'Name and contact information (email address, phone number, mailing address)')}</li>
                <li>{t('pages.privacy.sections.collection.personal.business', 'Business information (company name, job title, tax ID)')}</li>
                <li>{t('pages.privacy.sections.collection.personal.shipping', 'Shipping information (sender and recipient details)')}</li>
                <li>{t('pages.privacy.sections.collection.personal.payment', 'Payment information (credit card or bank account details)')}</li>
                <li>{t('pages.privacy.sections.collection.personal.id', 'Government-issued identification when required for customs clearance')}</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.privacy.sections.collection.usage.title', 'Usage Information')}</h3>
              <p className="mb-3">
                {t('pages.privacy.sections.collection.usage.p1', 'We automatically collect certain information about how you interact with our Services, including:')}
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>{t('pages.privacy.sections.collection.usage.device', 'Device information (IP address, browser type, operating system)')}</li>
                <li>{t('pages.privacy.sections.collection.usage.log', 'Log data (pages visited, time spent, actions taken)')}</li>
                <li>{t('pages.privacy.sections.collection.usage.location', 'Location information (with your consent)')}</li>
                <li>{t('pages.privacy.sections.collection.usage.cookies', 'Cookies and similar tracking technologies')}</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.privacy.sections.collection.shipment.title', 'Shipment Information')}</h3>
              <p>
                {t('pages.privacy.sections.collection.shipment.p1', 'We collect information about shipments, including parcel dimensions, weight, contents, value, tracking data, and customs documentation.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.use.title', '3. How We Use Your Information')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.use.p1', 'We use the information we collect for various purposes, including:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.privacy.sections.use.provide', 'To provide, maintain, and improve our Services')}</li>
                <li>{t('pages.privacy.sections.use.process', 'To process and complete shipping transactions')}</li>
                <li>{t('pages.privacy.sections.use.customs', 'To comply with customs and other regulatory requirements')}</li>
                <li>{t('pages.privacy.sections.use.communicate', 'To communicate with you about your account and shipments')}</li>
                <li>{t('pages.privacy.sections.use.support', 'To provide customer support and respond to inquiries')}</li>
                <li>{t('pages.privacy.sections.use.personalize', 'To personalize your experience and deliver content relevant to your interests')}</li>
                <li>{t('pages.privacy.sections.use.analytics', 'To analyze usage patterns and improve our Services')}</li>
                <li>{t('pages.privacy.sections.use.marketing', 'To send marketing communications (with your consent where required)')}</li>
                <li>{t('pages.privacy.sections.use.legal', 'To enforce our terms, prevent fraud, and comply with legal obligations')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.sharing.title', '4. Information Sharing and Disclosure')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.sharing.p1', 'We may share your information in the following circumstances:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>{t('pages.privacy.sections.sharing.service.title', 'Service Providers:')}</strong> {t('pages.privacy.sections.sharing.service.description', 'We share information with third-party vendors, consultants, and service providers who perform services on our behalf, such as payment processing, data analysis, and customer service.')}
                </li>
                <li>
                  <strong>{t('pages.privacy.sections.sharing.partners.title', 'Shipping Partners:')}</strong> {t('pages.privacy.sections.sharing.partners.description', 'We share shipment information with carriers, customs authorities, and other partners necessary to complete shipping services.')}
                </li>
                <li>
                  <strong>{t('pages.privacy.sections.sharing.legal.title', 'Legal Requirements:')}</strong> {t('pages.privacy.sections.sharing.legal.description', 'We may disclose your information if required by law, regulation, legal process, or governmental request.')}
                </li>
                <li>
                  <strong>{t('pages.privacy.sections.sharing.business.title', 'Business Transfers:')}</strong> {t('pages.privacy.sections.sharing.business.description', 'In the event of a merger, acquisition, or sale of all or part of our assets, your information may be transferred as part of that transaction.')}
                </li>
                <li>
                  <strong>{t('pages.privacy.sections.sharing.consent.title', 'With Your Consent:')}</strong> {t('pages.privacy.sections.sharing.consent.description', 'We may share your information with third parties when you have given us your consent to do so.')}
                </li>
              </ul>
              <p className="mt-3">
                {t('pages.privacy.sections.sharing.p2', 'We do not sell your personal information to third parties.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.cookies.title', '5. Cookies and Tracking Technologies')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.cookies.p1', 'We use cookies and similar tracking technologies to track activity on our Services and hold certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier.')}
              </p>
              <p className="mb-3">
                {t('pages.privacy.sections.cookies.p2', 'We use cookies for the following purposes:')}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('pages.privacy.sections.cookies.essential', 'Essential cookies: necessary for the operation of our Services')}</li>
                <li>{t('pages.privacy.sections.cookies.analytics', 'Analytical/performance cookies: to analyze how visitors use our Services')}</li>
                <li>{t('pages.privacy.sections.cookies.functional', 'Functionality cookies: to recognize you when you return to our Services')}</li>
                <li>{t('pages.privacy.sections.cookies.targeting', 'Targeting cookies: to deliver content relevant to your interests')}</li>
              </ul>
              <p className="mt-3">
                {t('pages.privacy.sections.cookies.p3', 'You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our Services may not function properly without cookies.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.security.title', '6. Data Security')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.security.p1', 'We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no method of transmission over the Internet or electronic storage is 100% secure.')}
              </p>
              <p>
                {t('pages.privacy.sections.security.p2', 'While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials and for any activities that occur under your account.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.data.title', '7. Data Retention')}</h2>
              <p>
                {t('pages.privacy.sections.data.p1', 'We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. We will retain shipping records as required by applicable shipping, customs, and tax regulations.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.international.title', '8. International Data Transfers')}</h2>
              <p>
                {t('pages.privacy.sections.international.p1', 'MoogShip operates globally, which means your information may be transferred to, stored, and processed in countries other than the one in which you reside. These countries may have data protection laws that are different from those in your country. We take appropriate safeguards to require that your personal information will remain protected in accordance with this Privacy Policy.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.rights.title', '9. Your Rights and Choices')}</h2>
              <p className="mb-3">
                {t('pages.privacy.sections.rights.p1', 'Depending on your location, you may have certain rights regarding your personal information, including:')}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('pages.privacy.sections.rights.access', 'Access and receive a copy of your personal information')}</li>
                <li>{t('pages.privacy.sections.rights.update', 'Update or correct your personal information')}</li>
                <li>{t('pages.privacy.sections.rights.deletion', 'Request deletion of your personal information')}</li>
                <li>{t('pages.privacy.sections.rights.restrict', 'Restrict or object to processing of your personal information')}</li>
                <li>{t('pages.privacy.sections.rights.portability', 'Data portability (receiving your data in a structured, commonly used format)')}</li>
                <li>{t('pages.privacy.sections.rights.marketing', 'Opt-out of marketing communications')}</li>
              </ul>
              <p className="mt-3">
                {t('pages.privacy.sections.rights.p2', 'To exercise these rights, please contact us using the information provided in the "Contact Us" section below. Please note that some of these rights may be limited based on legal requirements and our legitimate interests.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.children.title', '10. Children\'s Privacy')}</h2>
              <p>
                {t('pages.privacy.sections.children.p1', 'Our Services are not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you become aware that a child has provided us with personal information, please contact us. If we learn that we have collected personal information from a child under 16, we will take steps to delete that information.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.changes.title', '11. Changes to This Privacy Policy')}</h2>
              <p>
                {t('pages.privacy.sections.changes.p1', 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.privacy.sections.contact.title', '12. Contact Us')}</h2>
              <p>
                {t('pages.privacy.sections.contact.p1', 'If you have any questions about this Privacy Policy or our data practices, please contact us at:')}
              </p>
              <address className="mt-3 not-italic">
                {t('pages.privacy.sections.contact.name', 'MoogShip Logistics Inc.')}<br />
                {t('pages.privacy.sections.contact.attn', 'Attn: Privacy Officer')}<br />
                {t('pages.privacy.sections.contact.email', 'Email: privacy@moogship.com')}
              </address>
            </section>
          </div>
        </div>
      }
    />
  );
}