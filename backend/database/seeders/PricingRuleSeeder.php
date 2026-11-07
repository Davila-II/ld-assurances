<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\PricingRule;
use Illuminate\Database\Seeder;

class PricingRuleSeeder extends Seeder
{
    public function run(): void
    {
        $templates = PricingRule::defaultTemplates();
        $createdRules = [];

        foreach ($templates as $code => $tpl) {
            $rule = PricingRule::updateOrCreate(
                ['code' => $code],
                [
                    'name'         => $tpl['name'],
                    'name_en'      => $tpl['name_en'] ?? null,
                    'driver'       => $tpl['driver'],
                    'description'  => $tpl['description'] ?? null,
                    'parameters'   => $tpl['parameters'] ?? [],
                    'formula_code' => $tpl['formula_code'] ?? null,
                    'is_active'    => true,
                ]
            );
            $createdRules[$code] = $rule;
        }

        // Associer les catégories de devis existantes
        $categoryMapping = [
            'auto'                  => 'automobile',
            'voyage'                => 'voyage',
            'habitation'            => 'habitation',
            'personne'              => 'sante',
            'professionnelle'       => 'professionnelle',
            'responsabilite-civile' => 'responsabilite_civile',
            'autres'                => 'autres',
        ];

        foreach ($categoryMapping as $catSlug => $ruleCode) {
            if (isset($createdRules[$ruleCode])) {
                Category::where('slug', $catSlug)
                    ->update(['pricing_rule_id' => $createdRules[$ruleCode]->id]);
            }
        }
    }
}
