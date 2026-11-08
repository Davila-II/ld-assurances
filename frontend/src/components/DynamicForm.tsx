import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Calculator, Check, CheckCircle2, ChevronDown, ChevronUp, Download, Sparkles, X } from 'lucide-react';
import { calculateQuote, downloadTrackPdf, getForm, submitForm, ApiError } from '../api';
import { clientMe } from '../clientApi';
import { getClientToken } from '../clientAuth';
import type { Answers, Category, FormField, FormType, QuoteCalculation } from '../types';
import type { ClientUser } from '../clientTypes';
import { useLanguage } from '../i18n/LanguageContext';
import { getDateFieldLimits, validateDateField } from '../dateRules';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

interface Props {
  category: Category;
  formType?: FormType;
  presetAnswers?: Answers;
  isPreview?: boolean;
}

interface Step {
  title: string;
  title_en?: string | null;
  fields: FormField[];
}

// Regroupe les questions par étape (section), dans l'ordre d'apparition
// Garantit que l'étape "Identification" ou "Coordonnées" arrive en 4e et dernière étape
function buildSteps(fields: FormField[]): Step[] {
  const steps: Step[] = [];

  fields.forEach((field) => {
    const title = field.section ?? '';
    let step = steps.find((s) => s.title === title);

    if (!step) {
      step = { title, title_en: field.section_en, fields: [] };
      steps.push(step);
    }

    step.fields.push(field);
  });

  // Si "Identification" ou "Coordonnées" est présent, on s'assure qu'il est en dernière position
  const identIndex = steps.findIndex((s) => {
    const lower = s.title.toLowerCase();
    return lower.includes('identification') || lower.includes('coordonnées') || lower.includes('coordonnees');
  });

  if (identIndex >= 0 && identIndex !== steps.length - 1) {
    const [identStep] = steps.splice(identIndex, 1);
    steps.push(identStep);
  }

  return steps;
}

// Premier message d'erreur d'une question (venant de Laravel ou de la vérification locale)
function findError(errors: Record<string, string[]>, name: string): string | null {
  const key = Object.keys(errors).find(
    (k) => k === `answers.${name}` || k.startsWith(`answers.${name}.`)
  );
  return key ? errors[key][0] : null;
}

function formatFcfa(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0 FCFA';
  if (typeof val === 'string' && val.includes('FCFA')) return val;
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('fr-FR') + ' FCFA';
}

export default function DynamicForm({ category, formType = 'claim', presetAnswers, isPreview }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const { t, lang } = useLanguage();

  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Answers>(() => ({ ...(presetAnswers ?? {}) }));
  const [prevPreset, setPrevPreset] = useState(presetAnswers);
  if (presetAnswers !== prevPreset) {
    setPrevPreset(presetAnswers);
    setAnswers((prev) => ({ ...(presetAnswers ?? {}), ...prev }));
  }

  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // champ piège pour les robots
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Tarification en temps réel (pour les devis)
  const [quoteCalculation, setQuoteCalculation] = useState<QuoteCalculation | null>(null);
  const [calculatingQuote, setCalculatingQuote] = useState(false);
  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState(false);

  const isClaim = formType === 'claim';
  const isLoggedIn = Boolean(getClientToken());
  const activeEmail = (clientUser?.email || email).trim();

  const handleDownloadPdf = async () => {
    if (!reference || !activeEmail) return;
    setDownloadingPdf(true);
    try {
      await downloadTrackPdf(reference, activeEmail);
    } catch {
      // ignore
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Récupération des données du client connecté pour pré-remplir automatiquement ses coordonnées
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    clientMe()
      .then((u) => {
        if (cancelled) return;
        setClientUser(u);
        setEmail((prev) => prev || u.email);
        setAnswers((prev) => ({
          ...prev,
          full_name: prev.full_name || u.name,
          phone: prev.phone || u.phone || '',
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Chargement des questions (PublicPage recrée ce composant à chaque changement de catégorie)
  useEffect(() => {
    let cancelled = false;

    getForm(category.slug, formType)
      .then((data) => {
        if (!cancelled) setFields(data.fields);
      })
      .catch((e: unknown) => {
        if (!cancelled) setMessage(e instanceof Error ? e.message : 'Erreur inattendue.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category.slug, formType]);

  // Calcul du devis en temps réel lorsque l'utilisateur répond aux questions
  useEffect(() => {
    if (formType !== 'quote') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      // Filtrer les fichiers ou objets non sérialisables dans les réponses pour l'API
      const cleanAnswers: Record<string, unknown> = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (v instanceof FileList) return;
        cleanAnswers[k] = v;
      });

      try {
        setCalculatingQuote(true);
        const res = await calculateQuote(category.slug, cleanAnswers);
        if (!cancelled && res.calculated && res.calculation) {
          setQuoteCalculation(res.calculation);
        }
      } catch {
        // En cas d'erreur de calcul réseau silencieuse, on conserve l'ancien résultat
      } finally {
        if (!cancelled) setCalculatingQuote(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [category.slug, formType, answers]);

  const setAnswer = (name: string, value: Answers[string]) =>
    setAnswers((prev) => ({ ...prev, [name]: value }));

  // Une question avec condition ne s'affiche que si la condition est remplie
  const isVisible = (field: FormField): boolean => {
    if (!field.condition) return true;
    return answers[field.condition.field] === field.condition.equals;
  };

  // Masque le champ "Type de sinistre" si celui-ci a déjà été choisi sur la page précédente
  const isFieldDisplayed = (field: FormField): boolean => {
    if (field.name === 'sinistre_type' && (presetAnswers?.sinistre_type || answers.sinistre_type)) {
      return false;
    }
    return true;
  };

  // Un multiselect obligatoire sans aucun choix
  const isEmptyRequiredChoice = (field: FormField): boolean => {
    const value = answers[field.name];
    return (
      field.is_required &&
      field.field_type === 'multiselect' &&
      !(Array.isArray(value) && value.length > 0)
    );
  };

  const errorFor = (name: string): string | null => findError(errors, name);

  // --- Étapes ---
  const steps = buildSteps(fields);
  const stepped = steps.length > 1;
  const lastStep = steps.length - 1;
  const currentStep = Math.min(step, Math.max(lastStep, 0));
  const isLast = !stepped || currentStep === lastStep;
  const shownFields = (stepped ? steps[currentStep].fields : fields)
    .filter(isVisible)
    .filter(isFieldDisplayed);
  const showEmail = !stepped || isLast;

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Revient à l'étape qui contient la première erreur
  const jumpToError = (errs: Record<string, string[]>) => {
    if (!stepped) return;
    const index = steps.findIndex((s) =>
      s.fields.filter(isFieldDisplayed).some((f) => findError(errs, f.name))
    );
    if (index >= 0) setStep(index);
  };

  const goNext = () => {
    setErrors({});
    setMessage('');

    // Validation native des champs de l'étape affichée (seuls ceux-là sont dans la page)
    if (formRef.current && !formRef.current.reportValidity()) return;

    const missing = shownFields.filter(isEmptyRequiredChoice);
    if (missing.length > 0) {
      setErrors(
        Object.fromEntries(
          missing.map((f) => [`answers.${f.name}`, [t('validation.select_one_option')]])
        )
      );
      return;
    }

    // Validation de la cohérence des dates de l'étape affichée
    const dateErrors: Record<string, string[]> = {};
    shownFields.filter((f) => f.field_type === 'date').forEach((f) => {
      const val = answers[f.name];
      if (typeof val === 'string' && val) {
        const errKey = validateDateField(f, val, category.slug, answers);
        if (errKey) {
          dateErrors[`answers.${f.name}`] = [t(errKey)];
        }
      }
    });

    if (Object.keys(dateErrors).length > 0) {
      setErrors(dateErrors);
      setMessage(t('validation.check_fields'));
      return;
    }

    setStep(currentStep + 1);
    scrollToForm();
  };

  const goPrev = () => {
    setErrors({});
    setMessage('');
    setStep(currentStep - 1);
    scrollToForm();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // La touche Entrée dans une étape intermédiaire équivaut à « Suivant »
    if (!isLast) {
      goNext();
      return;
    }

    setErrors({});
    setMessage('');

    const visibleFields = fields.filter(isVisible);

    // Vérifications avant l'envoi : fichiers, choix obligatoires et cohérence des dates
    const localErrors: Record<string, string[]> = {};
    visibleFields.forEach((field) => {
      if (isEmptyRequiredChoice(field)) {
        localErrors[`answers.${field.name}`] = [t('validation.select_one_option')];
        return;
      }

      if (field.field_type === 'date') {
        const val = answers[field.name];
        if (typeof val === 'string' && val) {
          const errKey = validateDateField(field, val, category.slug, answers);
          if (errKey) {
            localErrors[`answers.${field.name}`] = [t(errKey)];
          }
        }
        return;
      }

      if (field.field_type !== 'file') return;
      const list = answers[field.name] as FileList | undefined;
      const files = list ? Array.from(list) : [];

      if (files.length > MAX_FILES) {
        localErrors[`answers.${field.name}`] = [`Maximum ${MAX_FILES} fichiers.`];
      } else if (files.some((file) => file.size > MAX_FILE_SIZE)) {
        localErrors[`answers.${field.name}`] = ['Chaque fichier doit faire 5 Mo maximum.'];
      }
    });

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setMessage(t('validation.check_fields'));
      jumpToError(localErrors);
      return;
    }

    if (isPreview) {
      setSending(true);
      setTimeout(() => {
        setSending(false);
        setReference(formType === 'quote' ? 'LD-DV-TEST-APERÇU' : 'LD-DS-TEST-APERÇU');
        setMessage("Mode test validé : Ce formulaire fonctionne parfaitement ! Aucune donnée réelle n'a été envoyée.");
      }, 400);
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append('category', category.slug);
    formData.append('form_type', formType);
    formData.append('email', activeEmail);
    formData.append('website', website);

    visibleFields.forEach((field) => {
      const value = answers[field.name];
      if (value === undefined || value === null || value === '') return;

      if (field.field_type === 'file') {
        Array.from(value as FileList).forEach((file) =>
          formData.append(`answers[${field.name}][]`, file)
        );
      } else if (field.field_type === 'multiselect') {
        (value as string[]).forEach((v) => formData.append(`answers[${field.name}][]`, v));
      } else if (field.field_type === 'checkbox') {
        formData.append(`answers[${field.name}]`, value ? '1' : '0');
      } else {
        formData.append(`answers[${field.name}]`, String(value));
      }
    });

    try {
      const data = await submitForm(formData);
      setReference(data.reference);
      if (!isLoggedIn) {
        setShowRegisterModal(true);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        setMessage(err.message);
        jumpToError(err.errors);
      } else {
        setMessage('Une erreur inattendue est survenue.');
      }
    } finally {
      setSending(false);
    }
  };

  // Affiche le bon champ selon le type de la question
  const renderInput = (field: FormField) => {
    const value = answers[field.name];
    const text = typeof value === 'string' ? value : '';
    const placeholder =
      lang === 'en' && field.placeholder_en ? field.placeholder_en : (field.placeholder ?? undefined);
    const common = { id: field.name, required: field.is_required, placeholder };

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            {...common}
            rows={4}
            value={text}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            {...common}
            type="number"
            value={text}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );

      case 'date': {
        const limits = getDateFieldLimits(field, category.slug, answers);
        return (
          <input
            {...common}
            type="date"
            min={limits.min}
            max={limits.max}
            value={text}
            onChange={(e) => {
              setAnswer(field.name, e.target.value);
              const errKey = validateDateField(field, e.target.value, category.slug, answers);
              if (errKey) {
                setErrors((prev) => ({ ...prev, [`answers.${field.name}`]: [t(errKey)] }));
              } else {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy[`answers.${field.name}`];
                  delete copy[field.name];
                  return copy;
                });
              }
            }}
          />
        );
      }

      case 'select':
        return (
          <select
            {...common}
            value={text}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          >
            <option value="">{t('form.choose')}</option>
            {(field.options ?? []).map((option, idx) => {
              const optLabel =
                lang === 'en' && field.options_en && field.options_en[idx]
                  ? field.options_en[idx]
                  : (lang === 'en' && option === 'Oui' ? 'Yes' : (lang === 'en' && option === 'Non' ? 'No' : option));
              return (
                <option key={option} value={option}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );

      case 'multiselect': {
        const current = Array.isArray(value) ? value : [];
        return (
          <div className="choices">
            {(field.options ?? []).map((option, idx) => {
              const optLabel =
                lang === 'en' && field.options_en && field.options_en[idx]
                  ? field.options_en[idx]
                  : (lang === 'en' && option === 'Oui' ? 'Yes' : (lang === 'en' && option === 'Non' ? 'No' : option));
              return (
                <label key={option} className="choice">
                  <input
                    type="checkbox"
                    checked={current.includes(option)}
                    onChange={(e) =>
                      setAnswer(
                        field.name,
                        e.target.checked
                          ? [...current, option]
                          : current.filter((v) => v !== option)
                      )
                    }
                  />{' '}
                  {optLabel}
                </label>
              );
            })}
          </div>
        );
      }

      case 'checkbox':
        return (
          <input
            id={field.name}
            type="checkbox"
            required={field.is_required}
            checked={value === true}
            onChange={(e) => setAnswer(field.name, e.target.checked)}
          />
        );

      case 'file':
        return (
          <input
            {...common}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setAnswer(field.name, e.target.files)}
          />
        );

      default:
        return (
          <input
            {...common}
            type="text"
            value={text}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );
    }
  };

  if (loading) return <p>{t('claims.loading')}</p>;

  // Écran de confirmation après l'envoi
  if (reference) {
    return (
      <>
        {showRegisterModal && !isLoggedIn && (
          <div className="register-modal-backdrop" role="dialog" aria-modal="true">
            <div className="register-modal-card">
              <button
                type="button"
                className="register-modal-close"
                aria-label="Fermer"
                onClick={() => setShowRegisterModal(false)}
              >
                <X size={20} />
              </button>
              <div className="register-modal-icon">
                <Sparkles size={32} />
              </div>
              <h3 className="register-modal-title">{t('modal.create_account_title')}</h3>
              <p className="register-modal-desc">{t('modal.create_account_desc')}</p>
              <div className="register-modal-ref">
                <span>{t('form.success_ref')}</span>
                <strong>{reference}</strong>
              </div>
              <div className="register-modal-actions">
                <button
                  type="button"
                  className="btn btn-gradient btn-full"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (email) params.set('email', email);
                    const fullName = String(answers.full_name ?? '');
                    if (fullName) params.set('name', fullName);
                    const phone = String(answers.phone ?? '');
                    if (phone) params.set('phone', phone);
                    window.location.assign(`/espace-client/inscription?${params.toString()}`);
                  }}
                >
                  {t('modal.create_btn')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowRegisterModal(false)}
                >
                  {t('modal.skip_btn')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="success">
          <h2>{t('form.success_title')}</h2>
          <p>
            {t('form.success_ref')} <strong>{reference}</strong>
          </p>

          {quoteCalculation && (
            <div
              style={{
                margin: '18px auto',
                padding: '16px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
                border: '1.5px solid #1aaca8',
                maxWidth: '520px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: '#144983', fontSize: '0.95rem' }}>
                  {lang === 'en' ? 'Estimated Total Premium (TTC)' : 'Estimation de votre prime TTC'}
                </strong>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: '#144983',
                  }}
                >
                  {formatFcfa(quoteCalculation.prime_ttc_formatted || quoteCalculation.prime_ttc)}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0f3868', lineHeight: '1.5' }}>
                {lang === 'en'
                  ? `Breakdown: Net Premium ${formatFcfa(quoteCalculation.prime_nette_formatted || quoteCalculation.prime_nette)} + Accessories ${formatFcfa(quoteCalculation.accessoires_formatted || quoteCalculation.accessoires)} + Tax 15% ${formatFcfa(quoteCalculation.taxe_unique_formatted || quoteCalculation.taxe_unique)}.`
                  : `Décomposition : Prime nette ${formatFcfa(quoteCalculation.prime_nette_formatted || quoteCalculation.prime_nette)} + Accessoires ${formatFcfa(quoteCalculation.accessoires_formatted || quoteCalculation.accessoires)} + Taxe unique 15% ${formatFcfa(quoteCalculation.taxe_unique_formatted || quoteCalculation.taxe_unique)}.`}
                <br />
                {lang === 'en'
                  ? 'This calculation is certified in your downloadable summary PDF.'
                  : 'Ce barème officiel est certifié dans votre récapitulatif PDF téléchargeable ci-dessous.'}
              </div>
            </div>
          )}

          <p>{t('form.success_note')}</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isLoggedIn ? (
              <a
                className="btn btn-primary"
                href={isClaim ? '/espace-client/sinistres' : '/espace-client/demandes'}
              >
                {t('form.view_in_client_space')}
              </a>
            ) : (
              <a
                className="btn btn-gradient"
                href={`/espace-client/inscription?email=${encodeURIComponent(activeEmail)}&name=${encodeURIComponent(String(answers.full_name ?? ''))}&phone=${encodeURIComponent(String(answers.phone ?? ''))}`}
              >
                {t('modal.create_btn')}
              </a>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              {downloadingPdf ? '…' : (lang === 'en' ? 'Download PDF summary' : 'Télécharger le récapitulatif PDF')}
            </button>
            <a className="btn btn-secondary" href={`/suivi?ref=${encodeURIComponent(reference)}`}>
              {t('form.track_link')}
            </a>
          </div>
        </div>
      </>
    );
  }

  const submitLabel = sending
    ? t('form.sending')
    : isClaim
      ? t('form.submit_claim')
      : t('form.submit_quote');

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="form">
      {stepped && (
        <>
          <ol className="stepper" aria-label="Progression du formulaire">
            {steps.map((s, index) => (
              <li
                key={s.title}
                className={index === currentStep ? 'active' : index < currentStep ? 'done' : ''}
                aria-current={index === currentStep ? 'step' : undefined}
              >
                <span className="stepper-dot">
                  {index < currentStep ? <Check size={16} /> : index + 1}
                </span>
                <span className="stepper-label">
                  {lang === 'en' && s.title_en ? s.title_en : s.title}
                </span>
              </li>
            ))}
          </ol>

          <p className="step-count">
            {t('form.step')} {currentStep + 1} {t('form.of')} {steps.length}
          </p>
          <h2 className="step-heading">
            {lang === 'en' && steps[currentStep].title_en
              ? steps[currentStep].title_en
              : steps[currentStep].title}
          </h2>

          {clientUser && isLast && (
            <div className="client-auto-badge">
              <CheckCircle2 size={18} />
              <div>
                <strong>{t('form.connected_account_title')} {clientUser.name}</strong> ({clientUser.email})
                <p>{t('form.account_linked')}</p>
              </div>
            </div>
          )}
        </>
      )}

      {!stepped && clientUser && (
        <div className="client-auto-badge">
          <CheckCircle2 size={18} />
          <div>
            <strong>{t('form.connected_account_title')} {clientUser.name}</strong> ({clientUser.email})
            <p>{t('form.account_linked')}</p>
          </div>
        </div>
      )}

      {message && <p className="error">{message}</p>}

      {/* Champ piège : invisible pour les humains, rempli par les robots */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {showEmail && (
        <div className="field">
          <label htmlFor="email">{t('form.email_label')}</label>
          <input
            id="email"
            type="email"
            required
            value={clientUser?.email || email}
            disabled={Boolean(clientUser)}
            readOnly={Boolean(clientUser)}
            placeholder="Ex : nom@exemple.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className="error">{errors.email[0]}</span>}
        </div>
      )}

      {shownFields.map((field) => {
        const fieldLabel = lang === 'en' && field.label_en ? field.label_en : field.label;

        return (
          <div className="field" key={field.id}>
            {field.field_type === 'checkbox' ? (
              <label className="choice" htmlFor={field.name}>
                {renderInput(field)}
                <span>
                  {fieldLabel}
                  {field.is_required ? ' *' : ''}
                </span>
              </label>
            ) : (
              <>
                <label htmlFor={field.name}>
                  {fieldLabel}
                  {field.is_required ? ' *' : ''}
                </label>
                {renderInput(field)}
              </>
            )}
            {errorFor(field.name) && <span className="error">{errorFor(field.name)}</span>}
          </div>
        );
      })}

      {/* Simulation de devis en direct (Code CIMA) */}
      {formType === 'quote' && quoteCalculation && (
        <div className={`quote-pricing-card ${quoteCalculation.prime_ttc > 0 ? 'calculated' : ''}`}>
          <div className="quote-pricing-header">
            <h3 className="quote-pricing-title">
              <Calculator size={18} style={{ color: '#0284c7' }} />
              {lang === 'en' ? 'Real-Time Premium Estimation' : 'Estimation de votre prime en temps réel'}
            </h3>
            <span className="quote-pricing-badge">
              {calculatingQuote
                ? (lang === 'en' ? 'Updating…' : 'Actualisation…')
                : (lang === 'en' ? 'CIMA Compliant' : 'Tarification officielle CIMA')}
            </span>
          </div>

          <div className="quote-pricing-grid">
            <div className="quote-pricing-item">
              <small>{lang === 'en' ? 'Net Premium' : 'Prime Nette'}</small>
              <span>{formatFcfa(quoteCalculation.prime_nette_formatted || quoteCalculation.prime_nette)}</span>
            </div>
            <div className="quote-pricing-item">
              <small>{lang === 'en' ? 'Accessories / Fees' : 'Accessoires / Vignette'}</small>
              <span>{formatFcfa(quoteCalculation.accessoires_formatted || quoteCalculation.accessoires)}</span>
            </div>
            <div className="quote-pricing-item">
              <small>{lang === 'en' ? 'Unique Tax (15%)' : 'Taxe Unique (15%)'}</small>
              <span>{formatFcfa(quoteCalculation.taxe_unique_formatted || quoteCalculation.taxe_unique)}</span>
            </div>
            <div className="quote-pricing-item highlight">
              <small>{lang === 'en' ? 'Total Premium (TTC)' : 'Prime Totale TTC'}</small>
              <span>{formatFcfa(quoteCalculation.prime_ttc_formatted || quoteCalculation.prime_ttc)}</span>
            </div>
          </div>

          {quoteCalculation.breakdown && quoteCalculation.breakdown.length > 0 && (
            <>
              <button
                type="button"
                className="quote-pricing-toggle-breakdown"
                onClick={() => setShowCalculationBreakdown(!showCalculationBreakdown)}
              >
                {showCalculationBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showCalculationBreakdown
                  ? (lang === 'en' ? 'Hide details' : 'Masquer le détail du calcul')
                  : (lang === 'en' ? 'View calculation details' : 'Voir le détail du calcul')}
              </button>

              {showCalculationBreakdown && (
                <table className="quote-pricing-breakdown-table">
                  <thead>
                    <tr>
                      <th>{lang === 'en' ? 'Component' : 'Élément / Garantie'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Amount' : 'Montant'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteCalculation.breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          {lang === 'en' && item.label_en ? item.label_en : item.label}{' '}
                          {item.detail && <small style={{ color: '#64748b' }}>({item.detail})</small>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatFcfa(item.formatted || item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          <p className="quote-pricing-note">
            {lang === 'en'
              ? 'Estimation calculated according to official CIMA standards and current insurance regulations. The official quote PDF will be issued upon form submission.'
              : 'Estimation calculée selon la réglementation CIMA et les barèmes officiels en vigueur. Le récapitulatif PDF officiel sera généré dès la validation.'}
          </p>
        </div>
      )}

      {stepped ? (
        <div className="step-actions">
          {currentStep > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={goPrev}>
              {t('form.prev')}
            </button>
          ) : (
            <span />
          )}

          {isLast ? (
            <button type="submit" disabled={sending}>
              {submitLabel}
            </button>
          ) : (
            <button type="button" className="btn btn-gradient" onClick={goNext}>
              {t('form.next')}
            </button>
          )}
        </div>
      ) : (
        <button type="submit" disabled={sending}>
          {submitLabel}
        </button>
      )}
    </form>
  );
}