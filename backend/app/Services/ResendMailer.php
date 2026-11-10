<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;

/**
 * Envoi d'emails via l'API HTTP Resend (port 443).
 * Contourne le blocage SMTP de Render (plan gratuit).
 */
class ResendMailer
{
    private Client $http;
    private string $apiKey;
    private string $fromAddress;
    private string $fromName;

    public function __construct()
    {
        $this->http        = new Client(['timeout' => 10]);
        $this->apiKey      = config('services.resend.key', env('RESEND_API_KEY', env('RESEND_KEY', '')));
        $this->fromAddress = config('mail.from.address', 'no-reply@ld-assurances.fr');
        $this->fromName    = config('mail.from.name', 'LD Assurances');
    }

    /**
     * Envoie un email HTML via l'API Resend.
     *
     * @param  string  $to       Adresse e-mail du destinataire
     * @param  string  $subject  Sujet de l'e-mail
     * @param  string  $html     Corps HTML de l'e-mail
     * @return bool
     */
    public function send(string $to, string $subject, string $html): bool
    {
        if (empty($this->apiKey)) {
            Log::warning('ResendMailer: RESEND_KEY non configurée — email non envoyé.', ['to' => $to]);
            return false;
        }

        try {
            $response = $this->http->post('https://api.resend.com/emails', [
                'headers' => [
                    'Authorization' => "Bearer {$this->apiKey}",
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'from'    => "{$this->fromName} <{$this->fromAddress}>",
                    'to'      => [$to],
                    'subject' => $subject,
                    'html'    => $html,
                ],
            ]);

            $status = $response->getStatusCode();

            if ($status >= 200 && $status < 300) {
                Log::info('ResendMailer: email envoyé.', ['to' => $to, 'subject' => $subject]);
                return true;
            }

            Log::error('ResendMailer: réponse inattendue.', ['status' => $status, 'body' => (string) $response->getBody()]);
            return false;
        } catch (GuzzleException $e) {
            Log::error('ResendMailer: erreur HTTP.', ['to' => $to, 'error' => $e->getMessage()]);
            return false;
        }
    }
}
