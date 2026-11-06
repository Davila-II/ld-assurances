import { useEffect, useState } from 'react';

const CAMEROON_DIAL = '+237';
const CAMEROON_PLACEHOLDER = '6 XX XX XX XX';

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
  // Extrait le numéro local sans le préfixe +237
  const parseLocalNumber = (val: string): string => {
    if (!val) return '';
    if (val.startsWith(CAMEROON_DIAL)) {
      return val.slice(CAMEROON_DIAL.length).trim();
    }
    // Nettoie tout autre préfixe international éventuel
    return val.replace(/^\+\d+\s*/, '').trim();
  };

  const [phoneNumber, setPhoneNumber] = useState<string>(() => parseLocalNumber(value));

  useEffect(() => {
    setPhoneNumber(parseLocalNumber(value));
  }, [value]);

  const handleNumberChange = (raw: string) => {
    // Ne garder que chiffres, espaces et tirets
    const cleaned = raw.replace(/[^\d\s-]/g, '');
    setPhoneNumber(cleaned);
    const combined = cleaned.trim() ? `${CAMEROON_DIAL} ${cleaned.trim()}` : '';
    onChange(combined);
  };

  return (
    <div className={`phone-input-group ${className}`}>
      <div className="phone-country-select-wrap phone-country-fixed" title="Cameroun (+237)">
        <span className="phone-dial-code">{CAMEROON_DIAL}</span>
      </div>

      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        className="phone-number-input"
        placeholder={CAMEROON_PLACEHOLDER}
        value={phoneNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
      />
    </div>
  );
}
