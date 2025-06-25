/**
 * Production Build Configuration for ErgoTrack
 * Automated build process for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build configuration
const config = {
  // Source directories
  clientSrc: './client/src',
  serverSrc: './server',
  
  // Output directories
  distDir: './dist',
  publicDir: './dist/public',
  
  // Environment variables
  nodeEnv: process.env.NODE_ENV || 'production',
  
  // Build options
  minify: true,
  sourceMap: false,
  skipTests: false
};

// Utility functions
const log = (message) => {
  console.log(`[BUILD] ${new Date().toISOString()} - ${message}`);
};

const execCommand = (command, description) => {
  log(`Starting: ${description}`);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`Completed: ${description}`);
  } catch (error) {
    log(`Failed: ${description} - ${error.message}`);
    process.exit(1);
  }
};

// Build steps
const buildSteps = [
  {
    name: 'Clean previous build',
    command: 'rm -rf dist',
    description: 'Cleaning previous build artifacts'
  },
  {
    name: 'Type check',
    command: 'npx tsc --noEmit',
    description: 'Running TypeScript type checking'
  },
  {
    name: 'Database migration',
    command: 'npm run db:push',
    description: 'Applying database migrations'
  },
  {
    name: 'Build frontend',
    command: 'npx vite build --mode production',
    description: 'Building React frontend with Vite'
  },
  {
    name: 'Build backend',
    command: 'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify',
    description: 'Building Express backend with ESBuild'
  },
  {
    name: 'Copy static assets',
    command: 'cp -r client/public/* dist/public/ 2>/dev/null || true',
    description: 'Copying static assets'
  }
];

// Main build function
async function build() {
  log('Starting automated build process for ErgoTrack');
  log(`Environment: ${config.nodeEnv}`);
  log(`Target: Production deployment`);
  
  // Execute build steps
  for (const step of buildSteps) {
    execCommand(step.command, step.description);
  }
  
  // Verify build output
  const distExists = fs.existsSync(config.distDir);
  const indexExists = fs.existsSync(path.join(config.distDir, 'index.js'));
  const publicExists = fs.existsSync(config.publicDir);
  
  if (distExists && indexExists && publicExists) {
    log('Build completed successfully!');
    log('Ready for deployment to production environment');
    
    // Display build summary
    const stats = fs.statSync(path.join(config.distDir, 'index.js'));
    log(`Server bundle size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    return true;
  } else {
    log('Build verification failed - missing required files');
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { build, config };

// Run build if called directly
if (require.main === module) {
  build().catch(error => {
    log(`Build failed: ${error.message}`);
    process.exit(1);
  });
}