import { loadTokenCache } from './lib/config.js';

async function runBenchmark() {
    const start = process.hrtime.bigint();
    const ITERATIONS = 10000;

    for (let i = 0; i < ITERATIONS; i++) {
        await loadTokenCache();
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Token Cache: Time taken for ${ITERATIONS} iterations: ${durationMs.toFixed(2)}ms`);
    console.log(`Token Cache: Average time per iteration: ${(durationMs / ITERATIONS).toFixed(4)}ms`);
}

runBenchmark().catch(console.error);
