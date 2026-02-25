
import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const binPath = path.resolve(__dirname, '../bin/mage-remote-run.js');

// Helper to wait for process output
function waitFor(cp, strMatcher, timeout = 5000) {
    return new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for "${strMatcher}". Output so far: ${output}`));
        }, timeout);

        const onData = (data) => {
            output += data.toString();
            if (output.includes(strMatcher)) {
                clearTimeout(timer);
                cp.stderr.removeListener('data', onData);
                resolve(output);
            }
        };

        cp.stderr.on('data', onData);
    });
}

// Helper to fully kill process
function killProcess(cp) {
    if (cp && !cp.killed) {
        cp.kill();
    }
}

describe('MCP Server', () => {
    let activeCp;

    afterEach(() => {
        killProcess(activeCp);
        activeCp = null;
    });

    describe('CLI Execution', () => {

        test('stdio transport starts and prints protocol info', async () => {
            activeCp = spawn('node', [binPath, 'mcp', '--transport', 'stdio']);

            // Should print "Registered Tools:" and "Protocol: stdio"
            // We verify stderr output
            try {
                const output = await waitFor(activeCp, 'Registered Tools:');
                expect(output.toLowerCase()).toContain('protocol: stdio');
            } catch (e) {
                throw e;
            }
        }, 10000);

        test('http transport starts and listens on port', async () => {
            const port = 18099;
            activeCp = spawn('node', [binPath, 'mcp', '--transport', 'http', '--port', port.toString()]);

            // Wait for "Registered Tools:" which is the last log message
            try {
                const output = await waitFor(activeCp, 'Registered Tools:');
                expect(output).toContain(`http://127.0.0.1:${port}`);
                expect(output).toContain('Protocol: HTTP (SSE)');
            } catch (e) {
                activeCp.kill(); // Ensure kill if wait fails (handled by afterEach too)
                throw e;
            }
        }, 10000);

        test('website_list argument passing (format json)', async () => {
            // Mocking console.log output capture in E2E via transport 
            activeCp = spawn('node', [binPath, 'mcp', '--transport', 'stdio']);

            let stdout = '';
            activeCp.stdout.on('data', d => stdout += d.toString());

            // Wait for server ready
            await waitFor(activeCp, 'Registered Tools:');

            // Send request
            const req = {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "website_list",
                    arguments: { format: "json" }
                }
            };
            activeCp.stdin.write(JSON.stringify(req) + "\n");

            // Wait for response in stdout
            // We can poll stdout or use a similar waiter
            return new Promise((resolve, reject) => {
                let checks = 0;
                const interval = setInterval(() => {
                    checks++;
                    if (stdout.includes('"content":[{"type":"text"')) {
                        clearInterval(interval);
                        // Success, we found JSON-like structure in response
                        resolve();
                    }
                    if (checks > 20) { // 2 seconds
                        clearInterval(interval);
                        reject(new Error(`Timeout waiting for JSON response. Stdout: ${stdout}`));
                    }
                }, 100);
            });
        }, 10000);

        test('include/exclude filters tools with exclude priority', async () => {
            activeCp = spawn('node', [
                binPath,
                'mcp',
                '--transport',
                'stdio',
                '--include',
                'order:*',
                '--exclude',
                'order:cancel'
            ]);

            let stdout = '';
            activeCp.stdout.on('data', d => stdout += d.toString());

            await waitFor(activeCp, 'Registered Tools:');

            const req = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
            };
            activeCp.stdin.write(JSON.stringify(req) + '\n');

            await new Promise((resolve, reject) => {
                let checks = 0;
                const interval = setInterval(() => {
                    checks++;
                    if (stdout.includes('"name":"order_list"')) {
                        clearInterval(interval);
                        try {
                            expect(stdout).not.toContain('"name":"order_cancel"');
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }
                    if (checks > 20) {
                        clearInterval(interval);
                        reject(new Error(`Timeout waiting for tools/list response. Stdout: ${stdout}`));
                    }
                }, 100);
            });
        }, 10000);
    });
});
