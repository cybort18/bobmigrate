/**
 * BobMigrate Unified Orchestrator Launcher
 * Starts sample-monolith (port 4000), core-engine (port 5000), and dashboard (port 3000)
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log(' [BOBMIGRATE] Autonomous Legacy Monolith Decomposer');
console.log(' Official IBM Bob 2.0 Hackathon Showcase System');
console.log('================================================================');

const processes = [];

function startProcess(name, cmd, args, cwd, color) {
  const p = spawn(cmd, args, {
    cwd: path.resolve(__dirname, cwd),
    stdio: 'pipe',
    shell: true
  });

  p.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.log(`${color}[${name}]${'\x1b[0m'} ${line}`);
    }
  });

  p.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.error(`${color}[${name}]${'\x1b[0m'} ${line}`);
    }
  });

  p.on('exit', (code) => {
    console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`);
  });

  processes.push(p);
  return p;
}

// 1. Start Sample Monolith (Port 4000)
console.log('[1/3] Starting Legacy Sample Monolith on port 4000...');
startProcess('Monolith', 'node', ['server.js'], 'sample-monolith', '\x1b[35m');

// 2. Start Core Engine (Port 5000)
console.log('[2/3] Starting Core Engine on port 5000...');
startProcess('Engine', 'node', ['dist/index.js'], 'core-engine', '\x1b[36m');

// 3. Start Dashboard (Port 3000)
console.log('[3/3] Starting Dashboard UI on port 3000...');
startProcess('Dashboard', 'npx', ['vite', '--port', '3000'], 'dashboard', '\x1b[32m');

console.log('================================================================');
console.log(' Active System Endpoints:');
console.log('    - Interactive Dashboard: http://localhost:3000');
console.log('    - Core Engine REST API:  http://localhost:5000/api/analyze');
console.log('    - Legacy Monolith App:   http://localhost:4000/health');
console.log('================================================================');

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down all BobMigrate services...');
  for (const p of processes) {
    p.kill('SIGTERM');
  }
  process.exit(0);
});
