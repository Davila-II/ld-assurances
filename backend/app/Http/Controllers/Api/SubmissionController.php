<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\FormField;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // 1. Vérifications de base : catégorie, type de formulaire, email
        $base = $request->validate([
            'category'  => ['required', 'string', 'exists:categories,slug'],
            'form_type' => ['required', 'in:claim,quote'],
            'email'     => ['required', 'email', 'max:255'],
        ]);

        $category = Category::where('slug', $base['category'])
            ->where('is_active', true)
            ->firstOrFail();

        // 2. Les questions de ce formulaire, telles qu'enregistrées en base
        $fields = $category->fields()
            ->where('form_type', $base['form_type'])
            ->where('is_active', true)
            ->get();

        // 3. On ne garde que les questions réellement affichées au client
        $visible = $fields->filter(fn (FormField $field) => $this->isVisible($field, $request));

        // 4. On construit les règles de validation à partir de ces questions
        $rules = [];
        foreach ($visible as $field) {
            $rules = array_merge($rules, $this->rulesFor($field));
        }

        Validator::make($request->all(), $rules)->validate();

        // 5. Les réponses texte (les fichiers sont traités à part)
        $answers = [];
        foreach ($visible->where('field_type', '!=', 'file') as $field) {
            $answers[$field->name] = $request->input("answers.{$field->name}");
        }

        // 6. Copie des questions au moment de l'envoi
        $snapshot = $visible->map(fn (FormField $field) => [
            'name'       => $field->name,
            'label'      => $field->label,
            'field_type' => $field->field_type,
        ])->values()->all();

        // 7. Enregistrement de la soumission et des pièces jointes
        $submission = DB::transaction(function () use ($request, $base, $category, $answers, $snapshot, $visible) {
            $submission = Submission::create([
                'category_id'   => $category->id,
                'form_type'     => $base['form_type'],
                'email'         => $base['email'],
                'status'        => 'received',
                'answers'       => $answers,
                'form_snapshot' => $snapshot,
            ]);

            foreach ($visible->where('field_type', 'file') as $field) {
                $files = Arr::wrap($request->file("answers.{$field->name}"));

                foreach ($files as $file) {
                    $path = $file->store("submissions/{$submission->reference}");

                    $submission->attachments()->create([
                        'original_name' => $file->getClientOriginalName(),
                        'path'          => $path,
                        'mime_type'     => $file->getClientMimeType(),
                        'size'          => $file->getSize(),
                    ]);
                }
            }

            return $submission;
        });

        return response()->json([
            'message'   => 'Votre demande a bien été enregistrée.',
            'reference' => $submission->reference,
        ], 201);
    }

    // Une question conditionnelle n'est visible que si la condition est remplie
    private function isVisible(FormField $field, Request $request): bool
    {
        $condition = $field->condition;

        if (empty($condition)) {
            return true;
        }

        return (string) $request->input('answers.' . $condition['field']) === (string) $condition['equals'];
    }

    // Règles de validation d'une question, selon son type
    private function rulesFor(FormField $field): array
    {
        $key = "answers.{$field->name}";
        $presence = $field->is_required ? 'required' : 'nullable';
        $options = $field->options ?? [];

        return match ($field->field_type) {
            'textarea' => [$key => [$presence, 'string', 'max:5000']],
            'number'   => [$key => [$presence, 'numeric']],
            'date'     => [$key => [$presence, 'date']],
            'select'   => [$key => [$presence, Rule::in($options)]],
            'multiselect' => [
                $key         => [$presence, 'array'],
                "{$key}.*"   => [Rule::in($options)],
            ],
            'checkbox' => [$key => [$presence, 'boolean']],
            'file' => [
                $key       => [$presence, 'array'],
                "{$key}.*" => ['file', 'max:5120', 'mimes:jpg,jpeg,png,pdf'],
            ],
            default => [$key => [$presence, 'string', 'max:255']],
        };
    }
}