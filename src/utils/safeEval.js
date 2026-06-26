/**
 * Safely parses and evaluates basic mathematical expressions.
 * Supported operators: +, -, *, /, ( )
 * Supported variables: map of string names to numeric values
 * 
 * Uses the Shunting-Yard algorithm to securely parse and evaluate expressions without eval().
 */
export function parseMathExpression(expression, variables = {}) {
  // Remove whitespace
  const cleanExpr = expression.replace(/\s+/g, '');

  // Tokenize the expression
  // Matches numbers (including decimals), operators, parentheses, or variable names
  const tokenRegex = /[0-9]+(?:\.[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*|[-+*/()]/g;
  const tokens = cleanExpr.match(tokenRegex);

  if (!tokens || tokens.join('') !== cleanExpr) {
    throw new Error("Invalid characters in expression.");
  }

  // Precedence of operators
  const precedence = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2
  };

  const outputQueue = [];
  const operatorStack = [];

  for (const token of tokens) {
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
      // It is a number literal
      outputQueue.push(parseFloat(token));
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      // It is a variable name
      if (!(token in variables)) {
        throw new Error(`Undefined variable: ${token}`);
      }
      outputQueue.push(variables[token]);
    } else if (token in precedence) {
      // It is an operator
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
      if (!foundMatching) {
        throw new Error("Mismatched parentheses in expression.");
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop();
    if (top === '(' || top === ')') {
      throw new Error("Mismatched parentheses in expression.");
    }
    outputQueue.push(top);
  }

  // Evaluate the RPN output queue
  const evaluationStack = [];
  for (const item of outputQueue) {
    if (typeof item === 'number') {
      evaluationStack.push(item);
    } else {
      // It is an operator
      if (evaluationStack.length < 2) {
        throw new Error("Malformed expression layout.");
      }
      const b = evaluationStack.pop();
      const a = evaluationStack.pop();
      
      let res;
      switch (item) {
        case '+': res = a + b; break;
        case '-': res = a - b; break;
        case '*': res = a * b; break;
        case '/':
          if (b === 0) {
            throw new Error("Division by zero error.");
          }
          res = a / b; 
          break;
        default:
          throw new Error(`Unknown operator: ${item}`);
      }
      evaluationStack.push(res);
    }
  }

  if (evaluationStack.length !== 1) {
    throw new Error("Invalid expression structure.");
  }

  return evaluationStack[0];
}
