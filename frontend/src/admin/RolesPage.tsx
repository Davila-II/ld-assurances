import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  Lock,
  Plus,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  assignUserToRole,
  createRole,
  deleteRole,
  getRoleUsers,
  getRoles,
  removeUserFromRole,
  updateRole,
} from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import type { StaffPermissionGroup, StaffRole, StaffRoleUser } from '../types';

/* ── Types locaux ────────────────────────────────────────────────────────── */
type ModalTab = 'info' | 'users';

interface FormState {
  name: string;
  name_en: string;
  description: string;
  permissions: string[];
}

/* ── Libellés des groupes ────────────────────────────────────────────────── */
const GROUP_ORDER = ['dossiers', 'finances', 'clients', 'parametres'];

/* ── Composant principal ─────────────────────────────────────────────────── */
export default function RolesPage() {
  const { t } = useLanguage();

  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permGroups, setPermGroups] = useState<StaffPermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('info');
  const [form, setForm] = useState<FormState>({ name: '', name_en: '', description: '', permissions: [] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Expandable rows */
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [expandedPermsRole, setExpandedPermsRole] = useState<number | null>(null);

  /* Users sous-panel */
  const [roleUsers, setRoleUsers] = useState<Record<number, StaffRoleUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<number, boolean>>({});
  const [assignEmail, setAssignEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      setLoading(true);
      setError(null);
      const data = await getRoles();
      setRoles(data.roles);
      setPermGroups(data.permissions);
    } catch {
      setError(t('roles.error_load'));
    } finally {
      setLoading(false);
    }
  }

  /* ── Ouvrir/fermer modal ────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditingRole(null);
    setForm({ name: '', name_en: '', description: '', permissions: [] });
    setModalTab('info');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (role: StaffRole) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      name_en: role.name_en ?? '',
      description: role.description ?? '',
      permissions: [...role.permissions],
    });
    setModalTab('info');
    setFormError(null);
    setModalOpen(true);
    loadUsersForRole(role.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    setAssignEmail('');
    setAssignError(null);
  };

  /* ── Toggle permission ──────────────────────────────────────────────────── */
  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const allPermKeys = permGroups.flatMap((g) => g.permissions.map((p) => p.key));

  const selectAll = () => setForm((prev) => ({ ...prev, permissions: allPermKeys }));
  const deselectAll = () => setForm((prev) => ({ ...prev, permissions: [] }));

  /* ── Sauvegarder ────────────────────────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);

    try {
      if (editingRole) {
        const updated = await updateRole(editingRole.id, {
          name: editingRole.is_system ? undefined : form.name || undefined,
          name_en: form.name_en || undefined,
          description: form.description || undefined,
          permissions: form.permissions,
        });
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRole({
          name: form.name,
          name_en: form.name_en || undefined,
          description: form.description || undefined,
          permissions: form.permissions,
        });
        setRoles((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('roles.error_save'));
    } finally {
      setSaving(false);
    }
  };

  /* ── Supprimer ──────────────────────────────────────────────────────────── */
  const handleDelete = async (role: StaffRole) => {
    if (role.is_system) {
      alert(t('roles.system_no_delete'));
      return;
    }
    if (role.users_count > 0) {
      alert(t('roles.has_users_no_delete'));
      return;
    }
    if (!window.confirm(t('roles.confirm_delete'))) return;
    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('roles.error_delete'));
    }
  };

  /* ── Toggle expanded row ────────────────────────────────────────────────── */
  const toggleExpand = (roleId: number) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
    } else {
      setExpandedRole(roleId);
      loadUsersForRole(roleId);
    }
  };

  /* ── Charger les utilisateurs d'un rôle ─────────────────────────────────── */
  const loadUsersForRole = async (roleId: number) => {
    if (roleUsers[roleId]) return; // déjà chargé
    setLoadingUsers((prev) => ({ ...prev, [roleId]: true }));
    try {
      const data = await getRoleUsers(roleId);
      setRoleUsers((prev) => ({ ...prev, [roleId]: data.users }));
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  /* ── Assigner un utilisateur ─────────────────────────────────────────────── */
  const handleAssign = async (roleId: number) => {
    if (!assignEmail.trim()) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await assignUserToRole(roleId, assignEmail.trim());
      setAssignEmail('');
      // Rafraîchir la liste des users de ce rôle
      setRoleUsers((prev) => ({
        ...prev,
        [roleId]: [...(prev[roleId] ?? []), res.user],
      }));
      // Incrémenter le compteur dans la liste des rôles
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, users_count: r.users_count + 1 } : r))
      );
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : t('roles.error_assign'));
    } finally {
      setAssigning(false);
    }
  };

  /* ── Retirer un utilisateur ──────────────────────────────────────────────── */
  const handleRemoveUser = async (roleId: number, userId: number) => {
    try {
      await removeUserFromRole(roleId, userId);
      setRoleUsers((prev) => ({
        ...prev,
        [roleId]: (prev[roleId] ?? []).filter((u) => u.id !== userId),
      }));
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, users_count: Math.max(0, r.users_count - 1) } : r))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('roles.error_delete'));
    }
  };

  /* ── Libellé groupe ─────────────────────────────────────────────────────── */
  const groupLabel = (group: string) =>
    t(`roles.group_${group}` as Parameters<typeof t>[0]) || group;

  /* ── Rendu ──────────────────────────────────────────────────────────────── */
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

      {/* Contenu */}
      {loading ? (
        <div className="roles-loading">
          <Loader2 size={28} className="roles-spinner" />
        </div>
      ) : error ? (
        <div className="roles-error-banner">
          {error}
          <button type="button" onClick={loadRoles} className="roles-retry-btn">
            Réessayer
          </button>
        </div>
      ) : (
        <div className="roles-cards">
          {roles.length === 0 ? (
            <p className="roles-empty">{t('roles.no_roles')}</p>
          ) : (
            roles.map((role) => {
              const isExpanded = expandedRole === role.id;
              const users = roleUsers[role.id] ?? [];
              const usersLoading = loadingUsers[role.id] ?? false;

              return (
                <div key={role.id} className={`roles-card ${!role.is_active ? 'roles-card--inactive' : ''}`}>
                  {/* Ligne principale */}
                  <div className="roles-card-header">
                    <div className="roles-card-left">
                      <div className="roles-card-title-row">
                        <span className="roles-card-name">{role.name}</span>
                        {role.is_system && (
                          <span className="roles-badge roles-badge--system">
                            <Lock size={10} />
                            {t('roles.system_badge')}
                          </span>
                        )}
                        {!role.is_active && (
                          <span className="roles-badge roles-badge--inactive">
                            {t('roles.inactive_badge')}
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="roles-card-desc">{role.description}</p>
                      )}
                      {/* Badges permissions */}
                      <div className="roles-perms-wrap">
                        {role.permissions.length === allPermKeys.length ? (
                          <span className="roles-perm-badge roles-perm-all">
                            <CheckSquare size={11} /> Toutes les permissions
                          </span>
                        ) : (
                          <>
                            {(expandedPermsRole === role.id ? role.permissions : role.permissions.slice(0, 4)).map((key) => {
                              const perm = permGroups
                                .flatMap((g) => g.permissions)
                                .find((p) => p.key === key);
                              return (
                                <span key={key} className="roles-perm-badge">
                                  {perm?.name ?? key}
                                </span>
                              );
                            })}
                            {role.permissions.length > 4 && (
                              <button
                                type="button"
                                className="roles-perm-badge roles-perm-more roles-perm-toggle-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPermsRole(expandedPermsRole === role.id ? null : role.id);
                                }}
                                title={expandedPermsRole === role.id ? "Réduire les permissions" : "Voir toutes les permissions"}
                              >
                                {expandedPermsRole === role.id ? "Afficher moins" : `+${role.permissions.length - 4}`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="roles-card-right">
                      {/* Compteur utilisateurs */}
                      <button
                        type="button"
                        className="roles-users-count"
                        onClick={() => toggleExpand(role.id)}
                        title={t('roles.users_tab')}
                      >
                        <Users size={14} />
                        <span>{role.users_count}</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {/* Actions */}
                      <div className="roles-actions">
                        <button
                          type="button"
                          className="roles-btn-edit"
                          onClick={() => openEdit(role)}
                          title={t('roles.edit')}
                        >
                          <Edit3 size={15} />
                        </button>
                        {!role.is_system && (
                          <button
                            type="button"
                            className="roles-btn-delete"
                            onClick={() => handleDelete(role)}
                            title={t('roles.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Zone expandable : utilisateurs */}
                  {isExpanded && (
                    <div className="roles-users-panel">
                      <div className="roles-users-panel-inner">
                        {/* Assigner */}
                        <div className="roles-assign-row">
                          <UserPlus size={15} className="roles-assign-icon" />
                          <input
                            type="email"
                            className="roles-assign-input"
                            placeholder={t('roles.assign_email_placeholder')}
                            value={assignEmail}
                            onChange={(e) => {
                              setAssignEmail(e.target.value);
                              setAssignError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAssign(role.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="roles-assign-btn"
                            onClick={() => handleAssign(role.id)}
                            disabled={assigning || !assignEmail.trim()}
                          >
                            {assigning ? <Loader2 size={14} className="roles-spinner" /> : t('roles.assign_btn')}
                          </button>
                        </div>
                        {assignError && <p className="roles-assign-error">{assignError}</p>}

                        {/* Liste utilisateurs */}
                        {usersLoading ? (
                          <div className="roles-users-loading">
                            <Loader2 size={18} className="roles-spinner" />
                          </div>
                        ) : users.length === 0 ? (
                          <p className="roles-no-users">{t('roles.no_users')}</p>
                        ) : (
                          <ul className="roles-user-list">
                            {users.map((user) => (
                              <li key={user.id} className="roles-user-item">
                                <div className="roles-user-avatar">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="roles-user-info">
                                  <span className="roles-user-name">{user.name}</span>
                                  <span className="roles-user-email">{user.email}</span>
                                </div>
                                <button
                                  type="button"
                                  className="roles-user-remove"
                                  onClick={() => handleRemoveUser(role.id, user.id)}
                                  title={t('roles.remove_user')}
                                >
                                  <UserMinus size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modal création / édition ── */}
      {modalOpen && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card roles-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header modal */}
            <div className="admin-modal-header">
              <h2>{editingRole ? t('roles.modal_edit_title') : t('roles.modal_add_title')}</h2>
              <button type="button" className="admin-modal-close" onClick={closeModal} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            {/* Tabs si édition */}
            {editingRole && (
              <div className="roles-modal-tabs">
                <button
                  type="button"
                  className={`roles-modal-tab ${modalTab === 'info' ? 'active' : ''}`}
                  onClick={() => setModalTab('info')}
                >
                  <Shield size={14} /> Rôle & Permissions
                </button>
                <button
                  type="button"
                  className={`roles-modal-tab ${modalTab === 'users' ? 'active' : ''}`}
                  onClick={() => setModalTab('users')}
                >
                  <Users size={14} /> {t('roles.users_tab')}
                  {editingRole.users_count > 0 && (
                    <span className="roles-modal-tab-count">{editingRole.users_count}</span>
                  )}
                </button>
              </div>
            )}

            {/* Tab: Infos + Permissions */}
            {modalTab === 'info' && (
              <form onSubmit={handleSave} className="roles-form">
                {formError && <div className="roles-form-error">{formError}</div>}

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
                    disabled={editingRole?.is_system}
                    required={!editingRole?.is_system}
                  />
                  {editingRole?.is_system && (
                    <p className="roles-field-hint">
                      <Lock size={12} /> Le nom d'un rôle système ne peut pas être modifié.
                    </p>
                  )}
                </div>

                {/* Nom EN */}
                <div className="form-group">
                  <label className="form-label" htmlFor="role-name-en">
                    {t('roles.field_name_en')}
                  </label>
                  <input
                    id="role-name-en"
                    type="text"
                    className="form-input"
                    value={form.name_en}
                    onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                    placeholder={t('roles.field_name_en_placeholder')}
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

                {/* Permissions groupées */}
                <div className="form-group">
                  <div className="roles-perm-header">
                    <span className="form-label">{t('roles.permissions_title')}</span>
                    <div className="roles-perm-actions">
                      <button type="button" className="roles-perm-toggle" onClick={selectAll}>
                        {t('roles.permissions_select_all')}
                      </button>
                      <span className="roles-perm-sep">·</span>
                      <button type="button" className="roles-perm-toggle" onClick={deselectAll}>
                        {t('roles.permissions_deselect_all')}
                      </button>
                    </div>
                  </div>

                  <div className="roles-perm-groups">
                    {[...permGroups].sort((a, b) => {
                      const ia = GROUP_ORDER.indexOf(a.group);
                      const ib = GROUP_ORDER.indexOf(b.group);
                      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                    }).map((group) => (
                      <div key={group.group} className="roles-perm-group">
                        <div className="roles-perm-group-title">{groupLabel(group.group)}</div>
                        <div className="roles-perms-grid">
                          {group.permissions.map((perm) => (
                            <label key={perm.key} className="roles-perm-check">
                              <input
                                type="checkbox"
                                checked={form.permissions.includes(perm.key)}
                                onChange={() => togglePermission(perm.key)}
                              />
                              <span>{perm.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Boutons */}
                <div className="roles-modal-actions">
                  <button type="button" className="roles-btn-cancel" onClick={closeModal} disabled={saving}>
                    {t('roles.btn_cancel')}
                  </button>
                  <button type="submit" className="roles-btn-save" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 size={14} className="roles-spinner" />
                        {t('roles.saving')}
                      </>
                    ) : (
                      t('roles.btn_save')
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Utilisateurs */}
            {modalTab === 'users' && editingRole && (
              <div className="roles-users-tab-content">
                {/* Assigner */}
                <div className="roles-assign-row">
                  <UserPlus size={15} className="roles-assign-icon" />
                  <input
                    type="email"
                    className="roles-assign-input"
                    placeholder={t('roles.assign_email_placeholder')}
                    value={assignEmail}
                    onChange={(e) => {
                      setAssignEmail(e.target.value);
                      setAssignError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAssign(editingRole.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="roles-assign-btn"
                    onClick={() => handleAssign(editingRole.id)}
                    disabled={assigning || !assignEmail.trim()}
                  >
                    {assigning ? <Loader2 size={14} className="roles-spinner" /> : t('roles.assign_btn')}
                  </button>
                </div>
                {assignError && <p className="roles-assign-error">{assignError}</p>}

                {/* Liste */}
                {loadingUsers[editingRole.id] ? (
                  <div className="roles-users-loading">
                    <Loader2 size={22} className="roles-spinner" />
                  </div>
                ) : (roleUsers[editingRole.id] ?? []).length === 0 ? (
                  <p className="roles-no-users">{t('roles.no_users')}</p>
                ) : (
                  <ul className="roles-user-list">
                    {(roleUsers[editingRole.id] ?? []).map((user) => (
                      <li key={user.id} className="roles-user-item">
                        <div className="roles-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                        <div className="roles-user-info">
                          <span className="roles-user-name">{user.name}</span>
                          <span className="roles-user-email">{user.email}</span>
                        </div>
                        <button
                          type="button"
                          className="roles-user-remove"
                          onClick={() => handleRemoveUser(editingRole.id, user.id)}
                          title={t('roles.remove_user')}
                        >
                          <UserMinus size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
