// Quro — Clinical Medication Library
// A curated list of common medications for order entry

export interface DrugInfo {
  generic: string;
  brand?: string;
  class?: string;
  is_psychotropic?: boolean;
}

export const COMMON_DRUGS: DrugInfo[] = [
  // Cardiovascular
  { generic: 'Atorvastatin', brand: 'Lipitor', class: 'Statin' },
  { generic: 'Lisinopril', brand: 'Zestril', class: 'ACE Inhibitor' },
  { generic: 'Amlodipine', brand: 'Norvasc', class: 'Calcium Channel Blocker' },
  { generic: 'Metoprolol', brand: 'Lopressor', class: 'Beta Blocker' },
  { generic: 'Losartan', brand: 'Cozaar', class: 'ARB' },
  { generic: 'Furosemide', brand: 'Lasix', class: 'Diuretic' },
  { generic: 'Clopidogrel', brand: 'Plavix', class: 'Antiplatelet' },
  { generic: 'Warfarin', brand: 'Coumadin', class: 'Anticoagulant' },
  { generic: 'Apixaban', brand: 'Eliquis', class: 'Anticoagulant' },
  { generic: 'Aspirin', class: 'Antiplatelet' },

  // Endocrine / Diabetes
  { generic: 'Metformin', brand: 'Glucophage', class: 'Biguanide' },
  { generic: 'Levothyroxine', brand: 'Synthroid', class: 'Thyroid Hormone' },
  { generic: 'Glipizide', brand: 'Glucotrol', class: 'Sulfonylurea' },
  { generic: 'Insulin Glargine', brand: 'Lantus', class: 'Insulin' },
  { generic: 'Insulin Lispro', brand: 'Humalog', class: 'Insulin' },

  // Psychotropic (Flagged for Monitoring)
  { generic: 'Sertraline', brand: 'Zoloft', class: 'SSRI', is_psychotropic: true },
  { generic: 'Escitalopram', brand: 'Lexapro', class: 'SSRI', is_psychotropic: true },
  { generic: 'Fluoxetine', brand: 'Prozac', class: 'SSRI', is_psychotropic: true },
  { generic: 'Quetiapine', brand: 'Seroquel', class: 'Antipsychotic', is_psychotropic: true },
  { generic: 'Haloperidol', brand: 'Haldol', class: 'Antipsychotic', is_psychotropic: true },
  { generic: 'Risperidone', brand: 'Risperdal', class: 'Antipsychotic', is_psychotropic: true },
  { generic: 'Olanzapine', brand: 'Zyprexa', class: 'Antipsychotic', is_psychotropic: true },
  { generic: 'Lorazepam', brand: 'Ativan', class: 'Benzodiazepine', is_psychotropic: true },
  { generic: 'Alprazolam', brand: 'Xanax', class: 'Benzodiazepine', is_psychotropic: true },
  { generic: 'Donepezil', brand: 'Aricept', class: 'Cholinesterase Inhibitor', is_psychotropic: true },
  { generic: 'Memantine', brand: 'Namenda', class: 'NMDA Antagonist', is_psychotropic: true },

  // Respiratory
  { generic: 'Albuterol', brand: 'ProAir', class: 'Bronchodilator' },
  { generic: 'Fluticasone', brand: 'Flonase', class: 'Corticosteroid' },
  { generic: 'Montelukast', brand: 'Singulair', class: 'Leukotriene Modifier' },
  { generic: 'Tiotropium', brand: 'Spiriva', class: 'Anticholinergic' },

  // Pain / Inflammation
  { generic: 'Acetaminophen', brand: 'Tylenol', class: 'Analgesic' },
  { generic: 'Ibuprofen', brand: 'Advil', class: 'NSAID' },
  { generic: 'Naproxen', brand: 'Aleve', class: 'NSAID' },
  { generic: 'Morphine Sulfate', brand: 'MS Contin', class: 'Opioid' },
  { generic: 'Oxycodone', brand: 'OxyContin', class: 'Opioid' },
  { generic: 'Gabapentin', brand: 'Neurontin', class: 'Anticonvulsant' },
  { generic: 'Prednisone', class: 'Corticosteroid' },

  // Gastrointestinal
  { generic: 'Omeprazole', brand: 'Prilosec', class: 'PPI' },
  { generic: 'Pantoprazole', brand: 'Protonix', class: 'PPI' },
  { generic: 'Famotidine', brand: 'Pepcid', class: 'H2 Blocker' },
  { generic: 'Docusate Sodium', brand: 'Colace', class: 'Stool Softener' },
  { generic: 'Polyethylene Glycol', brand: 'Miralax', class: 'Laxative' },

  // Anti-infective
  { generic: 'Amoxicillin', class: 'Antibiotic' },
  { generic: 'Azithromycin', brand: 'Zithromax', class: 'Antibiotic' },
  { generic: 'Cephalexin', brand: 'Keflex', class: 'Antibiotic' },
  { generic: 'Ciprofloxacin', brand: 'Cipro', class: 'Antibiotic' },
  { generic: 'Ceftriaxone', brand: 'Rocephin', class: 'Antibiotic' }
];
