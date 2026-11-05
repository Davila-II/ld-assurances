import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { clientErrorMessage, clientLogin } from '../clientApi';
import { getClientToken, setClientToken } from '../clientAuth';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getClientToken()) {
    return <Navigate to="/espace-client" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await clientLogin(email.trim(), password);
      setClientToken(result.token);
      navigate('/espace-client', { replace: true });
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

      <h1>{t('auth.login_title')}</h1>
      <p>{t('auth.login_sub')}</p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}

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

        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t('auth.logging_in') : t('auth.login_btn')}
        </button>
      </form>

      <p className="center">
        <Link to="/espace-client/mot-de-passe-oublie">{t('auth.forgot_password')}</Link>
      </p>
      <p className="center">
        {t('auth.no_account')}{' '}
        <Link to="/espace-client/inscription">{t('auth.create_account')}</Link>
      </p>
    </main>
  );
}
