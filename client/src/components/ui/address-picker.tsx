import { useState, useEffect } from 'react';
import { CountrySelect } from './country-select';
import { AddressInput } from './address-input';
import { type AddressSuggestion } from '@/services/addressVerification';
import { useTranslation } from 'react-i18next';

interface AddressPickerProps {
  // Address values
  address: string;
  countryCode?: string;
  onAddressChange: (address: string) => void;
  onCountryChange: (countryCode: string) => void;
  onAddressSelect?: (suggestion: AddressSuggestion) => void;
  
  // Styling and behavior
  addressPlaceholder?: string;
  countryPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  showVerificationStatus?: boolean;
  
  // Default country (for preselection)
  defaultCountry?: string;
}

export function AddressPicker({
  address,
  countryCode,
  onAddressChange,
  onCountryChange,
  onAddressSelect,
  addressPlaceholder = "Enter address after selecting country...",
  countryPlaceholder = "Select country first...",
  disabled = false,
  className,
  showVerificationStatus = true,
  defaultCountry
}: AddressPickerProps) {
  const { t } = useTranslation();
  const [hasSelectedCountry, setHasSelectedCountry] = useState(!!countryCode);
  const [shouldFocusAddress, setShouldFocusAddress] = useState(false);

  // Set default country on mount if provided and no country is selected
  useEffect(() => {
    if (!countryCode && defaultCountry) {
      onCountryChange(defaultCountry);
      setHasSelectedCountry(true);
    }
  }, [defaultCountry, countryCode, onCountryChange]);

  // Update hasSelectedCountry when countryCode prop changes externally
  useEffect(() => {
    setHasSelectedCountry(!!countryCode);
  }, [countryCode]);

  const handleCountryChange = (newCountryCode: string) => {
    // If changing from one country to another and there's an address, clear it
    if (countryCode && countryCode !== newCountryCode && address) {
      onAddressChange('');
    }
    
    onCountryChange(newCountryCode);
    setHasSelectedCountry(true);
    setShouldFocusAddress(true);
  };

  // Auto-focus address input when country is selected
  useEffect(() => {
    if (shouldFocusAddress && hasSelectedCountry) {
      const addressInput = document.querySelector('[data-testid="input-address"]') as HTMLInputElement;
      if (addressInput) {
        setTimeout(() => addressInput.focus(), 100);
      }
      setShouldFocusAddress(false);
    }
  }, [shouldFocusAddress, hasSelectedCountry]);

  const handleAddressChange = (newAddress: string) => {
    onAddressChange(newAddress);
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    onAddressChange(suggestion.address);
    if (onAddressSelect) {
      onAddressSelect(suggestion);
    }
  };

  return (
    <div className={className}>
      {/* Country Selection */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('common.country', 'Country')} <span className="text-red-500">*</span>
        </label>
        <CountrySelect
          value={countryCode}
          onChange={handleCountryChange}
          placeholder={countryPlaceholder}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Address Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('createShipment.recipientInfo.address', 'Address')} <span className="text-red-500">*</span>
        </label>
        <AddressInput
          value={address}
          onChange={handleAddressChange}
          onAddressSelect={handleAddressSelect}
          placeholder={hasSelectedCountry ? "Enter address..." : addressPlaceholder}
          countryCode={countryCode}
          disabled={disabled || !hasSelectedCountry}
          showVerificationStatus={showVerificationStatus}
          className={!hasSelectedCountry ? "opacity-50" : ""}
        />
        {!hasSelectedCountry && (
          <p className="text-xs text-gray-500 mt-1">
            {t('createShipment.selectDestinationCountry', 'Please select a country first to enable address search')}
          </p>
        )}
      </div>
    </div>
  );
}