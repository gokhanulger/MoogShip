import { useTranslation } from 'react-i18next';

/**
 * Maps FedEx API error messages to Turkish translation keys
 */
export function useFedExErrorTranslation() {
  const { t } = useTranslation();

  const translateFedExError = (errorMessage: string): string => {
    if (!errorMessage) return t('validations.fedexPostalCode.validationError');

    // Convert to lowercase for easier matching
    const lowerError = errorMessage.toLowerCase();

    // Map common FedEx error patterns to Turkish translations
    if (lowerError.includes('mismatch') && (lowerError.includes('postal code') || lowerError.includes('state') || lowerError.includes('province'))) {
      return t('validations.fedexPostalCode.postalStateCodeMismatch');
    }
    
    if (lowerError.includes('postal code') && lowerError.includes('required')) {
      return t('validations.fedexPostalCode.postalCodeRequired');
    }
    
    if (lowerError.includes('invalid postal code') || (lowerError.includes('invalid') && lowerError.includes('zip'))) {
      return t('validations.fedexPostalCode.invalidPostalCode');
    }

    if (lowerError.includes('validation service') || lowerError.includes('service unavailable')) {
      return t('validations.fedexPostalCode.validationUnavailable');
    }

    // Fallback for unmapped errors - return generic error message in current language
    return t('validations.fedexPostalCode.validationError');
  };

  const getValidationStatusText = (
    isValid: boolean | undefined,
    isPending: boolean,
    city?: string,
    errors?: string[]
  ): string => {
    if (isPending) {
      return t('validations.fedexPostalCode.autoValidating');
    }

    if (isValid === true) {
      if (city) {
        return t('validations.fedexPostalCode.validPostalCodeFor', { city });
      }
      return t('validations.fedexPostalCode.validPostalCode');
    }

    if (isValid === false && errors && errors.length > 0) {
      return translateFedExError(errors[0]);
    }

    return '';
  };

  return {
    translateFedExError,
    getValidationStatusText
  };
}