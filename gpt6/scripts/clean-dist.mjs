import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name === '.DS_Store') await rm(path);
    else if (entry.isDirectory()) await clean(path);
  }
}

await clean('dist');
