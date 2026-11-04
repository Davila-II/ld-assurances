<?php

namespace Tests\Unit;

use App\Models\FormField;
use App\Models\Submission;
use PHPUnit\Framework\TestCase;

class ModelTest extends TestCase
{
    public function test_status_label_maps_each_status(): void
    {
        $this->assertSame('Reçu', (new Submission(['status' => 'received']))->statusLabel());
        $this->assertSame('En cours', (new Submission(['status' => 'in_progress']))->statusLabel());
        $this->assertSame('Répondu', (new Submission(['status' => 'answered']))->statusLabel());
        $this->assertSame('Clôturé', (new Submission(['status' => 'closed']))->statusLabel());
    }

    public function test_form_field_casts_options_and_condition(): void
    {
        $field = new FormField([
            'options'   => ['A', 'B'],
            'condition' => ['field' => 'x', 'equals' => 'y'],
        ]);

        $this->assertSame(['A', 'B'], $field->options);
        $this->assertSame(['field' => 'x', 'equals' => 'y'], $field->condition);
    }
}
