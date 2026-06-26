import * as tools from '../mcp/tools.js';

export class AgroShieldOrchestrator {
  constructor() {
    this.name = "AgroShield ADK Orchestrator";
  }

  /**
   * Run the multi-agent workflow sequentially.
   * Emulates sequential node execution similar to Google ADK Workflow.
   */
  async runWorkflow(userQuery) {
    const logs = [];
    const conversation = [];
    let state = {
      query: userQuery,
      crop: "unknown",
      symptoms: [],
      diagnosis: null,
      remedy: null,
      chemicalUsed: null,
      healthAdvisory: null,
      optimizedTask: null
    };

    // --- NODE 1: Farmer Agent (Orchestration & NLU) ---
    logs.push({
      agent: "Farmer Agent",
      status: "active",
      message: "Parsing farmer request and extracting crop/symptoms context."
    });

    // Simple keyword extraction for offline NLU
    const lowercaseQuery = userQuery.toLowerCase();
    
    // Detect Crop
    if (lowercaseQuery.includes("tomato") || lowercaseQuery.includes("potato")) {
      state.crop = "Tomato/Potato";
    } else if (lowercaseQuery.includes("cucumber") || lowercaseQuery.includes("squash") || lowercaseQuery.includes("melon")) {
      state.crop = "Cucumber/Squash/Melon";
    } else if (lowercaseQuery.includes("corn") || lowercaseQuery.includes("maize") || lowercaseQuery.includes("bean")) {
      state.crop = "Corn/Beans";
    }

    // Detect Symptoms
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

    // Default symptoms fallback if none match
    if (state.symptoms.length === 0) {
      if (lowercaseQuery.includes("spot") || lowercaseQuery.includes("blight")) {
        state.symptoms.push("brown spot");
      } else if (lowercaseQuery.includes("mold") || lowercaseQuery.includes("powdery")) {
        state.symptoms.push("white powdery coating");
      } else {
        state.symptoms.push("brown spot"); // default fallback
      }
    }

    conversation.push({
      sender: "Farmer Agent",
      text: `Hello! I have captured your query. Crop detected: **${state.crop}**. Identified symptoms: **${state.symptoms.join(', ')}**. Let me consult our Crop Disease Detector agent to diagnose this.`
    });

    // --- NODE 2: Crop Disease Detector Agent ---
    logs.push({
      agent: "Crop Disease Agent",
      status: "active",
      message: "Running diagnosis query against local symptom database."
    });

    // Invoke detect_disease_db tool
    const diseaseResult = tools.detect_disease_db({
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
      
      // Select pesticide chemical for health mapping
      if (topMatch.id === 'early_blight' || topMatch.id === 'late_blight') {
        state.chemicalUsed = "copper fungicide";
      } else if (topMatch.id === 'powdery_mildew') {
        state.chemicalUsed = "sulfur";
      } else {
        state.chemicalUsed = "neem oil";
      }

      conversation.push({
        sender: "Crop Disease Agent",
        text: `Diagnosis: **${state.diagnosis}** detected on **${state.crop}**. 
* **Organic Control**: ${state.remedy.organic}
* **Chemical Control**: ${state.remedy.chemical}
Forwarding details to our Public Health Agent to verify community health protection measures and spray safety.`
      });
    } else {
      // Fallback
      state.diagnosis = "Unknown Foliar Disease / Nutrient Deficiency";
      state.chemicalUsed = "neem oil";
      state.remedy = {
        organic: "Apply general cold-pressed neem oil spray. Maintain balanced soil hydration.",
        chemical: "N/A",
        hazards: "Minimal health hazards.",
        reEntry: 4,
        preHarvest: 0,
        ppe: ["Gloves", "Safety glasses"]
      };

      conversation.push({
        sender: "Crop Disease Agent",
        text: `Diagnosis inconclusive based on symptom patterns. Recommending a safe broad-spectrum organic remedy: **Neem Oil Spray**. Transferring to Public Health Agent for toxicological confirmation.`
      });
    }

    // --- NODE 3: Public Health Impact Agent ---
    logs.push({
      agent: "Public Health Agent",
      status: "active",
      message: `Analyzing agricultural chemical risk profile for '${state.chemicalUsed}'.`
    });

    // Invoke assess_health_implications tool
    const healthResult = tools.assess_health_implications({
      chemicals: [state.chemicalUsed]
    });

    if (healthResult.status === 'success') {
      const profile = healthResult.profiles[state.chemicalUsed];
      state.healthAdvisory = profile;

      conversation.push({
        sender: "Public Health Agent",
        text: `Public Health Advisory for **${profile.chemicalName}** (${profile.hazardClass}):
* **Human Risk**: ${profile.chronicRisks} ${profile.acuteRisks}
* **Re-Entry Interval (REI)**: **${profile.reEntryIntervalHours} hours** before workers can re-enter field.
* **Pre-Harvest Interval (PHI)**: **${profile.preHarvestIntervalDays} days** before food consumption.
* **Environmental Buffer**: ${profile.publicHealthAdvice}
Forwarding safety constraints to Task Optimization Agent to construct safe worker schedules.`
      });
    }

    // --- NODE 4: Task Optimization Agent ---
    logs.push({
      agent: "Task Agent",
      status: "active",
      message: "Calculating chemical dilution rates and building optimized calendar schedules."
    });

    // Run safe math calculations for spray dosage
    // Equation: (pesticide_liters * 1000) / water_liters = dosage_ml_per_liter
    // Assume standard farm field requirements
    const pesticideQty = state.chemicalUsed === 'neem oil' ? 1.5 : 2.5; // liters
    const waterQty = 500; // liters
    const calcResult = tools.execute_safe_calculation({
      expression: "(chemical_qty * 1000) / water_qty",
      variables: {
        chemical_qty: pesticideQty,
        water_qty: waterQty
      }
    });

    const dosagePerLiter = calcResult.status === 'success' ? calcResult.resultValue : 5;

    // Build task item
    const sprayTime = "6:00 AM (Low wind drift)";
    const dateOffset = 1; // Schedule for tomorrow
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + dateOffset);
    const dateString = scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    state.optimizedTask = {
      taskName: `Apply ${state.chemicalUsed === 'neem oil' ? 'Organic Neem Oil' : 'Fungicide treatment'} for ${state.diagnosis.split(' (')[0]}`,
      date: dateString,
      time: sprayTime,
      dosage: `${dosagePerLiter.toFixed(1)} ml/L`,
      formulaUsed: `(${pesticideQty}L chemical * 1000) / ${waterQty}L water`,
      fieldNo: "Field B-4",
      rei: `${state.remedy.reEntry} Hours`,
      phi: `${state.remedy.preHarvest} Days`,
      ppe: state.remedy.ppe.join(', ')
    };

    conversation.push({
      sender: "Task Agent",
      text: `Optimized spray task created for **${dateString}** at **${sprayTime}**. 
* **Safe Dosage Rate**: Calculated at **${state.optimizedTask.dosage}** based on equation: \`(${pesticideQty}L chemical * 1000) / ${waterQty}L water\`.
* **Field**: Field B-4 (Tomato plots).
* **PPE Mandate**: ${state.optimizedTask.ppe}.
Routing completed task plan back to Farmer Agent.`
    });

    // --- NODE 5: Farmer Agent (Aggregation) ---
    logs.push({
      agent: "Farmer Agent",
      status: "success",
      message: "Aggregating multi-agent results into unified farm advisory."
    });

    conversation.push({
      sender: "Farmer Agent",
      text: `All agents have aligned! Your advisory report is ready on the dashboard. I have updated your Task Calendar and Health Risk meters with the diagnostic outcome. Please wear **${state.optimizedTask.ppe}** during application.`
    });

    return {
      status: "success",
      state: {
        crop: state.crop,
        symptoms: state.symptoms,
        diagnosis: state.diagnosis,
        chemical: state.chemicalUsed,
        remedy: state.remedy,
        healthAdvisory: state.healthAdvisory,
        optimizedTask: state.optimizedTask
      },
      logs,
      conversation
    };
  }
}
