// Pyodide Web Worker — executes Python code in a sandboxed thread
// This runs in a separate thread so infinite loops can be killed via worker.terminate()

let pyodide = null;

async function initPyodide() {
    try {
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js');
        pyodide = await loadPyodide();
        pyodide.runPython(`
import sys, io
`);
        self.postMessage({ type: 'ready' });
    } catch (err) {
        self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message });
    }
}

self.onmessage = async function (event) {
    if (event.data.type === 'run') {
        const { id, code } = event.data;
        try {
            // Reset stdout/stderr capture for each run
            pyodide.runPython(`
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
            pyodide.runPython(code);

            // Read candidate's print() output (stdout) separately from test results
            const stdout = pyodide.runPython('sys.stdout.getvalue()');
            const stderr = pyodide.runPython('sys.stderr.getvalue()');

            // Read test results from Python variable (not stdout)
            let testResults = null;
            try {
                testResults = pyodide.runPython('_test_results_json');
            } catch (e) {
                // Variable may not exist if candidate code errored before tests ran
            }

            self.postMessage({
                type: 'result',
                id,
                stdout: stdout,
                testResults: testResults,
                error: stderr || null
            });
        } catch (err) {
            // Capture any stdout that was printed before the error
            let stdout = '';
            try {
                stdout = pyodide.runPython('sys.stdout.getvalue()');
            } catch (e) { /* ignore */ }

            self.postMessage({
                type: 'result',
                id,
                stdout: stdout,
                testResults: null,
                error: err.message
            });
        }
    }
};

initPyodide();
