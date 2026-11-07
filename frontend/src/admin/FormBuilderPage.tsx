import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Sliders,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  createBuilderCategory,
  createBuilderField,
  deleteBuilderField,
  getBuilderCategories,
  getBuilderFields,
  reorderBuilderFields,
  updateBuilderCategory,
  updateBuilderField,
} from '../api';
import DynamicForm from '../components/DynamicForm';
import type { BuilderCategory, BuilderField, FieldType, FormType } from '../types';
import { FIELD_TYPE_LABELS, errorMessage } from './labels';

interface EditorState {
  mode: 'add' | 'edit';
  id?: number;
  name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  section: string;
  placeholder: string;
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
  field_type: 'text',
  is_required: false,
  section: '',
  placeholder: '',
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
  text: 'Texte court (ex : Immatriculation, Marque)',
  textarea: 'Paragraphe (ex : Circonstances, Description)',
  number: 'Nombre / Montant (ex : Puissance fiscale, Valeur)',
  date: 'Date (ex : Date de naissance, Date du sinistre)',
  select: 'Liste déroulante (Choix unique)',
  multiselect: 'Cases à cocher (Choix multiples)',
  checkbox: 'Case unique (Attestation, Accord)',
  file: 'Pièce jointe / Fichier (PDF, image)',
};

export default function FormBuilderPage() {
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

  // Ajout / renommage de catégorie
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<BuilderCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Rechargement des catégories
  const loadCategories = useCallback(async () => {
    try {
      const data = await getBuilderCategories();
      setCategories(data);
      if (selectedId === null && data.length > 0) {
        // Sélectionne par défaut la catégorie la plus pertinente
        const defaultCat = formType === 'claim'
          ? data.find((c) => c.slug === 'sinistre') ?? data[0]
          : data.find((c) => c.slug !== 'sinistre') ?? data[0];
        setSelectedId(defaultCat.id);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [formType, selectedId]);

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
    getBuilderCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        if (data.length > 0) {
          const defaultCat = formType === 'claim'
            ? data.find((c) => c.slug === 'sinistre') ?? data[0]
            : data.find((c) => c.slug !== 'sinistre') ?? data[0];
          setSelectedId(defaultCat.id);
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
    const groups: { name: string; fields: BuilderField[] }[] = [];
    const fieldsToProcess = showInactive ? fields : fields.filter((f) => f.is_active);

    fieldsToProcess.forEach((field) => {
      const secName = field.section?.trim() || 'Général';
      let group = groups.find((g) => g.name === secName);
      if (!group) {
        group = { name: secName, fields: [] };
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
    }
    setEditor(null);
    setNotice('');
  };

  const changeFormType = (type: FormType) => {
    if (type !== formType) {
      setFormType(type);
      setFields([]);
      // Bascule automatique vers une catégorie appropriée si besoin
      if (type === 'claim') {
        const claimCat = categories.find((c) => c.slug === 'sinistre') ?? categories[0];
        if (claimCat) setSelectedId(claimCat.id);
      } else {
        const quoteCat = categories.find((c) => c.slug !== 'sinistre') ?? categories[0];
        if (quoteCat) setSelectedId(quoteCat.id);
      }
    }
    setEditor(null);
    setNotice('');
  };

  // Ajout d'une nouvelle catégorie
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      const created = await createBuilderCategory(name);
      setNewCategoryName('');
      await loadCategories();
      setSelectedId(created.id);
      setNotice(`Catégorie "${created.name}" créée et activée.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Renommage d'une catégorie
  const handleUpdateCategoryName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const name = editCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      await updateBuilderCategory(editingCategory.id, { name });
      setEditingCategory(null);
      await loadCategories();
      setNotice('Catégorie renommée avec succès.');
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
          ? `Catégorie "${category.name}" désactivée sur le site public.`
          : `Catégorie "${category.name}" activée sur le site public.`
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
      field_type: field.field_type,
      is_required: field.is_required,
      section: field.section ?? '',
      placeholder: field.placeholder ?? '',
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
      setError('Le libellé de la question est obligatoire.');
      return;
    }
    if (!finalName) {
      setError("L'identifiant technique est obligatoire.");
      return;
    }

    const condition =
      editor.useCondition && editor.condition_field.trim() && editor.condition_equals.trim()
        ? { field: editor.condition_field.trim(), equals: editor.condition_equals.trim() }
        : null;

    const payload = {
      label: trimmedLabel,
      field_type: editor.field_type,
      is_required: editor.is_required,
      section: editor.section.trim() || null,
      placeholder: editor.placeholder.trim() || null,
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
        setNotice(`Question "${trimmedLabel}" ajoutée.`);
      } else {
        await updateBuilderField(editor.id as number, payload);
        setNotice(`Question "${trimmedLabel}" mise à jour.`);
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

    // Échange les deux questions dans la liste globale
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

    // Conserve les champs inactifs qui ne sont pas dans newGroups si showInactive est false
    const missingIds = fields
      .map((f) => f.id)
      .filter((id) => !reorderedFieldIds.includes(id));
    const allIds = [...reorderedFieldIds, ...missingIds];

    try {
      await reorderBuilderFields(selectedId, formType, allIds);
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setNotice('Ordre des étapes mis à jour.');
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
          ? `Question "${field.label}" désactivée.`
          : `Question "${field.label}" réactivée.`
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Désactiver / retirer une question
  const handleDeactivate = async (field: BuilderField) => {
    if (!window.confirm(`Voulez-vous retirer la question "${field.label}" ?`)) return;
    if (selectedId === null) return;
    setError('');
    try {
      await deleteBuilderField(field.id);
      await loadFields(selectedId, formType);
      setPreviewRefreshKey((k) => k + 1);
      setNotice(`Question "${field.label}" désactivée (historique préservé).`);
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

  // Suggestions d'options si le champ déclencheur a des options
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
          <h1>Constructeur de formulaires</h1>
          <p className="builder-header-desc">
            Créez, modifiez et ordonnez les questions des formulaires clients en direct.
          </p>
        </div>

        <div className="builder-header-controls">
          {/* Bascule Devis vs Sinistres */}
          <div className="builder-type-pill">
            <button
              type="button"
              className={formType === 'quote' ? 'active' : ''}
              onClick={() => changeFormType('quote')}
            >
              📄 Demandes de devis
            </button>
            <button
              type="button"
              className={formType === 'claim' ? 'active' : ''}
              onClick={() => changeFormType('claim')}
            >
              🚨 Déclarations de sinistres
            </button>
          </div>

          {/* Bascule Mode Éditeur vs Aperçu en direct */}
          <div className="builder-view-toggle">
            <button
              type="button"
              className={viewMode === 'editor' ? 'active' : ''}
              onClick={() => setViewMode('editor')}
              title="Modifier les sections et les questions"
            >
              <Sliders size={16} /> Mode Éditeur
            </button>
            <button
              type="button"
              className={viewMode === 'preview' ? 'active' : ''}
              onClick={() => setViewMode('preview')}
              title="Tester le rendu en temps réel comme le verra le client"
            >
              <Eye size={16} /> Aperçu en direct
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

      {loading && <p className="center">Chargement des catégories…</p>}

      {!loading && (
        <div className="builder-grid">
          {/* Colonne latérale : Catégories */}
          <aside className="builder-sidebar">
            <div className="builder-sidebar-header">
              <h2>
                <Layers size={18} /> Catégories
              </h2>
              <span className="badge-count">{categories.length}</span>
            </div>

            <ul className="builder-category-list">
              {categories.map((cat) => {
                const count = formType === 'quote' ? cat.quote_count : cat.claim_count;
                const isSelected = cat.id === selectedId;

                return (
                  <li key={cat.id} className={`builder-cat-item ${isSelected ? 'selected' : ''}`}>
                    <div className="builder-cat-main" onClick={() => selectCategory(cat.id)}>
                      <div className="builder-cat-title-row">
                        <span className="builder-cat-name">{cat.name}</span>
                        <span className={`cat-status-dot ${cat.is_active ? 'active' : 'inactive'}`} />
                      </div>
                      <div className="builder-cat-sub">
                        <span>
                          {count} question{count > 1 ? 's' : ''} ({formType === 'quote' ? 'devis' : 'sinistre'})
                        </span>
                      </div>
                    </div>

                    <div className="builder-cat-actions">
                      <button
                        type="button"
                        className="cat-btn-icon"
                        title="Renommer la catégorie"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat);
                          setEditCategoryName(cat.name);
                        }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <label className="switch" title={cat.is_active ? 'Désactiver la catégorie' : 'Activer la catégorie'}>
                        <input
                          type="checkbox"
                          checked={cat.is_active}
                          onChange={() => toggleCategoryActive(cat)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Formulaire ajout de catégorie */}
            <form onSubmit={handleAddCategory} className="builder-cat-add-form">
              <input
                type="text"
                placeholder="Nouvelle catégorie (ex : Santé)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit" className="btn btn-sm">
                <Plus size={14} /> Ajouter
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
                      {selectedCategory.name}
                      <span className={`badge ${selectedCategory.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {selectedCategory.is_active ? 'Active sur le site' : 'Désactivée'}
                      </span>
                    </h2>
                    <p className="builder-active-meta">
                      Formulaire {formType === 'quote' ? 'de demande de devis' : 'de déclaration de sinistre'} ·{' '}
                      {fields.length} question{fields.length > 1 ? 's' : ''} au total
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
                          Voir inactives ({fields.filter((f) => !f.is_active).length})
                        </label>

                        <button type="button" className="btn" onClick={() => openAdd()}>
                          <Plus size={16} /> Ajouter une question
                        </button>
                      </>
                    )}

                    {viewMode === 'preview' && (
                      <div className="preview-controls">
                        <button
                          type="button"
                          className={`btn-device ${previewDevice === 'desktop' ? 'active' : ''}`}
                          onClick={() => setPreviewDevice('desktop')}
                          title="Format Ordinateur"
                        >
                          <Monitor size={16} /> Ordinateur
                        </button>
                        <button
                          type="button"
                          className={`btn-device ${previewDevice === 'mobile' ? 'active' : ''}`}
                          onClick={() => setPreviewDevice('mobile')}
                          title="Format Smartphone"
                        >
                          <Smartphone size={16} /> Mobile
                        </button>
                        <button
                          type="button"
                          className="btn-refresh"
                          onClick={() => setPreviewRefreshKey((k) => k + 1)}
                          title="Réinitialiser l'aperçu"
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
                      <span>👁️ Mode interactif : testez le parcours utilisateur en temps réel.</span>
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
                    {loadingFields && <p className="center">Chargement des questions…</p>}

                    {!loadingFields && sectionGroups.length === 0 && (
                      <div className="builder-empty-state">
                        <p>Aucune question configurée pour ce formulaire.</p>
                        <button type="button" className="btn" onClick={() => openAdd('Informations')}>
                          <Plus size={16} /> Créer la première question
                        </button>
                      </div>
                    )}

                    {!loadingFields &&
                      sectionGroups.map((group, secIdx) => (
                        <div key={group.name} className="builder-section-card">
                          <div className="builder-section-card-header">
                            <div className="builder-section-title-wrap">
                              <span className="step-badge">Étape {secIdx + 1}</span>
                              <h3>{group.name}</h3>
                              <span className="section-count">
                                {group.fields.length} question{group.fields.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="builder-section-header-actions">
                              <button
                                type="button"
                                className="btn-icon"
                                title="Monter cette étape"
                                disabled={secIdx === 0}
                                onClick={() => moveSection(secIdx, -1)}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Descendre cette étape"
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
                                <Plus size={14} /> Ajouter dans cette étape
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
                                        title="Monter la question"
                                      >
                                        <ArrowUp size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-order"
                                        disabled={fieldIdx === group.fields.length - 1}
                                        onClick={() => moveFieldWithinSection(group.name, fieldIdx, 1)}
                                        title="Descendre la question"
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
                                          {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                                        </span>

                                        <span className={`req-tag ${field.is_required ? 'required' : 'optional'}`}>
                                          {field.is_required ? '● Obligatoire' : '○ Facultatif'}
                                        </span>

                                        {isConditional && (
                                          <span className="cond-tag" title={`Affiché si ${field.condition?.field} = ${field.condition?.equals}`}>
                                            ⚡ Si [{field.condition?.field}] = "{field.condition?.equals}"
                                          </span>
                                        )}

                                        {!field.is_active && <span className="inactive-tag">Inactif</span>}
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
                                        title="Modifier cette question"
                                      >
                                        <Edit3 size={15} /> Modifier
                                      </button>

                                      <button
                                        type="button"
                                        className={`btn-action toggle ${field.is_active ? 'active' : 'inactive'}`}
                                        onClick={() => toggleFieldActive(field)}
                                        title={field.is_active ? 'Désactiver la question' : 'Réactiver la question'}
                                      >
                                        {field.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn-action delete"
                                        onClick={() => handleDeactivate(field)}
                                        title="Retirer cette question"
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
                        <Plus size={16} /> Ajouter une nouvelle étape / section
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="center">Sélectionnez une catégorie à gauche pour commencer.</p>
            )}
          </main>
        </div>
      )}

      {/* MODALE RENOMMER CATÉGORIE */}
      {editingCategory && (
        <div className="builder-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <div className="builder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="builder-modal-header">
              <h3>Renommer la catégorie</h3>
              <button type="button" className="close-btn" onClick={() => setEditingCategory(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateCategoryName}>
              <div className="field">
                <label htmlFor="cat-edit-name">Nom de la catégorie</label>
                <input
                  id="cat-edit-name"
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>
              <div className="builder-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCategory(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn">
                  Enregistrer
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
              <h3>{editor.mode === 'add' ? 'Ajouter une question' : 'Modifier la question'}</h3>
              <button type="button" className="close-btn" onClick={() => setEditor(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEditor} className="builder-modal-form">
              {/* Libellé */}
              <div className="field">
                <label htmlFor="f-label">
                  Libellé de la question <span className="req">*</span>
                </label>
                <input
                  id="f-label"
                  type="text"
                  required
                  placeholder="Ex : Numéro d'immatriculation du véhicule"
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

              {/* Identifiant technique */}
              <div className="field">
                <div className="field-title-flex">
                  <label htmlFor="f-name">
                    Identifiant technique (clé en base) <span className="req">*</span>
                  </label>
                  {editor.mode === 'add' && (
                    <label className="choice mini-choice">
                      <input
                        type="checkbox"
                        checked={editor.autoSlug}
                        onChange={(e) => setEditor({ ...editor, autoSlug: e.target.checked })}
                      />
                      Générer auto
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
                    L'identifiant est verrouillé pour garantir la cohérence des dossiers déjà reçus.
                  </small>
                )}
              </div>

              {/* Type de réponse et Section */}
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="f-type">Type de réponse attendu</label>
                  <select
                    id="f-type"
                    value={editor.field_type}
                    onChange={(e) =>
                      setEditor({ ...editor, field_type: e.target.value as FieldType })
                    }
                  >
                    {Object.entries(FIELD_TYPE_DESCRIPTIONS).map(([type, desc]) => (
                      <option key={type} value={type}>
                        {FIELD_TYPE_LABELS[type]} — {desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="f-section">Section (Étape)</label>
                  <input
                    id="f-section"
                    type="text"
                    list="existing-sections-list"
                    placeholder="Ex : Votre sinistre"
                    value={editor.section}
                    onChange={(e) => setEditor({ ...editor, section: e.target.value })}
                  />
                  <datalist id="existing-sections-list">
                    {existingSections.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Placeholder et Obligatoire */}
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="f-placeholder">Texte d'aide (placeholder)</label>
                  <input
                    id="f-placeholder"
                    type="text"
                    placeholder="Ex : AA-123-BB ou format attendu"
                    value={editor.placeholder}
                    onChange={(e) => setEditor({ ...editor, placeholder: e.target.value })}
                  />
                </div>

                <div className="field flex-align-end">
                  <label className="choice big-toggle">
                    <input
                      type="checkbox"
                      checked={editor.is_required}
                      onChange={(e) => setEditor({ ...editor, is_required: e.target.checked })}
                    />
                    <span>Cette question est obligatoire</span>
                  </label>
                </div>
              </div>

              {/* Gestionnaire d'options pour select ou multiselect */}
              {needsOptions && (
                <div className="field-group-box">
                  <h4>Choix disponibles pour cette question</h4>
                  <div className="chip-input-wrap">
                    <input
                      type="text"
                      placeholder="Saisissez un choix puis appuyez sur Entrée"
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
                      Ajouter
                    </button>
                  </div>

                  <div className="chips-container">
                    {editor.optionsList.length === 0 ? (
                      <p className="help-text">Aucun choix pour l'instant. Ajoutez au moins une option.</p>
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
                  <h4>Règle conditionnelle (Affichage dynamique)</h4>
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
                    Activer une condition
                  </label>
                </div>

                {editor.useCondition && (
                  <div className="condition-builder-grid">
                    <div className="field">
                      <label htmlFor="cond-trigger">Afficher cette question si</label>
                      <select
                        id="cond-trigger"
                        value={editor.condition_field}
                        onChange={(e) =>
                          setEditor({ ...editor, condition_field: e.target.value })
                        }
                      >
                        <option value="">-- Choisir la question déclencheuse --</option>
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
                      <label htmlFor="cond-val">A pour réponse exacte</label>
                      {triggerFieldOptions && triggerFieldOptions.length > 0 ? (
                        <select
                          id="cond-val"
                          value={editor.condition_equals}
                          onChange={(e) =>
                            setEditor({ ...editor, condition_equals: e.target.value })
                          }
                        >
                          <option value="">-- Choisir l'option --</option>
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
                          placeholder="Ex : Oui ou valeur exacte"
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
                  Annuler
                </button>
                <button type="submit" className="btn">
                  {editor.mode === 'add' ? 'Créer la question' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
