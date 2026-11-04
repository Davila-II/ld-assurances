import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getForm, submitForm, ApiError } from '../api';
import type { Answers, Category, FormField, FormType } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

interface Props {
  category: Category;
  formType?: FormType;
}

export default function DynamicForm({ category, formType = 'claim' }: Props) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // champ piège pour les robots
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  const isClaim = formType === 'claim';

  // Chargement des questions quand la catégorie ou le type de formulaire change
  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setAnswers({});
    setErrors({});
    setMessage('');
    setReference('');

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

  // Message d'erreur d'une question (venant de Laravel ou de la vérification locale)
  const errorFor = (name: string): string | null => {
    const key = Object.keys(errors).find(
      (k) => k === `answers.${name}` || k.startsWith(`answers.${name}.`)
    );
    return key ? errors[key][0] : null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    const visibleFields = fields.filter(isVisible);

    // Vérification des fichiers avant l'envoi
    const localErrors: Record<string, string[]> = {};
    visibleFields.forEach((field) => {
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

  return (
    <form onSubmit={handleSubmit} className="form">
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

      <div className="field">
        <label htmlFor="email">Adresse email *</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <span className="error">{errors.email[0]}</span>}
      </div>

      {fields.filter(isVisible).map((field) => (
        <div className="field" key={field.id}>
          <label htmlFor={field.name}>
            {field.label}
            {field.is_required ? ' *' : ''}
          </label>
          {renderInput(field)}
          {errorFor(field.name) && <span className="error">{errorFor(field.name)}</span>}
        </div>
      ))}

      <button type="submit" disabled={sending}>
        {sending
          ? 'Envoi en cours…'
          : isClaim
            ? 'Envoyer la déclaration'
            : 'Envoyer la demande de devis'}
      </button>
    </form>
  );
}