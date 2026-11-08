import type { Answers, FormField } from './types';
import type { TranslationKey } from './i18n/translations';

/**
 * Formate une date en YYYY-MM-DD
 */
export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retourne la date d'aujourd'hui formatée en YYYY-MM-DD
 */
export function getTodayYMD(): string {
  return formatYMD(new Date());
}

/**
 * Retourne la date d'il y a N années
 */
export function getYearsAgoYMD(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return formatYMD(d);
}

/**
 * Calcule l'âge en années révolues à partir d'une date de naissance (YYYY-MM-DD)
 */
export function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Détermine si le champ correspond à la date de naissance d'un conducteur
 */
export function isDriverBirthdateField(fieldName: string, categorySlug?: string): boolean {
  const name = fieldName.toLowerCase();
  const cat = (categorySlug || '').toLowerCase();

  if (name === 'driver_birthdate' || name === 'driver_birth_date' || name === 'date_naissance_conducteur') {
    return true;
  }

  // Dans un formulaire automobile, birth_date désigne le conducteur
  if ((cat === 'auto' || cat.includes('auto')) && (name === 'birth_date' || name === 'date_naissance' || name.includes('conducteur'))) {
    return true;
  }

  return (
    (name.includes('driver') && (name.includes('birth') || name.includes('age'))) ||
    (name.includes('conducteur') && (name.includes('naissance') || name.includes('age')))
  );
}

/**
 * Détermine si le champ correspond à un événement qui doit être dans le passé ou aujourd'hui (<= today)
 */
export function isPastDateField(fieldName: string): boolean {
  const name = fieldName.toLowerCase();
  return (
    name === 'incident_date' ||
    name === 'known_date' ||
    name === 'license_date' ||
    name === 'first_registration_date' ||
    name === 'birth_date' ||
    name === 'driver_birthdate' ||
    name === 'driver_birth_date' ||
    name === 'date_naissance' ||
    name.includes('sinistre') ||
    name.includes('incident') ||
    name.includes('naissance') ||
    name.includes('birth') ||
    name.includes('circulation') ||
    name.includes('permis')
  );
}

/**
 * Détermine si le champ correspond à une date de début ou d'effet qui doit être aujourd'hui ou dans le futur (>= today)
 */
export function isFutureDateField(fieldName: string): boolean {
  const name = fieldName.toLowerCase();
  return (
    name === 'start_date' ||
    name === 'departure_date' ||
    name === 'effective_date' ||
    name === 'date_debut' ||
    name === 'date_depart'
  );
}

/**
 * Calcule les bornes min et max pour un input type date
 */
export function getDateFieldLimits(
  field: FormField,
  categorySlug?: string,
  answers?: Answers
): { min?: string; max?: string } {
  const today = getTodayYMD();

  if (isDriverBirthdateField(field.name, categorySlug)) {
    // Le conducteur doit avoir au moins 21 ans (né au plus tard il y a 21 ans)
    return {
      min: getYearsAgoYMD(100),
      max: getYearsAgoYMD(21),
    };
  }

  if (isPastDateField(field.name)) {
    // Événement passé (sinistre, date de naissance générale, permis, mise en circulation) : jamais dans le futur
    return {
      min: getYearsAgoYMD(120),
      max: today,
    };
  }

  if (isFutureDateField(field.name)) {
    // Date de début souhaitée ou départ voyage : pas dans le passé
    return {
      min: today,
      max: getYearsAgoYMD(-2), // Jusqu'à 2 ans dans le futur
    };
  }

  if (field.name.toLowerCase() === 'return_date' || field.name.toLowerCase() === 'date_retour') {
    const depVal = answers?.departure_date || answers?.date_depart;
    const minDate = typeof depVal === 'string' && depVal ? depVal : today;
    return {
      min: minDate,
      max: getYearsAgoYMD(-2),
    };
  }

  return {};
}

/**
 * Valide la cohérence d'une date et retourne la clé de traduction d'erreur si invalide
 */
export function validateDateField(
  field: FormField,
  value: string | undefined | null,
  categorySlug?: string,
  answers?: Answers
): TranslationKey | null {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return null; // La règle "obligatoire" est traitée séparément
  }

  const valYMD = value.trim();
  const today = getTodayYMD();

  // 1. Conducteur : minimum 21 ans
  if (isDriverBirthdateField(field.name, categorySlug)) {
    const maxDate21 = getYearsAgoYMD(21);
    if (valYMD > maxDate21) {
      return 'validation.driver_min_age_21';
    }
    return null;
  }

  // 2. Événements passés : ne peuvent pas être dans le futur
  if (isPastDateField(field.name)) {
    if (valYMD > today) {
      return 'validation.date_cannot_be_future';
    }
    return null;
  }

  // 3. Date de début de contrat / départ voyage : ne peuvent pas être dans le passé
  if (isFutureDateField(field.name)) {
    if (valYMD < today) {
      return 'validation.date_cannot_be_past';
    }
    return null;
  }

  // 4. Date de retour voyage : >= date de départ
  if (field.name.toLowerCase() === 'return_date' || field.name.toLowerCase() === 'date_retour') {
    const depVal = answers?.departure_date || answers?.date_depart;
    if (typeof depVal === 'string' && depVal && valYMD < depVal) {
      return 'validation.return_after_departure';
    }
    if (valYMD < today) {
      return 'validation.date_cannot_be_past';
    }
    return null;
  }

  return null;
}
