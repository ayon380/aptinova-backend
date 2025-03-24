const vm = require('vm');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'aptinova-code-execution');

// Ensure temp directory exists synchronously
try {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating temp directory:', error);
}

async function executePythonInMemory(code, testCases, timeoutMs) {
  const tempFile = path.join(TEMP_DIR, `${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
  
  const pythonCode = `
import json
import time
import sys

${code}

def run_tests():
    test_cases = ${JSON.stringify(testCases)}
    test_results = []
    
    for test_case in test_cases:
        try:
            input_val = test_case["input"]
            start_time = time.time()
            output = reverse_string(input_val)
            end_time = time.time()
            execution_time_ms = (end_time - start_time) * 1000
            
            passed = output == test_case["expectedOutput"]
            
            test_results.append({
                "input": test_case["input"],
                "expectedOutput": test_case["expectedOutput"],
                "actualOutput": output,
                "passed": passed,
                "executionTimeMs": execution_time_ms,
                "marks": test_case["marks"] if passed else 0
            })
        except Exception as e:
            test_results.append({
                "input": test_case["input"],
                "expectedOutput": test_case["expectedOutput"],
                "actualOutput": None,
                "passed": False,
                "error": str(e),
                "marks": 0
            })
    
    print(json.dumps({"testResults": test_results}))

if __name__ == "__main__":
    run_tests()
`;

  try {
    // Write file synchronously
    fs.writeFileSync(tempFile, pythonCode, 'utf8');
    
    // Execute Python with spawnSync for better control
    const pythonProcess = spawnSync('python', [tempFile], {
      timeout: timeoutMs,
      encoding: 'utf8'
    });

    if (pythonProcess.error) {
      throw new Error(`Python process error: ${pythonProcess.error.message}`);
    }

    if (pythonProcess.stderr) {
      console.error('Python stderr:', pythonProcess.stderr);
    }

    if (pythonProcess.status !== 0) {
      throw new Error(`Python process exited with code ${pythonProcess.status}`);
    }

    const output = pythonProcess.stdout.trim();
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Python execution error: ${error.message}`);
  } finally {
    // Clean up temp file synchronously
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (err) {
      console.error('Error cleaning up temp file:', err);
    }
  }
}

function executeJavaScriptInMemory(code, testCases, timeoutMs) {
  const sandbox = {
    setTimeout,
    clearTimeout,
    console: {
      log: () => {},
      error: () => {},
    },
    performance: {
      now: () => Date.now()
    },
    testResults: [],
  };

  const testWrapper = `
    ${code}
    
    const testResults = [];
    const testCases = ${JSON.stringify(testCases)};
    
    for (const testCase of testCases) {
      try {
        const input = testCase.input;
        const start = performance.now();
        const output = reverseString(input);
        const end = performance.now();
        const executionTimeMs = end - start;
        
        const passed = output === testCase.expectedOutput;
        
        testResults.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: output,
          passed,
          executionTimeMs,
          marks: passed ? testCase.marks : 0
        });
      } catch (error) {
        testResults.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          passed: false,
          error: error.toString(),
          marks: 0
        });
      }
    }
    
    ({ testResults });
  `;

  const context = vm.createContext(sandbox);
  
  try {
    const result = vm.runInContext(testWrapper, context, { 
      timeout: timeoutMs,
      displayErrors: true
    });
    return result;
  } catch (error) {
    throw new Error(`JavaScript execution error: ${error.message}`);
  }
}

module.exports = {
  executePythonInMemory,
  executeJavaScriptInMemory
};
