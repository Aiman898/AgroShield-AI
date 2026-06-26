import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPServer } from './src/mcp/server.js';
import { AgroShieldOrchestrator } from './src/agents/orchestrator.js';
import * as tools from './src/mcp/tools.js';

// Resolve directory paths in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read dotenv manually to operate 100% offline without extra complex dependencies
const envPath = path.join(__dirname, '.env');
const config = { PORT: 3000, HOST: 'localhost' };
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      config[parts[0].trim()] = parts[1].trim();
    }
  });
}

const mcpServer = new MCPServer();
const orchestrator = new AgroShieldOrchestrator();

// CLI Execution Check: Run Stdio MCP if --stdio flag is present
if (process.argv.includes('--stdio')) {
  mcpServer.startStdio();
} else {
  // Otherwise, start the full HTTP/Express web application
  const app = express();
  const PORT = parseInt(config.PORT || process.env.PORT || 3000, 10);

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // SSE Clients registry
  let sseClients = [];

  // ==========================================
  // MCP SERVER SSE TRANSPORT ENDPOINTS
  // ==========================================

  // 1. Establish SSE Connection Channel
  app.get('/mcp/sse', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientId = Date.now().toString();
    const newClient = { id: clientId, response: res };
    sseClients.push(newClient);

    // Write initial endpoint redirect event mapping to the client
    // Format conforming to Model Context Protocol specification
    res.write(`event: endpoint\ndata: /mcp/message?clientId=${clientId}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client.id !== clientId);
    });
  });

  // 2. Accept incoming JSON-RPC 2.0 messages from MCP SSE client
  app.post('/mcp/message', async (req, res) => {
    const message = req.body;
    const clientId = req.query.clientId;

    const targetClient = sseClients.find(client => client.id === clientId);

    await mcpServer.handleMessage(message, (rpcResponse) => {
      // Send response inline via HTTP response
      res.status(200).json(rpcResponse);

      // Also forward response through the SSE channel if client exists (spec compliance)
      if (targetClient) {
        targetClient.response.write(`event: message\ndata: ${JSON.stringify(rpcResponse)}\n\n`);
      }
    });
  });

  // ==========================================
  // DASHBOARD REST APIS
  // ==========================================

  // Post chat query to simulated Multi-Agent system
  app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Query message is required." });
    }

    try {
      const response = await orchestrator.runWorkflow(message);
      res.status(200).json(response);
    } catch (err) {
      res.status(500).json({ error: `Orchestrator error: ${err.message}` });
    }
  });

  // Direct disease diagnostic manual lookup
  app.post('/api/diagnose', (req, res) => {
    const { symptoms, crop } = req.body;
    const validationResult = tools.validate_inputs({ symptoms, crop });
    
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.errors.join(', ') });
    }

    const result = tools.detect_disease_db({ symptoms, crop });
    res.status(200).json(result);
  });

  // Direct chemical public health profile lookup
  app.post('/api/health-check', (req, res) => {
    const { chemicals } = req.body;
    const validationResult = tools.validate_inputs({ chemicals });
    
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.errors.join(', ') });
    }

    const result = tools.assess_health_implications({ chemicals });
    res.status(200).json(result);
  });

  // Safe arithmetic calculation simulator endpoint
  app.post('/api/calculate', (req, res) => {
    const { expression, variables } = req.body;
    
    // Validate values using standard validator tool
    const validationResult = tools.validate_inputs(variables);
    if (!validationResult.valid) {
      return res.status(400).json({ error: `Validation Error: ${validationResult.errors.join(', ')}` });
    }

    const result = tools.execute_safe_calculation({ expression, variables });
    res.status(200).json(result);
  });

  // Health-check endpoint
  app.get('/api/status', (req, res) => {
    res.status(200).json({
      status: "online",
      mode: "offline-simulation",
      mcpServer: "active",
      sseActiveConnections: sseClients.length
    });
  });

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` AgroShield Web App Server running at:`);
    console.log(` http://localhost:${PORT}`);
    console.log(` Mode: Offline Simulated Multi-Agent & MCP Server`);
    console.log(`====================================================`);
  });
}
