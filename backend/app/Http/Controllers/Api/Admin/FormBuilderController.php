<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\FormField;
use App\Models\PricingRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FormBuilderController extends Controller
{
    private const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'file'];

    // Liste des catégories avec leur état et le nombre de questions par type.
    // Filtrable par ?type=quote ou ?type=claim (ou ?form_type=...)
    public function categories(Request $request): JsonResponse
    {
        $type = $request->query('form_type', $request->query('type'));

        $query = Category::orderBy('sort_order');

        if ($type !== null && in_array($type, ['quote', 'claim'], true)) {
            $query->where(function ($q) use ($type) {
                $q->where('form_type', $type);
            });
        }

        $categories = $query
            ->with(['pricingRule:id,name,name_en,code,driver'])
            ->withCount([
                'fields as quote_count' => fn ($q) => $q->where('form_type', 'quote')->where('is_active', true),
                'fields as claim_count' => fn ($q) => $q->where('form_type', 'claim')->where('is_active', true),
            ])
            ->get()
            ->map(fn (Category $c) => [
                'id'              => $c->id,
                'name'            => $c->name,
                'name_en'         => $c->name_en,
                'slug'            => $c->slug,
                'form_type'       => $c->form_type,
                'pricing_rule_id' => $c->pricing_rule_id,
                'pricing_rule'    => $c->pricingRule ? [
                    'id'      => $c->pricingRule->id,
                    'name'    => $c->pricingRule->name,
                    'name_en' => $c->pricingRule->name_en,
                    'code'    => $c->pricingRule->code,
                    'driver'  => $c->pricingRule->driver,
                ] : null,
                'is_active'       => $c->is_active,
                'sort_order'      => $c->sort_order,
                'quote_count'     => $c->quote_count,
                'claim_count'     => $c->claim_count,
            ]);

        return response()->json($categories);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            'name_en'          => ['nullable', 'string', 'max:100'],
            'form_type'        => ['nullable', 'in:quote,claim'],
            'pricing_rule_id'  => ['nullable', 'integer', 'exists:pricing_rules,id'],
            'new_pricing_rule' => ['nullable', 'array'],
            'new_pricing_rule.name'         => ['required_with:new_pricing_rule', 'string', 'max:150'],
            'new_pricing_rule.name_en'      => ['nullable', 'string', 'max:150'],
            'new_pricing_rule.driver'       => ['required_with:new_pricing_rule', 'string', 'in:automobile,voyage,habitation,sante,professionnelle,responsabilite_civile,autres,custom'],
            'new_pricing_rule.parameters'   => ['nullable', 'array'],
            'new_pricing_rule.formula_code' => ['nullable', 'string', 'max:2000'],
        ]);

        $baseSlug = Str::slug($data['name']);
        if (empty($baseSlug)) {
            $baseSlug = 'categorie';
        }
        $slug = $baseSlug;
        $counter = 1;
        while (Category::where('slug', $slug)->exists()) {
            $typePrefix = $data['form_type'] ?? 'cat';
            $slug = "{$baseSlug}-{$typePrefix}-{$counter}";
            $counter++;
        }

        $pricingRuleId = $data['pricing_rule_id'] ?? null;

        // Si l'administrateur a choisi de créer un nouveau calcul pour ce devis
        if (!empty($data['new_pricing_rule'])) {
            $newRuleData = $data['new_pricing_rule'];
            $ruleCode = Str::slug($newRuleData['name']);
            $origRuleCode = $ruleCode;
            $rCount = 1;
            while (PricingRule::where('code', $ruleCode)->exists()) {
                $ruleCode = "{$origRuleCode}-{$rCount}";
                $rCount++;
            }

            $parameters = $newRuleData['parameters'] ?? [];
            if (empty($parameters)) {
                $templates = PricingRule::defaultTemplates();
                $parameters = $templates[$newRuleData['driver']]['parameters'] ?? [
                    'base_amount' => 25000,
                    'rate'        => 0.01,
                    'accessoires' => 5000,
                    'taxe_unique' => 0.15,
                ];
            }

            $createdRule = PricingRule::create([
                'name'         => $newRuleData['name'],
                'name_en'      => $newRuleData['name_en'] ?? null,
                'code'         => $ruleCode,
                'driver'       => $newRuleData['driver'],
                'parameters'   => $parameters,
                'formula_code' => $newRuleData['formula_code'] ?? null,
                'is_active'    => true,
            ]);

            $pricingRuleId = $createdRule->id;
        }

        $category = Category::create([
            'name'            => $data['name'],
            'name_en'         => $data['name_en'] ?? null,
            'form_type'       => $data['form_type'] ?? null,
            'pricing_rule_id' => $pricingRuleId,
            'slug'            => $slug,
            'is_active'       => true,
            'sort_order'      => (int) Category::max('sort_order') + 1,
        ]);

        $category->load('pricingRule:id,name,name_en,code,driver');

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name'            => ['sometimes', 'required', 'string', 'max:100'],
            'name_en'         => ['nullable', 'string', 'max:100'],
            'form_type'       => ['nullable', 'in:quote,claim'],
            'pricing_rule_id' => ['nullable', 'integer', 'exists:pricing_rules,id'],
            'is_active'       => ['sometimes', 'boolean'],
            'sort_order'      => ['sometimes', 'integer', 'min:0'],
        ]);

        $category->update($data);
        $category->load('pricingRule:id,name,name_en,code,driver');

        return response()->json($category->fresh());
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        if ($category->submissions()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer cette catégorie car elle est rattachée à des dossiers existants. Vous pouvez la désactiver à la place.',
            ], 422);
        }

        $category->fields()->delete();
        $category->delete();

        return response()->json(['message' => 'Catégorie supprimée avec succès.']);
    }

    // Questions d'une catégorie pour un type de formulaire
    public function fields(Request $request, Category $category): JsonResponse
    {
        $type = $request->query('type', 'quote');

        if (! in_array($type, ['quote', 'claim'], true)) {
            return response()->json(['message' => 'Type de formulaire invalide.'], 422);
        }

        $fields = $category->fields()
            ->where('form_type', $type)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (FormField $f) => $this->payload($f));

        return response()->json($fields);
    }

    public function storeField(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate($this->storeRules($category));

        if (array_key_exists('condition', $data)) {
            if (empty($data['condition']['field']) || empty($data['condition']['equals'])) {
                $data['condition'] = null;
            }
        }

        $max = (int) ($category->fields()->where('form_type', $data['form_type'])->max('sort_order') ?? 0);

        $field = $category->fields()->create([
            'form_type'      => $data['form_type'],
            'name'           => $data['name'],
            'label'          => $data['label'],
            'label_en'       => $data['label_en'] ?? null,
            'placeholder'    => $data['placeholder'] ?? null,
            'placeholder_en' => $data['placeholder_en'] ?? null,
            'section'        => $data['section'] ?? null,
            'section_en'     => $data['section_en'] ?? null,
            'field_type'     => $data['field_type'],
            'is_required'    => (bool) ($data['is_required'] ?? false),
            'options'        => $data['options'] ?? null,
            'options_en'     => $data['options_en'] ?? null,
            'condition'      => $data['condition'] ?? null,
            'sort_order'     => $max + 1,
            'is_active'      => true,
        ]);

        return response()->json($this->payload($field), 201);
    }

    public function updateField(Request $request, FormField $field): JsonResponse
    {
        $data = $request->validate([
            'label'          => ['sometimes', 'required', 'string', 'max:255'],
            'label_en'       => ['nullable', 'string', 'max:255'],
            'placeholder'    => ['nullable', 'string', 'max:255'],
            'placeholder_en' => ['nullable', 'string', 'max:255'],
            'section'        => ['nullable', 'string', 'max:100'],
            'section_en'     => ['nullable', 'string', 'max:100'],
            'field_type'     => ['sometimes', 'required', Rule::in(self::FIELD_TYPES)],
            'is_required'    => ['sometimes', 'boolean'],
            'options'        => ['nullable', 'array'],
            'options_en'     => ['nullable', 'array'],
            'condition'      => ['nullable', 'array:field,equals'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('condition', $data)) {
            if (empty($data['condition']['field']) || empty($data['condition']['equals'])) {
                $data['condition'] = null;
            }
        }

        $field->update($data);

        return response()->json($this->payload($field->fresh()));
    }

    // Désactivation (jamais de suppression définitive pour préserver les réponses antérieures)
    public function destroyField(FormField $field): JsonResponse
    {
        $field->update(['is_active' => false]);

        return response()->json(['id' => $field->id, 'is_active' => false]);
    }

    // Réordonnancement : on envoie la liste des ids dans l'ordre souhaité
    public function reorder(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'form_type'   => ['required', 'in:quote,claim'],
            'field_ids'   => ['required', 'array'],
            'field_ids.*' => ['integer'],
        ]);

        $category->fields()
            ->where('form_type', $data['form_type'])
            ->whereIn('id', $data['field_ids'])
            ->get()
            ->each(function (FormField $field) use ($data) {
                $position = array_search($field->id, $data['field_ids'], true);
                if ($position !== false) {
                    $field->update(['sort_order' => $position + 1]);
                }
            });

        return response()->json(['message' => 'Ordre mis à jour.']);
    }

    private function storeRules(Category $category): array
    {
        return [
            'form_type'      => ['required', Rule::in(['quote', 'claim'])],
            'name'           => [
                'required', 'string', 'max:100',
                Rule::unique('form_fields', 'name')
                    ->where(fn ($q) => $q->where('category_id', $category->id)->where('form_type', request('form_type'))),
            ],
            'label'          => ['required', 'string', 'max:255'],
            'label_en'       => ['nullable', 'string', 'max:255'],
            'placeholder'    => ['nullable', 'string', 'max:255'],
            'placeholder_en' => ['nullable', 'string', 'max:255'],
            'section'        => ['nullable', 'string', 'max:100'],
            'section_en'     => ['nullable', 'string', 'max:100'],
            'field_type'     => ['required', Rule::in(self::FIELD_TYPES)],
            'is_required'    => ['sometimes', 'boolean'],
            'options'        => ['nullable', 'array'],
            'options_en'     => ['nullable', 'array'],
            'condition'      => ['nullable', 'array:field,equals'],
        ];
    }

    private function payload(FormField $f): array
    {
        return [
            'id'             => $f->id,
            'name'           => $f->name,
            'label'          => $f->label,
            'label_en'       => $f->label_en,
            'placeholder'    => $f->placeholder,
            'placeholder_en' => $f->placeholder_en,
            'section'        => $f->section,
            'section_en'     => $f->section_en,
            'field_type'     => $f->field_type,
            'is_required'    => $f->is_required,
            'options'        => $f->options,
            'options_en'     => $f->options_en,
            'condition'      => $f->condition,
            'sort_order'     => $f->sort_order,
            'is_active'      => $f->is_active,
        ];
    }
}
