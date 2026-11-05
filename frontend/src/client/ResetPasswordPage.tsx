import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clientErrorMessage, clientReset } from '../clientApi';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <main className="login">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <LanguageToggle />
        </div>
        <h1>Lien invalide / Invalid link</h1>
        <p>Ce lien de réinitialisation est incomplet. / This reset link is invalid.</p>
        <p className="center">
          <Link to="/espace-client/mot-de-passe-oublie">{t('auth.forgot_title')}</Link>
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="login">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <LanguageToggle />
        </div>
        <h1>{t('auth.reset_title')}</h1>
        <p className="notice">{t('profile.password_changed')}</p>
        <p className="center">
          <Link to="/espace-client/connexion">{t('auth.login_btn')}</Link>
        </p>
      </main>
    );
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
      await clientReset({ token, email, password, password_confirmation: confirm });
      setDone(true);
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

      <h1>{t('auth.reset_title')}</h1>
      <p>
        {t('auth.reset_sub')} (<strong>{email}</strong>)
      </p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}

        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <PasswordInput
            id="password"
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
          <PasswordInput
            id="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t('profile.saving') : t('auth.reset_btn')}
        </button>
      </form>
    </main>
  );
}
