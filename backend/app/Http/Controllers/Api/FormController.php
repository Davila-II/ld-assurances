<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormController extends Controller
{
    // Liste des catégories actives. Avec ?type=claim ou ?type=quote, seulement celles qui ont un formulaire de ce type
    public function categories(Request $request): JsonResponse
    {
        $type = $request->query('type');

        if ($type !== null && ! in_array($type, ['claim', 'quote'], true)) {
            return response()->json(['message' => 'Type de formulaire invalide.'], 422);
        }

        $query = Category::where('is_active', true)->orderBy('sort_order');

        if ($type !== null) {
            $query->where(function ($q) use ($type) {
                $q->where('form_type', $type)->orWhereNull('form_type');
            })->whereHas('fields', fn ($q) => $q->where('form_type', $type)->where('is_active', true));
        }

        return response()->json($query->get(['id', 'name', 'name_en', 'slug', 'form_type']));
    }

    // Renvoie les questions d'une catégorie pour un type de formulaire
    public function show(Request $request, string $slug): JsonResponse
    {
        $type = $request->query('type', 'claim');

        if (! in_array($type, ['claim', 'quote'], true)) {
            return response()->json(['message' => 'Type de formulaire invalide.'], 422);
        }

        $category = Category::with('pricingRule')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where(function ($q) use ($type) {
                $q->where('form_type', $type)->orWhereNull('form_type');
            })
            ->first() ?? Category::with('pricingRule')->where('slug', $slug)->where('is_active', true)->firstOrFail();

        $fields = $category->fields()
            ->where('form_type', $type)
            ->where('is_active', true)
            ->get([
                'id',
                'name',
                'label',
                'label_en',
                'placeholder',
                'placeholder_en',
                'section',
                'section_en',
                'field_type',
                'is_required',
                'options',
                'options_en',
                'condition',
                'sort_order',
            ]);

        $hasPricing = ($type === 'quote' && ($category->pricing_rule_id !== null || in_array($category->slug, ['auto', 'voyage', 'habitation', 'personne', 'professionnelle', 'responsabilite-civile', 'autres'], true)));

        return response()->json([
            'category'  => [
                'id'                     => $category->id,
                'name'                   => $category->name,
                'name_en'                => $category->name_en,
                'slug'                   => $category->slug,
                'form_type'              => $category->form_type,
                'pricing_rule_id'        => $category->pricing_rule_id,
                'has_pricing_calculator' => $hasPricing,
                'pricing_rule'           => $category->pricingRule ? [
                    'id'      => $category->pricingRule->id,
                    'name'    => $category->pricingRule->name,
                    'name_en' => $category->pricingRule->name_en,
                    'driver'  => $category->pricingRule->driver,
                ] : null,
            ],
            'form_type' => $type,
            'fields'    => $fields,
        ]);
    }
}
