<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormController extends Controller
{
    // Renvoie la liste des catégories actives (auto, habitation, personne)
    public function categories(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug']);

        return response()->json($categories);
    }

    // Renvoie les questions d'une catégorie pour un type de formulaire
    public function show(Request $request, string $slug): JsonResponse
    {
        $type = $request->query('type', 'claim');

        if (! in_array($type, ['claim', 'quote'], true)) {
            return response()->json(['message' => 'Type de formulaire invalide.'], 422);
        }

        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $fields = $category->fields()
            ->where('form_type', $type)
            ->where('is_active', true)
            ->get(['id', 'name', 'label', 'field_type', 'is_required', 'options', 'condition', 'sort_order']);

        return response()->json([
            'category'  => [
                'id'   => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ],
            'form_type' => $type,
            'fields'    => $fields,
        ]);
    }
}