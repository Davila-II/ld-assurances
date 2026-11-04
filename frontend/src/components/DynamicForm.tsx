import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check } from 'lucide-react';
import { getForm, submitForm, ApiError } from '../api';
import type { Answers, Category, FormField, FormType } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

interface Props {
  category: Category;
  formType?: FormType;
}

interface Step {
  title: string;
  fields: FormField[];
}

// Regroupe les questions par étape (section), dans l'ordre d'apparition
function buildSteps(fields: FormField[]): Step[] {
  const steps: Step[] = [];

  fields.forEach((field) => {
    const title = field.section ?? '';
    let step = steps.find((s) => s.title === title);

    if (!step) {
      step = { title, fields: [] };
      steps.push(step);
    }

    step.fields.push(field);
  });

  return steps;
}

// Premier message d'erreur d'une question (venant de Laravel ou de la vérification locale)
function findError(errors: Record<string, string[]>, name: string): string | null {
  const key = Object.keys(errors).find(
    (k) => k === `answers.${name}` || k.startsWith(`answers.${name}.`)
  );
  return key ? errors[key][0] : null;
}

export default function DynamicForm({ category, formType = 'claim' }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // champ piège pour les robots
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  const isClaim = formType === 'claim';

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

  const setAnswer = (name: string, value: Answers[string]) =>
    setAnswers((prev) => ({ ...prev, [name]: value }));

  // Une question avec condition ne s'affiche que si la condition est remplie
  const isVisible = (field: FormField): boolean => {
    if (!field.condition) return true;
    return answers[field.condition.field] === field.condition.equals;
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
  const shownFields = (stepped ? steps[currentStep].fields : fields).filter(isVisible);
  const showEmail = !stepped || isLast;

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Revient à l'étape qui contient la première erreur
  const jumpToError = (errs: Record<string, string[]>) => {
    if (!stepped) return;
    const index = steps.findIndex((s) => s.fields.some((f) => findError(errs, f.name)));
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
          missing.map((f) => [`answers.${f.name}`, ['Sélectionnez au moins une option.']])
        )
      );
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

    // Vérifications avant l'envoi : fichiers et choix obligatoires
    const localErrors: Record<string, string[]> = {};
    visibleFields.forEach((field) => {
      if (isEmptyRequiredChoice(field)) {
        localErrors[`answers.${field.name}`] = ['Sélectionnez au moins une option.'];
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
      setMessage('Vérifiez les champs signalés.');
      jumpToError(localErrors);
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append('category', category.slug);
    formData.append('form_type', formType);
    formData.append('email', email);
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
    const common = { id: field.name, required: field.is_required };

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            {...common}
            rows={4}
            value={text}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            {...common}
            type="number"
            value={text}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );

      case 'date':
        return (
          <input
            {...common}
            type="date"
            value={text}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            {...common}
            value={text}
            onChange={(e) => setAnswer(field.name, e.target.value)}
          >
            <option value="">Choisir…</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect': {
        const current = Array.isArray(value) ? value : [];
        return (
          <div className="choices">
            {(field.options ?? []).map((option) => (
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
                {option}
              </label>
            ))}
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

  if (loading) return <p>Chargement du formulaire…</p>;

  // Écran de confirmation après l'envoi
  if (reference) {
    return (
      <div className="success">
        <h2>
          {isClaim
            ? 'Votre déclaration a bien été envoyée'
            : 'Votre demande de devis a bien été envoyée'}
        </h2>
        <p>
          Votre numéro de dossier : <strong>{reference}</strong>
        </p>
        <p>Conservez-le pour suivre votre dossier.</p>
        <p>Un email de confirmation vous est envoyé à l'adresse indiquée.</p>
      </div>
    );
  }

  const submitLabel = sending
    ? 'Envoi en cours…'
    : isClaim
      ? 'Envoyer la déclaration'
      : 'Envoyer la demande de devis';

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
                <span className="stepper-label">{s.title}</span>
              </li>
            ))}
          </ol>

          <p className="step-count">
            Étape {currentStep + 1} sur {steps.length}
          </p>
          <h2 className="step-heading">{steps[currentStep].title}</h2>
        </>
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
          <label htmlFor="email">Adresse email *</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            placeholder="Ex : nom@exemple.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className="error">{errors.email[0]}</span>}
        </div>
      )}

      {shownFields.map((field) => (
        <div className="field" key={field.id}>
          {field.field_type === 'checkbox' ? (
            <label className="choice" htmlFor={field.name}>
              {renderInput(field)}
              <span>
                {field.label}
                {field.is_required ? ' *' : ''}
              </span>
            </label>
          ) : (
            <>
              <label htmlFor={field.name}>
                {field.label}
                {field.is_required ? ' *' : ''}
              </label>
              {renderInput(field)}
            </>
          )}
          {errorFor(field.name) && <span className="error">{errorFor(field.name)}</span>}
        </div>
      ))}

      {stepped ? (
        <div className="step-actions">
          {currentStep > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={goPrev}>
              Précédent
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
              Suivant
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