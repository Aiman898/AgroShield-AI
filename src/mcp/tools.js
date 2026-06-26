import { parseMathExpression } from '../utils/safeEval.js';

// Local database of diseases and organic/chemical treatments
const DISEASE_DATABASE = [
  {
    id: "early_blight",
    name: "Early Blight (Alternaria solani)",
    crop: "Tomato/Potato",
    symptoms: ["brown spots", "target-like rings", "yellow halo", "leaf drop", "concentric rings"],
    biologicalIndicator: "Fungal spores spreading in high humidity (>85%) and warm temperatures (24-29°C).",
    organicRemedy: "Apply copper fungicide or Bacillus subtilis early in the morning. Remove lower infected leaves and mulch around the base.",
    chemicalRemedy: "Chlorothalonil or Mancozeb application under strict dosage guidelines.",
    healthHazards: "Copper fungicides can cause severe eye irritation, respiratory discomfort if inhaled, and mild skin irritation.",
    preHarvestIntervalDays: 1,
    reEntryIntervalHours: 24,
    ppeRequired: ["Protective eyewear", "N95 respirator mask", "Chemical-resistant gloves", "Long sleeves"]
  },
  {
    id: "late_blight",
    name: "Late Blight (Phytophthora infestans)",
    crop: "Tomato/Potato",
    symptoms: ["dark water-soaked spots", "white mold under leaves", "rapid rotting", "foul smell", "black stems"],
    biologicalIndicator: "Water-mold pathogen spreading rapidly in cool, wet weather (15-20°C). Highly destructive.",
    organicRemedy: "Strict bio-security, destroy infected plants immediately. Apply copper hydroxide as a preventive measure.",
    chemicalRemedy: "Metalaxyl or Famoxadone applications.",
    healthHazards: "Chemical treatments present acute dermal toxicity hazards and can contaminate local groundwater table.",
    preHarvestIntervalDays: 5,
    reEntryIntervalHours: 48,
    ppeRequired: ["Chemical-resistant splash goggles", "N95 respirator", "Nitrile gloves", "Waterproof coveralls"]
  },
  {
    id: "powdery_mildew",
    name: "Powdery Mildew (Podosphaera xanthii)",
    crop: "Cucumber/Squash/Melon",
    symptoms: ["white powdery coating", "dusty white spots", "curled leaves", "stunted growth"],
    biologicalIndicator: "Fungal disease thriving in warm, dry climates with high relative humidity at night.",
    organicRemedy: "Spray potassium bicarbonate solution, neem oil, or sulfur-based spray. Increase air circulation.",
    chemicalRemedy: "Myclobutanil or Triadimefon.",
    healthHazards: "Sulfur dusts cause respiratory tract irritation, coughing, and temporary asthma-like symptoms.",
    preHarvestIntervalDays: 0,
    reEntryIntervalHours: 12,
    ppeRequired: ["Dust mask", "Safety glasses", "Rubber gloves"]
  },
  {
    id: "rust_fungus",
    name: "Common Rust (Puccinia sorghi)",
    crop: "Corn/Beans",
    symptoms: ["orange pustules", "reddish-brown spots", "powdery orange spores", "leaf drying"],
    biologicalIndicator: "Fungal pathogen favored by cool temperatures (16-23°C) and high moisture/dew.",
    organicRemedy: "Apply sulfur sprays, plant resistant cultivars, and maintain spacing for dry leaves.",
    chemicalRemedy: "Pyraclostrobin or Tebuconazole.",
    healthHazards: "Synthetic fungicides pose systemic chronic exposure risks, endocrine disruption hazards, and aquatic toxicity.",
    preHarvestIntervalDays: 7,
    reEntryIntervalHours: 24,
    ppeRequired: ["Protective goggles", "Chemical-resistant gloves", "Coveralls"]
  }
];

// Local toxicity and public health impact profiles for common crop chemicals
const CHEMICAL_HEALTH_PROFILES = {
  "copper fungicide": {
    chemicalName: "Copper Octanoate / Copper Sulfate",
    hazardClass: "Class II - Moderately Toxic",
    chronicRisks: "Long-term accumulation in soil harms earthworms and soil microbiota. Chronic inhalation can cause vineyard sprayer's lung (interstitial lung disease).",
    acuteRisks: "Severe eye irritation, chemical burns, nausea/vomiting if ingested.",
    environmentalImpact: "Highly toxic to fish, aquatic invertebrates, and bioaccumulates in aquatic food chains through runoff.",
    reEntryIntervalHours: 24,
    preHarvestIntervalDays: 1,
    publicHealthAdvice: "Buffer zones of at least 30 feet from water bodies. Do not spray within 48 hours of heavy rainfall forecasts to prevent drinking water contamination."
  },
  "neem oil": {
    chemicalName: "Cold Pressed Neem Oil (Azadirachtin)",
    hazardClass: "Class IV - Practically Non-Toxic",
    chronicRisks: "No known chronic human health hazards. Minimal risk of bioaccumulation.",
    acuteRisks: "Mild eye irritation, potential allergen for sensitive skin.",
    environmentalImpact: "Low toxicity to birds and bees if sprayed in evening (when bees are inactive). Rapidly biodegrades in UV light (half-life of 5-17 hours).",
    reEntryIntervalHours: 4,
    preHarvestIntervalDays: 0,
    publicHealthAdvice: "Extremely safe for public human health. Safe for urban agricultural integration."
  },
  "sulfur": {
    chemicalName: "Elemental Sulfur",
    hazardClass: "Class III - Slightly Toxic",
    chronicRisks: "Can cause occupational asthma in agricultural workers with frequent skin/lung exposure.",
    acuteRisks: "Skin irritation (dermatitis), conjunctivitis in eyes, bronchial irritation.",
    environmentalImpact: "Relatively low toxicity to aquatic life, but soil acidification can occur with repeated high doses.",
    reEntryIntervalHours: 24,
    preHarvestIntervalDays: 0,
    publicHealthAdvice: "Avoid application during windy conditions (>10 mph) to prevent drift into neighboring residential areas."
  },
  "glyphosate": {
    chemicalName: "N-(phosphonomethyl)glycine",
    hazardClass: "Class II / III - EPA Category III (Caution), IARC 2A (Probably Carcinogenic to Humans)",
    chronicRisks: "Non-Hodgkin Lymphoma risk correlation in high-exposure cohorts. Disruption of gut microbiome. Potential endocrine disruptor.",
    acuteRisks: "Skin irritation, gastrointestinal pain if swallowed, respiratory tract irritation.",
    environmentalImpact: "Binds tightly to soil particles, reducing immediate water leaching, but toxic to non-target plants and alters amphibian development in wetlands.",
    reEntryIntervalHours: 12,
    preHarvestIntervalDays: 7,
    publicHealthAdvice: "Strictly ban cosmetic use. Agricultural application must use low-drift nozzles and maintain a 50-foot buffer from wells and public parks."
  }
};

/**
 * Tool: Input Validation
 * Sanitizes and validates inputs to prevent script injections and ensure correct data shapes.
 */
export function validate_inputs(params) {
  const result = { valid: true, errors: [] };
  
  if (!params || typeof params !== 'object') {
    return { valid: false, errors: ["Invalid parameter format. Parameters must be an object."] };
  }

  // Helper to check for unsafe input patterns (XSS / SQL / Command injection check)
  const isUnsafeString = (str) => {
    if (typeof str !== 'string') return false;
    const unsafePatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script> tags
      /javascript:/gi,                                      // JS protocol urls
      /SELECT\s+.*\s+FROM/gi,                                // SQL keywords
      /UNION\s+SELECT/gi,
      /[&|;`$]/g                                            // Shell command characters
    ];
    return unsafePatterns.some(pattern => pattern.test(str));
  };

  // Validate fields in params
  for (const [key, value] of Object.entries(params)) {
    // 1. Check length of strings (Prevention of Buffer/DoS attacks)
    if (typeof value === 'string') {
      if (value.length > 500) {
        result.valid = false;
        result.errors.push(`Field '${key}' exceeds maximum length of 500 characters.`);
      }
      if (isUnsafeString(value)) {
        result.valid = false;
        result.errors.push(`Field '${key}' contains potentially unsafe characters or keywords.`);
      }
    }

    // 2. Check coordinates structure if provided
    if (key === 'coordinates') {
      if (value && (typeof value.lat !== 'number' || typeof value.lng !== 'number')) {
        result.valid = false;
        result.errors.push(`Coordinates must contain 'lat' and 'lng' as numeric values.`);
      } else if (value) {
        if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) {
          result.valid = false;
          result.errors.push(`Coordinates are out of geographical range (lat: -90 to 90, lng: -180 to 180).`);
        }
      }
    }

    // 3. Check positive numbers for quantities
    if (['pesticide_qty', 'dilution_water', 'dosage', 'area_hectares'].includes(key)) {
      if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
        result.valid = false;
        result.errors.push(`Field '${key}' must be a positive number.`);
      }
    }
  }

  return result;
}

/**
 * Tool: Safe Calculation Execution
 * Evaluates safe math expressions using a custom non-eval math parser.
 */
export function execute_safe_calculation(params) {
  const { expression, variables } = params;
  
  if (!expression || typeof expression !== 'string') {
    return { status: "error", error: "Missing mathematical expression string." };
  }

  // Pre-validate variables mapping object
  if (variables && typeof variables !== 'object') {
    return { status: "error", error: "Variables parameter must be an object map." };
  }

  // Sanitized validation: check variable names to contain only safe alphanumeric characters
  const cleanVars = {};
  if (variables) {
    for (const [key, val] of Object.entries(variables)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return { status: "error", error: `Unsafe variable name format: ${key}` };
      }
      if (typeof val !== 'number') {
        return { status: "error", error: `Variable '${key}' must be a number.` };
      }
      cleanVars[key] = val;
    }
  }

  try {
    const result = parseMathExpression(expression, cleanVars);
    return { status: "success", expression, variables: cleanVars, resultValue: result };
  } catch (error) {
    return { status: "error", error: `Calculation failed: ${error.message}` };
  }
}

/**
 * Tool: Disease Database Lookup
 * Searches for diseases based on symptom matches.
 */
export function detect_disease_db(params) {
  const { symptoms, crop } = params;
  if (!symptoms || !Array.isArray(symptoms)) {
    return { status: "error", error: "Symptoms parameter is required and must be an array of strings." };
  }

  const querySymptoms = symptoms.map(s => s.toLowerCase());
  const matches = [];

  for (const disease of DISEASE_DATABASE) {
    // Optional crop filter
    if (crop && !disease.crop.toLowerCase().includes(crop.toLowerCase())) {
      continue;
    }

    // Match keywords
    let matchCount = 0;
    for (const sym of querySymptoms) {
      if (disease.symptoms.some(ds => ds.includes(sym) || sym.includes(ds))) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      matches.push({
        disease: disease.name,
        crop: disease.crop,
        matchScore: matchCount / disease.symptoms.length,
        details: disease
      });
    }
  }

  // Sort by match score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return {
    status: "success",
    query: { symptoms, crop },
    matchedCount: matches.length,
    matches: matches
  };
}

/**
 * Tool: Agricultural & Public Health Link
 * Returns health risk data for a list of target crop-protection chemicals.
 */
export function assess_health_implications(params) {
  const { chemicals } = params;
  if (!chemicals || !Array.isArray(chemicals)) {
    return { status: "error", error: "Chemicals parameter is required and must be an array of strings." };
  }

  const results = {};
  for (const chem of chemicals) {
    const normalized = chem.toLowerCase().trim();
    // Try matching exact key or substring
    let found = false;
    for (const [key, profile] of Object.entries(CHEMICAL_HEALTH_PROFILES)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        results[chem] = profile;
        found = true;
        break;
      }
    }

    if (!found) {
      results[chem] = {
        chemicalName: chem,
        hazardClass: "Class Unknown - Unlisted Compound",
        chronicRisks: "No localized chronic profile. Maintain standard safety precautions.",
        acuteRisks: "Standard skin/eye irritant precautions apply.",
        environmentalImpact: "Unknown runoff profile. Maintain a 30ft buffer zone.",
        reEntryIntervalHours: 24,
        preHarvestIntervalDays: 7,
        publicHealthAdvice: "Use restricted chemical safety protocols. Verify safety via local agricultural extension office."
      };
    }
  }

  return {
    status: "success",
    profiles: results
  };
}
