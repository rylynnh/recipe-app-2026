import { cp, mkdir, rm } from 'node:fs/promises';

await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');

await mkdir('dist/server', { recursive: true });
await cp('dist/recipe_app/index.js', 'dist/server/index.js');
await rm('dist/recipe_app/.dev.vars', { force: true });
await rm('dist/recipe_app/.dev.vars.map', { force: true });
