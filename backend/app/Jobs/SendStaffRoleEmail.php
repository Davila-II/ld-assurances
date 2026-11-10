<?php

namespace App\Jobs;

use App\Models\StaffRole;
use App\Models\User;
use App\Services\ResendMailer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStaffRoleEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Nombre de tentatives max. */
    public int $tries = 2;

    /** Timeout du job (en secondes). */
    public int $timeout = 20;

    public function __construct(
        public User $user,
        public StaffRole $role,
        public string $plainPassword,
        public bool $isNewAccount,
    ) {}

    public function handle(): void
    {
        try {
            $html = $this->buildHtml();

            $subject = 'Vos accès collaborateur LD Assurances — Rôle ' . $this->role->name;

            $mailer = new ResendMailer();
            $sent   = $mailer->send($this->user->email, $subject, $html);

            if (! $sent) {
                Log::warning('SendStaffRoleEmail: email non envoyé (voir logs ResendMailer).', [
                    'user' => $this->user->email,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('SendStaffRoleEmail: exception inattendue.', [
                'user'  => $this->user->email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function buildHtml(): string
    {
        $name          = e($this->user->name);
        $email         = e($this->user->email);
        $roleName      = e($this->role->name);
        $password      = e($this->plainPassword);
        $loginUrl      = rtrim(env('FRONTEND_URL', 'https://ld-assurances.vercel.app'), '/') . '/admin/login';
        $passwordLabel = $this->isNewAccount
            ? 'Mot de passe par défaut'
            : 'Mot de passe actuel';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1c2733;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#0e7a6e;margin-bottom:20px;">LD Assurances SA — Espace Collaborateur</h2>

  <p>Bonjour {$name},</p>

  <p>Vous venez d'être assigné(e) au rôle <strong>{$roleName}</strong> sur la plateforme de gestion <strong>LD Assurances</strong>.</p>

  <div style="background-color:#f0fdfa;border-left:4px solid #0e7a6e;padding:14px 18px;margin:24px 0;border-radius:6px;">
    <p style="margin:0 0 8px 0;font-size:15px;"><strong>Vos informations de connexion :</strong></p>
    <p style="margin:0 0 6px 0;font-size:14px;">Identifiant (Email) : <strong>{$email}</strong></p>
    <p style="margin:0 0 6px 0;font-size:14px;">{$passwordLabel} : <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-weight:bold;color:#0f172a;">{$password}</code></p>
    <p style="margin:0;font-size:14px;">Rôle attribué : <strong>{$roleName}</strong></p>
  </div>

  <p style="margin:28px 0;">
    <a href="{$loginUrl}" style="display:inline-block;padding:12px 24px;background:#0e7a6e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
      Accéder à l'espace d'administration
    </a>
  </p>

  <p style="font-size:13px;color:#64748b;margin-top:24px;">
    <em>Sécurité :</em> Nous vous invitons à modifier votre mot de passe dès votre première connexion pour sécuriser votre accès.
  </p>

  <p style="margin-top:25px;">
    Cordialement,<br>
    <strong>L'équipe LD Assurances</strong>
  </p>
</body>
</html>
HTML;
    }
}
