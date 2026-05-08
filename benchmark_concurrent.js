import { loadConfig } from './lib/config.js';

async function runBenchmark() {
    const start = process.hrtime.bigint();
    const CONCURRENCY = 1000;

    const promises = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        promises.push(loadConfig());
    }
    await Promise.all(promises);

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Time taken for ${CONCURRENCY} concurrent iterations: ${durationMs.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
