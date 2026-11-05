import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ClientOutletContext } from './ClientLayout';
import { clientChangePassword, clientErrorMessage, clientUpdateProfile } from '../clientApi';
import { useLanguage } from '../i18n/LanguageContext';

export default function ProfilePage() {
  const { user, refresh } = useOutletContext<ClientOutletContext>();
  const { t } = useLanguage();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone ?? '');
  }, [user]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setProfileNotice('');
    setProfileLoading(true);

    try {
      await clientUpdateProfile({ name: name.trim(), phone: phone.trim() });
      await refresh();
      setProfileNotice(t('profile.profile_updated'));
    } catch (err) {
      setProfileError(clientErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.password_mismatch'));
      return;
    }

    setPasswordLoading(true);

    try {
      const result = await clientChangePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordNotice(result.message || t('profile.password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(clientErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('profile.title')}</h1>
      <p className="client-page-subtitle">{t('profile.subtitle')}</p>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('profile.personal_info')}</h2>
        <form onSubmit={handleProfileSubmit} className="form">
          {profileError && <p className="alert">{profileError}</p>}
          {profileNotice && <p className="notice">{profileNotice}</p>}

          <div className="field">
            <label htmlFor="name">{t('profile.name')}</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="email">{t('profile.email')}</label>
            <input id="email" type="email" value={user.email} disabled style={{ opacity: 0.7 }} />
          </div>

          <div className="field">
            <label htmlFor="phone">{t('profile.phone')}</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" disabled={profileLoading}>
            {profileLoading ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('profile.change_password')}</h2>
        <form onSubmit={handlePasswordSubmit} className="form">
          {passwordError && <p className="alert">{passwordError}</p>}
          {passwordNotice && <p className="notice">{passwordNotice}</p>}

          <div className="field">
            <label htmlFor="currentPassword">{t('profile.current_password')}</label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="newPassword">{t('profile.new_password')}</label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <small>{t('auth.password_help')}</small>
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">{t('profile.confirm_new_password')}</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={passwordLoading}>
            {passwordLoading ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </section>
    </div>
  );
}
