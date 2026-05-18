// Quro — Clinical Medication Library
// A comprehensive list of common Skilled Nursing Facility (SNF) medications
// Organized by clinical category for intuitive searching

export interface DrugInfo {
  generic: string;
  brand?: string;
  class: string;
  is_psychotropic?: boolean;
  common_dosages?: string[];
}

export const COMMON_DRUGS: DrugInfo[] = [
  // 1. Cardiovascular (Heart & Blood Pressure)
  { generic: 'Amlodipine', brand: 'Norvasc', class: 'Cardiovascular (Antihypertensive)' },
  { generic: 'Lisinopril', brand: 'Zestril', class: 'Cardiovascular (Antihypertensive)', common_dosages: ['5mg', '10mg', '20mg'] },
  { generic: 'Losartan', brand: 'Cozaar', class: 'Cardiovascular (Antihypertensive)', common_dosages: ['25mg', '50mg', '100mg'] },
  { generic: 'Metoprolol', brand: 'Lopressor', class: 'Cardiovascular (Antihypertensive)', common_dosages: ['25mg', '50mg'] },
  { generic: 'Carvedilol', brand: 'Coreg', class: 'Cardiovascular (Antihypertensive)' },
  { generic: 'Clonidine', brand: 'Catapres', class: 'Cardiovascular (Antihypertensive)' },
  { generic: 'Furosemide', brand: 'Lasix', class: 'Cardiovascular (Diuretic)' },
  { generic: 'Hydrochlorothiazide', brand: 'HCTZ', class: 'Cardiovascular (Diuretic)' },
  { generic: 'Spironolactone', brand: 'Aldactone', class: 'Cardiovascular (Diuretic)' },
  { generic: 'Bumetanide', brand: 'Bumex', class: 'Cardiovascular (Diuretic)' },
  { generic: 'Atorvastatin', brand: 'Lipitor', class: 'Cardiovascular (Statin)' },
  { generic: 'Simvastatin', brand: 'Zocor', class: 'Cardiovascular (Statin)' },
  { generic: 'Pravastatin', brand: 'Pravachol', class: 'Cardiovascular (Statin)' },
  { generic: 'Rosuvastatin', brand: 'Crestor', class: 'Cardiovascular (Statin)' },
  { generic: 'Apixaban', brand: 'Eliquis', class: 'Cardiovascular (Anticoagulant)' },
  { generic: 'Rivaroxaban', brand: 'Xarelto', class: 'Cardiovascular (Anticoagulant)' },
  { generic: 'Warfarin', brand: 'Coumadin', class: 'Cardiovascular (Anticoagulant)' },
  { generic: 'Clopidogrel', brand: 'Plavix', class: 'Cardiovascular (Antiplatelet)' },
  { generic: 'Aspirin (81mg)', class: 'Cardiovascular (Antiplatelet)' },
  { generic: 'Aspirin (325mg)', class: 'Cardiovascular (Antiplatelet)' },
  { generic: 'Digoxin', brand: 'Lanoxin', class: 'Cardiovascular' },
  { generic: 'Isosorbide Mononitrate', brand: 'Imdur', class: 'Cardiovascular' },

  // 2. Endocrine (Diabetes & Thyroid)
  { generic: 'Insulin Lispro', brand: 'Humalog', class: 'Endocrine (Insulin)' },
  { generic: 'Insulin Aspart', brand: 'Novolog', class: 'Endocrine (Insulin)' },
  { generic: 'Insulin Glargine', brand: 'Lantus', class: 'Endocrine (Insulin)' },
  { generic: 'Insulin Detemir', brand: 'Levemir', class: 'Endocrine (Insulin)' },
  { generic: 'Insulin NPH', brand: 'Humulin N', class: 'Endocrine (Insulin)' },
  { generic: 'Insulin Regular', brand: 'Humulin R', class: 'Endocrine (Insulin)' },
  { generic: 'Metformin', brand: 'Glucophage', class: 'Endocrine (Hypoglycemic)' },
  { generic: 'Glipizide', brand: 'Glucotrol', class: 'Endocrine (Hypoglycemic)' },
  { generic: 'Sitagliptin', brand: 'Januvia', class: 'Endocrine (Hypoglycemic)' },
  { generic: 'Empagliflozin', brand: 'Jardiance', class: 'Endocrine (Hypoglycemic)' },
  { generic: 'Levothyroxine', brand: 'Synthroid', class: 'Endocrine (Thyroid)' },
  { generic: 'Armour Thyroid', class: 'Endocrine (Thyroid)' },

  // 3. Gastrointestinal (GI & Digestion)
  { generic: 'Omeprazole', brand: 'Prilosec', class: 'Gastrointestinal (PPI)' },
  { generic: 'Pantoprazole', brand: 'Protonix', class: 'Gastrointestinal (PPI)' },
  { generic: 'Famotidine', brand: 'Pepcid', class: 'Gastrointestinal (H2 Blocker)' },
  { generic: 'Esomeprazole', brand: 'Nexium', class: 'Gastrointestinal (PPI)' },
  { generic: 'Polyethylene Glycol', brand: 'Miralax', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Senna', brand: 'Senokot', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Senna 8.6mg', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Docusate Sodium', brand: 'Colace', class: 'Gastrointestinal (Stool Softener)' },
  { generic: 'Bisacodyl', brand: 'Dulcolax', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Bisacodyl 10mg supp', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Lactulose', class: 'Gastrointestinal (Laxative)' },
  { generic: 'Loperamide', brand: 'Imodium', class: 'Gastrointestinal (Anti-Diarrheal)' },
  { generic: 'Ondansetron', brand: 'Zofran', class: 'Gastrointestinal (Anti-Emetic)' },
  { generic: 'Promethazine', brand: 'Phenergan', class: 'Gastrointestinal (Anti-Emetic)' },
  { generic: 'Metoclopramide', brand: 'Reglan', class: 'Gastrointestinal (Anti-Emetic)' },

  // 4. Pain & Musculoskeletal
  { generic: 'Acetaminophen', brand: 'Tylenol', class: 'Pain (Analgesic)', common_dosages: ['325mg', '500mg', '650mg'] },
  { generic: 'Ibuprofen', brand: 'Advil/Motrin', class: 'Pain (NSAID)' },
  { generic: 'Naproxen', brand: 'Aleve', class: 'Pain (NSAID)' },
  { generic: 'Celecoxib', brand: 'Celebrex', class: 'Pain (NSAID)' },
  { generic: 'Meloxicam', brand: 'Mobic', class: 'Pain (NSAID)' },
  { generic: 'Morphine Sulfate', brand: 'MS Contin', class: 'Pain (Opioid)' },
  { generic: 'Oxycodone', brand: 'Roxicodone', class: 'Pain (Opioid)' },
  { generic: 'Oxycodone ER', brand: 'OxyContin', class: 'Pain (Opioid)' },
  { generic: 'Hydrocodone/APAP', brand: 'Norco', class: 'Pain (Opioid)' },
  { generic: 'Tramadol', brand: 'Ultram', class: 'Pain (Opioid)' },
  { generic: 'Gabapentin', brand: 'Neurontin', class: 'Pain (Neuropathic)' },
  { generic: 'Pregabalin', brand: 'Lyrica', class: 'Pain (Neuropathic)' },
  { generic: 'Amitriptyline', brand: 'Elavil', class: 'Pain (Neuropathic)' },
  { generic: 'Cyclobenzaprine', brand: 'Flexeril', class: 'Musculoskeletal (Muscle Relaxant)' },
  { generic: 'Baclofen', brand: 'Lioresal', class: 'Musculoskeletal (Muscle Relaxant)' },
  { generic: 'Tizanidine', brand: 'Zanaflex', class: 'Musculoskeletal (Muscle Relaxant)' },

  // 5. Psychotropic & Neurological (Flagged for Monitoring)
  { generic: 'Quetiapine', brand: 'Seroquel', class: 'Psychotropic (Antipsychotic)', is_psychotropic: true, common_dosages: ['25mg', '50mg', '100mg', '200mg'] },
  { generic: 'Risperidone', brand: 'Risperdal', class: 'Psychotropic (Antipsychotic)', is_psychotropic: true, common_dosages: ['0.25mg', '0.5mg', '1mg', '2mg'] },
  { generic: 'Olanzapine', brand: 'Zyprexa', class: 'Psychotropic (Antipsychotic)', is_psychotropic: true, common_dosages: ['2.5mg', '5mg', '10mg', '15mg'] },
  { generic: 'Haloperidol', brand: 'Haldol', class: 'Psychotropic (Antipsychotic)', is_psychotropic: true, common_dosages: ['0.5mg', '1mg', '2mg', '5mg'] },
  { generic: 'Lorazepam', brand: 'Ativan', class: 'Psychotropic (Anxiolytic)', is_psychotropic: true, common_dosages: ['0.5mg', '1mg', '2mg'] },
  { generic: 'Alprazolam', brand: 'Xanax', class: 'Psychotropic (Anxiolytic)', is_psychotropic: true, common_dosages: ['0.25mg', '0.5mg', '1mg'] },
  { generic: 'Diazepam', brand: 'Valium', class: 'Psychotropic (Anxiolytic)', is_psychotropic: true, common_dosages: ['2mg', '5mg', '10mg'] },
  { generic: 'Buspirone', brand: 'Buspar', class: 'Psychotropic (Anxiolytic)', is_psychotropic: true, common_dosages: ['5mg', '10mg', '15mg'] },
  { generic: 'Sertraline', brand: 'Zoloft', class: 'Psychotropic (Antidepressant)', is_psychotropic: true, common_dosages: ['25mg', '50mg', '100mg'] },
  { generic: 'Escitalopram', brand: 'Lexapro', class: 'Psychotropic (Antidepressant)', is_psychotropic: true, common_dosages: ['5mg', '10mg', '20mg'] },
  { generic: 'Fluoxetine', brand: 'Prozac', class: 'Psychotropic (Antidepressant)', is_psychotropic: true, common_dosages: ['10mg', '20mg', '40mg'] },
  { generic: 'Mirtazapine', brand: 'Remeron', class: 'Psychotropic (Antidepressant)', is_psychotropic: true, common_dosages: ['7.5mg', '15mg', '30mg'] },
  { generic: 'Trazodone', brand: 'Desyrel', class: 'Psychotropic (Antidepressant)', is_psychotropic: true, common_dosages: ['50mg', '100mg', '150mg'] },
  { generic: 'Donepezil', brand: 'Aricept', class: 'Neurological (Anti-Dementia)', is_psychotropic: true, common_dosages: ['5mg', '10mg', '23mg'] },
  { generic: 'Memantine', brand: 'Namenda', class: 'Neurological (Anti-Dementia)', is_psychotropic: true, common_dosages: ['5mg', '10mg'] },
  { generic: 'Levetiracetam', brand: 'Keppra', class: 'Neurological (Anti-Seizure)' },
  { generic: 'Phenytoin', brand: 'Dilantin', class: 'Neurological (Anti-Seizure)' },
  { generic: 'Divalproex', brand: 'Depakote', class: 'Neurological (Anti-Seizure)' },

  // 6. Respiratory & Allergy
  { generic: 'Albuterol', brand: 'ProAir', class: 'Respiratory (Bronchodilator)' },
  { generic: 'Ipratropium', brand: 'Atrovent', class: 'Respiratory (Anticholinergic)' },
  { generic: 'Budesonide', brand: 'Pulmicort', class: 'Respiratory (Corticosteroid)' },
  { generic: 'Symbicort', class: 'Respiratory' },
  { generic: 'Advair', class: 'Respiratory' },
  { generic: 'Cetirizine', brand: 'Zyrtec', class: 'Allergy' },
  { generic: 'Loratadine', brand: 'Claritin', class: 'Allergy' },
  { generic: 'Diphenhydramine', brand: 'Benadryl', class: 'Allergy' },
  { generic: 'Fluticasone', brand: 'Flonase', class: 'Allergy' },

  // 7. Anti-Infectives (Antibiotics/Antifungals)
  { generic: 'Amoxicillin/Clavulanate', brand: 'Augmentin', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Cephalexin', brand: 'Keflex', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Ciprofloxacin', brand: 'Cipro', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Nitrofurantoin', brand: 'Macrobid', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Sulfamethoxazole/Trimethoprim', brand: 'Bactrim', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Azithromycin', brand: 'Z-Pak', class: 'Anti-Infective (Antibiotic)' },
  { generic: 'Fluconazole', brand: 'Diflucan', class: 'Anti-Infective (Antifungal)' },
  { generic: 'Nystatin', brand: 'Mycostatin', class: 'Anti-Infective (Antifungal)' },
  { generic: 'Acyclovir', brand: 'Zovirax', class: 'Anti-Infective (Antiviral)' },

  // 8. Miscellaneous/Supplements
  { generic: 'Multivitamin', class: 'Supplement' },
  { generic: 'Vitamin D3', class: 'Supplement' },
  { generic: 'Vitamin B12', class: 'Supplement' },
  { generic: 'Vitamin C', brand: 'Ascorbic Acid', class: 'Supplement' },
  { generic: 'Folic Acid', class: 'Supplement' },
  { generic: 'Ferrous Sulfate', class: 'Supplement (Iron)' },
  { generic: 'Ferrous Gluconate', class: 'Supplement (Iron)' },
  { generic: 'Calcium + D', class: 'Supplement' },
  { generic: 'Potassium Chloride', brand: 'K-Dur', class: 'Electrolyte' },
  { generic: 'Magnesium Oxide', class: 'Electrolyte' },
  { generic: 'Cranberry Extract', class: 'Supplement' },
  { generic: 'Zinc', class: 'Supplement' },
  { generic: 'Probiotic', class: 'Supplement' },
  { generic: 'Melatonin', class: 'Supplement (Sleep Aid)' }
];
