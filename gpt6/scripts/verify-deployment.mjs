import { readdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const base = 'https://www.lyx666.cn/housegpt/';
const sha256 = data => createHash('sha256').update(data).digest('hex');
async function filesAt(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesAt(directory + '/' + entry.name, name + '/'));
    else files.push(name);
  }
  return files;
}
const checks = await Promise.allSettled((await filesAt('dist')).sort().map(async file => {
  const local = await readFile('dist/' + file);
  const { stdout } = await run('curl', ['--noproxy', '*', '-fsS', '--connect-timeout', '10', '--max-time', '30', base + file], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
  if (!local.equals(stdout)) throw new Error(file + ': deployed bytes differ');
  return { file, bytes: local.length, sha256: sha256(local), match: true };
}));
const results = checks.map(result => result.status === 'fulfilled' ? result.value : { error: result.reason.message });
const report = { checkedAt: new Date().toISOString(), base, results };
await writeFile('artifacts/deployment-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (checks.some(result => result.status === 'rejected')) process.exitCode = 1;
