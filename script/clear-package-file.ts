#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

// Check if a path argument is provided
if (process.argv.length < 3) {
  console.error('Please provide a path to package.json');
  process.exit(1);
}

// Get the path argument
const packageJsonPath = path.resolve(process.argv[2]);

// Check if the file exists
if (!fs.existsSync(packageJsonPath)) {
  console.error(`File not found: ${packageJsonPath}`);
  process.exit(1);
}

try {
  // Read the package.json file
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson: Record<string, any> = JSON.parse(packageJsonContent);

  // Remove workspace-related fields
  if (packageJson.workspaces) {
    packageJson.workspaces = undefined;
    console.log('Removed "workspaces" field');
  }

  // Update main field
  if (packageJson.main === './src/index.ts') {
    packageJson.main = './dist/index.js';
    console.log('Updated "main" field from "./src/index.ts" to "./dist/index.js"');
  }

  // Remove dependencies that reference workspaces
  if (packageJson.dependencies) {
    let removedCount = 0;
    for (const dep of Object.keys(packageJson.dependencies)) {
      if (String(packageJson.dependencies[dep]).includes('workspace:')) {
        packageJson.dependencies[dep] = undefined;
        removedCount++;
      }
    }
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} workspace dependencies`);
    }
  }

  // Remove devDependencies that reference workspaces
  if (packageJson.devDependencies) {
    let removedCount = 0;
    for (const dep of Object.keys(packageJson.devDependencies)) {
      if (String(packageJson.devDependencies[dep]).includes('workspace:')) {
        packageJson.devDependencies[dep] = undefined;
        removedCount++;
      }
    }
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} workspace devDependencies`);
    }
  }

  // Clean up undefined properties before writing
  if (packageJson.dependencies) {
    packageJson.dependencies = Object.fromEntries(
      Object.entries(packageJson.dependencies).filter(([_, value]) => value !== undefined)
    );
  }
  
  if (packageJson.devDependencies) {
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(packageJson.devDependencies).filter(([_, value]) => value !== undefined)
    );
  }

  // Write the updated package.json back to the file
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8'
  );

  console.log(`Updated ${packageJsonPath}`);
} catch (error) {
  console.error(`Error processing ${packageJsonPath}:`, error);
  process.exit(1);
}
