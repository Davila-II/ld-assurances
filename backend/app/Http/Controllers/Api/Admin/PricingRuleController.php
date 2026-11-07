<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PricingRule;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PricingRuleController extends Controller
{
    /**
     * Liste toutes les règles de calcul disponibles.
     */
    public function index(): JsonResponse
    {
        $rules = PricingRule::withCount('categories')
            ->orderBy('id')
            ->get();

        return response()->json($rules);
    }

    /**
     * Détail d'une règle de calcul.
     */
    public function show(PricingRule $pricingRule): JsonResponse
    {
        $pricingRule->load('categories:id,name,name_en,slug,pricing_rule_id');

        return response()->json($pricingRule);
    }

    /**
     * Création d'une nouvelle règle de calcul personnalisée par l'administrateur.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:150'],
            'name_en'      => ['nullable', 'string', 'max:150'],
            'code'         => ['nullable', 'string', 'max:50', 'unique:pricing_rules,code'],
            'description'  => ['nullable', 'string', 'max:500'],
            'driver'       => ['required', 'string', 'in:automobile,voyage,habitation,sante,professionnelle,responsabilite_civile,autres,custom'],
            'parameters'   => ['nullable', 'array'],
            'formula_code' => ['nullable', 'string', 'max:2000'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $code = !empty($data['code']) ? Str::slug($data['code']) : Str::slug($data['name']);
        $originalCode = $code;
        $counter = 1;
        while (PricingRule::where('code', $code)->exists()) {
            $code = "{$originalCode}-{$counter}";
            $counter++;
        }

        // Si aucun paramètre n'a été spécifié, on charge les paramètres par défaut du driver choisi
        $parameters = $data['parameters'] ?? [];
        if (empty($parameters)) {
            $templates = PricingRule::defaultTemplates();
            $parameters = $templates[$data['driver']]['parameters'] ?? [
                'base_amount' => 25000,
                'rate'        => 0.01,
                'accessoires' => 5000,
                'taxe_unique' => 0.15,
            ];
        }

        $rule = PricingRule::create([
            'name'         => $data['name'],
            'name_en'      => $data['name_en'] ?? null,
            'code'         => $code,
            'description'  => $data['description'] ?? null,
            'driver'       => $data['driver'],
            'parameters'   => $parameters,
            'formula_code' => $data['formula_code'] ?? null,
            'is_active'    => $data['is_active'] ?? true,
        ]);

        return response()->json($rule, 201);
    }

    /**
     * Modification d'une règle de calcul par l'administrateur.
     */
    public function update(Request $request, PricingRule $pricingRule): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['sometimes', 'required', 'string', 'max:150'],
            'name_en'      => ['nullable', 'string', 'max:150'],
            'description'  => ['nullable', 'string', 'max:500'],
            'driver'       => ['sometimes', 'required', 'string', 'in:automobile,voyage,habitation,sante,professionnelle,responsabilite_civile,autres,custom'],
            'parameters'   => ['sometimes', 'array'],
            'formula_code' => ['nullable', 'string', 'max:2000'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $pricingRule->update($data);

        return response()->json($pricingRule->fresh());
    }

    /**
     * Suppression d'une règle personnalisée.
     */
    public function destroy(PricingRule $pricingRule): JsonResponse
    {
        // On protège les templates fondamentaux contre la suppression accidentelle
        $coreTemplates = array_keys(PricingRule::defaultTemplates());
        if (in_array($pricingRule->code, $coreTemplates, true)) {
            return response()->json([
                'message' => 'Cette règle de tarification standard ne peut pas être supprimée. Vous pouvez la désactiver ou modifier ses paramètres.',
            ], 422);
        }

        $pricingRule->categories()->update(['pricing_rule_id' => null]);
        $pricingRule->delete();

        return response()->json(['message' => 'Règle de tarification supprimée avec succès.']);
    }

    /**
     * Simulation en direct d'un calcul pour tester les modifications de l'admin.
     */
    public function test(Request $request, PricingRule $pricingRule, PricingService $pricingService): JsonResponse
    {
        $answers = $request->input('answers', []);
        $simulatedRule = clone $pricingRule;

        // Si l'admin teste des paramètres temporaires non encore sauvegardés
        if ($request->has('parameters')) {
            $simulatedRule->parameters = $request->input('parameters');
        }

        $result = $pricingService->calculate($simulatedRule, $answers);

        return response()->json($result ?: ['has_calculation' => false]);
    }
}
