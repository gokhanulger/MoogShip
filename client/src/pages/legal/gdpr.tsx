import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';
import { Button } from '@/components/ui/button';

export default function GDPRPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.gdpr.title', 'GDPR Compliance')}
      subtitle={t('pages.gdpr.subtitle', 'Information about your rights under the General Data Protection Regulation')}
      content={
        <div className="text-gray-700">
          <p className="mb-4">
            {t('pages.gdpr.lastUpdated', 'Last Updated: April 30, 2025')}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.introduction.title', 'Introduction')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.introduction.p1', 'MoogShip Logistics Inc. ("MoogShip", "we", "us", or "our") is committed to protecting the personal data of our customers, partners, and website visitors from the European Economic Area (EEA), United Kingdom, and Switzerland. This GDPR Compliance Statement outlines how we comply with the General Data Protection Regulation (GDPR) and similar data protection laws.')}
              </p>
              <p>
                {t('pages.gdpr.sections.introduction.p2', 'This statement supplements our Privacy Policy and provides additional information for individuals covered by the GDPR.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.controller.title', 'Data Controller')}</h2>
              <p>
                {t('pages.gdpr.sections.controller.p1', 'MoogShip Logistics Inc., headquartered in Istanbul, Turkey, acts as the data controller for the personal data we collect and process. For questions or concerns regarding our data processing activities, please contact our Data Protection Officer at dpo@moogship.com.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.principles.title', 'GDPR Principles')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.principles.p1', 'We adhere to the principles set forth in the GDPR when processing personal data:')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.lawfulness.title', 'Lawfulness, Fairness, and Transparency')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.lawfulness.description', 'We process personal data lawfully, fairly, and in a transparent manner.')}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.purpose.title', 'Purpose Limitation')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.purpose.description', 'We collect personal data for specified, explicit, and legitimate purposes and do not process it in a manner incompatible with those purposes.')}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.minimization.title', 'Data Minimization')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.minimization.description', 'We limit our collection of personal data to what is necessary for the purposes for which it is processed.')}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.accuracy.title', 'Accuracy')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.accuracy.description', 'We take reasonable steps to ensure personal data is accurate and, where necessary, kept up to date.')}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.storage.title', 'Storage Limitation')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.storage.description', 'We retain personal data only for as long as necessary for the purposes for which it is processed.')}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.security.title', 'Integrity and Confidentiality')}</h3>
                  <p className="text-sm">{t('pages.gdpr.sections.principles.security.description', 'We implement appropriate technical and organizational measures to ensure the security of personal data.')}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-1">{t('pages.gdpr.sections.principles.accountability.title', 'Accountability')}</h3>
                <p className="text-sm">{t('pages.gdpr.sections.principles.accountability.description', 'We are responsible for and can demonstrate compliance with the GDPR principles.')}</p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.lawful.title', 'Lawful Basis for Processing')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.lawful.p1', 'We process personal data only when we have a lawful basis to do so under the GDPR. The lawful bases we rely on include:')}
              </p>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>{t('pages.gdpr.sections.lawful.contract.title', 'Contract:')}</strong> {t('pages.gdpr.sections.lawful.contract.description', 'Processing is necessary for the performance of a contract with you or to take steps at your request before entering into a contract.')}
                </li>
                <li>
                  <strong>{t('pages.gdpr.sections.lawful.legal.title', 'Legal Obligation:')}</strong> {t('pages.gdpr.sections.lawful.legal.description', 'Processing is necessary for compliance with a legal obligation to which we are subject.')}
                </li>
                <li>
                  <strong>{t('pages.gdpr.sections.lawful.legitimate.title', 'Legitimate Interests:')}</strong> {t('pages.gdpr.sections.lawful.legitimate.description', 'Processing is necessary for our legitimate interests or those of a third party, except where such interests are overridden by your interests or fundamental rights and freedoms.')}
                </li>
                <li>
                  <strong>{t('pages.gdpr.sections.lawful.consent.title', 'Consent:')}</strong> {t('pages.gdpr.sections.lawful.consent.description', 'You have given clear consent for us to process your personal data for a specific purpose.')}
                </li>
              </ul>
              
              <p className="mt-3">
                {t('pages.gdpr.sections.lawful.p2', 'For special categories of personal data, we only process such data when permitted by the GDPR and with appropriate safeguards.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.rights.title', 'Your Rights Under GDPR')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.rights.p1', 'If you are located in the EEA, United Kingdom, or Switzerland, you have the following rights regarding your personal data:')}
              </p>
              
              <div className="space-y-4 mb-3">
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.access.title', 'Right to Access')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.access.description', 'You have the right to request a copy of the personal data we hold about you and information about how we process it.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.rectification.title', 'Right to Rectification')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.rectification.description', 'You have the right to request that we correct any inaccurate or incomplete personal data we hold about you.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.erasure.title', 'Right to Erasure')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.erasure.description', 'Also known as the "right to be forgotten," you have the right to request that we delete your personal data in certain circumstances.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.restriction.title', 'Right to Restriction of Processing')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.restriction.description', 'You have the right to request that we restrict the processing of your personal data in certain circumstances.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.portability.title', 'Right to Data Portability')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.portability.description', 'You have the right to receive your personal data in a structured, commonly used, and machine-readable format, and to transmit that data to another controller.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.object.title', 'Right to Object')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.object.description', 'You have the right to object to the processing of your personal data in certain circumstances, including processing for direct marketing purposes.')}</p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-4 py-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.gdpr.sections.rights.automated.title', 'Rights Related to Automated Decision-Making')}</h3>
                  <p className="text-gray-600">{t('pages.gdpr.sections.rights.automated.description', 'You have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning you or similarly significantly affects you.')}</p>
                </div>
              </div>
              
              <p>
                {t('pages.gdpr.sections.rights.p2', 'To exercise any of these rights, please contact our Data Protection Officer using the contact information provided below. We will respond to your request within one month. In certain circumstances, we may need to extend this period or charge a reasonable fee if your request is manifestly unfounded or excessive.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.transfers.title', 'International Data Transfers')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.transfers.p1', 'As a global shipping logistics company, we may transfer personal data to countries outside the EEA, United Kingdom, and Switzerland. When we do so, we ensure appropriate safeguards are in place to protect your personal data, such as:')}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('pages.gdpr.sections.transfers.scc', 'European Commission\'s Standard Contractual Clauses')}</li>
                <li>{t('pages.gdpr.sections.transfers.brc', 'Binding Corporate Rules')}</li>
                <li>{t('pages.gdpr.sections.transfers.adequacy', 'Adequacy decisions by the European Commission')}</li>
                <li>{t('pages.gdpr.sections.transfers.consent', 'Explicit consent (in limited circumstances)')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.security.title', 'Data Security Measures')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.security.p1', 'We implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:')}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('pages.gdpr.sections.security.encryption', 'Encryption of personal data')}</li>
                <li>{t('pages.gdpr.sections.security.resilience', 'Ongoing confidentiality, integrity, availability, and resilience of processing systems')}</li>
                <li>{t('pages.gdpr.sections.security.recovery', 'Ability to restore access to personal data in a timely manner in the event of a physical or technical incident')}</li>
                <li>{t('pages.gdpr.sections.security.testing', 'Regular testing, assessing, and evaluating of security measures')}</li>
                <li>{t('pages.gdpr.sections.security.access', 'Access controls and authentication procedures')}</li>
                <li>{t('pages.gdpr.sections.security.training', 'Staff training on data protection and security')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.breach.title', 'Data Breach Notification')}</h2>
              <p>
                {t('pages.gdpr.sections.breach.p1', 'In the event of a personal data breach that is likely to result in a high risk to your rights and freedoms, we will notify the relevant supervisory authority without undue delay and, when required, notify the affected individuals in accordance with GDPR requirements.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.dpo.title', 'Data Protection Officer')}</h2>
              <p>
                {t('pages.gdpr.sections.dpo.p1', 'We have appointed a Data Protection Officer (DPO) responsible for overseeing our compliance with the GDPR and other data protection laws. You can contact our DPO at:')}
              </p>
              <address className="mt-3 not-italic">
                {t('pages.gdpr.sections.dpo.name', 'Data Protection Officer')}<br />
                {t('pages.gdpr.sections.dpo.company', 'MoogShip Logistics Inc.')}<br />
                {t('pages.gdpr.sections.dpo.email', 'Email: dpo@moogship.com')}
              </address>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.gdpr.sections.complaints.title', 'Complaints')}</h2>
              <p className="mb-3">
                {t('pages.gdpr.sections.complaints.p1', 'If you have concerns about how we handle your personal data, please contact us first so we can try to resolve your concerns. If you are not satisfied with our response, you have the right to lodge a complaint with a supervisory authority in the country where you live, work, or where the alleged infringement occurred.')}
              </p>
            </section>
            
            <div className="bg-blue-50 p-6 rounded-lg mt-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900">{t('pages.gdpr.sections.request.title', 'Submit a Data Subject Request')}</h2>
              <p className="mb-4">
                {t('pages.gdpr.sections.request.p1', 'To exercise your rights under the GDPR, please submit a request using our Data Subject Request form or contact our Data Protection Officer.')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = '/company/contact'}
                >
                  {t('pages.gdpr.sections.request.submit', 'Submit Request')}
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  onClick={() => window.location.href = 'mailto:dpo@moogship.com'}
                >
                  {t('pages.gdpr.sections.request.contact', 'Contact DPO')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}