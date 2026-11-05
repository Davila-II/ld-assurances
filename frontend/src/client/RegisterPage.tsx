import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { clientErrorMessage, clientRegister } from '../clientApi';
import { getClientToken, setClientToken } from '../clientAuth';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getClientToken()) {
    return <Navigate to="/espace-client" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError(t('auth.password_mismatch'));
      return;
    }

    setLoading(true);

    try {
      const result = await clientRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: confirm,
      });
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

      <h1>{t('auth.register_title')}</h1>
      <p>{t('auth.register_sub')}</p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}

        <div className="field">
          <label htmlFor="name">{t('auth.name')}</label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ex : Jean Dupont"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

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
          <label htmlFor="phone">{t('auth.phone')}</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Ex : 6 90 12 34 56"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <small>{t('auth.password_help')}</small>
        </div>

        <div className="field">
          <label htmlFor="confirm">{t('auth.password_confirm')}</label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t('auth.registering') : t('auth.register_btn')}
        </button>
      </form>

      <p className="center">
        {t('auth.have_account')}{' '}
        <Link to="/espace-client/connexion">{t('auth.login_btn')}</Link>
      </p>
    </main>
  );
}
