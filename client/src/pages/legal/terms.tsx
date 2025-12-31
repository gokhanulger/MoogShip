import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function TermsPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.terms.title', 'Terms of Service')}
      subtitle={t('pages.terms.subtitle', 'Please read these terms carefully before using our services')}
      content={
        <div className="text-gray-700">
          <p className="mb-4">
            {t('pages.terms.lastUpdated', 'Last Updated: April 30, 2025')}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.introduction.title', '1. Introduction')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.introduction.p1', 'These Terms of Service ("Terms") govern your use of the MoogShip platform, website, and services (collectively, the "Services") operated by MoogShip Logistics Inc. ("MoogShip", "we", "us", or "our").')}
              </p>
              <p>
                {t('pages.terms.sections.introduction.p2', 'By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Services.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.definitions.title', '2. Definitions')}</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.terms.sections.definitions.user', '"User," "you," and "your" refer to the individual, company, or organization that has visited or is using the Services.')}</li>
                <li>{t('pages.terms.sections.definitions.account', '"Account" means a unique account created for you to access our Services.')}</li>
                <li>{t('pages.terms.sections.definitions.shipment', '"Shipment" refers to the physical goods or packages that are transported through our Services.')}</li>
                <li>{t('pages.terms.sections.definitions.platform', '"Platform" refers to the MoogShip website, mobile applications, and related services.')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.accountTerms.title', '3. Account Terms')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.accountTerms.p1', 'You must be at least 18 years of age to use our Services. By creating an account, you represent and warrant that:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.terms.sections.accountTerms.accurate', 'You provide complete and accurate information during the registration process.')}</li>
                <li>{t('pages.terms.sections.accountTerms.security', 'You are responsible for maintaining the security of your account and password.')}</li>
                <li>{t('pages.terms.sections.accountTerms.responsibility', 'You are responsible for all activities that occur under your account.')}</li>
                <li>{t('pages.terms.sections.accountTerms.notification', 'You must notify us immediately of any unauthorized access to your account.')}</li>
              </ul>
              <p className="mt-3">
                {t('pages.terms.sections.accountTerms.p2', 'MoogShip reserves the right to terminate accounts, remove or edit content, or cancel shipments at our sole discretion.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.serviceTerms.title', '4. Service Terms')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.serviceTerms.p1', 'MoogShip provides global shipping and logistics services subject to the following terms:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.terms.sections.serviceTerms.prohibited', 'You agree not to ship prohibited items as outlined in our Prohibited Items Policy.')}</li>
                <li>{t('pages.terms.sections.serviceTerms.customs', 'You are responsible for providing accurate information for customs purposes and complying with all applicable laws and regulations.')}</li>
                <li>{t('pages.terms.sections.serviceTerms.inspection', 'MoogShip reserves the right to inspect shipments to ensure compliance with our policies and applicable laws.')}</li>
                <li>{t('pages.terms.sections.serviceTerms.delivery', 'Delivery times are estimates and not guaranteed unless expressly stated in writing.')}</li>
                <li>{t('pages.terms.sections.serviceTerms.refusal', 'MoogShip reserves the right to refuse service to anyone for any reason at any time.')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.payment.title', '5. Payment Terms')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.payment.p1', 'By using our Services, you agree to the following payment terms:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.terms.sections.payment.pricing', 'Pricing for services will be displayed before shipping confirmation and may include duties, taxes, and other fees.')}</li>
                <li>{t('pages.terms.sections.payment.methods', 'We accept payment via credit card, bank transfer, and other methods as specified on our platform.')}</li>
                <li>{t('pages.terms.sections.payment.timing', 'Payment is required before shipment processing unless you have established credit terms with MoogShip.')}</li>
                <li>{t('pages.terms.sections.payment.taxes', 'You are responsible for all applicable taxes related to your use of the Services.')}</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.limitation.title', '6. Limitation of Liability')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.limitation.p1', 'To the maximum extent permitted by law, MoogShip shall not be liable for:')}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.terms.sections.limitation.indirect', 'Indirect, incidental, special, consequential, or punitive damages.')}</li>
                <li>{t('pages.terms.sections.limitation.loss', 'Loss of profits, revenue, data, or business opportunities.')}</li>
                <li>{t('pages.terms.sections.limitation.delay', 'Any delays, delivery failures, or damages resulting from issues beyond our reasonable control.')}</li>
              </ul>
              <p className="mt-3">
                {t('pages.terms.sections.limitation.p2', 'Our liability is limited to the amount paid by you for the specific shipment in question, or as otherwise limited by applicable shipping conventions and laws.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.intellectual.title', '7. Intellectual Property')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.intellectual.p1', 'The Service and its original content, features, and functionality are and will remain the exclusive property of MoogShip and its licensors. The Service is protected by copyright, trademark, and other laws.')}
              </p>
              <p>
                {t('pages.terms.sections.intellectual.p2', 'Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of MoogShip.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.termination.title', '8. Termination')}</h2>
              <p className="mb-3">
                {t('pages.terms.sections.termination.p1', 'We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.')}
              </p>
              <p>
                {t('pages.terms.sections.termination.p2', 'Upon termination, your right to use the Services will immediately cease. All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.governing.title', '9. Governing Law')}</h2>
              <p>
                {t('pages.terms.sections.governing.p1', 'These Terms shall be governed and construed in accordance with the laws of Turkey, without regard to its conflict of law provisions. Any disputes relating to these Terms shall be subject to the exclusive jurisdiction of the courts in Istanbul, Turkey.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.changes.title', '10. Changes to Terms')}</h2>
              <p>
                {t('pages.terms.sections.changes.p1', 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days\' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Services after any revisions become effective, you agree to be bound by the revised terms.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.terms.sections.contact.title', '11. Contact Us')}</h2>
              <p>
                {t('pages.terms.sections.contact.p1', 'If you have any questions about these Terms, please contact us at legal@moogship.com or through our contact page.')}
              </p>
            </section>
          </div>
        </div>
      }
    />
  );
}