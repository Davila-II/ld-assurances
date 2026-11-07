<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\FormField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FormBuilderController extends Controller
{
    private const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'file'];

    // Liste des catégories avec leur état et le nombre de questions par type
    public function categories(): JsonResponse
    {
        $categories = Category::orderBy('sort_order')
            ->withCount([
                'fields as quote_count' => fn ($q) => $q->where('form_type', 'quote')->where('is_active', true),
                'fields as claim_count' => fn ($q) => $q->where('form_type', 'claim')->where('is_active', true),
            ])
            ->get()
            ->map(fn (Category $c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'slug'        => $c->slug,
                'is_active'   => $c->is_active,
                'sort_order'  => $c->sort_order,
                'quote_count' => $c->quote_count,
                'claim_count' => $c->claim_count,
            ]);

        return response()->json($categories);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $category = Category::create([
            'name'       => $data['name'],
            'slug'       => Str::slug($data['name']),
            'is_active'  => true,
            'sort_order' => (int) Category::max('sort_order') + 1,
        ]);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['sometimes', 'required', 'string', 'max:100'],
            'is_active'  => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $category->update($data);

        return response()->json($category->fresh());
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
            'form_type'   => $data['form_type'],
            'name'        => $data['name'],
            'label'       => $data['label'],
            'placeholder' => $data['placeholder'] ?? null,
            'section'     => $data['section'] ?? null,
            'field_type'  => $data['field_type'],
            'is_required' => (bool) ($data['is_required'] ?? false),
            'options'     => $data['options'] ?? null,
            'condition'   => $data['condition'] ?? null,
            'sort_order'  => $max + 1,
            'is_active'   => true,
        ]);

        return response()->json($this->payload($field), 201);
    }

    public function updateField(Request $request, FormField $field): JsonResponse
    {
        $data = $request->validate([
            'label'       => ['sometimes', 'required', 'string', 'max:255'],
            'placeholder' => ['nullable', 'string', 'max:255'],
            'section'     => ['nullable', 'string', 'max:100'],
            'field_type'  => ['sometimes', 'required', Rule::in(self::FIELD_TYPES)],
            'is_required' => ['sometimes', 'boolean'],
            'options'     => ['nullable', 'array'],
            'condition'   => ['nullable', 'array:field,equals'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('condition', $data)) {
            if (empty($data['condition']['field']) || empty($data['condition']['equals'])) {
                $data['condition'] = null;
            }
        }

        $field->update($data);

        return response()->json($this->payload($field->fresh()));
    }

    // Désactivation (jamais de suppression définitive : les réponses existantes y font référence)
    public function destroyField(FormField $field): JsonResponse
    {
        $field->update(['is_active' => false]);

        return response()->json(['id' => $field->id, 'is_active' => false]);
    }

    // Réordonnancement : on envoie la liste des ids dans l'ordre souhaité
    public function reorder(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'form_type' => ['required', 'in:quote,claim'],
            'field_ids' => ['required', 'array'],
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
            'form_type'   => ['required', Rule::in(['quote', 'claim'])],
            'name'        => [
                'required', 'string', 'max:100',
                Rule::unique('form_fields', 'name')
                    ->where(fn ($q) => $q->where('category_id', $category->id)->where('form_type', request('form_type'))),
            ],
            'label'       => ['required', 'string', 'max:255'],
            'placeholder' => ['nullable', 'string', 'max:255'],
            'section'     => ['nullable', 'string', 'max:100'],
            'field_type'  => ['required', Rule::in(self::FIELD_TYPES)],
            'is_required' => ['sometimes', 'boolean'],
            'options'     => ['nullable', 'array'],
            'condition'   => ['nullable', 'array:field,equals'],
        ];
    }

    private function payload(FormField $f): array
    {
        return [
            'id'          => $f->id,
            'name'        => $f->name,
            'label'       => $f->label,
            'placeholder' => $f->placeholder,
            'section'     => $f->section,
            'field_type'  => $f->field_type,
            'is_required' => $f->is_required,
            'options'     => $f->options,
            'condition'   => $f->condition,
            'sort_order'  => $f->sort_order,
            'is_active'   => $f->is_active,
        ];
    }
}
