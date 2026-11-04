import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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
import type { BuilderCategory, BuilderField, FieldType, FormType } from '../types';
import { FIELD_TYPES, FIELD_TYPE_LABELS, errorMessage } from './labels';

interface EditorState {
  mode: 'add' | 'edit';
  id?: number;
  name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  section: string;
  placeholder: string;
  options: string;
  condition_field: string;
  condition_equals: string;
}

const EMPTY_EDITOR: EditorState = {
  mode: 'add',
  name: '',
  label: '',
  field_type: 'text',
  is_required: false,
  section: '',
  placeholder: '',
  options: '',
  condition_field: '',
  condition_equals: '',
};

export default function FormBuilderPage() {
  const [categories, setCategories] = useState<BuilderCategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formType, setFormType] = useState<FormType>('quote');
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Rechargements déclenchés par les boutons (ajout, activation, etc.)
  const loadCategories = useCallback(async () => {
    setCategories(await getBuilderCategories());
  }, []);

  const loadFields = useCallback(async (categoryId: number, type: FormType) => {
    setFields(await getBuilderFields(categoryId, type));
  }, []);

  // Chargement initial des catégories
  useEffect(() => {
    let cancelled = false;

    getBuilderCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
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
  }, []);

  // Chargement des questions quand la catégorie ou l'onglet change
  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;

    getBuilderFields(selectedId, formType)
      .then((data) => {
        if (!cancelled) setFields(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, formType]);

  const selected = categories.find((category) => category.id === selectedId) ?? null;

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
    }
    setEditor(null);
  };

  const handleAddCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      await createBuilderCategory(name);
      setNewCategoryName('');
      await loadCategories();
      setNotice('Catégorie ajoutée.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleCategoryActive = async (category: BuilderCategory) => {
    setError('');
    try {
      await updateBuilderCategory(category.id, { is_active: !category.is_active });
      await loadCategories();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openAdd = () => setEditor({ ...EMPTY_EDITOR, mode: 'add' });

  const openEdit = (field: BuilderField) =>
    setEditor({
      mode: 'edit',
      id: field.id,
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      section: field.section ?? '',
      placeholder: field.placeholder ?? '',
      options: field.options?.join('\n') ?? '',
      condition_field: field.condition?.field ?? '',
      condition_equals: field.condition?.equals ?? '',
    });

  const saveEditor = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || selectedId === null) return;
    setError('');
    setNotice('');

    const options = editor.options.split('\n').map((o) => o.trim()).filter(Boolean);
    const condition =
      editor.condition_field.trim() && editor.condition_equals.trim()
        ? { field: editor.condition_field.trim(), equals: editor.condition_equals.trim() }
        : null;

    const payload = {
      label: editor.label.trim(),
      field_type: editor.field_type,
      is_required: editor.is_required,
      section: editor.section.trim() || null,
      placeholder: editor.placeholder.trim() || null,
      options: options.length > 0 ? options : null,
      condition,
    };

    try {
      if (editor.mode === 'add') {
        await createBuilderField(selectedId, { ...payload, name: editor.name.trim(), form_type: formType });
        setNotice('Question ajoutée.');
      } else {
        await updateBuilderField(editor.id as number, payload);
        setNotice('Question modifiée.');
      }
      await loadFields(selectedId, formType);
      setEditor(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const moveField = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length || selectedId === null) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    setError('');
    try {
      await reorderBuilderFields(selectedId, formType, next.map((f) => f.id));
    } catch (err) {
      setError(errorMessage(err));
      await loadFields(selectedId, formType);
    }
  };

  const toggleFieldActive = async (field: BuilderField) => {
    if (selectedId === null) return;
    setError('');
    try {
      await updateBuilderField(field.id, { is_active: !field.is_active });
      await loadFields(selectedId, formType);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deactivateField = async (field: BuilderField) => {
    if (selectedId === null) return;
    setError('');
    try {
      await deleteBuilderField(field.id);
      await loadFields(selectedId, formType);
      setNotice('Question désactivée.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const needsOptions = editor && (editor.field_type === 'select' || editor.field_type === 'multiselect');

  return (
    <>
      <h1>Constructeur de formulaires</h1>
      <p className="count">Modifiez les catégories et leurs questions sans toucher au code.</p>

      {loading && <p role="status">Chargement…</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {!loading && (
        <div className="builder-layout">
          <aside className="builder-categories">
            <h2>Catégories</h2>
            <ul>
              {categories.map((category) => (
                <li key={category.id} className={category.id === selectedId ? 'active' : ''}>
                  <button type="button" onClick={() => selectCategory(category.id)}>
                    <span>{category.name}</span>
                    <small>
                      {category.quote_count} devis · {category.claim_count} sinistres
                    </small>
                  </button>
                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={category.is_active}
                      onChange={() => toggleCategoryActive(category)}
                    />
                    Active
                  </label>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddCategory} className="builder-add-category">
              <input
                type="text"
                placeholder="Nouvelle catégorie"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
              <button type="submit" className="btn btn-sm">
                Ajouter
              </button>
            </form>
          </aside>

          <section className="builder-fields">
            {selected ? (
              <>
                <div className="builder-toolbar">
                  <h2>{selected.name}</h2>
                  <div className="builder-tabs">
                    <button
                      type="button"
                      className={formType === 'quote' ? 'active' : ''}
                      onClick={() => changeFormType('quote')}
                    >
                      Devis
                    </button>
                    <button
                      type="button"
                      className={formType === 'claim' ? 'active' : ''}
                      onClick={() => changeFormType('claim')}
                    >
                      Sinistre
                    </button>
                  </div>
                  <button type="button" className="btn" onClick={openAdd}>
                    Ajouter une question
                  </button>
                </div>

                {fields.length === 0 ? (
                  <p>Aucune question pour ce formulaire.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Question</th>
                        <th scope="col">Type</th>
                        <th scope="col">Oblig.</th>
                        <th scope="col">Section</th>
                        <th scope="col">Active</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className={field.is_active ? '' : 'muted'}>
                          <td>{index + 1}</td>
                          <td>
                            {field.label} <small>({field.name})</small>
                          </td>
                          <td>{FIELD_TYPE_LABELS[field.field_type]}</td>
                          <td>{field.is_required ? 'Oui' : 'Non'}</td>
                          <td>{field.section ?? '—'}</td>
                          <td>{field.is_active ? 'Oui' : 'Non'}</td>
                          <td>
                            <div className="builder-actions">
                              <button type="button" disabled={index === 0} onClick={() => moveField(index, -1)}>
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={index === fields.length - 1}
                                onClick={() => moveField(index, 1)}
                              >
                                ↓
                              </button>
                              <button type="button" onClick={() => openEdit(field)}>
                                Éditer
                              </button>
                              <button type="button" onClick={() => toggleFieldActive(field)}>
                                {field.is_active ? 'Désactiver' : 'Activer'}
                              </button>
                              <button type="button" onClick={() => deactivateField(field)}>
                                Retirer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {editor && (
                  <form className="builder-editor" onSubmit={saveEditor}>
                    <h3>{editor.mode === 'add' ? 'Nouvelle question' : 'Modifier la question'}</h3>

                    <div className="field">
                      <label htmlFor="f-label">Libellé *</label>
                      <input
                        id="f-label"
                        type="text"
                        required
                        value={editor.label}
                        onChange={(e) => setEditor({ ...editor, label: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="f-name">
                        Identifiant technique * {editor.mode === 'edit' && '(non modifiable)'}
                      </label>
                      <input
                        id="f-name"
                        type="text"
                        required
                        disabled={editor.mode === 'edit'}
                        value={editor.name}
                        onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="f-type">Type de champ</label>
                      <select
                        id="f-type"
                        value={editor.field_type}
                        onChange={(e) => setEditor({ ...editor, field_type: e.target.value as FieldType })}
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="choice">
                        <input
                          type="checkbox"
                          checked={editor.is_required}
                          onChange={(e) => setEditor({ ...editor, is_required: e.target.checked })}
                        />
                        Question obligatoire
                      </label>
                    </div>

                    <div className="field">
                      <label htmlFor="f-section">Section (étape)</label>
                      <input
                        id="f-section"
                        type="text"
                        placeholder="Ex : Identification"
                        value={editor.section}
                        onChange={(e) => setEditor({ ...editor, section: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="f-placeholder">Exemple (placeholder)</label>
                      <input
                        id="f-placeholder"
                        type="text"
                        value={editor.placeholder}
                        onChange={(e) => setEditor({ ...editor, placeholder: e.target.value })}
                      />
                    </div>

                    {needsOptions && (
                      <div className="field">
                        <label htmlFor="f-options">Choix (un par ligne)</label>
                        <textarea
                          id="f-options"
                          rows={4}
                          value={editor.options}
                          onChange={(e) => setEditor({ ...editor, options: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="builder-condition">
                      <div className="field">
                        <label htmlFor="f-cond-field">Champ condition (nom)</label>
                        <input
                          id="f-cond-field"
                          type="text"
                          value={editor.condition_field}
                          onChange={(e) => setEditor({ ...editor, condition_field: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="f-cond-equals">Afficher si égale à</label>
                        <input
                          id="f-cond-equals"
                          type="text"
                          value={editor.condition_equals}
                          onChange={(e) => setEditor({ ...editor, condition_equals: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="builder-editor-actions">
                      <button type="submit" className="btn">
                        {editor.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditor(null)}>
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <p>Sélectionnez une catégorie pour afficher ses questions.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
