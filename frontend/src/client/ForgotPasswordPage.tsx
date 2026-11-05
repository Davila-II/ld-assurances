import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { clientErrorMessage, clientForgot } from '../clientApi';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const result = await clientForgot(email.trim());
      setNotice(result.message);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <LanguageToggle />
      </div>

      <h1>{t('auth.forgot_title')}</h1>
      <p>{t('auth.forgot_sub')}</p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="Ex : nom@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t('auth.sending') : t('auth.send_link')}
        </button>
      </form>

      <p className="center">
        <Link to="/espace-client/connexion">{t('auth.back_to_login')}</Link>
      </p>
    </main>
  );
}
