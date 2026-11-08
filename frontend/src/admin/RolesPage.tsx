import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, Shield, Trash2, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

/* ── Types ──────────────────────────────────────────────────────────────── */

type Permission =
  | 'view_submissions'
  | 'edit_submissions'
  | 'manage_clients'
  | 'manage_forms'
  | 'manage_roles'
  | 'view_stats';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  users_count: number;
}

const ALL_PERMISSIONS: Permission[] = [
  'view_submissions',
  'edit_submissions',
  'manage_clients',
  'manage_forms',
  'manage_roles',
  'view_stats',
];

/* ── Données initiales (statiques — à connecter au backend) ─────────────── */

const INITIAL_ROLES: Role[] = [
  {
    id: 1,
    name: 'Super Administrateur',
    description: 'Accès complet à toutes les fonctionnalités de la plateforme.',
    permissions: ['view_submissions', 'edit_submissions', 'manage_clients', 'manage_forms', 'manage_roles', 'view_stats'],
    users_count: 1,
  },
  {
    id: 2,
    name: 'Gestionnaire',
    description: 'Peut consulter et traiter les dossiers clients et les déclarations.',
    permissions: ['view_submissions', 'edit_submissions', 'manage_clients', 'view_stats'],
    users_count: 2,
  },
];

/* ── Composant principal ─────────────────────────────────────────────────── */

export default function RolesPage() {
  const { t } = useLanguage();

  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as Permission[] });
  const [saving, setSaving] = useState(false);

  /* Ouvrir modal création */
  const openAdd = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', permissions: [] });
    setModalOpen(true);
  };

  /* Ouvrir modal édition */
  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description, permissions: [...role.permissions] });
    setModalOpen(true);
  };

  /* Fermer modal */
  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
  };

  /* Basculer une permission dans le formulaire */
  const togglePermission = (perm: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  /* Sauvegarder (local — à brancher sur l'API) */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    await new Promise((r) => setTimeout(r, 400)); // simulation réseau

    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? { ...r, name: form.name, description: form.description, permissions: form.permissions }
            : r,
        ),
      );
    } else {
      setRoles((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: form.name,
          description: form.description,
          permissions: form.permissions,
          users_count: 0,
        },
      ]);
    }

    setSaving(false);
    closeModal();
  };

  /* Supprimer */
  const handleDelete = (id: number) => {
    if (!window.confirm(t('roles.confirm_delete'))) return;
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  /* Label permission */
  const permLabel = (perm: Permission) => t(`roles.perm_${perm}` as Parameters<typeof t>[0]);

  return (
    <div className="roles-root">
      {/* En-tête */}
      <div className="roles-header">
        <div className="roles-header-top">
          <Link to="/admin/parametres" className="roles-back-link">
            <ArrowLeft size={16} />
            <span>{t('roles.back')}</span>
          </Link>
        </div>
        <div className="roles-header-main">
          <div className="roles-header-icon">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="roles-title">{t('roles.title')}</h1>
            <p className="roles-subtitle">{t('roles.subtitle')}</p>
          </div>
          <button type="button" className="roles-add-btn" onClick={openAdd}>
            <Plus size={16} />
            <span>{t('roles.add_btn')}</span>
          </button>
        </div>
      </div>

      {/* Tableau des rôles */}
      <div className="card">
        {roles.length === 0 ? (
          <p className="roles-empty">{t('roles.no_roles')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('roles.th_role')}</th>
                  <th scope="col">{t('roles.th_desc')}</th>
                  <th scope="col">{t('roles.th_permissions')}</th>
                  <th scope="col">{t('roles.th_users')}</th>
                  <th scope="col">{t('roles.th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td data-label={t('roles.th_role')}>
                      <strong className="roles-name">{role.name}</strong>
                    </td>
                    <td data-label={t('roles.th_desc')}>
                      <span className="roles-desc-cell">{role.description || '—'}</span>
                    </td>
                    <td data-label={t('roles.th_permissions')}>
                      <div className="roles-perms-wrap">
                        {role.permissions.length === ALL_PERMISSIONS.length ? (
                          <span className="roles-perm-badge roles-perm-all">Toutes</span>
                        ) : (
                          role.permissions.map((p) => (
                            <span key={p} className="roles-perm-badge">
                              {permLabel(p)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td data-label={t('roles.th_users')}>{role.users_count}</td>
                    <td data-label={t('roles.th_actions')}>
                      <div className="roles-actions">
                        <button type="button" className="roles-btn-edit" onClick={() => openEdit(role)} title={t('roles.edit')}>
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="roles-btn-delete"
                          onClick={() => handleDelete(role.id)}
                          title={t('roles.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création / édition */}
      {modalOpen && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card roles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingRole ? t('roles.modal_edit_title') : t('roles.modal_add_title')}</h2>
              <button type="button" className="admin-modal-close" onClick={closeModal} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="roles-form">
              {/* Nom */}
              <div className="form-group">
                <label className="form-label" htmlFor="role-name">
                  {t('roles.field_name')} <span className="required">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('roles.field_name_placeholder')}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="role-desc">
                  {t('roles.field_desc')}
                </label>
                <textarea
                  id="role-desc"
                  className="form-input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('roles.field_desc_placeholder')}
                />
              </div>

              {/* Permissions */}
              <div className="form-group">
                <span className="form-label">{t('roles.permissions_title')}</span>
                <div className="roles-perms-grid">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} className="roles-perm-check">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                      />
                      <span>{permLabel(perm)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Boutons */}
              <div className="roles-modal-actions">
                <button type="button" className="roles-btn-cancel" onClick={closeModal} disabled={saving}>
                  {t('roles.btn_cancel')}
                </button>
                <button type="submit" className="roles-btn-save" disabled={saving}>
                  {saving ? t('roles.saving') : t('roles.btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
