import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  createBuilderCategory,
  createBuilderField,
  deleteBuilderCategory,
  deleteBuilderField,
  getBuilderCategories,
  getBuilderFields,
  reorderBuilderFields,
  updateBuilderCategory,
  updateBuilderField,
} from '../api';
import DynamicForm from '../components/DynamicForm';
import { useLanguage } from '../i18n/LanguageContext';
import type { BuilderCategory, BuilderField, FieldType, FormType } from '../types';
import { getFieldTypeLabel, errorMessage } from './labels';

interface EditorState {
  mode: 'add' | 'edit';
  id?: number;
  name: string;
  label: string;
  label_en: string;
  field_type: FieldType;
  is_required: boolean;
  section: string;
  section_en: string;
  placeholder: string;
  placeholder_en: string;
  optionsList: string[];
  newOptionText: string;
  useCondition: boolean;
  condition_field: string;
  condition_equals: string;
  autoSlug: boolean;
}

const EMPTY_EDITOR: EditorState = {
  mode: 'add',
  name: '',
  label: '',
  label_en: '',
  field_type: 'text',
  is_required: false,
  section: '',
  section_en: '',
  placeholder: '',
  placeholder_en: '',
  optionsList: [],
  newOptionText: '',
  useCondition: false,
  condition_field: '',
  condition_equals: '',
  autoSlug: true,
};

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45);
}

const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  text: 'Texte court / Short text',
  textarea: 'Paragraphe / Text area',
  number: 'Nombre ou montant / Number or amount',
  date: 'Sélecteur de date / Date picker',
  select: 'Liste déroulante / Dropdown select',
  multiselect: 'Cases à cocher multiples / Checkboxes',
  checkbox: 'Case à cocher unique / Single checkbox',
  file: 'Pièce jointe ou document / File upload',
};

export default function FormBuilderPage() {
  const { lang, t } = useLanguage();

  const [categories, setCategories] = useState<BuilderCategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formType, setFormType] = useState<FormType>('quote');
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const currentKey = selectedId !== null ? `${selectedId}-${formType}` : null;
  const loadingFields = currentKey !== null && loadedKey !== currentKey;

  // Mode affichage : éditeur ou aperçu en direct
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  // Filtre pour afficher ou masquer les champs inactifs
  const [showInactive, setShowInactive] = useState(false);

  // Modale d'édition d'une question
  const [editor, setEditor] = useState<EditorState | null>(null);

  // Ajout / renommage de catégorie (bilingue)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [editingCategory, setEditingCategory] = useState<BuilderCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryNameEn, setEditCategoryNameEn] = useState('');

  // Rechargement des catégories filtrées selon le mode (devis ou sinistre)
  const loadCategories = useCallback(async (typeToLoad?: FormType) => {
    try {
      const targetType = typeToLoad ?? formType;
      const data = await getBuilderCategories(targetType);
      setCategories(data);
      if (data.length > 0) {
        setSelectedId((prev) => {
          if (prev !== null && data.some((c) => c.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [formType]);

  // Rechargement des questions
  const loadFields = useCallback(async (categoryId: number, type: FormType) => {
    try {
      const data = await getBuilderFields(categoryId, type);
      setFields(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    let cancelled = false;
    getBuilderCategories(formType)
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        if (data.length > 0) {
          setSelectedId((prev) => {
            if (prev !== null && data.some((c) => c.id === prev)) return prev;
            return data[0].id;
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formType]);

  // Chargement des questions à chaque sélection
  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;

    getBuilderFields(selectedId, formType)
      .then((data) => {
        if (!cancelled) {
          setFields(data);
          setLoadedKey(`${selectedId}-${formType}`);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, formType]);

  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null;

  // Catégories ordonnées selon le type de formulaire actif (celles ayant des questions en premier)
  const displayedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = formType === 'quote' ? a.quote_count : a.claim_count;
      const countB = formType === 'quote' ? b.quote_count : b.claim_count;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [categories, formType]);

  // Sections uniques existantes dans le formulaire courant
  const existingSections = useMemo(() => {
    const set = new Set<string>();
    fields.forEach((f) => {
      if (f.section && f.section.trim()) {
        set.add(f.section.trim());
      }
    });
    return Array.from(set);
  }, [fields]);

  // Regroupement des questions par section dans l'ordre d'affichage
  const sectionGroups = useMemo(() => {
    const groups: { name: string; name_en?: string | null; fields: BuilderField[] }[] = [];
    const fieldsToProcess = showInactive ? fields : fields.filter((f) => f.is_active);

    fieldsToProcess.forEach((field) => {
      const secName = field.section?.trim() || 'Général';
      let group = groups.find((g) => g.name === secName);
      if (!group) {
        group = { name: secName, name_en: field.section_en?.trim(), fields: [] };
        groups.push(group);
      }
      group.fields.push(field);
    });

    return groups;
  }, [fields, showInactive]);

  const selectCategory = (id: number) => {
    if (id !== selectedId) {
      setSelectedId(id);
      setFields([]);
      setLoadedKey(null);
    }
    setEditor(null);
    setNotice('');
  };

  const changeFormType = async (type: FormType) => {
    if (type !== formType) {
      setFormType(type);
      setFields([]);
      setLoadedKey(null);
      setEditor(null);
      setNotice('');
      try {
        const data = await getBuilderCategories(type);
        setCategories(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        } else {
          setSelectedId(null);
        }
      } catch (err) {
        setError(errorMessage(err));
      }
    }
  };

  // Suppression définitive d'une catégorie
  const handleDeleteCategory = async (cat: BuilderCategory) => {
    if (!window.confirm(t('builder.confirm_delete_cat', { name: cat.name }))) return;
    setError('');
    setNotice('');
    try {
      await deleteBuilderCategory(cat.id);
      setNotice(t('builder.notice_cat_deleted'));
      const remaining = categories.filter((c) => c.id !== cat.id);
      setCategories(remaining);
      if (selectedId === cat.id) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      await loadCategories(formType);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Ajout d'une nouvelle catégorie (bilingue)
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    const name_en = newCategoryNameEn.trim();
    if (!name) return;
    setError('');
    try {
      const created = await createBuilderCategory({
        name,
        name_en: name_en || undefined,
        form_type: formType,
      });
      setNewCategoryName('');
      setNewCategoryNameEn('');
      await loadCategories(formType);
      setSelectedId(created.id);
      setNotice(t('builder.notice_cat_created', { name: created.name }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Renommage d'une catégorie (bilingue)
  const handleUpdateCategoryName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const name = editCategoryName.trim();
    const name_en = editCategoryNameEn.trim();
    if (!name) return;
    setError('');
    try {
      await updateBuilderCategory(editingCategory.id, {
        name,
        name_en: name_en || undefined,
      });
      setEditingCategory(null);
      await loadCategories(formType);
      setNotice(t('builder.notice_cat_renamed'));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Activation / désactivation d'une catégorie
  const toggleCategoryActive = async (category: BuilderCategory) => {
    setError('');
    try {
      await updateBuilderCategory(category.id, { is_active: !category.is_active });
      await loadCategories();
      setNotice(
        category.is_active
          ? `${category.name}: ${t('builder.deactivated')}`
          : `${category.name}: ${t('builder.active_on_site')}`
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Ouverture éditeur en mode ajout
  const openAdd = (presetSection?: string) => {
    setEditor({
      ...EMPTY_EDITOR,
      mode: 'add',
      section: presetSection ?? (existingSections[0] || 'Informations'),
    });
  };

  // Ouverture éditeur en mode modification
  const openEdit = (field: BuilderField) => {
    setEditor({
      mode: 'edit',
      id: field.id,
      name: field.name,
      label: field.label,
      label_en: field.label_en ?? '',
      field_type: field.field_type,
      is_required: field.is_required,
      section: field.section ?? '',
      section_en: field.section_en ?? '',
      placeholder: field.placeholder ?? '',
      placeholder_en: field.placeholder_en ?? '',
      optionsList: field.options ?? [],
      newOptionText: '',
      useCondition: Boolean(field.condition?.field),
      condition_field: field.condition?.field ?? '',
      condition_equals: field.condition?.equals ?? '',
      autoSlug: false,
    });
  };

  // Enregistrement de la question (ajout ou modification)
  const saveEditor = async (e: FormEvent) => {
    e.preventDefault();
    if (!editor || selectedId === null) return;
    setError('');
    setNotice('');

    const trimmedLabel = editor.label.trim();
    const finalName = (editor.mode === 'add' ? (editor.name.trim() || slugify(trimmedLabel)) : editor.name).trim();

    if (!trimmedLabel) {
      setError(t('builder.label_field'));
      return;
    }
    if (!finalName) {
      setError(t('builder.technical_key'));
      return;
    }

    const condition =
      editor.useCondition && editor.condition_field.trim() && editor.condition_equals.trim()
        ? { field: editor.condition_field.trim(), equals: editor.condition_equals.trim() }
        : null;

    const payload = {
      label: trimmedLabel,
      label_en: editor.label_en.trim() || null,
      field_type: editor.field_type,
      is_required: editor.is_required,
      section: editor.section.trim() || null,
      section_en: editor.section_en.trim() || null,
      placeholder: editor.placeholder.trim() || null,
      placeholder_en: editor.placeholder_en.trim() || null,
      options: editor.optionsList.length > 0 ? editor.optionsList : null,
      condition,
    };

    try {
      if (editor.mode === 'add') {
        await createBuilderField(selectedId, {
          ...payload,
          name: finalName,
          form_type: formType,
        });
        setNotice(t('builder.notice_added', { label: trimmedLabel }));
      } else {
        await updateBuilderField(editor.id as number, payload);
        setNotice(t('builder.notice_updated', { label: trimmedLabel }));
      }
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setEditor(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Réordonner une question à l'intérieur de sa section ou globalement
  const moveFieldWithinSection = async (
    sectionName: string,
    fieldIndex: number,
    direction: -1 | 1
  ) => {
    if (selectedId === null) return;
    const group = sectionGroups.find((g) => g.name === sectionName);
    if (!group) return;

    const targetIndex = fieldIndex + direction;
    if (targetIndex < 0 || targetIndex >= group.fields.length) return;

    const fieldA = group.fields[fieldIndex];
    const fieldB = group.fields[targetIndex];

    const nextGlobal = [...fields];
    const globalIdxA = nextGlobal.findIndex((f) => f.id === fieldA.id);
    const globalIdxB = nextGlobal.findIndex((f) => f.id === fieldB.id);

    if (globalIdxA === -1 || globalIdxB === -1) return;

    [nextGlobal[globalIdxA], nextGlobal[globalIdxB]] = [
      nextGlobal[globalIdxB],
      nextGlobal[globalIdxA],
    ];

    setFields(nextGlobal);
    try {
      await reorderBuilderFields(
        selectedId,
        formType,
        nextGlobal.map((f) => f.id)
      );
      setPreviewRefreshKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
      await loadFields(selectedId, formType);
    }
  };

  // Monter ou descendre une section complète
  const moveSection = async (sectionIndex: number, direction: -1 | 1) => {
    if (selectedId === null) return;
    const targetSectionIndex = sectionIndex + direction;
    if (targetSectionIndex < 0 || targetSectionIndex >= sectionGroups.length) return;

    const newGroups = [...sectionGroups];
    [newGroups[sectionIndex], newGroups[targetSectionIndex]] = [
      newGroups[targetSectionIndex],
      newGroups[sectionIndex],
    ];

    const reorderedFieldIds = newGroups.flatMap((g) => g.fields.map((f) => f.id));

    const missingIds = fields
      .map((f) => f.id)
      .filter((id) => !reorderedFieldIds.includes(id));
    const allIds = [...reorderedFieldIds, ...missingIds];

    try {
      await reorderBuilderFields(selectedId, formType, allIds);
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setNotice(t('builder.notice_reordered'));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Activer / désactiver une question
  const toggleFieldActive = async (field: BuilderField) => {
    if (selectedId === null) return;
    setError('');
    try {
      await updateBuilderField(field.id, { is_active: !field.is_active });
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setNotice(
        field.is_active
          ? `${field.label}: ${t('builder.deactivated')}`
          : `${field.label}: ${t('builder.active_on_site')}`
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Désactiver / retirer une question
  const handleDeactivate = async (field: BuilderField) => {
    if (!window.confirm(t('builder.confirm_deactivate', { label: field.label }))) return;
    if (selectedId === null) return;
    setError('');
    try {
      await deleteBuilderField(field.id);
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setNotice(t('builder.notice_deactivated', { label: field.label }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Gestion des chips d'options pour select/multiselect
  const addOptionChip = () => {
    if (!editor || !editor.newOptionText.trim()) return;
    const trimmed = editor.newOptionText.trim();
    if (editor.optionsList.includes(trimmed)) return;
    setEditor({
      ...editor,
      optionsList: [...editor.optionsList, trimmed],
      newOptionText: '',
    });
  };

  const removeOptionChip = (index: number) => {
    if (!editor) return;
    const next = [...editor.optionsList];
    next.splice(index, 1);
    setEditor({ ...editor, optionsList: next });
  };

  const needsOptions =
    editor && (editor.field_type === 'select' || editor.field_type === 'multiselect');

  const triggerFieldOptions = useMemo(() => {
    if (!editor || !editor.condition_field) return null;
    const trigger = fields.find((f) => f.name === editor.condition_field);
    return trigger?.options ?? null;
  }, [editor, fields]);

  return (
    <div className="builder-root">
      {/* En-tête principal */}
      <div className="builder-header">
        <div>
          <h1>{t('builder.title')}</h1>
          <p className="builder-header-desc">{t('builder.subtitle')}</p>
        </div>

        <div className="builder-header-controls">
          {/* Bascule Devis vs Sinistres */}
          <div className="builder-type-pill">
            <button
              type="button"
              className={formType === 'quote' ? 'active' : ''}
              onClick={() => changeFormType('quote')}
            >
              <FileText size={16} />
              <span>{t('builder.quotes_tab')}</span>
            </button>
            <button
              type="button"
              className={formType === 'claim' ? 'active' : ''}
              onClick={() => changeFormType('claim')}
            >
              <AlertTriangle size={16} />
              <span>{t('builder.claims_tab')}</span>
            </button>
          </div>

          {/* Bascule Mode Éditeur vs Aperçu en direct */}
          <div className="builder-view-toggle">
            <button
              type="button"
              className={viewMode === 'editor' ? 'active' : ''}
              onClick={() => setViewMode('editor')}
              title={t('builder.mode_editor')}
            >
              <Sliders size={16} />
              <span>{t('builder.mode_editor')}</span>
            </button>
            <button
              type="button"
              className={viewMode === 'preview' ? 'active' : ''}
              onClick={() => setViewMode('preview')}
              title={t('builder.mode_preview')}
            >
              <Eye size={16} />
              <span>{t('builder.mode_preview')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications et erreurs */}
      {error && (
        <div className="alert builder-alert" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="close-alert" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="notice builder-notice" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button type="button" className="close-alert" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {loading && <p className="center">{t('builder.loading_cats')}</p>}

      {!loading && (
        <div className="builder-grid">
          {/* Colonne latérale : Catégories */}
          <aside className="builder-sidebar">
            <div className="builder-sidebar-header">
              <h2>
                <Layers size={18} /> {t('builder.categories')}
              </h2>
              <span className="badge-count">{categories.length}</span>
            </div>

            <ul className="builder-category-list">
              {displayedCategories.map((cat) => {
                const count = formType === 'quote' ? cat.quote_count : cat.claim_count;
                const isSelected = cat.id === selectedId;
                const catTitle = lang === 'en' && cat.name_en ? cat.name_en : cat.name;
                const catSub = lang === 'en' ? cat.name : (cat.name_en || null);

                return (
                  <li key={cat.id} className={`builder-cat-item ${isSelected ? 'selected' : ''}`}>
                    <div className="builder-cat-main" onClick={() => selectCategory(cat.id)}>
                      <div className="builder-cat-title-row">
                        <span className="builder-cat-name">
                          {catTitle}
                          {catSub && <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', fontWeight: 400 }}>{catSub}</span>}
                        </span>
                        <span className={`cat-status-dot ${cat.is_active ? 'active' : 'inactive'}`} />
                      </div>
                      <div className="builder-cat-sub">
                        <span>
                          {count} question{count > 1 ? 's' : ''} ({formType === 'quote' ? t('status.quote') : t('status.claim')})
                        </span>
                      </div>
                    </div>

                    <div className="builder-cat-actions">
                      <button
                        type="button"
                        className="cat-btn-icon"
                        title={t('builder.rename_cat_title')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat);
                          setEditCategoryName(cat.name);
                          setEditCategoryNameEn(cat.name_en ?? '');
                        }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <label className="switch" title={cat.is_active ? t('builder.deactivated') : t('builder.active_on_site')}>
                        <input
                          type="checkbox"
                          checked={cat.is_active}
                          onChange={() => toggleCategoryActive(cat)}
                        />
                        <span className="slider round" />
                      </label>

                      <button
                        type="button"
                        className="cat-btn-icon cat-btn-delete"
                        title={t('builder.delete_cat_title')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Formulaire ajout de catégorie (bilingue) */}
            <form onSubmit={handleAddCategory} className="builder-cat-add-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                required
                placeholder={t('builder.new_category_placeholder')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <input
                type="text"
                placeholder={t('builder.new_category_en_placeholder')}
                value={newCategoryNameEn}
                onChange={(e) => setNewCategoryNameEn(e.target.value)}
              />
              <button type="submit" className="btn btn-sm">
                <Plus size={14} /> {t('builder.add')}
              </button>
            </form>
          </aside>

          {/* Zone principale : Éditeur ou Aperçu en direct */}
          <main className="builder-content">
            {selectedCategory ? (
              <>
                {/* Bandeau d'informations de la catégorie sélectionnée */}
                <div className="builder-active-banner">
                  <div>
                    <h2 className="builder-active-title">
                      {lang === 'en' && selectedCategory.name_en ? selectedCategory.name_en : selectedCategory.name}
                      <span className={`badge ${selectedCategory.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {selectedCategory.is_active ? t('builder.active_on_site') : t('builder.deactivated')}
                      </span>
                    </h2>
                    <p className="builder-active-meta">
                      {formType === 'quote' ? t('builder.quotes_tab') : t('builder.claims_tab')} ·{' '}
                      {fields.length} question{fields.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="builder-active-actions">
                    {viewMode === 'editor' && (
                      <>
                        <label className="choice filter-inactive-toggle">
                          <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                          />
                          {t('builder.see_inactive')} ({fields.filter((f) => !f.is_active).length})
                        </label>

                        <button type="button" className="btn" onClick={() => openAdd()}>
                          <Plus size={16} /> {t('builder.add_question')}
                        </button>
                      </>
                    )}

                    {viewMode === 'preview' && (
                      <div className="preview-controls">
                        <button
                          type="button"
                          className={`btn-device ${previewDevice === 'desktop' ? 'active' : ''}`}
                          onClick={() => setPreviewDevice('desktop')}
                          title={t('builder.device_desktop')}
                        >
                          <Monitor size={16} /> {t('builder.device_desktop')}
                        </button>
                        <button
                          type="button"
                          className={`btn-device ${previewDevice === 'mobile' ? 'active' : ''}`}
                          onClick={() => setPreviewDevice('mobile')}
                          title={t('builder.device_mobile')}
                        >
                          <Smartphone size={16} /> {t('builder.device_mobile')}
                        </button>
                        <button
                          type="button"
                          className="btn-refresh"
                          onClick={() => setPreviewRefreshKey((k) => k + 1)}
                          title={t('builder.reset_preview')}
                        >
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* MODE APERÇU EN DIRECT */}
                {viewMode === 'preview' && (
                  <div className={`builder-preview-container ${previewDevice}`}>
                    <div className="builder-preview-header-note">
                      <Eye size={15} />
                      <span>{t('builder.interactive_note')}</span>
                    </div>

                    <div className="builder-preview-viewport">
                      <div className="preview-content-wrapper">
                        <DynamicForm
                          key={`${selectedCategory.slug}-${formType}-${previewRefreshKey}`}
                          category={selectedCategory}
                          formType={formType}
                          isPreview={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE ÉDITEUR : GROUPEMENT PAR SECTIONS */}
                {viewMode === 'editor' && (
                  <div className="builder-sections-flow">
                    {loadingFields && <p className="center">{t('builder.loading_fields')}</p>}

                    {!loadingFields && sectionGroups.length === 0 && (
                      <div className="builder-empty-state">
                        <p>{t('builder.empty_form')}</p>
                        <button type="button" className="btn" onClick={() => openAdd('Informations')}>
                          <Plus size={16} /> {t('builder.create_first_question')}
                        </button>
                      </div>
                    )}

                    {!loadingFields &&
                      sectionGroups.map((group, secIdx) => (
                        <div key={group.name} className="builder-section-card">
                          <div className="builder-section-card-header">
                            <div className="builder-section-title-wrap">
                              <span className="step-badge">{t('builder.step')} {secIdx + 1}</span>
                              <h3>{group.name}</h3>
                              <span className="section-count">
                                {group.fields.length} question{group.fields.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="builder-section-header-actions">
                              <button
                                type="button"
                                className="btn-icon"
                                title={t('builder.move_step_up')}
                                disabled={secIdx === 0}
                                onClick={() => moveSection(secIdx, -1)}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title={t('builder.move_step_down')}
                                disabled={secIdx === sectionGroups.length - 1}
                                onClick={() => moveSection(secIdx, 1)}
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => openAdd(group.name)}
                              >
                                <Plus size={14} /> {t('builder.add_in_this_step')}
                              </button>
                            </div>
                          </div>

                          <div className="builder-section-card-body">
                            <div className="builder-fields-list">
                              {group.fields.map((field, fieldIdx) => {
                                const isConditional = Boolean(field.condition?.field);

                                return (
                                  <div
                                    key={field.id}
                                    className={`builder-field-row ${!field.is_active ? 'is-inactive' : ''}`}
                                  >
                                    <div className="field-reorder-col">
                                      <button
                                        type="button"
                                        className="btn-order"
                                        disabled={fieldIdx === 0}
                                        onClick={() => moveFieldWithinSection(group.name, fieldIdx, -1)}
                                        title={t('builder.move_question_up')}
                                      >
                                        <ArrowUp size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-order"
                                        disabled={fieldIdx === group.fields.length - 1}
                                        onClick={() => moveFieldWithinSection(group.name, fieldIdx, 1)}
                                        title={t('builder.move_question_down')}
                                      >
                                        <ArrowDown size={13} />
                                      </button>
                                    </div>

                                    <div className="field-info-col">
                                      <div className="field-header-line">
                                        <strong className="field-label-text">{field.label}</strong>
                                        <code className="field-slug-text">{field.name}</code>
                                      </div>

                                      <div className="field-badges-line">
                                        <span className={`type-tag type-${field.field_type}`}>
                                          {getFieldTypeLabel(field.field_type, lang)}
                                        </span>

                                        <span className={`req-tag ${field.is_required ? 'required' : 'optional'}`}>
                                          {field.is_required ? `● ${t('builder.required_badge')}` : `○ ${t('builder.optional_badge')}`}
                                        </span>

                                        {isConditional && (
                                          <span className="cond-tag" title={`${t('builder.condition_if')} ${field.condition?.field} = ${field.condition?.equals}`}>
                                            <Sparkles size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                                            {t('builder.condition_if')} [{field.condition?.field}] = "{field.condition?.equals}"
                                          </span>
                                        )}

                                        {!field.is_active && <span className="inactive-tag">{t('builder.inactive_badge')}</span>}
                                      </div>

                                      {field.options && field.options.length > 0 && (
                                        <div className="field-options-preview">
                                          {field.options.map((opt) => (
                                            <span key={opt} className="opt-chip-mini">
                                              {opt}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="field-actions-col">
                                      <button
                                        type="button"
                                        className="btn-action edit"
                                        onClick={() => openEdit(field)}
                                        title={t('builder.edit_btn')}
                                      >
                                        <Edit3 size={15} /> {t('builder.edit_btn')}
                                      </button>

                                      <button
                                        type="button"
                                        className={`btn-action toggle ${field.is_active ? 'active' : 'inactive'}`}
                                        onClick={() => toggleFieldActive(field)}
                                        title={field.is_active ? t('builder.toggle_title_deactivate') : t('builder.toggle_title_activate')}
                                      >
                                        {field.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn-action delete"
                                        onClick={() => handleDeactivate(field)}
                                        title={t('builder.remove_btn')}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}

                    <div className="builder-add-step-wrapper">
                      <button
                        type="button"
                        className="btn btn-secondary btn-new-step"
                        onClick={() => openAdd(`Étape ${sectionGroups.length + 1}`)}
                      >
                        <Plus size={16} /> {t('builder.add_new_step')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="center">{t('builder.select_cat_prompt')}</p>
            )}
          </main>
        </div>
      )}

      {/* MODALE RENOMMER CATÉGORIE */}
      {editingCategory && (
        <div className="builder-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <div className="builder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="builder-modal-header">
              <h3>{t('builder.rename_cat_title')}</h3>
              <button type="button" className="close-btn" onClick={() => setEditingCategory(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateCategoryName}>
              <div className="field">
                <label htmlFor="cat-edit-name">{t('builder.cat_name_label')} (FR) <span className="req">*</span></label>
                <input
                  id="cat-edit-name"
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cat-edit-name-en">{t('builder.cat_name_en_label')}</label>
                <input
                  id="cat-edit-name-en"
                  type="text"
                  placeholder="Ex : Motor Insurance"
                  value={editCategoryNameEn}
                  onChange={(e) => setEditCategoryNameEn(e.target.value)}
                />
              </div>
              <div className="builder-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCategory(null)}>
                  {t('builder.btn_cancel')}
                </button>
                <button type="submit" className="btn">
                  {t('builder.btn_save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE ÉDITEUR DE QUESTION */}
      {editor && (
        <div className="builder-modal-backdrop" onClick={() => setEditor(null)}>
          <div className="builder-modal builder-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="builder-modal-header">
              <h3>{editor.mode === 'add' ? t('builder.modal_add_title') : t('builder.modal_edit_title')}</h3>
              <button type="button" className="close-btn" onClick={() => setEditor(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEditor} className="builder-modal-form">
              {/* Libellé FR et EN */}
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="f-label">
                    {t('builder.label_field')} (FR) <span className="req">*</span>
                  </label>
                  <input
                    id="f-label"
                    type="text"
                    required
                    placeholder={t('builder.label_placeholder')}
                    value={editor.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      const updates: Partial<EditorState> = { label: newLabel };
                      if (editor.mode === 'add' && editor.autoSlug) {
                        updates.name = slugify(newLabel);
                      }
                      setEditor({ ...editor, ...updates });
                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="f-label-en">{t('builder.label_field_en')}</label>
                  <input
                    id="f-label-en"
                    type="text"
                    placeholder={t('builder.label_placeholder_en')}
                    value={editor.label_en}
                    onChange={(e) => setEditor({ ...editor, label_en: e.target.value })}
                  />
                </div>
              </div>

              {/* Identifiant technique */}
              <div className="field">
                <div className="field-title-flex">
                  <label htmlFor="f-name">
                    {t('builder.technical_key')} <span className="req">*</span>
                  </label>
                  {editor.mode === 'add' && (
                    <label className="choice mini-choice">
                      <input
                        type="checkbox"
                        checked={editor.autoSlug}
                        onChange={(e) => setEditor({ ...editor, autoSlug: e.target.checked })}
                      />
                      {t('builder.auto_gen_slug')}
                    </label>
                  )}
                </div>
                <input
                  id="f-name"
                  type="text"
                  required
                  disabled={editor.mode === 'edit'}
                  placeholder="Ex : vehicle_plate"
                  value={editor.name}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      name: slugify(e.target.value),
                      autoSlug: false,
                    })
                  }
                />
                {editor.mode === 'edit' && (
                  <small className="help-text">
                    {t('builder.slug_locked_help')}
                  </small>
                )}
              </div>

              {/* Type de réponse */}
              <div className="field">
                <label htmlFor="f-type">{t('builder.response_type')}</label>
                <select
                  id="f-type"
                  value={editor.field_type}
                  onChange={(e) =>
                    setEditor({ ...editor, field_type: e.target.value as FieldType })
                  }
                >
                  {Object.entries(FIELD_TYPE_DESCRIPTIONS).map(([type, desc]) => (
                    <option key={type} value={type}>
                      {getFieldTypeLabel(type, lang)} — {desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section FR et EN */}
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="f-section">{t('builder.section_field')} (FR)</label>
                  <input
                    id="f-section"
                    type="text"
                    list="existing-sections-list"
                    placeholder={t('builder.section_placeholder')}
                    value={editor.section}
                    onChange={(e) => setEditor({ ...editor, section: e.target.value })}
                  />
                  <datalist id="existing-sections-list">
                    {existingSections.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label htmlFor="f-section-en">{t('builder.section_field_en')}</label>
                  <input
                    id="f-section-en"
                    type="text"
                    placeholder={t('builder.section_placeholder_en')}
                    value={editor.section_en}
                    onChange={(e) => setEditor({ ...editor, section_en: e.target.value })}
                  />
                </div>
              </div>

              {/* Placeholder FR et EN */}
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="f-placeholder">{t('builder.placeholder_field')} (FR)</label>
                  <input
                    id="f-placeholder"
                    type="text"
                    placeholder={t('builder.placeholder_help')}
                    value={editor.placeholder}
                    onChange={(e) => setEditor({ ...editor, placeholder: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="f-placeholder-en">{t('builder.placeholder_field_en')}</label>
                  <input
                    id="f-placeholder-en"
                    type="text"
                    placeholder={t('builder.placeholder_help_en')}
                    value={editor.placeholder_en}
                    onChange={(e) => setEditor({ ...editor, placeholder_en: e.target.value })}
                  />
                </div>
              </div>

              {/* Obligatoire */}
              <div className="field" style={{ marginBottom: '16px' }}>
                <label className="choice big-toggle">
                  <input
                    type="checkbox"
                    checked={editor.is_required}
                    onChange={(e) => setEditor({ ...editor, is_required: e.target.checked })}
                  />
                  <span>{t('builder.required_toggle')}</span>
                </label>
              </div>

              {/* Gestionnaire d'options pour select ou multiselect */}
              {needsOptions && (
                <div className="field-group-box">
                  <h4>{t('builder.options_title')}</h4>
                  <div className="chip-input-wrap">
                    <input
                      type="text"
                      placeholder={t('builder.options_input_placeholder')}
                      value={editor.newOptionText}
                      onChange={(e) => setEditor({ ...editor, newOptionText: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOptionChip();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-sm" onClick={addOptionChip}>
                      {t('builder.add')}
                    </button>
                  </div>

                  <div className="chips-container">
                    {editor.optionsList.length === 0 ? (
                      <p className="help-text">{t('builder.options_empty_help')}</p>
                    ) : (
                      editor.optionsList.map((opt, i) => (
                        <span key={opt} className="option-chip">
                          {opt}
                          <button
                            type="button"
                            className="remove-chip"
                            onClick={() => removeOptionChip(i)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Logique conditionnelle ("Si... Alors...") */}
              <div className="field-group-box">
                <div className="field-title-flex">
                  <h4>{t('builder.condition_box_title')}</h4>
                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={editor.useCondition}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          useCondition: e.target.checked,
                          condition_field: e.target.checked
                            ? editor.condition_field || (fields[0]?.name ?? '')
                            : '',
                        })
                      }
                    />
                    {t('builder.condition_toggle')}
                  </label>
                </div>

                {editor.useCondition && (
                  <div className="condition-builder-grid">
                    <div className="field">
                      <label htmlFor="cond-trigger">{t('builder.condition_trigger_label')}</label>
                      <select
                        id="cond-trigger"
                        value={editor.condition_field}
                        onChange={(e) =>
                          setEditor({ ...editor, condition_field: e.target.value })
                        }
                      >
                        <option value="">{t('builder.condition_choose_trigger')}</option>
                        {fields
                          .filter((f) => f.name !== editor.name)
                          .map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.label} ({f.name})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="cond-val">{t('builder.condition_expected_value')}</label>
                      {triggerFieldOptions && triggerFieldOptions.length > 0 ? (
                        <select
                          id="cond-val"
                          value={editor.condition_equals}
                          onChange={(e) =>
                            setEditor({ ...editor, condition_equals: e.target.value })
                          }
                        >
                          <option value="">{t('builder.condition_choose_option')}</option>
                          {triggerFieldOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="cond-val"
                          type="text"
                          placeholder="Ex : Oui"
                          value={editor.condition_equals}
                          onChange={(e) =>
                            setEditor({ ...editor, condition_equals: e.target.value })
                          }
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="builder-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditor(null)}>
                  {t('builder.btn_cancel')}
                </button>
                <button type="submit" className="btn">
                  {editor.mode === 'add' ? t('builder.btn_create_question') : t('builder.btn_save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
