import readline from 'readline';
import * as tools from './tools.js';

export class MCPServer {
  constructor() {
    this.serverInfo = {
      name: "agroshield-mcp-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05"
    };
  }

  // List of tools that this MCP server exposes
  getToolsDescription() {
    return [
      {
        name: "validate_inputs",
        description: "Strictly sanitizes and validates inputs to prevent XSS/SQL/command injections and verify coordinate ranges/quantities.",
        inputSchema: {
          type: "object",
          properties: {
            crop: { type: "string", description: "Target crop name." },
            chemical_qty: { type: "number", description: "Quantity of chemical compound applied." },
            coordinates: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" }
              },
              required: ["lat", "lng"]
            }
          }
        }
      },
      {
        name: "execute_safe_calculation",
        description: "Evaluates mathematical formulations (such as dilution, dosage ratios) safely without code injection risks.",
        inputSchema: {
          type: "object",
          properties: {
            expression: { type: "string", description: "Mathematical expression with operators +, -, *, /, and variables." },
            variables: { type: "object", description: "Map of variable names to numbers used in the expression." }
          },
          required: ["expression"]
        }
      },
      {
        name: "detect_disease_db",
        description: "Searches the agricultural database for crop diseases matching specified symptoms.",
        inputSchema: {
          type: "object",
          properties: {
            symptoms: {
              type: "array",
              items: { type: "string" },
              description: "Array of keywords describing crop symptoms (e.g. brown spots, yellow halo, white mold)."
            },
            crop: { type: "string", description: "Optional crop filter (e.g., Tomato)." }
          },
          required: ["symptoms"]
        }
      },
      {
        name: "assess_health_implications",
        description: "Fetches public human health toxicity profiles, re-entry intervals (REI), and hazard guidelines for active pesticide/fungicide chemicals.",
        inputSchema: {
          type: "object",
          properties: {
            chemicals: {
              type: "array",
              items: { type: "string" },
              description: "List of chemicals to evaluate (e.g., Copper Fungicide, Sulfur, Neem Oil, Glyphosate)."
            }
          },
          required: ["chemicals"]
        }
      }
    ];
  }

  /**
   * Main message router handling JSON-RPC requests
   */
  async handleMessage(message, respond) {
    if (!message || typeof message !== 'object') {
      return respond(this.errorResponse(null, -32600, "Invalid Request"));
    }

    const { jsonrpc, id, method, params } = message;

    if (jsonrpc !== '2.0') {
      return respond(this.errorResponse(id || null, -32600, "Invalid Request (non-2.0 JSON-RPC)"));
    }

    try {
      switch (method) {
        case 'initialize':
          return respond(this.successResponse(id, {
            protocolVersion: this.serverInfo.protocolVersion,
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: this.serverInfo.name,
              version: this.serverInfo.version
            }
          }));

        case 'tools/list':
          return respond(this.successResponse(id, {
            tools: this.getToolsDescription()
          }));

        case 'tools/call':
          if (!params || !params.name) {
            return respond(this.errorResponse(id, -32602, "Invalid params: 'name' is required for tools/call"));
          }
          return await this.callTool(id, params.name, params.arguments || {}, respond);

        default:
          return respond(this.errorResponse(id, -32601, `Method not found: ${method}`));
      }
    } catch (err) {
      return respond(this.errorResponse(id, -32603, `Internal error: ${err.message}`));
    }
  }

  /**
   * Dispatches the tool call to the matching tool function
   */
  async callTool(id, toolName, args, respond) {
    let result;
    switch (toolName) {
      case 'validate_inputs':
        result = tools.validate_inputs(args);
        break;
      case 'execute_safe_calculation':
        result = tools.execute_safe_calculation(args);
        break;
      case 'detect_disease_db':
        result = tools.detect_disease_db(args);
        break;
      case 'assess_health_implications':
        result = tools.assess_health_implications(args);
        break;
      default:
        return respond(this.errorResponse(id, -32601, `Tool not found: ${toolName}`));
    }

    if (result && result.status === 'error') {
      return respond(this.successResponse(id, {
        content: [{ type: "text", text: `Error: ${result.error || JSON.stringify(result)}` }],
        isError: true
      }));
    }

    return respond(this.successResponse(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    }));
  }

  successResponse(id, result) {
    return { jsonrpc: '2.0', id, result };
  }

  errorResponse(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  /**
   * Starts Stdio connection for CLI / desktop integrations
   */
  startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const message = JSON.parse(line);
        this.handleMessage(message, (response) => {
          process.stdout.write(JSON.stringify(response) + '\n');
        });
      } catch (err) {
        const errorResp = this.errorResponse(null, -32700, "Parse error");
        process.stdout.write(JSON.stringify(errorResp) + '\n');
      }
    });

    console.error("AgroShield MCP Server running on Stdio transport...");
  }
}
