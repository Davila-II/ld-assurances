import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckCircle,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { adminChangePassword, getAdminMe } from '../api';
import { getAdminUser, setAdminUser } from '../auth';
import { useLanguage } from '../i18n/LanguageContext';
import type { AdminUser } from '../types';
import PasswordInput from '../components/PasswordInput';

export default function RoleProfilePage() {
  const { lang } = useLanguage();

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getAdminUser());

  // Formulaire changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    getAdminMe()
      .then((user) => {
        setAdminUser(user);
        setCurrentUser(user);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 8) {
      setPwdError(
        lang === 'en'
          ? 'The new password must be at least 8 characters long.'
          : 'Le nouveau mot de passe doit comporter au moins 8 caractères.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError(
        lang === 'en'
          ? 'Password confirmation does not match.'
          : 'La confirmation du mot de passe ne correspond pas.'
      );
      return;
    }

    setPwdLoading(true);
    try {
      const res = await adminChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setPwdSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPwdError(
        err instanceof Error
          ? err.message
          : lang === 'en'
          ? 'Failed to update password.'
          : 'Échec de la modification du mot de passe.'
      );
    } finally {
      setPwdLoading(false);
    }
  };

  const isAdmin = currentUser?.is_admin || currentUser?.role === 'admin';
  const roleName = currentUser?.role_name || (isAdmin ? 'Super Administrateur' : 'Collaborateur');

  return (
    <div className="role-profile-root">
      {/* ── Bandeau d'identité ── */}
      <div className="role-portal-hero">
        <div className="role-portal-hero-info">
          <div className="role-portal-avatar">
            <UserIcon size={32} />
          </div>
          <div>
            <div className="role-portal-badge-wrap">
              <span className="role-portal-role-badge">
                <Shield size={14} />
                {roleName}
              </span>
              <span className="role-portal-status-online">
                <span className="role-portal-dot" /> En ligne
              </span>
            </div>
            <h1 className="role-portal-title">{currentUser?.name || 'Mon Profil'}</h1>
            <p className="role-portal-email">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      <div className="role-profile-grid">
        {/* ── Colonne Gauche : Vos Habilitations & Périmètre ── */}
        <div className="role-profile-card">
          <div className="role-profile-card-header">
            <div className="role-profile-header-icon" style={{ background: '#e6f7f5', color: '#0e7a6e' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2>{lang === 'en' ? 'My Role & Authorizations' : 'Mon Rôle & Mes Habilitations'}</h2>
              <p>{lang === 'en' ? 'Actions you are authorized to perform' : 'Ce que vous êtes autorisé à faire sur la plateforme'}</p>
            </div>
          </div>

          <div className="role-profile-role-box">
            <div className="role-profile-role-title">
              <Shield size={16} />
              <span>{roleName}</span>
            </div>
            {currentUser?.role_description && (
              <p className="role-profile-role-desc">{currentUser.role_description}</p>
            )}
          </div>

          <h3 className="role-profile-perms-title">
            {lang === 'en' ? 'Detailed Permissions Granted :' : 'Détail des permissions accordées :'}
          </h3>

          {isAdmin ? (
            <div className="role-profile-admin-full">
              <CheckCircle size={18} color="#0e7a6e" />
              <span>
                {lang === 'en'
                  ? 'Full administrative privileges: all actions and modules accessible.'
                  : 'Privilèges administrateur complets : toutes les fonctionnalités et paramètres sont débloqués.'}
              </span>
            </div>
          ) : (
            <div className="role-profile-perms-list">
              {currentUser?.permissions_details && currentUser.permissions_details.length > 0 ? (
                currentUser.permissions_details.map((p) => (
                  <div key={p.key} className="role-profile-perm-item">
                    <ShieldCheck size={16} color="#0e7a6e" />
                    <div className="role-profile-perm-texts">
                      <span className="role-profile-perm-name">{lang === 'en' && p.name_en ? p.name_en : p.name}</span>
                      <span className="role-profile-perm-group">{p.group}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="role-profile-perms-fallback">
                  {(currentUser?.permissions || []).map((permKey) => (
                    <span key={permKey} className="roles-perm-badge">
                      {permKey}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Colonne Droite : Sécurité & Mot de passe ── */}
        <div className="role-profile-card">
          <div className="role-profile-card-header">
            <div className="role-profile-header-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h2>{lang === 'en' ? 'Security & Password' : 'Sécurité & Mot de passe'}</h2>
              <p>{lang === 'en' ? 'Update your personal credentials' : 'Modifiez votre mot de passe de connexion'}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="role-profile-pwd-form">
            {pwdError && (
              <div className="role-profile-alert-error">
                <ShieldAlert size={16} />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="role-profile-alert-success">
                <CheckCircle size={16} />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="profile-cur-pwd">
                {lang === 'en' ? 'Current password' : 'Mot de passe actuel'} <span className="required">*</span>
              </label>
              <PasswordInput
                id="profile-cur-pwd"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ex : 12345678"
              />
              <small className="role-profile-hint">
                {lang === 'en' ? 'Enter the password you used to log in.' : 'Saisissez le mot de passe avec lequel vous vous êtes connecté.'}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-new-pwd">
                {lang === 'en' ? 'New password' : 'Nouveau mot de passe'} <span className="required">*</span>
              </label>
              <PasswordInput
                id="profile-new-pwd"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <small className="role-profile-hint">
                {lang === 'en' ? 'Minimum 8 characters.' : 'Au moins 8 caractères.'}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-conf-pwd">
                {lang === 'en' ? 'Confirm new password' : 'Confirmer le nouveau mot de passe'} <span className="required">*</span>
              </label>
              <PasswordInput
                id="profile-conf-pwd"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="role-profile-submit-btn"
              disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
            >
              {pwdLoading ? (
                <>
                  <Loader2 size={16} className="roles-spinner" />
                  <span>{lang === 'en' ? 'Saving…' : 'Enregistrement…'}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>{lang === 'en' ? 'Update Password' : 'Mettre à jour mon mot de passe'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
