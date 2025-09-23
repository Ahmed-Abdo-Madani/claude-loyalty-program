#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧹 Cleaning ports 3000 and 3001...');

async function killProcessOnPort(port) {
  try {
    // Find processes using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

    if (!stdout.trim()) {
      console.log(`✅ Port ${port} is already free`);
      return;
    }

    // Extract PIDs from netstat output
    const lines = stdout.trim().split('\n');
    const pids = new Set();

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(pid)) {
        pids.add(pid);
      }
    });

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /F /PID ${pid}`);
        console.log(`🔄 Killed process ${pid} on port ${port}`);
      } catch (error) {
        // Process might already be dead, ignore
        console.log(`⚠️  Process ${pid} could not be killed (might already be stopped)`);
      }
    }

    console.log(`✅ Port ${port} cleaned`);
  } catch (error) {
    console.log(`✅ Port ${port} is free (or already cleaned)`);
  }
}

async function cleanPorts() {
  console.log('🔍 Checking for processes on ports 3000 and 3001...\n');

  await killProcessOnPort(3000);
  await killProcessOnPort(3001);

  console.log('\n🎉 Port cleanup completed!');
  console.log('Ready to start development servers...\n');
}

cleanPorts().catch(console.error);