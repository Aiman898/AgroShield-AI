import { parseMathExpression } from './src/utils/safeEval.js';
import * as tools from './src/mcp/tools.js';
import { AgroShieldOrchestrator } from './src/agents/orchestrator.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

async function runTests() {
  console.log("=========================================");
  console.log(" RUNNING AGROSHIELD OFFLINE TEST SUITE ");
  console.log("=========================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: Safe AST Math Expression Evaluator
  // ----------------------------------------------------
  console.log("--- 1. Testing Safe Math Expression Evaluator ---");
  
  try {
    const result1 = parseMathExpression("(chemical_qty * 1000) / water_qty", {
      chemical_qty: 2.5,
      water_qty: 500
    });
    assert(result1 === 5, "Evaluated '(2.5 * 1000) / 500' to equal 5.");
  } catch (err) {
    assert(false, `Standard arithmetic failed: ${err.message}`);
  }

  try {
    const result2 = parseMathExpression("((base + offset) * multiplier) - divisor", {
      base: 10,
      offset: 5,
      multiplier: 3,
      divisor: 5
    });
    assert(result2 === 40, "Evaluated '((10 + 5) * 3) - 5' to equal 40.");
  } catch (err) {
    assert(false, `Nested parentheses failed: ${err.message}`);
  }

  // Assertion for division by zero
  try {
    parseMathExpression("10 / zero_val", { zero_val: 0 });
    assert(false, "Division by zero should have thrown an error.");
  } catch (err) {
    assert(err.message.includes("Division by zero"), "Caught division by zero exception.");
  }

  // Assertion for script execution blockage (Security proof)
  try {
    parseMathExpression("require('fs')");
    assert(false, "Executing non-arithmetic function call should have thrown an error.");
  } catch (err) {
    assert(err.message.includes("Invalid characters"), "Successfully blocked non-arithmetic characters.");
  }

  // ----------------------------------------------------
  // TEST SECTION 2: Input Validation Tool
  // ----------------------------------------------------
  console.log("\n--- 2. Testing Input Validation & Sanitization ---");

  const validParams = {
    crop: "Tomato",
    chemical_qty: 2.5,
    coordinates: { lat: 37.7749, lng: -122.4194 }
  };
  const validation1 = tools.validate_inputs(validParams);
  assert(validation1.valid === true, "Valid input parameters accepted.");

  const xssParams = {
    crop: "<script>alert('XSS')</script>",
    chemical_qty: 1.2
  };
  const validation2 = tools.validate_inputs(xssParams);
  assert(validation2.valid === false && validation2.errors[0].includes("unsafe characters"), "XSS script payload caught and rejected.");

  const sqlParams = {
    crop: "Tomato' UNION SELECT username, password FROM users --",
    chemical_qty: 1
  };
  const validation3 = tools.validate_inputs(sqlParams);
  assert(validation3.valid === false && validation3.errors[0].includes("unsafe characters"), "SQL injection payload caught and rejected.");

  const invalidCoords = {
    coordinates: { lat: 105, lng: -122 }
  };
  const validation4 = tools.validate_inputs(invalidCoords);
  assert(validation4.valid === false && validation4.errors[0].includes("range"), "Geographic coordinates out of range caught and rejected.");

  // ----------------------------------------------------
  // TEST SECTION 3: Disease Database Lookup
  // ----------------------------------------------------
  console.log("\n--- 3. Testing Disease Database Lookup ---");

  const diseaseMatch = tools.detect_disease_db({
    symptoms: ["brown spots", "target-like rings"],
    crop: "Tomato"
  });
  assert(diseaseMatch.status === "success" && diseaseMatch.matchedCount > 0, "Successfully queried tomato early blight using symptoms list.");
  if (diseaseMatch.matchedCount > 0) {
    assert(diseaseMatch.matches[0].disease.includes("Early Blight"), `Matched disease name '${diseaseMatch.matches[0].disease}' matches early blight.`);
  }

  // ----------------------------------------------------
  // TEST SECTION 4: Multi-Agent Orchestration
  // ----------------------------------------------------
  console.log("\n--- 4. Testing Multi-Agent Orchestration Chain ---");

  const orchestrator = new AgroShieldOrchestrator();
  const userQuery = "My tomato crop leaves are starting to show brown spots and target-like rings. What should I do?";
  
  try {
    const flowResult = await orchestrator.runWorkflow(userQuery);
    assert(flowResult.status === "success", "Agent workflow executed successfully offline.");
    assert(flowResult.state.diagnosis.includes("Early Blight"), `Workflow diagnosed disease: ${flowResult.state.diagnosis}`);
    assert(flowResult.state.chemical === "copper fungicide", "Workflow mapped remedy treatment to copper fungicide.");
    assert(flowResult.state.optimizedTask.dosage === "5.0 ml/L", `Workflow calculated dosage: ${flowResult.state.optimizedTask.dosage}`);
    assert(flowResult.conversation.length === 5, "Workflow completed full 5-step agent execution conversation tree.");
  } catch (err) {
    assert(false, `Agent flow execution crashed: ${err.message}`);
  }

  console.log("\n=========================================");
  console.log(` SUMMARY: Passed ${passedTests} of ${totalTests} tests.`);
  console.log("=========================================");

  if (passedTests === totalTests) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED. PLEASE VERIFY COMPONENT LOGIC.");
    process.exit(1);
  }
}

runTests();
