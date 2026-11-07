<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AdminNewSubmission;
use App\Mail\SubmissionReceived;
use App\Models\Category;
use App\Models\FormField;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class SubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Piège anti-robots : ce champ est invisible, seul un robot le remplit
        if ($request->filled('website')) {
            $prefix = $request->input('form_type') === 'quote' ? 'LD-DV' : 'LD-DS';
            $date = now()->format('dmY');

            return response()->json([
                'message'   => 'Votre demande a bien été enregistrée.',
                'reference' => sprintf('%s-%04d-%s', $prefix, 9999, $date),
            ], 201);
        }

        // 1. Vérifications de base : catégorie, type de formulaire, email
        $base = $request->validate([
            'category'  => ['required', 'string', 'exists:categories,slug'],
            'form_type' => ['required', 'in:claim,quote'],
            'email'     => ['required', 'email', 'max:255'],
        ]);

        $category = Category::where('slug', $base['category'])
            ->where('is_active', true)
            ->firstOrFail();

        // Si un client connecté envoie le formulaire (ou s'il possède déjà un compte client avec cet email), le dossier est rattaché à son compte
        $client = $request->user('sanctum');
        $cleanEmail = Str::lower(trim($base['email']));
        $userId = ($client && $client->role === 'client')
            ? $client->id
            : \App\Models\User::where('role', 'client')
                ->whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                ->value('id');

        // 2. Les questions de ce formulaire, telles qu'enregistrées en base
        $fields = $category->fields()
            ->where('form_type', $base['form_type'])
            ->where('is_active', true)
            ->get();

        // 3. On ne garde que les questions réellement affichées au client
        $visible = $fields->filter(fn (FormField $field) => $this->isVisible($field, $request));

        // 4. Règles de validation construites à partir de ces questions
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

        // 6. Copie des questions au moment de l'envoi (historique)
        $snapshot = $visible->map(fn (FormField $field) => [
            'name'        => $field->name,
            'label'       => $field->label,
            'field_type'  => $field->field_type,
            'is_required' => $field->is_required,
            'options'     => $field->options,
        ])->values()->all();

        // 7. Enregistrement ; si quelque chose échoue, on supprime les fichiers déjà copiés
        $storedPaths = [];

        try {
            $submission = DB::transaction(function () use ($request, $base, $category, $userId, $answers, $snapshot, $visible, &$storedPaths) {
                $submission = Submission::create([
                    'category_id'   => $category->id,
                    'user_id'       => $userId,
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
                        $storedPaths[] = $path;

                        $submission->attachments()->create([
                            // MySQL refuse un texte plus long que la colonne : on limite la longueur
                            'original_name' => Str::limit($file->getClientOriginalName(), 200, ''),
                            'path'          => $path,
                            'mime_type'     => $file->getMimeType(),
                            'size'          => $file->getSize(),
                        ]);
                    }
                }

                return $submission;
            });
        } catch (Throwable $e) {
            if (! empty($storedPaths)) {
                Storage::delete($storedPaths);
            }

            Log::error('Échec enregistrement soumission', ['message' => $e->getMessage()]);

            return response()->json([
                'message' => "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.",
            ], 500);
        }

        // Emails : chacun a sa propre protection, un échec ne bloque jamais la demande
        $submission->loadMissing('category');

        try {
            Mail::to($submission->email)->send(new SubmissionReceived($submission));
        } catch (Throwable $e) {
            Log::error('Échec envoi email de confirmation', ['message' => $e->getMessage()]);
        }

        $adminEmail = (string) config('mail.admin_email');

        if ($adminEmail !== '') {
            try {
                Mail::to($adminEmail)->send(new AdminNewSubmission($submission));
            } catch (Throwable $e) {
                Log::error('Échec envoi email administrateur', ['message' => $e->getMessage()]);
            }
        }

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
            'textarea'    => [$key => [$presence, 'string', 'max:5000']],
            'number'      => [$key => [$presence, 'numeric']],
            'date'        => [$key => [$presence, 'date']],
            'select'      => [$key => [$presence, Rule::in($options)]],
            'multiselect' => [
                $key       => [$presence, 'array'],
                "{$key}.*" => [Rule::in($options)],
            ],
            'checkbox'    => [$key => [$presence, 'boolean']],
            'file'        => [
                $key       => [$presence, 'array', 'max:5'],
                "{$key}.*" => [
                    'file',
                    'max:5120', // 5 Mo
                    'mimes:jpg,jpeg,png,pdf',
                    'mimetypes:image/jpeg,image/png,application/pdf',
                ],
            ],
            default       => [$key => [$presence, 'string', 'max:255']],
        };
    }
}