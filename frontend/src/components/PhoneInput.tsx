import { useEffect, useState } from 'react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', placeholder: '6 XX XX XX XX' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', placeholder: '07 XX XX XX XX' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', placeholder: '06 XX XX XX XX' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', placeholder: '77 XXX XX XX' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬', placeholder: '06 XXX XX XX' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩', placeholder: '66 XX XX XX' },
  { code: 'CF', name: 'RCA', dialCode: '+236', flag: '🇨🇫', placeholder: '70 XX XX XX' },
  { code: 'GQ', name: 'Guinée Équatoriale', dialCode: '+240', flag: '🇬🇶', placeholder: '222 XX XX XX' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '06 XX XX XX XX' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪', placeholder: '04XX XX XX XX' },
  { code: 'CA', name: 'Canada / USA', dialCode: '+1', flag: '🇨🇦', placeholder: '(XXX) XXX-XXXX' },
];

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function PhoneInput({
  id = 'phone',
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: Props) {
  // Détection du pays à partir de la valeur existante
  const parseInitial = () => {
    if (!value) return { country: COUNTRIES[0], number: '' };

    const matched = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matched) {
      return {
        country: matched,
        number: value.slice(matched.dialCode.length).trim(),
      };
    }

    return { country: COUNTRIES[0], number: value.trim() };
  };

  const initial = parseInitial();
  const [selectedCountry, setSelectedCountry] = useState<Country>(initial.country);
  const [phoneNumber, setPhoneNumber] = useState<string>(initial.number);

  useEffect(() => {
    // Synchronisation si la valeur parent change
    const matched = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matched) {
      setSelectedCountry(matched);
      setPhoneNumber(value.slice(matched.dialCode.length).trim());
    } else if (value && !value.startsWith('+')) {
      setPhoneNumber(value);
    }
  }, [value]);

  const handleCountryChange = (dialCode: string) => {
    const country = COUNTRIES.find((c) => c.dialCode === dialCode) ?? COUNTRIES[0];
    setSelectedCountry(country);
    const combined = phoneNumber.trim() ? `${country.dialCode} ${phoneNumber.trim()}` : '';
    onChange(combined);
  };

  const handleNumberChange = (raw: string) => {
    // Ne garder que chiffres, espaces et tirets
    const cleaned = raw.replace(/[^\d\s-]/g, '');
    setPhoneNumber(cleaned);
    const combined = cleaned.trim() ? `${selectedCountry.dialCode} ${cleaned.trim()}` : '';
    onChange(combined);
  };

  return (
    <div className={`phone-input-group ${className}`}>
      <div className="phone-country-select-wrap">
        <span className="phone-country-flag" aria-hidden="true">
          {selectedCountry.flag}
        </span>
        <select
          className="phone-country-select"
          value={selectedCountry.dialCode}
          disabled={disabled}
          aria-label="Indicatif pays"
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dialCode}>
              {c.flag} {c.name} ({c.dialCode})
            </option>
          ))}
        </select>
        <span className="phone-dial-code">{selectedCountry.dialCode}</span>
      </div>

      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        className="phone-number-input"
        placeholder={selectedCountry.placeholder}
        value={phoneNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
      />
    </div>
  );
}
