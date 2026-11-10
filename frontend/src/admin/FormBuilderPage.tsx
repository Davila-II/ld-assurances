import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calculator,
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
  getPricingRules,
  reorderBuilderFields,
  testPricingRule,
  updateBuilderCategory,
  updateBuilderField,
  updatePricingRule,
} from '../api';
import DynamicForm from '../components/DynamicForm';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  BuilderCategory,
  BuilderField,
  FieldType,
  FormType,
  PricingDriver,
  PricingRule,
  QuoteCalculation,
} from '../types';
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

function formatFcfa(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0 FCFA';
  if (typeof val === 'string' && val.includes('FCFA')) return val;
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('fr-FR') + ' FCFA';
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

interface PricingParameters {
  accessoires?: number;
  taxe_unique?: number;
  commercial_base?: number;
  commercial_multiplier?: number;
  young_driver_surcharge?: number;
  bonus_no_claims?: number;
  malus_claims_surcharge?: number;
  flat_bris_glace?: number;
  rate_incendie?: number;
  rate_vol?: number;
  rate_tous_risques?: number;
  rates_by_zone?: Record<string, number>;
  rates_construction?: Record<string, number>;
  annexe_appartement?: number;
  annexe_autre?: number;
  medical_surcharge?: number;
  child_flat_rate?: number;
  formula_multipliers?: Record<string, number>;
  // Sinistre Auto
  franchise_vol_rate?: number;
  franchise_fixe_tous_risques?: number;
  franchise_partage_rate?: number;
  franchise_partage_min?: number;
  // Sinistre Habitation
  default_franchise_contractuelle?: number;
  // Sinistre Santé
  taux_couverture_default?: number;
  plafond_annuel_default?: number;
  capital_base_cima_ipp?: number;
  // Sinistre RC
  franchise_rc_assure?: number;
  // Sinistre Professionnelle
  taux_marge_brute_default?: number;
  franchise_jours?: number;
  jours_par_mois?: number;
  // Sinistre Voyage
  dts_par_kg_fcfa?: number;
  franchise_marchandises_rate?: number;
  // Sinistre Agricole
  franchise_indicielle_rate?: number;
  prix_marche_defaut?: number;
  rendement_moyen_defaut?: number;
  // Sinistre Autres
  plafond_indemnisation_defaut?: number;
  franchise_defaut?: number;
  [key: string]: unknown;
}

interface PricingTestInputs {
  puissance_fiscale?: number;
  usage?: string;
  age_permis?: number;
  historique_sinistres?: number;
  valeur_vehicule?: number;
  zone_destination?: string;
  duree_sejour?: number;
  nbre_personnes?: number;
  travelers_ages?: string;
  age_voyageur?: string | number;
  materiaux_construction?: string;
  type_logement?: string;
  securite_presence?: string;
  capital_mobilier?: number;
  capital_immobilier?: number;
  age_proposant?: number;
  formule_couverture?: string;
  antecedents_medicaux?: string;
  nbre_enfants_charge?: number;
  // Sinistre Auto
  choc_responsabilite?: string;
  type_garantie?: string;
  devis_expert?: number;
  valeur_venale?: number;
  // Sinistre Habitation
  montant_degats_expert?: number;
  valeur_reelle_biens?: number;
  valeur_declaree_contrat?: number;
  franchise_contractuelle?: number;
  // Sinistre Santé
  facture_clinique_agreee?: number;
  taux_couverture?: number;
  plafond_annuel_restant?: number;
  taux_ipp?: number;
  // Sinistre RC
  devis_reparation_tiers?: number;
  // Sinistre Professionnelle
  chiffre_affaires_n_moins_1?: number;
  chiffre_affaires_sinistre?: number;
  taux_marge_brute?: number;
  charges_fixes_permanentes?: number;
  // Sinistre Voyage
  type_transport?: string;
  valeur_facture_marchandise?: number;
  cout_fret?: number;
  poids_perdu_kg?: number;
  // Sinistre Agricole
  superficie_hectares?: number;
  rendement_moyen_historique?: number;
  prix_marquet_cameroun?: number;
  taux_perte_expert?: number;
  // Sinistre Autres
  estimated_value?: number;
  [key: string]: string | number | undefined;
}

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

  // Tarification & Règles de calcul
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [pricingChoice, setPricingChoice] = useState<'existing' | 'new' | 'none'>('existing');
  const [selectedPricingRuleId, setSelectedPricingRuleId] = useState<number | null>(null);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleNameEn, setNewRuleNameEn] = useState('');
  const [newRuleDriver, setNewRuleDriver] = useState<PricingDriver>('automobile');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  // Modale de configuration du calcul de devis
  const [pricingModalCategory, setPricingModalCategory] = useState<BuilderCategory | null>(null);
  const [activePricingRuleId, setActivePricingRuleId] = useState<number | null>(null);
  const [editingParams, setEditingParams] = useState<PricingParameters>({});
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [pricingTab, setPricingTab] = useState<'params' | 'rule' | 'test'>('params');
  const [testInputs, setTestInputs] = useState<PricingTestInputs>({});
  const [testResult, setTestResult] = useState<QuoteCalculation | null>(null);
  const [testing, setTesting] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');

  const loadPricingRules = useCallback(async () => {
    try {
      const data = await getPricingRules();
      setPricingRules(data);
      if (data.length > 0) {
        setSelectedPricingRuleId((prev) => (prev === null ? data[0].id : prev));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (formType !== 'quote') return;
    let cancelled = false;

    getPricingRules()
      .then((data) => {
        if (cancelled) return;
        setPricingRules(data);
        if (data.length > 0) {
          setSelectedPricingRuleId((prev) => (prev === null ? data[0].id : prev));
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [formType]);

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

  // Ajout d'une nouvelle catégorie (avec options de tarification pour les devis)
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    const name_en = newCategoryNameEn.trim();
    if (!name) return;
    setError('');

    const payload: {
      name: string;
      name_en?: string;
      form_type: FormType;
      pricing_rule_id?: number | null;
      new_pricing_rule?: Partial<PricingRule>;
    } = {
      name,
      name_en: name_en || undefined,
      form_type: formType,
    };

    if (formType === 'quote') {
      if (pricingChoice === 'existing' && selectedPricingRuleId) {
        payload.pricing_rule_id = selectedPricingRuleId;
      } else if (pricingChoice === 'new') {
        payload.new_pricing_rule = {
          name: newRuleName.trim() || `Tarification ${name}`,
          name_en: newRuleNameEn.trim() || undefined,
          driver: newRuleDriver,
          description: newRuleDescription.trim() || undefined,
        };
      } else {
        payload.pricing_rule_id = null;
      }
    }

    try {
      const created = await createBuilderCategory(payload);
      setNewCategoryName('');
      setNewCategoryNameEn('');
      setShowAddCategoryModal(false);
      await loadCategories(formType);
      await loadPricingRules();
      setSelectedId(created.id);
      setNotice(t('builder.notice_cat_created', { name: created.name }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Ouverture et gestion de la modale de tarification
  const openPricingModal = (cat: BuilderCategory) => {
    setPricingModalCategory(cat);
    const assignedId = cat.pricing_rule_id ?? (cat.pricing_rule ? cat.pricing_rule.id : null);
    setActivePricingRuleId(assignedId);

    const rule = cat.pricing_rule || pricingRules.find((r) => r.id === assignedId);
    if (rule) {
      setRuleName(rule.name);
      setRuleDescription(rule.description || '');
      const p = rule.parameters ? JSON.parse(JSON.stringify(rule.parameters)) : {};
      setEditingParams(p);
      setRawJsonText(JSON.stringify(p, null, 2));
    } else {
      setRuleName('');
      setRuleDescription('');
      setEditingParams({});
      setRawJsonText('{}');
    }
    setTestInputs({});
    setTestResult(null);
    setPricingTab(assignedId ? 'params' : 'rule');
    setRawJsonMode(false);
  };

  const handleApplyRuleToCategory = async () => {
    if (!pricingModalCategory) return;
    setSavingPricing(true);
    setError('');
    try {
      await updateBuilderCategory(pricingModalCategory.id, {
        pricing_rule_id: activePricingRuleId,
      });
      await loadCategories(formType);
      const rule = pricingRules.find((r) => r.id === activePricingRuleId) || null;
      setPricingModalCategory({
        ...pricingModalCategory,
        pricing_rule_id: activePricingRuleId,
        pricing_rule: rule,
      });
      if (rule) {
        setRuleName(rule.name);
        setRuleDescription(rule.description || '');
        const p = rule.parameters ? JSON.parse(JSON.stringify(rule.parameters)) : {};
        setEditingParams(p);
        setRawJsonText(JSON.stringify(p, null, 2));
      }
      setNotice('Règle de tarification associée avec succès à la catégorie.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveRuleParameters = async () => {
    if (!activePricingRuleId) return;
    setSavingPricing(true);
    setError('');

    let paramsToSave = editingParams;
    if (rawJsonMode) {
      try {
        paramsToSave = JSON.parse(rawJsonText);
        setEditingParams(paramsToSave);
      } catch {
        setError('Le JSON des paramètres est invalide.');
        setSavingPricing(false);
        return;
      }
    }

    try {
      const updated = await updatePricingRule(activePricingRuleId, {
        name: ruleName.trim() || undefined,
        description: ruleDescription.trim() || undefined,
        parameters: paramsToSave,
      });
      await loadPricingRules();
      await loadCategories(formType);
      setNotice(`Paramètres de l'algorithme "${updated.name}" sauvegardés.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingPricing(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!activePricingRuleId) return;
    setTesting(true);
    setError('');
    try {
      let params = editingParams;
      if (rawJsonMode) {
        try {
          params = JSON.parse(rawJsonText);
        } catch {
          // ignore
        }
      }
      const res = await testPricingRule(activePricingRuleId, {
        answers: testInputs,
        parameters: params,
      });
      if ('prime_ttc' in res) {
        setTestResult(res as QuoteCalculation);
      } else {
        setTestResult(null);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTesting(false);
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
                        className="cat-btn-icon"
                        title={formType === 'claim' ? 'Paramétrer le calcul d\'indemnisation CIMA' : 'Paramétrer le calcul de prime'}
                        style={{ color: cat.pricing_rule ? (formType === 'claim' ? '#0f766e' : '#0284c7') : '#64748b' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPricingModal(cat);
                        }}
                      >
                        <Calculator size={14} />
                      </button>

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

            {/* Bouton d'ajout de catégorie (ouvre la modale responsive) */}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => {
                setNewCategoryName('');
                setNewCategoryNameEn('');
                setPricingChoice(formType === 'quote' ? 'existing' : 'none');
                setShowAddCategoryModal(true);
              }}
            >
              <Plus size={14} /> {formType === 'quote' ? 'Nouvelle catégorie de devis' : 'Nouvelle catégorie de sinistre'}
            </button>
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
                      <span
                        className={`badge ${selectedCategory.pricing_rule ? (formType === 'claim' ? 'badge-success' : 'badge-info') : 'badge-neutral'}`}
                        style={{ cursor: 'pointer', marginLeft: '6px' }}
                        onClick={() => openPricingModal(selectedCategory)}
                        title={formType === 'claim' ? 'Cliquez pour configurer le calcul d\'indemnisation' : 'Cliquez pour configurer le calcul de prime'}
                      >
                        {selectedCategory.pricing_rule
                          ? (formType === 'claim' ? `Indemnisation : ${selectedCategory.pricing_rule.name}` : `Calcul : ${selectedCategory.pricing_rule.name}`)
                          : (formType === 'claim' ? 'Indemnisation manuelle' : 'Calcul manuel')}
                      </span>
                    </h2>
                    <p className="builder-active-meta">
                      {formType === 'quote' ? t('builder.quotes_tab') : t('builder.claims_tab')} ·{' '}
                      {fields.length} question{fields.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="builder-active-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openPricingModal(selectedCategory)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Calculator size={15} style={{ color: formType === 'claim' ? '#0f766e' : '#0284c7' }} />
                      {formType === 'claim' ? 'Indemnisation & Calcul' : 'Tarification & Calcul'}
                    </button>
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
                          <Monitor size={16} /> <span>{t('builder.device_desktop')}</span>
                        </button>
                        <button
                          type="button"
                          className={`btn-device ${previewDevice === 'mobile' ? 'active' : ''}`}
                          onClick={() => setPreviewDevice('mobile')}
                          title={t('builder.device_mobile')}
                        >
                          <Smartphone size={16} /> <span>{t('builder.device_mobile')}</span>
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
                                <Plus size={14} /> <span>{t('builder.add_in_this_step')}</span>
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
                                        <Edit3 size={15} /> <span>{t('builder.edit_btn')}</span>
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

      {/* MODALE D'AJOUT DE CATÉGORIE (AVEC 3 CHOIX DE TARIFICATION) */}
      {showAddCategoryModal && (
        <div className="builder-modal-backdrop" onClick={() => setShowAddCategoryModal(false)}>
          <div className="builder-modal builder-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="builder-modal-header">
              <h3>{formType === 'quote' ? 'Nouvelle catégorie de devis' : 'Nouvelle catégorie'}</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="builder-modal-form">
              <div className="grid-2-col">
                <div className="field">
                  <label htmlFor="modal-cat-name">
                    Nom de la catégorie (FR) <span className="req">*</span>
                  </label>
                  <input
                    id="modal-cat-name"
                    type="text"
                    required
                    placeholder="Ex: Assurance Flotte Automobile"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="modal-cat-name-en">Nom en anglais (EN)</label>
                  <input
                    id="modal-cat-name-en"
                    type="text"
                    placeholder="Ex: Motor Fleet Insurance"
                    value={newCategoryNameEn}
                    onChange={(e) => setNewCategoryNameEn(e.target.value)}
                  />
                </div>
              </div>

              {formType === 'quote' && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block', marginBottom: '12px', color: '#0f172a' }}>
                    Choix du mode de calcul de la prime :
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Option 1: Calcul existant */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${pricingChoice === 'existing' ? '#0284c7' : '#cbd5e1'}`,
                        background: pricingChoice === 'existing' ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="pricingChoice"
                        value="existing"
                        checked={pricingChoice === 'existing'}
                        onChange={() => setPricingChoice('existing')}
                        style={{ marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#0f172a' }}>1. Utiliser un calcul existant</strong>
                        <p style={{ margin: '2px 0 8px', fontSize: '0.85rem', color: '#64748b' }}>
                          Sélectionnez parmi les algorithmes CIMA et formules déjà configurés dans LD Assurances.
                        </p>
                        {pricingChoice === 'existing' && (
                          <select
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            value={selectedPricingRuleId ?? ''}
                            onChange={(e) => setSelectedPricingRuleId(Number(e.target.value) || null)}
                          >
                            {pricingRules.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.driver.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>

                    {/* Option 2: Nouveau calcul */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${pricingChoice === 'new' ? '#0284c7' : '#cbd5e1'}`,
                        background: pricingChoice === 'new' ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="pricingChoice"
                        value="new"
                        checked={pricingChoice === 'new'}
                        onChange={() => setPricingChoice('new')}
                        style={{ marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#0f172a' }}>2. Entrer un nouveau calcul (personnalisé)</strong>
                        <p style={{ margin: '2px 0 8px', fontSize: '0.85rem', color: '#64748b' }}>
                          Créer une nouvelle règle de calcul spécifique avec son propre barème ou sa base algorithmique.
                        </p>
                        {pricingChoice === 'new' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            <div className="grid-2-col">
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Nom du calcul (FR)</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Tarification Flotte Entreprise"
                                  value={newRuleName}
                                  onChange={(e) => setNewRuleName(e.target.value)}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Nom du calcul (EN, optionnel)</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Fleet Business Pricing"
                                  value={newRuleNameEn}
                                  onChange={(e) => setNewRuleNameEn(e.target.value)}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Moteur algorithmique de base</label>
                                <select
                                  value={newRuleDriver}
                                  onChange={(e) => setNewRuleDriver(e.target.value as PricingDriver)}
                                >
                                  <option value="automobile">Automobile (Grille CIMA + Véhicule)</option>
                                  <option value="voyage">Voyage (Zone géographique + Âge + Durée)</option>
                                  <option value="habitation">Habitation (Matériaux + Sécurité)</option>
                                  <option value="sante">Santé (Tranches d'âge + Formule)</option>
                                  <option value="professionnelle">Professionnelle (Secteur + Risque)</option>
                                  <option value="responsabilite_civile">Responsabilité Civile (Famille / Pro)</option>
                                  <option value="autres">Autres assurances (Forfaits / Taux)</option>
                                  <option value="custom">Calcul personnalisé (Formule sur mesure)</option>
                                  <optgroup label="── Sinistres & Indemnisation ──">
                                    <option value="sinistre_auto">Sinistre Auto (Convention IDA &amp; CIMA)</option>
                                    <option value="sinistre_habitation">Sinistre Habitation (Art. 32 CIMA)</option>
                                    <option value="sinistre_sante">Sinistre Santé &amp; Corporel (Barème CIMA)</option>
                                    <option value="sinistre_rc">Sinistre Responsabilité Civile (CIMA)</option>
                                    <option value="sinistre_professionnelle">Sinistre Entreprise (OHADA)</option>
                                    <option value="sinistre_voyage">Sinistre Transport &amp; Voyage (DTS)</option>
                                    <option value="sinistre_agricole">Sinistre Agricole (Indicielle)</option>
                                    <option value="sinistre_autres">Sinistre Autres Risques</option>
                                  </optgroup>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#475569' }}>Description (facultative)</label>
                              <input
                                type="text"
                                placeholder="Description succincte des règles appliquées..."
                                value={newRuleDescription}
                                onChange={(e) => setNewRuleDescription(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 3: Aucun calcul */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${pricingChoice === 'none' ? '#0284c7' : '#cbd5e1'}`,
                        background: pricingChoice === 'none' ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="pricingChoice"
                        value="none"
                        checked={pricingChoice === 'none'}
                        onChange={() => setPricingChoice('none')}
                        style={{ marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#0f172a' }}>3. Aucun calcul automatique</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Évaluation manuelle par l'équipe LD Assurances sans chiffrage temps réel lors de la soumission.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="builder-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategoryModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer la catégorie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIGURATION, PARAMÉTRAGE ET TEST DU CALCUL DE PRIME */}
      {pricingModalCategory && (
        <div className="builder-modal-backdrop" onClick={() => setPricingModalCategory(null)}>
          <div className="builder-modal builder-modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="builder-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={20} style={{ color: pricingModalCategory.form_type === 'claim' ? '#0f766e' : '#0284c7' }} />
                  {pricingModalCategory.form_type === 'claim' ? 'Indemnisation & Calcul' : 'Tarification & Calcul'} — {pricingModalCategory.name}
                </h3>
                <small style={{ color: '#64748b' }}>
                  {pricingModalCategory.form_type === 'claim'
                    ? "Configuration des algorithmes d'indemnisation CIMA et simulation en temps réel pour ce type de sinistre."
                    : 'Configuration des algorithmes CIMA et simulation en temps réel pour cette catégorie.'}
                </small>
              </div>
              <button type="button" className="close-btn" onClick={() => setPricingModalCategory(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Onglets */}
            <div className="pricing-tabs-header">
              <button
                type="button"
                className={`pricing-tab-btn ${pricingTab === 'params' ? 'active' : ''}`}
                onClick={() => setPricingTab('params')}
              >
                <Sliders size={16} /> Barèmes & Paramètres
              </button>
              <button
                type="button"
                className={`pricing-tab-btn ${pricingTab === 'rule' ? 'active' : ''}`}
                onClick={() => setPricingTab('rule')}
              >
                <Layers size={16} /> Changer d'algorithme
              </button>
              <button
                type="button"
                className={`pricing-tab-btn ${pricingTab === 'test' ? 'active' : ''}`}
                onClick={() => setPricingTab('test')}
              >
                <Sparkles size={16} /> Testeur en direct
              </button>
            </div>

            {/* Contenu Onglet 1: Paramètres de l'algorithme */}
            {pricingTab === 'params' && (
              <div>
                {activePricingRuleId ? (
                  <div>
                    <div className="grid-2-col" style={{ marginBottom: '14px' }}>
                      <div className="pricing-field">
                        <label>Nom de la règle</label>
                        <input
                          type="text"
                          value={ruleName}
                          onChange={(e) => setRuleName(e.target.value)}
                        />
                      </div>
                      <div className="pricing-field">
                        <label>Description</label>
                        <input
                          type="text"
                          value={ruleDescription}
                          onChange={(e) => setRuleDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Paramètres fiscaux et généraux — uniquement pour tarification (non sinistre) */}
                    {!pricingRules.find((r) => r.id === activePricingRuleId)?.driver?.startsWith('sinistre_') && (
                    <div className="pricing-params-group">
                      <h4>Frais & Fiscalité Cameroun (Code CIMA)</h4>
                      <div className="pricing-grid-3">
                        <div className="pricing-field">
                          <label>Accessoires / Frais de dossier (FCFA)</label>
                          <input
                            type="number"
                            value={editingParams.accessoires ?? 5000}
                            onChange={(e) =>
                              setEditingParams({ ...editingParams, accessoires: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div className="pricing-field">
                          <label>Taxe Unique sur les primes (ex: 0.15 pour 15%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingParams.taxe_unique ?? 0.15}
                            onChange={(e) =>
                              setEditingParams({ ...editingParams, taxe_unique: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Paramètres selon le driver */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'automobile' && (
                      <div className="pricing-params-group">
                        <h4>Grille Automobile & Risques Conducteur</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Base RC Commercial (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.commercial_base ?? 45000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, commercial_base: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Multiplicateur Taxi / Transport</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingParams.commercial_multiplier ?? 2.5}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, commercial_multiplier: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Surprime Jeune Conducteur (&lt; 2 ans)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.young_driver_surcharge ?? 0.20}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, young_driver_surcharge: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Bonus 0 Sinistre (ex: 0.10 pour -10%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.bonus_no_claims ?? 0.10}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, bonus_no_claims: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Malus &gt; 2 Sinistres (ex: 0.40 pour +40%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.malus_claims_surcharge ?? 0.40}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, malus_claims_surcharge: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Forfait Bris de Glace (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.flat_bris_glace ?? 15000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, flat_bris_glace: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux Garantie Incendie (ex: 0.005 pour 0.5%)</label>
                            <input
                              type="number"
                              step="0.001"
                              value={editingParams.rate_incendie ?? 0.005}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, rate_incendie: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux Garantie Vol (ex: 0.01 pour 1%)</label>
                            <input
                              type="number"
                              step="0.001"
                              value={editingParams.rate_vol ?? 0.01}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, rate_vol: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux Tous Risques (ex: 0.035 pour 3.5%)</label>
                            <input
                              type="number"
                              step="0.001"
                              value={editingParams.rate_tous_risques ?? 0.035}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, rate_tous_risques: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'voyage' && (
                      <div className="pricing-params-group">
                        <h4>Tarifs Journaliers par Zone Médicale CIMA</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Zone Afrique / CIMA (FCFA / jour)</label>
                            <input
                              type="number"
                              value={editingParams.rates_by_zone?.Zone_Afrique ?? 1000}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_by_zone: {
                                    ...(editingParams.rates_by_zone ?? {}),
                                    Zone_Afrique: Number(e.target.value),
                                    Zone_CIMA: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Zone Europe Schengen (FCFA / jour)</label>
                            <input
                              type="number"
                              value={editingParams.rates_by_zone?.Zone_Europe_Schengen ?? 1500}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_by_zone: {
                                    ...(editingParams.rates_by_zone ?? {}),
                                    Zone_Europe_Schengen: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Zone Monde / USA / Canada (FCFA / jour)</label>
                            <input
                              type="number"
                              value={editingParams.rates_by_zone?.Zone_Monde ?? 3000}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_by_zone: {
                                    ...(editingParams.rates_by_zone ?? {}),
                                    Zone_Monde: Number(e.target.value),
                                    USA_Canada: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'habitation' && (
                      <div className="pricing-params-group">
                        <h4>Barèmes Incendie & Sécurité Habitation</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Taux Incendie Béton Dur (ex: 0.001 pour 1‰)</label>
                            <input
                              type="number"
                              step="0.0005"
                              value={editingParams.rates_construction?.Beton_Dur ?? 0.0010}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_construction: {
                                    ...(editingParams.rates_construction ?? {}),
                                    Beton_Dur: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux Incendie Semi-Dur Tôle (ex: 0.0025)</label>
                            <input
                              type="number"
                              step="0.0005"
                              value={editingParams.rates_construction?.Semi_Dur_Tole ?? 0.0025}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_construction: {
                                    ...(editingParams.rates_construction ?? {}),
                                    Semi_Dur_Tole: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux Incendie Bois / Paille (ex: 0.006)</label>
                            <input
                              type="number"
                              step="0.0005"
                              value={editingParams.rates_construction?.Bois_Paille ?? 0.0060}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  rates_construction: {
                                    ...(editingParams.rates_construction ?? {}),
                                    Bois_Paille: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Forfait Annexe Appartement (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.annexe_appartement ?? 10000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, annexe_appartement: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Forfait Annexe Maison / Villa (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.annexe_autre ?? 7000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, annexe_autre: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sante' && (
                      <div className="pricing-params-group">
                        <h4>Barèmes Santé & Majoration Antécédents</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Surprime Antécédents (ex: 0.35 pour +35%)</label>
                            <input
                              type="number"
                              step="0.05"
                              value={editingParams.medical_surcharge ?? 0.35}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, medical_surcharge: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Forfait par Enfant à Charge (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.child_flat_rate ?? 40000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, child_flat_rate: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Coeff Formule 70%</label>
                            <input
                              type="number"
                              step="0.05"
                              value={editingParams.formula_multipliers?.['Formule_70%'] ?? 0.85}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  formula_multipliers: {
                                    ...(editingParams.formula_multipliers ?? {}),
                                    'Formule_70%': Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Coeff Formule 100%</label>
                            <input
                              type="number"
                              step="0.05"
                              value={editingParams.formula_multipliers?.['Formule_100%'] ?? 1.40}
                              onChange={(e) =>
                                setEditingParams({
                                  ...editingParams,
                                  formula_multipliers: {
                                    ...(editingParams.formula_multipliers ?? {}),
                                    'Formule_100%': Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}


                    {/* ═══ PARAMÈTRES SINISTRE AUTO ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_auto' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Auto — Franchises &amp; Convention IDA (Code CIMA)</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Taux franchise vol (ex: 0.10 pour 10%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.franchise_vol_rate ?? 0.10}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_vol_rate: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Franchise fixe Tous Risques (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.franchise_fixe_tous_risques ?? 75000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_fixe_tous_risques: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux franchise 50% responsable (ex: 0.10)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.franchise_partage_rate ?? 0.10}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_partage_rate: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Minimum franchise partage (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.franchise_partage_min ?? 50000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_partage_min: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE HABITATION ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_habitation' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Habitation — Règle proportionnelle Art. 32 CIMA</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Franchise contractuelle par défaut (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.default_franchise_contractuelle ?? 50000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, default_franchise_contractuelle: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE SANTÉ ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_sante' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Santé &amp; Corporel — Barème CIMA</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Taux prise en charge par défaut (ex: 80 pour 80%)</label>
                            <input
                              type="number"
                              value={editingParams.taux_couverture_default ?? 80}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, taux_couverture_default: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Plafond annuel par défaut (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.plafond_annuel_default ?? 1500000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, plafond_annuel_default: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Capital base IPP CIMA (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.capital_base_cima_ipp ?? 2000000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, capital_base_cima_ipp: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE RC ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_rc' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Responsabilité Civile — Code CIMA</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Franchise à charge assuré (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.franchise_rc_assure ?? 50000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_rc_assure: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE PROFESSIONNELLE ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_professionnelle' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Entreprise — Perte d'exploitation (OHADA)</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Taux marge brute par défaut (ex: 0.30)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.taux_marge_brute_default ?? 0.30}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, taux_marge_brute_default: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Franchise en jours d'activité</label>
                            <input
                              type="number"
                              value={editingParams.franchise_jours ?? 3}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_jours: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Jours de référence par mois</label>
                            <input
                              type="number"
                              value={editingParams.jours_par_mois ?? 30}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, jours_par_mois: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE VOYAGE / TRANSPORT ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_voyage' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Transport &amp; Voyage — DTS / Port Autonome de Douala</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Plafond aérien DTS / kg (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.dts_par_kg_fcfa ?? 13500}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, dts_par_kg_fcfa: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Franchise terrestre/maritime (ex: 0.05)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.franchise_marchandises_rate ?? 0.05}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_marchandises_rate: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE AGRICOLE ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_agricole' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Agricole — Assurance indicielle</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Franchise indicielle (ex: 0.15 pour 15%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingParams.franchise_indicielle_rate ?? 0.15}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_indicielle_rate: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Prix marché FCFA / tonne (par défaut)</label>
                            <input
                              type="number"
                              value={editingParams.prix_marche_defaut ?? 250000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, prix_marche_defaut: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Rendement historique par défaut (t/ha)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={editingParams.rendement_moyen_defaut ?? 3.5}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, rendement_moyen_defaut: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PARAMÈTRES SINISTRE AUTRES ═══ */}
                    {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_autres' && (
                      <div className="pricing-params-group">
                        <h4>Sinistre Autres Risques — Plafonds &amp; Franchises</h4>
                        <div className="pricing-grid-3">
                          <div className="pricing-field">
                            <label>Plafond indemnisation par défaut (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.plafond_indemnisation_defaut ?? 500000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, plafond_indemnisation_defaut: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Franchise par défaut (FCFA)</label>
                            <input
                              type="number"
                              value={editingParams.franchise_defaut ?? 25000}
                              onChange={(e) =>
                                setEditingParams({ ...editingParams, franchise_defaut: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Mode JSON brut pour modification avancée de tous les paramètres */}
                    <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <label className="choice" style={{ cursor: 'pointer', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={rawJsonMode}
                          onChange={(e) => {
                            setRawJsonMode(e.target.checked);
                            if (e.target.checked) {
                              setRawJsonText(JSON.stringify(editingParams, null, 2));
                            }
                          }}
                        />
                        <span>Mode JSON avancé (accéder à l'ensemble brut des barèmes de l'algorithme)</span>
                      </label>
                      {rawJsonMode && (
                        <textarea
                          rows={10}
                          style={{ fontFamily: 'monospace', fontSize: '0.82rem', width: '100%', background: '#1e293b', color: '#f8fafc', padding: '10px', borderRadius: '6px' }}
                          value={rawJsonText}
                          onChange={(e) => setRawJsonText(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="builder-modal-actions" style={{ marginTop: '20px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPricingModalCategory(null)}
                      >
                        Fermer
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={savingPricing}
                        onClick={handleSaveRuleParameters}
                      >
                        {savingPricing ? 'Enregistrement…' : 'Sauvegarder les barèmes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px' }}>
                    <p style={{ color: '#64748b', margin: '0 0 14px' }}>
                      Aucun algorithme de calcul automatique n'est actuellement assigné à cette catégorie.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setPricingTab('rule')}
                    >
                      Assigner un algorithme de tarification
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Contenu Onglet 2: Changer d'algorithme */}
            {pricingTab === 'rule' && (
              <div>
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label htmlFor="select-assigned-rule">
                    Algorithme de calcul pour la catégorie &laquo; {pricingModalCategory.name} &raquo; :
                  </label>
                  <select
                    id="select-assigned-rule"
                    value={activePricingRuleId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setActivePricingRuleId(id);
                      if (id) {
                        const r = pricingRules.find((rule) => rule.id === id);
                        if (r) {
                          setRuleName(r.name);
                          setRuleDescription(r.description || '');
                          const p = r.parameters ? JSON.parse(JSON.stringify(r.parameters)) : {};
                          setEditingParams(p);
                          setRawJsonText(JSON.stringify(p, null, 2));
                        }
                      }
                    }}
                  >
                    <option value="">Aucun calcul automatique (Évaluation manuelle)</option>
                    {pricingRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name} [{rule.driver.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                {activePricingRuleId && (
                  <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 6px', color: '#0369a1' }}>
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.description}
                    </p>
                  </div>
                )}

                <div className="builder-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPricingModalCategory(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingPricing}
                    onClick={handleApplyRuleToCategory}
                  >
                    {savingPricing ? 'Application…' : 'Appliquer à la catégorie'}
                  </button>
                </div>
              </div>
            )}

            {/* Contenu Onglet 3: Testeur en direct */}
            {pricingTab === 'test' && (
              <div>
                {activePricingRuleId ? (
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 16px' }}>
                      Saisissez des valeurs fictives pour tester le comportement de la formule et des barèmes en temps réel.
                    </p>

                    {/* Champs de test dynamiques selon le driver */}
                    <div className="pricing-grid-3" style={{ marginBottom: '16px' }}>
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'automobile' && (
                        <>
                          <div className="pricing-field">
                            <label>Puissance fiscale (CV)</label>
                            <input
                              type="number"
                              placeholder="Ex: 6"
                              value={testInputs.puissance_fiscale ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, puissance_fiscale: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Usage du véhicule</label>
                            <select
                              value={testInputs.usage ?? 'Promenade_Trajet'}
                              onChange={(e) => setTestInputs({ ...testInputs, usage: e.target.value })}
                            >
                              <option value="Promenade_Trajet">Promenade & Trajet</option>
                              <option value="Transport_Commercial">Transport Commercial</option>
                              <option value="Taxi">Taxi</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Ancienneté du permis (années)</label>
                            <input
                              type="number"
                              placeholder="Ex: 5"
                              value={testInputs.age_permis ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, age_permis: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Historique sinistres (nombre)</label>
                            <input
                              type="number"
                              placeholder="Ex: 0"
                              value={testInputs.historique_sinistres ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, historique_sinistres: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Valeur vénale du véhicule (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 5000000"
                              value={testInputs.valeur_vehicule ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, valeur_vehicule: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'voyage' && (
                        <>
                          <div className="pricing-field">
                            <label>Zone de destination</label>
                            <select
                              value={testInputs.zone_destination ?? 'Zone_Afrique'}
                              onChange={(e) => setTestInputs({ ...testInputs, zone_destination: e.target.value })}
                            >
                              <option value="Zone_Afrique">Zone Afrique / CIMA</option>
                              <option value="Zone_Europe_Schengen">Zone Europe Schengen</option>
                              <option value="Zone_Monde">Zone Monde / USA / Canada</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Durée du séjour (jours)</label>
                            <input
                              type="number"
                              placeholder="Ex: 15"
                              value={testInputs.duree_sejour ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, duree_sejour: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Nombre de personnes à assurer</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Ex: 1"
                              value={testInputs.nbre_personnes ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, nbre_personnes: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Âge(s) du/des voyageur(s)</label>
                            <input
                              type="text"
                              placeholder="Ex: 35 ou 35, 32, 8 (ou 72 pour un senior)"
                              value={testInputs.travelers_ages ?? testInputs.age_voyageur ?? ''}
                              onChange={(e) =>
                                setTestInputs({
                                  ...testInputs,
                                  travelers_ages: e.target.value,
                                  age_voyageur: e.target.value,
                                })
                              }
                            />
                            <small style={{ color: '#64748b', fontSize: '0.74rem' }}>
                              Si plusieurs personnes : séparez les âges par des virgules (ex: 35, 32, 8). S'il y a un senior (&gt;65 ans), seule sa part subit la surprime.
                            </small>
                          </div>
                        </>
                      )}

                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'habitation' && (
                        <>
                          <div className="pricing-field">
                            <label>Matériaux de construction</label>
                            <select
                              value={testInputs.materiaux_construction ?? 'Beton_Dur'}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, materiaux_construction: e.target.value })
                              }
                            >
                              <option value="Beton_Dur">Béton Dur</option>
                              <option value="Semi_Dur_Tole">Semi-dur Tôle</option>
                              <option value="Bois_Paille">Bois / Paille</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Type de logement</label>
                            <select
                              value={testInputs.type_logement ?? 'Appartement'}
                              onChange={(e) => setTestInputs({ ...testInputs, type_logement: e.target.value })}
                            >
                              <option value="Appartement">Appartement</option>
                              <option value="Maison">Maison / Villa</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Dispositif de sécurité</label>
                            <select
                              value={testInputs.securite_presence ?? 'Gardiennage_Et_Grilles'}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, securite_presence: e.target.value })
                              }
                            >
                              <option value="Gardiennage_Et_Grilles">Gardiennage & Grilles</option>
                              <option value="Standard">Standard</option>
                              <option value="Aucune">Aucune / Non sécurisé</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Capital Mobilier (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 10000000"
                              value={testInputs.capital_mobilier ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, capital_mobilier: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Capital Immobilier (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 35000000"
                              value={testInputs.capital_immobilier ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, capital_immobilier: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sante' && (
                        <>
                          <div className="pricing-field">
                            <label>Âge du souscripteur</label>
                            <input
                              type="number"
                              placeholder="Ex: 35"
                              value={testInputs.age_proposant ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, age_proposant: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Formule de couverture</label>
                            <select
                              value={testInputs.formule_couverture ?? 'Formule_80%'}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, formule_couverture: e.target.value })
                              }
                            >
                              <option value="Formule_70%">Formule 70%</option>
                              <option value="Formule_80%">Formule 80%</option>
                              <option value="Formule_100%">Formule 100%</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Antécédents médicaux</label>
                            <select
                              value={testInputs.antecedents_medicaux ?? 'Aucun'}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, antecedents_medicaux: e.target.value })
                              }
                            >
                              <option value="Aucun">Aucun</option>
                              <option value="Hypertension">Hypertension</option>
                              <option value="Diabete">Diabète</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Enfants à charge</label>
                            <input
                              type="number"
                              placeholder="Ex: 2"
                              value={testInputs.nbre_enfants_charge ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, nbre_enfants_charge: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE AUTO ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_auto' && (
                        <>
                          <div className="pricing-field">
                            <label>Responsabilité dans l'accident</label>
                            <select
                              value={testInputs.choc_responsabilite ?? '0%_Responsable'}
                              onChange={(e) => setTestInputs({ ...testInputs, choc_responsabilite: e.target.value })}
                            >
                              <option value="0%_Responsable">0% Responsable (tiers fautif)</option>
                              <option value="50%_Responsable">50% Responsable (partage de torts)</option>
                              <option value="100%_Responsable">100% Responsable</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Type de garantie</label>
                            <select
                              value={testInputs.type_garantie ?? 'Tous_Risques'}
                              onChange={(e) => setTestInputs({ ...testInputs, type_garantie: e.target.value })}
                            >
                              <option value="Tous_Risques">Tous Risques</option>
                              <option value="Tiers">Tiers (RC simple)</option>
                              <option value="Vol">Vol de véhicule</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Devis expert / Coût réparation (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 500000"
                              value={testInputs.devis_expert ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, devis_expert: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Valeur vénale du véhicule (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 3000000"
                              value={testInputs.valeur_venale ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, valeur_venale: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE HABITATION ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_habitation' && (
                        <>
                          <div className="pricing-field">
                            <label>Montant des dégâts (expertise) (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 2000000"
                              value={testInputs.montant_degats_expert ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, montant_degats_expert: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Valeur réelle des biens (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 20000000"
                              value={testInputs.valeur_reelle_biens ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, valeur_reelle_biens: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Valeur déclarée au contrat (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 10000000"
                              value={testInputs.valeur_declaree_contrat ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, valeur_declaree_contrat: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Franchise contractuelle (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 50000"
                              value={testInputs.franchise_contractuelle ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, franchise_contractuelle: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE SANTÉ ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_sante' && (
                        <>
                          <div className="pricing-field">
                            <label>Facture clinique agréée (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 350000"
                              value={testInputs.facture_clinique_agreee ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, facture_clinique_agreee: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux de couverture (%)</label>
                            <input
                              type="number"
                              placeholder="Ex: 80"
                              value={testInputs.taux_couverture ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, taux_couverture: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Plafond annuel restant (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 1500000"
                              value={testInputs.plafond_annuel_restant ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, plafond_annuel_restant: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux d'IPP (invalidité permanente, %)</label>
                            <input
                              type="number"
                              placeholder="Ex: 0 (ou 20 si invalide)"
                              value={testInputs.taux_ipp ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, taux_ipp: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE RC ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_rc' && (
                        <>
                          <div className="pricing-field">
                            <label>Devis réparation tiers victime (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 800000"
                              value={testInputs.devis_reparation_tiers ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, devis_reparation_tiers: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE PROFESSIONNELLE ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_professionnelle' && (
                        <>
                          <div className="pricing-field">
                            <label>CA année N-1 (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 50000000"
                              value={testInputs.chiffre_affaires_n_moins_1 ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, chiffre_affaires_n_moins_1: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>CA pendant le sinistre (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 30000000"
                              value={testInputs.chiffre_affaires_sinistre ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, chiffre_affaires_sinistre: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux de marge brute (ex: 0.30)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 0.30"
                              value={testInputs.taux_marge_brute ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, taux_marge_brute: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Charges fixes permanentes (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 2000000"
                              value={testInputs.charges_fixes_permanentes ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, charges_fixes_permanentes: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE VOYAGE / TRANSPORT ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_voyage' && (
                        <>
                          <div className="pricing-field">
                            <label>Type de transport</label>
                            <select
                              value={testInputs.type_transport ?? 'Terrestre_National'}
                              onChange={(e) => setTestInputs({ ...testInputs, type_transport: e.target.value })}
                            >
                              <option value="Terrestre_National">Terrestre national</option>
                              <option value="Maritime">Maritime (Port de Douala)</option>
                              <option value="Aerien_Bagages">Aérien — Bagages perdus</option>
                            </select>
                          </div>
                          <div className="pricing-field">
                            <label>Valeur facture marchandise (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 1500000"
                              value={testInputs.valeur_facture_marchandise ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, valeur_facture_marchandise: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Coût de fret (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 150000"
                              value={testInputs.cout_fret ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, cout_fret: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Poids perdu (kg) — aérien uniquement</label>
                            <input
                              type="number"
                              placeholder="Ex: 23"
                              value={testInputs.poids_perdu_kg ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, poids_perdu_kg: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE AGRICOLE ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_agricole' && (
                        <>
                          <div className="pricing-field">
                            <label>Superficie (hectares)</label>
                            <input
                              type="number"
                              placeholder="Ex: 5"
                              value={testInputs.superficie_hectares ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, superficie_hectares: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Rendement moyen historique (t/ha)</label>
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Ex: 2.5"
                              value={testInputs.rendement_moyen_historique ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, rendement_moyen_historique: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Prix marché FCFA / tonne</label>
                            <input
                              type="number"
                              placeholder="Ex: 250000"
                              value={testInputs.prix_marquet_cameroun ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, prix_marquet_cameroun: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Taux de perte estimé par expert (%)</label>
                            <input
                              type="number"
                              placeholder="Ex: 70"
                              value={testInputs.taux_perte_expert ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, taux_perte_expert: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* ═══ TESTEUR SINISTRE AUTRES ═══ */}
                      {pricingRules.find((r) => r.id === activePricingRuleId)?.driver === 'sinistre_autres' && (
                        <>
                          <div className="pricing-field">
                            <label>Valeur estimée du sinistre (FCFA)</label>
                            <input
                              type="number"
                              placeholder="Ex: 150000"
                              value={testInputs.estimated_value ?? ''}
                              onChange={(e) =>
                                setTestInputs({ ...testInputs, estimated_value: Number(e.target.value) })
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={testing}
                      onClick={handleRunSimulation}
                      style={{ marginBottom: '16px' }}
                    >
                      {testing ? 'Calcul en cours…' : 'Calculer la simulation'}
                    </button>

                    {testResult && (
                      <div className="quote-pricing-card calculated">
                        <div className="quote-pricing-header">
                          <h3 className="quote-pricing-title">
                            <Calculator size={18} style={{ color: pricingRules.find((r) => r.id === activePricingRuleId)?.driver?.startsWith('sinistre_') ? '#0f766e' : '#059669' }} />
                            Résultat de la simulation
                          </h3>
                          <span className="quote-pricing-badge">Code CIMA Certifié</span>
                        </div>
                        {pricingRules.find((r) => r.id === activePricingRuleId)?.driver?.startsWith('sinistre_') ? (
                          <div className="quote-pricing-grid">
                            <div className="quote-pricing-item">
                              <small>Dommages Bruts</small>
                              <span>{formatFcfa(testResult.montant_brut_formatted || testResult.montant_brut)}</span>
                            </div>
                            <div className="quote-pricing-item">
                              <small>Franchise</small>
                              <span>{formatFcfa(testResult.franchise_formatted || testResult.franchise)}</span>
                            </div>
                            <div className="quote-pricing-item highlight">
                              <small>Indemnité Nette</small>
                              <span>{formatFcfa(testResult.indemnisation_estimee_formatted || testResult.indemnisation_estimee)}</span>
                            </div>
                          </div>
                        ) : (
                        <div className="quote-pricing-grid">
                          <div className="quote-pricing-item">
                            <small>Prime Nette</small>
                            <span>{formatFcfa(testResult.prime_nette_formatted || testResult.prime_nette)}</span>
                          </div>
                          <div className="quote-pricing-item">
                            <small>Accessoires / Vignette</small>
                            <span>{formatFcfa(testResult.accessoires_formatted || testResult.accessoires)}</span>
                          </div>
                          <div className="quote-pricing-item">
                            <small>Taxe Unique (15%)</small>
                            <span>{formatFcfa(testResult.taxe_unique_formatted || testResult.taxe_unique)}</span>
                          </div>
                          <div className="quote-pricing-item highlight">
                            <small>Prime Totale TTC</small>
                            <span>{formatFcfa(testResult.prime_ttc_formatted || testResult.prime_ttc)}</span>
                          </div>
                        </div>
                        )}

                        {testResult.breakdown?.length > 0 && (
                          <div className="table-responsive">
                          <table className="quote-pricing-breakdown-table">
                            <thead>
                              <tr>
                                <th>Garantie / Éléments</th>
                                <th style={{ textAlign: 'right' }}>Montant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {testResult.breakdown.map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    {item.label}{' '}
                                    {item.detail && <small style={{ color: '#64748b' }}>({item.detail})</small>}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {formatFcfa(item.formatted || item.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Veuillez d'abord assigner un algorithme de calcul.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
