<?php

namespace App\Traits;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

trait ValidatesSubmissionDates
{
    /**
     * Valide les champs de date dans un tableau de réponses pour assurer leur cohérence avec la réalité.
     *
     * @param array $answers
     * @param string|null $categorySlug
     * @throws ValidationException
     */
    protected function validateDateAnswers(array $answers, ?string $categorySlug = null): void
    {
        $rules = [];
        $messages = [];
        $today = now()->format('Y-m-d');
        $minDriverBirth = now()->subYears(21)->format('Y-m-d');

        foreach ($answers as $key => $value) {
            if (empty($value) || ! is_string($value)) {
                continue;
            }

            $name = strtolower($key);
            $cat = strtolower($categorySlug ?? '');

            // 1. Date de naissance du conducteur : le conducteur doit avoir au moins 21 ans
            $isDriverBirth = in_array($name, ['driver_birthdate', 'driver_birth_date', 'date_naissance_conducteur'], true)
                || (($cat === 'auto' || str_contains($cat, 'auto')) && in_array($name, ['birth_date', 'driver_birthdate'], true))
                || (str_contains($name, 'driver') && str_contains($name, 'birth'))
                || (str_contains($name, 'conducteur') && str_contains($name, 'naissance'));

            if ($isDriverBirth) {
                $rules[$key] = ['date', "before_or_equal:{$minDriverBirth}"];
                $messages["{$key}.before_or_equal"] = "Le conducteur principal doit être âgé d'au moins 21 ans.";
                continue;
            }

            // 2. Événements passés (sinistre, date de naissance générale, permis, mise en circulation) : jamais dans le futur
            $isPast = in_array($name, ['incident_date', 'known_date', 'license_date', 'first_registration_date', 'birth_date', 'date_naissance'], true)
                || str_contains($name, 'incident')
                || str_contains($name, 'sinistre')
                || str_contains($name, 'naissance')
                || str_contains($name, 'birth')
                || str_contains($name, 'permis')
                || str_contains($name, 'circulation');

            if ($isPast) {
                $rules[$key] = ['date', "before_or_equal:{$today}"];
                $messages["{$key}.before_or_equal"] = "La date ne peut pas être postérieure à aujourd'hui.";
                continue;
            }

            // 3. Date de début ou d'effet ou départ voyage : pas dans le passé
            $isFuture = in_array($name, ['start_date', 'departure_date', 'effective_date', 'date_debut', 'date_depart'], true);

            if ($isFuture) {
                $rules[$key] = ['date', "after_or_equal:{$today}"];
                $messages["{$key}.after_or_equal"] = "La date ne peut pas être antérieure à aujourd'hui.";
                continue;
            }

            // 4. Date de retour voyage : >= date de départ et >= aujourd'hui
            if ($name === 'return_date' || $name === 'date_retour') {
                $depKey = isset($answers['departure_date']) ? 'departure_date' : (isset($answers['date_depart']) ? 'date_depart' : null);
                if ($depKey && ! empty($answers[$depKey])) {
                    $rules[$key] = ['date', "after_or_equal:{$depKey}"];
                    $messages["{$key}.after_or_equal"] = "La date de retour doit être postérieure ou égale à la date de départ.";
                } else {
                    $rules[$key] = ['date', "after_or_equal:{$today}"];
                    $messages["{$key}.after_or_equal"] = "La date de retour ne peut pas être antérieure à aujourd'hui.";
                }
            }
        }

        if (! empty($rules)) {
            Validator::make($answers, $rules, $messages)->validate();
        }
    }
}
