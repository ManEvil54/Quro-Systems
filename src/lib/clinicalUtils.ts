/**
 * Enriches physician orders with automated clinical safety guardrails
 * right before hitting the unified /provider_orders collection.
 */
export function enrichProviderOrderClinicalData(orderData: any) {
  // If this isn't a medication order, or if it's being cancelled/discontinued, bypass enrichment
  if (orderData.order_type !== "medication" || orderData.status === "cancelled") {
    return orderData;
  }

  const title = (orderData.generic_name || orderData.title || "").toLowerCase();
  const instructions = (orderData.special_instructions || orderData.instructions || "").toLowerCase();
  const enriched = { ...orderData };

  // 1. DYNAMIC PSYCHOTROPIC TEMPLATING
  const isPsychotropic = [
    "risperdal", "risperidone", "haldol", "haloperidol", "seroquel", "quetiapine",
    "zyprexa", "olanzapine", "ativan", "lorazepam", "xanax", "alprazolam",
    "lexapro", "escitalopram", "zoloft", "sertraline", "prozac", "fluoxetine"
  ].some(name => title.includes(name) || instructions.includes(name));

  if (isPsychotropic || orderData.is_psychotropic) {
    enriched.is_psychotropic = true;
    // Fallback default tracking rules if the clinical user hasn't specified any
    enriched.psychotropic_monitoring = orderData.psychotropic_monitoring ?? [
      "Extrapyramidal Symptoms (EPS)",
      "Tardive Dyskinesia Tracking",
      "Shift-level Sedation Level"
    ];
  }

  // 2. DYNAMIC VITALS HOLDS & ASSESSMENT TEMPLATING
  // Cardiovascular Automation
  const isCardio = ["metoprolol", "lisinopril", "amlodipine", "clonidine", "carvedilol", "digoxin", "furosemide"].some(
    name => title.includes(name)
  );
  if (isCardio) {
    enriched.requires_vitals = orderData.requires_vitals ?? true;
    enriched.vital_type = orderData.vital_type ?? (title.includes("digoxin") || title.includes("metoprolol") ? "hr" : "bp");
    enriched.vital_threshold_low = orderData.vital_threshold_low ?? (title.includes("digoxin") || title.includes("metoprolol") ? 60 : 90);
  }

  // Antidiabetic/Insulin Automation
  const isDiabetic = ["insulin", "metformin", "glipizide", "glyburide", "lantus", "humalog"].some(
    name => title.includes(name)
  );
  if (isDiabetic) {
    enriched.requires_vitals = orderData.requires_vitals ?? true;
    enriched.vital_type = orderData.vital_type ?? "glucose";
    enriched.vital_threshold_low = orderData.vital_threshold_low ?? 70;
  }

  return enriched;
}
