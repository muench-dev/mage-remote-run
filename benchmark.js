import { loadConfig } from './lib/config.js';

async function runBenchmark() {
    const start = process.hrtime.bigint();
    const ITERATIONS = 10000;

    for (let i = 0; i < ITERATIONS; i++) {
        await loadConfig();
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Time taken for ${ITERATIONS} iterations: ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per iteration: ${(durationMs / ITERATIONS).toFixed(4)}ms`);
}

runBenchmark().catch(console.error);
