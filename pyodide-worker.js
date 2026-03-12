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

            const stdout = pyodide.runPython('sys.stdout.getvalue()');
            const stderr = pyodide.runPython('sys.stderr.getvalue()');

            self.postMessage({
                type: 'result',
                id,
                output: stdout,
                error: stderr || null
            });
        } catch (err) {
            self.postMessage({
                type: 'result',
                id,
                output: '',
                error: err.message
            });
        }
    }
};

initPyodide();
