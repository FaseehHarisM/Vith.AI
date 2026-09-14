import { createServer } from '@hattip/adapter-node';
import { createRouter } from '@hattip/router';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = createRouter();

dotenv.config();

const apiDir = path.join(__dirname, 'api');
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'));

globalThis.Deno = { env: { get: (k) => process.env[k] } };

for (const file of files) {
  const route = '/api/' + file.replace('.ts', '');
  const handlerFn = async (ctx) => {
    try {
      const mod = await import('file://' + path.join(apiDir, file));
      const handler = mod.default;
      return handler(ctx.request);
    } catch (e) {
      console.error('Error in route', route, e);
      return new Response(e.message, { status: 500 });
    }
  };
  router.post(route, handlerFn);
  router.options(route, handlerFn);
  router.get(route, handlerFn);
}

const server = createServer(router.buildHandler());
server.listen(3001, () => {
  console.log('Local API Server running on port 3001');
});
