import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  MailQuestion,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import type { ClientOutletContext } from './ClientLayout';
import {
  clientChangePassword,
  clientErrorMessage,
  clientForgot,
  clientUpdateProfile,
} from '../clientApi';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import PhoneInput from '../components/PhoneInput';

export default function ProfilePage() {
  const { user, refresh } = useOutletContext<ClientOutletContext>();
  const { t } = useLanguage();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Accordéon pour la section Mot de passe : 'change', 'forgot' ou null
  const [passwordMode, setPasswordMode] = useState<'change' | 'forgot' | null>(null);

  // Formulaire Changer de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeNotice, setChangeNotice] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  // Formulaire Mot de passe oublié
  const [forgotNotice, setForgotNotice] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone ?? '');
  }, [user]);

  const toggleMode = (mode: 'change' | 'forgot') => {
    setPasswordMode((prev) => (prev === mode ? null : mode));
    setChangeError('');
    setChangeNotice('');
    setForgotError('');
    setForgotNotice('');
  };

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

  const handleChangePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangeError('');
    setChangeNotice('');

    if (newPassword !== confirmPassword) {
      setChangeError(t('auth.password_mismatch'));
      return;
    }

    setChangeLoading(true);

    try {
      const result = await clientChangePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setChangeNotice(result.message || t('profile.password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setChangeError(clientErrorMessage(err));
    } finally {
      setChangeLoading(false);
    }
  };

  const handleForgotPasswordRequest = async () => {
    setForgotError('');
    setForgotNotice('');
    setForgotLoading(true);

    try {
      const result = await clientForgot(user.email);
      setForgotNotice(result.message || t('profile.reset_sent_success'));
    } catch (err) {
      setForgotError(clientErrorMessage(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('profile.title')}</h1>
      <p className="client-page-subtitle">{t('profile.subtitle')}</p>

      {/* En-tête profil avec avatar et statut */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar">{initials || 'U'}</div>
        <div className="profile-hero-details">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <div className="profile-hero-badge">
            <ShieldCheck size={14} />
            <span>Compte vérifié & actif</span>
          </div>
        </div>
      </div>

      {/* Section 1 : Préférences de langue dans le profil */}
      <section className="profile-section" style={{ marginBottom: '28px' }}>
        <h2 className="profile-section-title">{t('profile.language_title')}</h2>
        <p className="profile-section-desc">{t('profile.language_desc')}</p>
        <div style={{ marginTop: '12px' }}>
          <LanguageToggle />
        </div>
      </section>

      {/* Section 2 : Informations personnelles avec PhoneInput enrichi */}
      <section className="profile-section" style={{ marginBottom: '28px' }}>
        <h2 className="profile-section-title">{t('profile.personal_info')}</h2>
        <p className="profile-section-desc">Mettez à jour vos coordonnées de contact pour vos contrats et devis.</p>

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
              placeholder="Ex : Jean Dupont"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="email">{t('profile.email')}</label>
              <span className="email-verified-tag">
                <CheckCircle2 size={13} /> Vérifié
              </span>
            </div>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="input-disabled"
            />
            <small style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
              L'adresse email sert d'identifiant de connexion et ne peut être modifiée directement.
            </small>
          </div>

          <div className="field">
            <label htmlFor="phone">{t('profile.phone')}</label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={(val) => setPhone(val)}
            />
            <small style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
              Sélectionnez votre indicatif pays (ex: 🇨🇲 +237) puis saisissez votre numéro de mobile.
            </small>
          </div>

          <button type="submit" disabled={profileLoading} className="btn-gradient">
            <Save size={16} /> {profileLoading ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </section>

      {/* Section 3 : Mot de passe (avec accordéon : Changer de mot de passe & Mot de passe oublié) */}
      <section className="profile-section">
        <h2 className="profile-section-title">{t('profile.password_section_title')}</h2>
        <p className="profile-section-desc">{t('profile.password_section_sub')}</p>

        <div className="accordion-options">
          {/* Option 1 : Changer de mot de passe */}
          <div className="accordion-item">
            <button
              type="button"
              className={`accordion-trigger ${passwordMode === 'change' ? 'open' : ''}`}
              aria-expanded={passwordMode === 'change'}
              onClick={() => toggleMode('change')}
            >
              <div className="accordion-trigger-left">
                <KeyRound size={20} className="accordion-icon" />
                <div style={{ textAlign: 'left' }}>
                  <strong>{t('profile.opt_change_password')}</strong>
                  <span className="accordion-trigger-sub">
                    {t('profile.opt_change_password_desc')}
                  </span>
                </div>
              </div>
              {passwordMode === 'change' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {passwordMode === 'change' && (
              <div className="accordion-body">
                <form onSubmit={handleChangePasswordSubmit} className="form">
                  {changeError && <p className="alert">{changeError}</p>}
                  {changeNotice && <p className="notice">{changeNotice}</p>}

                  <div className="field">
                    <label htmlFor="currentPassword">{t('profile.current_password')}</label>
                    <PasswordInput
                      id="currentPassword"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="newPassword">{t('profile.new_password')}</label>
                    <PasswordInput
                      id="newPassword"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <small>{t('auth.password_help')}</small>
                  </div>

                  <div className="field">
                    <label htmlFor="confirmPassword">{t('profile.confirm_new_password')}</label>
                    <PasswordInput
                      id="confirmPassword"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={changeLoading}>
                    {changeLoading ? t('profile.saving') : t('profile.save')}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Option 2 : Mot de passe oublié */}
          <div className="accordion-item">
            <button
              type="button"
              className={`accordion-trigger ${passwordMode === 'forgot' ? 'open' : ''}`}
              aria-expanded={passwordMode === 'forgot'}
              onClick={() => toggleMode('forgot')}
            >
              <div className="accordion-trigger-left">
                <MailQuestion size={20} className="accordion-icon" />
                <div style={{ textAlign: 'left' }}>
                  <strong>{t('profile.opt_forgot_password')}</strong>
                  <span className="accordion-trigger-sub">
                    {t('profile.opt_forgot_password_desc')}
                  </span>
                </div>
              </div>
              {passwordMode === 'forgot' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {passwordMode === 'forgot' && (
              <div className="accordion-body">
                {forgotError && <p className="alert">{forgotError}</p>}
                {forgotNotice && <p className="notice">{forgotNotice}</p>}

                <p style={{ margin: '0 0 16px', color: 'var(--text)', fontSize: '0.95rem' }}>
                  {t('profile.forgot_email_info')}{' '}
                  <strong>{user.email}</strong>.
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={forgotLoading}
                  onClick={handleForgotPasswordRequest}
                >
                  {forgotLoading ? t('auth.sending') : t('profile.send_reset_btn')}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
