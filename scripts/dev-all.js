import { spawn } from 'child_process';
import process from 'process';

const services = [
  { name: 'tenant   ', cmd: 'go', args: ['run', './cmd/tenant-service/main.go'], cwd: './backend', color: '\x1b[36m' },
  { name: 'ingest   ', cmd: 'go', args: ['run', './cmd/ingest-service/main.go'], cwd: './backend', color: '\x1b[33m' },
  { name: 'recon    ', cmd: 'go', args: ['run', './cmd/recon-service/main.go'], cwd: './backend', color: '\x1b[35m' },
  { name: 'invoicing', cmd: 'go', args: ['run', './cmd/invoicing-service/main.go'], cwd: './backend', color: '\x1b[32m' },
  { name: 'gateway  ', cmd: 'go', args: ['run', './cmd/gateway/main.go'], cwd: './backend', color: '\x1b[34m' },
  { name: 'frontend ', cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite', '--port=3000', '--host=0.0.0.0'], cwd: '.', color: '\x1b[31m' },
];

const RESET = '\x1b[0m';
const activeProcesses = [];

console.log('\x1b[1;32m%s\x1b[0m', '🚀 Launching TaxDrive (AutoTax) Local Full Stack Mesh...');

// Start database containers first
console.log('📦 Ensuring PostgreSQL & Redis containers are running...');
const dbUp = spawn(process.platform === 'win32' ? 'docker.exe' : 'docker', ['compose', 'up', '-d', 'postgres', 'redis'], {
  stdio: 'inherit',
  shell: true,
});

dbUp.on('close', (code) => {
  if (code !== 0) {
    console.warn('⚠️ Warning: docker compose up for databases exited with code', code);
  }

  console.log('\x1b[1;36m%s\x1b[0m', '⚡ Starting Go microservices mesh & React frontend concurrently...\n');

  for (const svc of services) {
    const proc = spawn(svc.cmd, svc.args, {
      cwd: svc.cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    activeProcesses.push(proc);

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${svc.color}[${svc.name}]${RESET} ${line}`);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.error(`${svc.color}[${svc.name}]${RESET} ${line}`);
        }
      }
    });

    proc.on('close', (exitCode) => {
      console.log(`${svc.color}[${svc.name}]${RESET} Process exited with code ${exitCode}`);
    });
  }
});

function cleanup() {
  console.log('\n\x1b[1;33m🛑 Gracefully shutting down all services...\x1b[0m');
  for (const proc of activeProcesses) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
      }
    } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
