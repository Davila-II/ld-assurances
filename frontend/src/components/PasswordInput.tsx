import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
}

export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={`password-input ${className}`}
      />
      <button
        type="button"
        className="password-toggle-btn"
        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
