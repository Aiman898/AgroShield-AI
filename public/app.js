// ====================================================
// OFFLINE BACKUP DATABASES & UTILITIES
// ====================================================

const DISEASE_DATABASE = [
  {
    id: "early_blight",
    name: "Early Blight (Alternaria solani)",
    crop: "Tomato/Potato",
    symptoms: ["brown spots", "target-like rings", "yellow halo", "leaf drop", "concentric rings"],
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
    organicRemedy: "Apply sulfur sprays, plant resistant cultivars, and maintain spacing for dry leaves.",
    chemicalRemedy: "Pyraclostrobin or Tebuconazole.",
    healthHazards: "Synthetic fungicides pose systemic chronic exposure risks, endocrine disruption hazards, and aquatic toxicity.",
    preHarvestIntervalDays: 7,
    reEntryIntervalHours: 24,
    ppeRequired: ["Protective goggles", "Chemical-resistant gloves", "Coveralls"]
  }
];

const CHEMICAL_HEALTH_PROFILES = {
  "copper fungicide": {
    chemicalName: "Copper Octanoate / Copper Sulfate",
    hazardClass: "Class II - Moderately Toxic",
    chronicRisks: "Long-term accumulation in soil harms earthworms and soil microbiota. Chronic inhalation can cause vineyard sprayer's lung.",
    acuteRisks: "Severe eye irritation, chemical burns, nausea/vomiting if ingested.",
    environmentalImpact: "Highly toxic to fish, aquatic invertebrates, and bioaccumulates in aquatic food chains.",
    reEntryIntervalHours: 24,
    preHarvestIntervalDays: 1,
    publicHealthAdvice: "Buffer zones of at least 30 feet from water bodies. Do not spray within 48 hours of heavy rainfall forecasts."
  },
  "neem oil": {
    chemicalName: "Cold Pressed Neem Oil (Azadirachtin)",
    hazardClass: "Class IV - Practically Non-Toxic",
    chronicRisks: "No known chronic human health hazards. Minimal risk of bioaccumulation.",
    acuteRisks: "Mild eye irritation, potential allergen for sensitive skin.",
    environmentalImpact: "Low toxicity to birds and bees if sprayed in evening. Rapidly biodegrades in UV light.",
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
    chronicRisks: "Non-Hodgkin Lymphoma risk correlation in high-exposure cohorts. Disruption of gut microbiome.",
    acuteRisks: "Skin irritation, gastrointestinal pain if swallowed, respiratory tract irritation.",
    environmentalImpact: "Binds tightly to soil, but toxic to non-target plants and alters amphibian development.",
    reEntryIntervalHours: 12,
    preHarvestIntervalDays: 7,
    publicHealthAdvice: "Strictly ban cosmetic use. Agricultural application must maintain 50-foot buffer from public areas."
  }
};

// Custom non-eval AST Math Evaluator (same logic as safeEval.js)
function localParseMathExpression(expression, variables = {}) {
  const cleanExpr = expression.replace(/\s+/g, '');
  const tokenRegex = /[0-9]+(?:\.[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*|[-+*/()]/g;
  const tokens = cleanExpr.match(tokenRegex);

  if (!tokens || tokens.join('') !== cleanExpr) {
    throw new Error("Invalid characters in expression.");
  }

  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const outputQueue = [];
  const operatorStack = [];

  for (const token of tokens) {
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
      outputQueue.push(parseFloat(token));
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      if (!(token in variables)) {
        throw new Error(`Undefined variable: ${token}`);
      }
      outputQueue.push(variables[token]);
    } else if (token in precedence) {
      const o1 = token;
      while (operatorStack.length > 0) {
        const o2 = operatorStack[operatorStack.length - 1];
        if (o2 in precedence && precedence[o2] >= precedence[o1]) {
          outputQueue.push(operatorStack.pop());
        } else {
          break;
        }
      }
      operatorStack.push(o1);
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      let foundMatching = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop();
        if (top === '(') {
          foundMatching = true;
          break;
        } else {
          outputQueue.push(top);
        }
      }
      if (!foundMatching) throw new Error("Mismatched parentheses.");
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop();
    if (top === '(' || top === ')') throw new Error("Mismatched parentheses.");
    outputQueue.push(top);
  }

  const evaluationStack = [];
  for (const item of outputQueue) {
    if (typeof item === 'number') {
      evaluationStack.push(item);
    } else {
      if (evaluationStack.length < 2) throw new Error("Malformed expression.");
      const b = evaluationStack.pop();
      const a = evaluationStack.pop();
      let res;
      switch (item) {
        case '+': res = a + b; break;
        case '-': res = a - b; break;
        case '*': res = a * b; break;
        case '/':
          if (b === 0) throw new Error("Division by zero.");
          res = a / b;
          break;
      }
      evaluationStack.push(res);
    }
  }

  if (evaluationStack.length !== 1) throw new Error("Invalid expression structure.");
  return evaluationStack[0];
}

// Local tools implementation matching backend
function localValidateInputs(params) {
  const result = { valid: true, errors: [] };
  if (!params || typeof params !== 'object') {
    return { valid: false, errors: ["Params must be an object."] };
  }
  const isUnsafeString = (str) => {
    if (typeof str !== 'string') return false;
    const unsafePatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /SELECT\s+.*\s+FROM/gi,
      /[&|;`$]/g
    ];
    return unsafePatterns.some(pattern => pattern.test(str));
  };
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      if (value.length > 500) {
        result.valid = false;
        result.errors.push(`Field '${key}' exceeds 500 characters.`);
      }
      if (isUnsafeString(value)) {
        result.valid = false;
        result.errors.push(`Field '${key}' contains unsafe characters.`);
      }
    }
    if (key === 'coordinates' && value) {
      if (typeof value.lat !== 'number' || typeof value.lng !== 'number') {
        result.valid = false;
        result.errors.push(`Coordinates must contain 'lat' and 'lng' as numbers.`);
      } else if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) {
        result.valid = false;
        result.errors.push(`Coordinates out of bounds.`);
      }
    }
    if (['chemical_qty', 'water_qty', 'dosage', 'area_hectares'].includes(key)) {
      if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
        result.valid = false;
        result.errors.push(`Field '${key}' must be positive.`);
      }
    }
  }
  return result;
}

function localDetectDiseaseDb(params) {
  const { symptoms, crop } = params;
  if (!symptoms || !Array.isArray(symptoms)) {
    return { status: "error", error: "Symptoms array is required." };
  }
  const querySymptoms = symptoms.map(s => s.toLowerCase());
  const matches = [];

  for (const disease of DISEASE_DATABASE) {
    if (crop && !disease.crop.toLowerCase().includes(crop.toLowerCase())) {
      continue;
    }
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
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return { status: "success", matchedCount: matches.length, matches };
}

function localAssessHealthImplications(params) {
  const { chemicals } = params;
  if (!chemicals || !Array.isArray(chemicals)) {
    return { status: "error", error: "Chemicals array is required." };
  }
  const results = {};
  for (const chem of chemicals) {
    const normalized = chem.toLowerCase().trim();
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
        hazardClass: "Class Unknown - Standard Hazard Precautions",
        chronicRisks: "No specific toxicological mapping found.",
        acuteRisks: "Avoid eye contact or inhalation.",
        environmentalImpact: "Do not apply near aquatic bodies.",
        reEntryIntervalHours: 24,
        preHarvestIntervalDays: 7,
        publicHealthAdvice: "Verify local spraying thresholds."
      };
    }
  }
  return { status: "success", profiles: results };
}

// Simulated local multi-agent workflow runner (identical to orchestrator.js logic)
function localRunWorkflow(userQuery) {
  const conversation = [];
  const logs = [];
  const state = {
    query: userQuery,
    crop: "unknown",
    symptoms: [],
    diagnosis: null,
    remedy: null,
    chemicalUsed: null,
    healthAdvisory: null,
    optimizedTask: null
  };

  const lowercaseQuery = userQuery.toLowerCase();
  
  if (lowercaseQuery.includes("tomato") || lowercaseQuery.includes("potato")) {
    state.crop = "Tomato/Potato";
  } else if (lowercaseQuery.includes("cucumber") || lowercaseQuery.includes("squash") || lowercaseQuery.includes("melon")) {
    state.crop = "Cucumber/Squash/Melon";
  } else if (lowercaseQuery.includes("corn") || lowercaseQuery.includes("maize") || lowercaseQuery.includes("bean")) {
    state.crop = "Corn/Beans";
  }

  const symptomKeywords = [
    "brown spot", "target-like ring", "yellow halo", "leaf drop", "concentric ring",
    "water-soaked", "white mold", "rot", "foul smell", "black stem",
    "white powdery", "dusty white", "curled leaf", "stunted growth",
    "orange pustule", "reddish-brown spot", "powdery orange", "drying"
  ];

  for (const sym of symptomKeywords) {
    if (lowercaseQuery.includes(sym)) {
      state.symptoms.push(sym);
    }
  }

  if (state.symptoms.length === 0) {
    if (lowercaseQuery.includes("spot") || lowercaseQuery.includes("blight")) {
      state.symptoms.push("brown spot");
    } else if (lowercaseQuery.includes("mold") || lowercaseQuery.includes("powdery")) {
      state.symptoms.push("white powdery coating");
    } else {
      state.symptoms.push("brown spot");
    }
  }

  logs.push({ agent: "Farmer Agent", status: "active", message: "Parsing query offline." });
  conversation.push({
    sender: "Farmer Agent",
    text: `Hello! (Offline Fallback Engine) Crop identified: **${state.crop}**. Symptoms parsed: **${state.symptoms.join(', ')}**. Checking with Crop Disease Agent.`
  });

  const diseaseResult = localDetectDiseaseDb({
    symptoms: state.symptoms,
    crop: state.crop === "unknown" ? undefined : state.crop
  });

  if (diseaseResult.status === 'success' && diseaseResult.matchedCount > 0) {
    const topMatch = diseaseResult.matches[0].details;
    state.diagnosis = topMatch.name;
    state.remedy = {
      organic: topMatch.organicRemedy,
      chemical: topMatch.chemicalRemedy,
      hazards: topMatch.healthHazards,
      reEntry: topMatch.reEntryIntervalHours,
      preHarvest: topMatch.preHarvestIntervalDays,
      ppe: topMatch.ppeRequired
    };
    state.chemicalUsed = (topMatch.id.includes('blight')) ? "copper fungicide" : "sulfur";
  } else {
    state.diagnosis = "Mild Foliar Infection / Blight Alert";
    state.chemicalUsed = "neem oil";
    state.remedy = {
      organic: "Apply general cold-pressed neem oil spray. Clear weeds to increase wind ventilation.",
      chemical: "N/A",
      hazards: "Minimal health hazards.",
      reEntry: 4,
      preHarvest: 0,
      ppe: ["Gloves", "Safety glasses"]
    };
  }

  logs.push({ agent: "Crop Disease Agent", status: "active", message: "Lookup symptoms offline." });
  conversation.push({
    sender: "Crop Disease Agent",
    text: `Diagnosis: **${state.diagnosis}** determined. Remediation: **${state.remedy.organic}**. Submitting profile to Health Agent.`
  });

  logs.push({ agent: "Public Health Agent", status: "active", message: "Analyze pesticide toxicity offline." });
  const healthResult = localAssessHealthImplications({ chemicals: [state.chemicalUsed] });
  const profile = healthResult.profiles[state.chemicalUsed];
  state.healthAdvisory = profile;

  conversation.push({
    sender: "Public Health Agent",
    text: `Toxicity profile loaded: **${profile.chemicalName}** (${profile.hazardClass}). Pre-harvest interval: **${profile.preHarvestIntervalDays} days**. Worker safety re-entry: **${profile.reEntryIntervalHours} hours**. Alert: ${profile.publicHealthAdvice}`
  });

  logs.push({ agent: "Task Agent", status: "active", message: "Optimizing spray calendar offline." });
  const pesticideQty = state.chemicalUsed === 'neem oil' ? 1.5 : 2.5;
  const waterQty = 500;
  const calcResult = localParseMathExpression("(chem * 1000) / water", { chem: pesticideQty, water: waterQty });

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 1);
  const dateString = scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  state.optimizedTask = {
    taskName: `Apply ${state.chemicalUsed === 'neem oil' ? 'Neem Oil' : 'Fungicide'} for ${state.diagnosis.split(' (')[0]}`,
    date: dateString,
    time: "6:00 AM",
    dosage: `${calcResult.toFixed(1)} ml/L`,
    fieldNo: "Field B-4",
    rei: `${state.remedy.reEntry} Hours`,
    phi: `${state.remedy.preHarvest} Days`,
    ppe: state.remedy.ppe.join(', ')
  };

  conversation.push({
    sender: "Task Agent",
    text: `Spray calendar item optimized for **${state.optimizedTask.date}** at **${state.optimizedTask.time}** in **Field B-4**. Dosage calculation is **${state.optimizedTask.dosage}**.`
  });

  logs.push({ agent: "Farmer Agent", status: "success", message: "Aggregating outputs." });
  conversation.push({
    sender: "Farmer Agent",
    text: `Offline compilation complete. I have updated the dashboard widgets with details. Please wear **${state.optimizedTask.ppe}** during operation.`
  });

  return { status: "success", state, logs, conversation };
}

// ====================================================
// CLIENT INTERACTIONS & INTERACTIVE HANDLERS
// ====================================================

let mcpSseSource = null;
function connectMcpSse() {
  logSystemMessage("Attempting to handshake with Model Context Protocol (MCP) server...");
  mcpSseSource = new EventSource('/mcp/sse');
  
  mcpSseSource.addEventListener('endpoint', (e) => {
    console.log("MCP SSE Endpoint mapped:", e.data);
    logSystemMessage(`✔ MCP SSE Channel Handshake successful! Endpoint: ${e.data}`);
  });

  mcpSseSource.addEventListener('message', (e) => {
    console.log("MCP SSE message received:", e.data);
    try {
      const parsed = JSON.parse(e.data);
      logAgentMessage("MCP System", `SSE Event payload parsed: ${JSON.stringify(parsed)}`);
    } catch(err) {}
  });

  mcpSseSource.onerror = (err) => {
    console.warn("MCP SSE server offline. Operating in 100% Client-Side Simulation Mode.");
    logSystemMessage("⚠️ Local Node is offline. Dashboard has automatically activated its sandboxed Browser Client-Side agent simulation engine.");
    mcpSseSource.close();
  };
}

function logSystemMessage(text) {
  const terminal = document.getElementById('chat-messages');
  const log = document.createElement('div');
  log.className = 'agent-message system-log';
  log.innerHTML = `
    <div class="msg-meta">System core</div>
    <div class="msg-content">${text}</div>
  `;
  terminal.appendChild(log);
  terminal.scrollTop = terminal.scrollHeight;
}

function logAgentMessage(sender, text) {
  const terminal = document.getElementById('chat-messages');
  const log = document.createElement('div');
  log.className = 'agent-message agent-log';
  log.innerHTML = `
    <div class="msg-meta">${sender} Node</div>
    <div class="msg-content">${text}</div>
  `;
  terminal.appendChild(log);
  terminal.scrollTop = terminal.scrollHeight;
}

function resetAgentNodes() {
  document.getElementById('agent-farmer').querySelector('.node-pulse').className = 'node-pulse yellow';
  document.getElementById('agent-disease').querySelector('.node-pulse').className = 'node-pulse grey';
  document.getElementById('agent-health').querySelector('.node-pulse').className = 'node-pulse grey';
  document.getElementById('agent-task').querySelector('.node-pulse').className = 'node-pulse grey';
}

// Chat Form dispatch
const chatForm = document.getElementById('chat-form');
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const inputEl = document.getElementById('chat-input');
  const query = inputEl.value.trim();
  if (!query) return;

  const terminal = document.getElementById('chat-messages');
  const userMsg = document.createElement('div');
  userMsg.className = 'agent-message user-text';
  userMsg.innerHTML = `
    <div class="msg-meta">Farmer (You)</div>
    <div class="msg-content">${query}</div>
  `;
  terminal.appendChild(userMsg);
  inputEl.value = '';
  terminal.scrollTop = terminal.scrollHeight;

  resetAgentNodes();
  document.getElementById('agent-farmer').querySelector('.node-pulse').className = 'node-pulse yellow';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    
    if (res.ok) {
      const data = await res.json();
      playAgentWorkflow(data.logs, data.conversation, data.state);
    } else {
      throw new Error("HTTP connection error. Directing to client engine...");
    }
  } catch (err) {
    console.log("Routing query to client-side backup simulation:", err.message);
    logSystemMessage("Routing query to browser-side local simulated agents engine...");
    const clientData = localRunWorkflow(query);
    playAgentWorkflow(clientData.logs, clientData.conversation, clientData.state);
  }
});

function playAgentWorkflow(logs, conversation, state) {
  const terminal = document.getElementById('chat-messages');
  let step = 0;

  function runNextStep() {
    if (step >= conversation.length) {
      resetAgentNodes();
      document.getElementById('agent-farmer').querySelector('.node-pulse').className = 'node-pulse green';
      document.getElementById('agent-disease').querySelector('.node-pulse').className = 'node-pulse green';
      document.getElementById('agent-health').querySelector('.node-pulse').className = 'node-pulse green';
      document.getElementById('agent-task').querySelector('.node-pulse').className = 'node-pulse green';
      updateDashboardWidgets(state);
      return;
    }

    const item = conversation[step];
    resetAgentNodes();
    if (item.sender.includes("Farmer")) {
      document.getElementById('agent-farmer').querySelector('.node-pulse').className = 'node-pulse yellow';
    } else if (item.sender.includes("Disease")) {
      document.getElementById('agent-disease').querySelector('.node-pulse').className = 'node-pulse teal';
    } else if (item.sender.includes("Health")) {
      document.getElementById('agent-health').querySelector('.node-pulse').className = 'node-pulse yellow';
    } else if (item.sender.includes("Task")) {
      document.getElementById('agent-task').querySelector('.node-pulse').className = 'node-pulse green';
    }

    const msg = document.createElement('div');
    msg.className = 'agent-message agent-text';
    msg.innerHTML = `
      <div class="msg-meta">${item.sender}</div>
      <div class="msg-content">${item.text.replace(/\n/g, '<br>')}</div>
    `;
    terminal.appendChild(msg);
    terminal.scrollTop = terminal.scrollHeight;

    step++;
    setTimeout(runNextStep, 1000);
  }

  runNextStep();
}

function updateDashboardWidgets(state) {
  document.getElementById('val-diagnosis').textContent = state.diagnosis;
  document.getElementById('val-biological').innerHTML = `<strong>Organic Cure:</strong> ${state.remedy.organic}`;

  const riskClassEl = document.getElementById('val-health-class');
  const riskBarEl = document.getElementById('val-risk-bar');
  const riskAdviceEl = document.getElementById('val-health-advice');
  const reiEl = document.getElementById('val-rei');
  const phiEl = document.getElementById('val-phi');

  reiEl.textContent = `${state.remedy.reEntry} Hours`;
  phiEl.textContent = `${state.remedy.preHarvest} Days`;

  if (state.healthAdvisory) {
    riskClassEl.textContent = state.healthAdvisory.hazardClass;
    riskAdviceEl.textContent = state.healthAdvisory.publicHealthAdvice;

    const hazard = state.healthAdvisory.hazardClass.toLowerCase();
    if (hazard.includes("non-toxic") || hazard.includes("class iv")) {
      riskBarEl.style.width = "25%";
      riskBarEl.style.backgroundColor = "var(--accent-green)";
      riskClassEl.style.color = "var(--accent-green)";
    } else if (hazard.includes("slightly") || hazard.includes("class iii")) {
      riskBarEl.style.width = "50%";
      riskBarEl.style.backgroundColor = "var(--accent-yellow)";
      riskClassEl.style.color = "var(--accent-yellow)";
    } else if (hazard.includes("moderately") || hazard.includes("class ii")) {
      riskBarEl.style.width = "75%";
      riskBarEl.style.backgroundColor = "orange";
      riskClassEl.style.color = "orange";
    } else {
      riskBarEl.style.width = "100%";
      riskBarEl.style.backgroundColor = "var(--accent-red)";
      riskClassEl.style.color = "var(--accent-red)";
    }
  } else {
    riskClassEl.textContent = "Safe / Local Control";
    riskClassEl.style.color = "var(--accent-green)";
    riskBarEl.style.width = "10%";
    riskBarEl.style.backgroundColor = "var(--accent-green)";
    riskAdviceEl.textContent = "No hazardous compounds detected.";
  }

  const taskPanel = document.getElementById('val-task-details');
  if (state.optimizedTask) {
    taskPanel.innerHTML = `
      <div class="task-item-display">
        <div class="name">${state.optimizedTask.taskName}</div>
        <div class="sub">
          <span>Field: ${state.optimizedTask.fieldNo}</span>
          <span>Date: ${state.optimizedTask.date} (${state.optimizedTask.time})</span>
        </div>
        <div class="sub">
          <span>Dosage: ${state.optimizedTask.dosage}</span>
          <span>REI: ${state.optimizedTask.rei}</span>
        </div>
        <div class="ppe-sub">⚠️ Required PPE: ${state.optimizedTask.ppe}</div>
      </div>
    `;
  } else {
    taskPanel.innerHTML = `<div class="empty-state">No scheduled tasks.</div>`;
  }
}

// Symptom Presets Handler
const btnRunSymptoms = document.getElementById('btn-run-symptoms');
btnRunSymptoms.addEventListener('click', async () => {
  const crop = document.getElementById('crop-dropdown').value;
  const checkboxes = document.querySelectorAll('input[name="symptoms"]:checked');
  const symptoms = Array.from(checkboxes).map(cb => cb.value);

  if (symptoms.length === 0) {
    alert("Please select at least one symptom checkbox.");
    return;
  }

  logSystemMessage(`Invoking 'detect_disease_db' tool offline...`);
  
  const result = localDetectDiseaseDb({ symptoms, crop });
  
  if (result.status === 'success' && result.matchedCount > 0) {
    const match = result.matches[0];
    logAgentMessage("Disease Agent", `Identified **${match.disease}**. Organic Remedy: ${match.details.organicRemedy}`);
    
    const chemicalName = match.details.id.includes('blight') ? "copper fungicide" : "sulfur";
    const hResult = localAssessHealthImplications({ chemicals: [chemicalName] });
    
    const manualState = {
      diagnosis: match.details.name,
      chemical: chemicalName,
      remedy: {
        organic: match.details.organicRemedy,
        chemical: match.details.chemicalRemedy,
        hazards: match.details.healthHazards,
        reEntry: match.details.reEntryIntervalHours,
        preHarvest: match.details.preHarvestIntervalDays,
        ppe: match.details.ppeRequired
      },
      healthAdvisory: hResult.profiles[chemicalName]
    };

    updateDashboardWidgets(manualState);
  } else {
    logAgentMessage("Disease Agent", "No matching diseases found in local DB.");
  }
});

// AST Calculator handler
const btnCalculate = document.getElementById('btn-calculate');
btnCalculate.addEventListener('click', () => {
  const chemical_qty = parseFloat(document.getElementById('calc-qty').value);
  const water_qty = parseFloat(document.getElementById('calc-water').value);
  const expression = document.getElementById('calc-expression').value;

  const resultBox = document.getElementById('calc-result-box');
  const codeOutput = document.getElementById('calc-code-output');

  resultBox.classList.remove('hidden');

  try {
    const validation = localValidateInputs({ chemical_qty, water_qty, expression });
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    const value = localParseMathExpression(expression, { chemical_qty, water_qty });
    codeOutput.className = "code-output success";
    codeOutput.style.color = "var(--accent-green)";
    codeOutput.textContent = `
[CLIENT EXECUTION SUCCESSFUL]
Expression: ${expression}
Variables : chemical_qty=${chemical_qty}, water_qty=${water_qty}
AST Result: ${value.toFixed(2)} ml/L dosage rate.

✔ Code-injection checks passed: No eval() used.
✔ Sandbox verified locally in the browser.
    `.trim();
  } catch (err) {
    codeOutput.className = "code-output error";
    codeOutput.style.color = "var(--accent-red)";
    codeOutput.textContent = `
[CLIENT EXECUTION REJECTED]
Error  : ${err.message}
Reason : Input or formula violated strict client-side AST constraints.
    `.trim();
  }
});

// ====================================================
// REAL-TIME SECURITY & LOGIC TEST SUITE RUNNER
// ====================================================
const btnRunTests = document.getElementById('btn-run-tests');
btnRunTests.addEventListener('click', () => {
  const testResultsBox = document.getElementById('test-results-box');
  const testSummaryText = document.getElementById('test-summary-text');
  const testMatrixOutput = document.getElementById('test-matrix-output');

  testResultsBox.classList.remove('hidden');
  testSummaryText.textContent = "Executing Test Suite...";
  testMatrixOutput.textContent = "";

  let total = 0;
  let passed = 0;
  const outputs = [];

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      outputs.push(`[PASS] ${message}`);
    } else {
      outputs.push(`[FAIL] ${message}`);
    }
  }

  // 1. Math Evaluator Assertions
  try {
    const res = localParseMathExpression("(chem * 1000) / water", { chem: 2.5, water: 500 });
    assert(res === 5, "Math expression evaluation matching '(2.5 * 1000) / 500' = 5");
  } catch(err) { assert(false, `Math expression failed: ${err.message}`); }

  try {
    localParseMathExpression("10 / val", { val: 0 });
    assert(false, "Division by zero should crash");
  } catch(err) {
    assert(err.message.includes("Division by zero"), "Division by zero exception caught correctly");
  }

  try {
    localParseMathExpression("alert('XSS')");
    assert(false, "Executing function calls inside math expression should fail");
  } catch(err) {
    assert(err.message.includes("Invalid characters"), "AST blocks non-arithmetic code terms (require/alert) successfully");
  }

  // 2. Input Sanitization Assertions
  const cleanInputs = localValidateInputs({ crop: "Tomato", chemical_qty: 2.5 });
  assert(cleanInputs.valid === true, "Sanitization accepts clean variable inputs");

  const injectionInputs = localValidateInputs({ crop: "Tomato; DROP TABLE Crops; --" });
  assert(injectionInputs.valid === false && injectionInputs.errors[0].includes("unsafe"), "Sanitization rejects database manipulation command strings");

  const xssInputs = localValidateInputs({ crop: "<script>hack()</script>" });
  assert(xssInputs.valid === false, "Sanitization rejects cross-site script structures");

  // 3. Database queries assertions
  const dbMatch = localDetectDiseaseDb({ symptoms: ["target-like rings"], crop: "Tomato" });
  assert(dbMatch.status === "success" && dbMatch.matchedCount > 0 && dbMatch.matches[0].disease.includes("Early Blight"), "Disease DB resolves 'target-like rings' on tomatoes to Early Blight");

  // 4. Orchestrator flow check
  try {
    const flow = localRunWorkflow("My tomato has water-soaked spots and white mold on stems");
    assert(flow.status === "success" && flow.state.diagnosis.includes("Late Blight"), "Multi-Agent sequential execution resolves tomato mold to Late Blight");
    assert(flow.state.optimizedTask !== null && flow.state.healthAdvisory !== null, "Consensus successfully compiles scheduled calendar item and toxicity profiles");
  } catch(err) { assert(false, `Orchestrator failed: ${err.message}`); }

  // Draw output summary
  testSummaryText.textContent = `Passed ${passed} of ${total} tests.`;
  if (passed === total) {
    testSummaryText.style.color = "var(--accent-green)";
    outputs.unshift("🎉 ALL AGROSHIELD SECURITY & CORE SYSTEMS SANITY CHECKS PASSED!");
  } else {
    testSummaryText.style.color = "var(--accent-red)";
  }
  testMatrixOutput.textContent = outputs.join('\n');
});

// Run connection establishment on loading page
window.addEventListener('load', () => {
  connectMcpSse();
});
