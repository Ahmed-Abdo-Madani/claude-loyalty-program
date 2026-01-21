#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const isWindows = os.platform() === 'win32';

console.log('🧹 Cleaning ports 3000 and 3001...');

async function killProcessOnPort(port) {
  try {
    let command;
    if (isWindows) {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -i :${port} -t`;
    }

    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      console.log(`✅ Port ${port} is already free`);
      return;
    }

    const pids = new Set(stdout.trim().split(/\s+/).filter(pid => pid && pid !== '0' && !isNaN(pid)));

    for (const pid of pids) {
      try {
        if (isWindows) {
          await execAsync(`taskkill /F /PID ${pid}`);
        } else {
          await execAsync(`kill -9 ${pid}`);
        }
        console.log(`🔄 Killed process ${pid} on port ${port}`);
      } catch (error) {
        console.log(`⚠️  Process ${pid} could not be killed (might already be stopped)`);
      }
    }

    console.log(`✅ Port ${port} cleaned`);
  } catch (error) {
    // If command fails (e.g. lsof returns nothing), port is likely free
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