const { executePythonInMemory, executeJavaScriptInMemory } = require('./sandboxEval');

async function executeCode(language, code, testCases, constraints) {
  try {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return await executeJavaScriptInMemory(code, testCases, constraints.timeoutMs);
      case 'python':
      case 'py':
        return await executePythonInMemory(code, testCases, constraints.timeoutMs);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  } catch (error) {
    throw new Error(`Execution error: ${error.message}`);
  }
}

module.exports = { executeCode };
