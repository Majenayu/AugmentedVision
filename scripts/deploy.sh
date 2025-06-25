#!/bin/bash

# ErgoTrack Production Deployment Script
# Automated build and deployment process

set -e  # Exit on any error

echo "🚀 Starting ErgoTrack deployment process..."
echo "Timestamp: $(date)"
echo "Environment: ${NODE_ENV:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
log "Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
fi

NODE_VERSION=$(node --version)
log "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
fi

NPM_VERSION=$(npm --version)
log "npm version: $NPM_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm ci --silent
else
    log "Dependencies already installed"
fi

# Run security audit (optional)
log "Running security audit..."
npm audit --audit-level moderate || warning "Security vulnerabilities detected"

# Type checking
log "Running TypeScript type checking..."
npx tsc --noEmit || error "Type checking failed"

# Database preparation
log "Preparing database..."
if [ -n "$DATABASE_URL" ]; then
    npm run db:push || warning "Database migration had issues"
else
    warning "DATABASE_URL not set, skipping database operations"
fi

# Build process
log "Building application..."

# Clean previous build
rm -rf dist/
log "Cleaned previous build artifacts"

# Build frontend
log "Building React frontend..."
npx vite build --mode production || error "Frontend build failed"

# Build backend
log "Building Express backend..."
npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=dist \
    --minify || error "Backend build failed"

# Copy static files if they exist
if [ -d "client/public" ]; then
    log "Copying static assets..."
    cp -r client/public/* dist/public/ 2>/dev/null || true
fi

# Verify build
log "Verifying build output..."
if [ ! -f "dist/index.js" ]; then
    error "Server bundle not found"
fi

if [ ! -d "dist/public" ]; then
    error "Frontend build not found"
fi

# Calculate bundle sizes
SERVER_SIZE=$(du -h dist/index.js | cut -f1)
FRONTEND_SIZE=$(du -sh dist/public | cut -f1)

success "Build completed successfully!"
log "Server bundle size: $SERVER_SIZE"
log "Frontend bundle size: $FRONTEND_SIZE"

# Health check preparation
log "Preparing health check..."
cat > dist/health-check.js << 'EOF'
// Health check endpoint for deployment verification
import http from 'http';

const healthCheck = () => {
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 5000,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve('Health check passed');
      } else {
        reject(new Error(`Health check failed with status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Health check timeout')));
    req.setTimeout(5000);
    req.end();
  });
};

if (process.argv[2] === 'check') {
  healthCheck()
    .then(console.log)
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}
EOF

# Create production environment file template
log "Creating production environment template..."
cat > dist/.env.production.template << 'EOF'
# ErgoTrack Production Environment Variables
NODE_ENV=production
PORT=5000
DATABASE_URL=your_production_database_url
SESSION_SECRET=your_secure_session_secret

# Optional: Analytics and monitoring
ANALYTICS_ID=your_analytics_id
SENTRY_DSN=your_sentry_dsn

# Optional: External APIs
OPENAI_API_KEY=your_openai_api_key
EOF

# Deployment instructions
log "Creating deployment instructions..."
cat > dist/DEPLOYMENT.md << 'EOF'
# ErgoTrack Production Deployment

## Quick Start
1. Copy this entire `dist` folder to your production server
2. Set up environment variables (see .env.production.template)
3. Run: `node index.js`
4. Verify: `node health-check.js check`

## Environment Variables Required
- `NODE_ENV=production`
- `PORT=5000` (or your preferred port)
- `DATABASE_URL=your_postgresql_connection_string`
- `SESSION_SECRET=your_secure_random_string`

## Health Check
The application includes a health check endpoint at `/health`
Use: `node health-check.js check` to verify the deployment

## Monitoring
- Monitor the application logs for errors
- Set up database connection monitoring
- Configure reverse proxy (nginx/apache) if needed

## Troubleshooting
- Check environment variables are set correctly
- Ensure database is accessible and migrations are applied
- Verify port is not already in use
- Check application logs for specific error messages
EOF

success "Deployment preparation completed!"
log "Build artifacts ready in ./dist directory"
log "Next steps:"
echo "  1. Upload ./dist directory to your production server"
echo "  2. Set up environment variables"
echo "  3. Run: node dist/index.js"
echo "  4. Verify: node dist/health-check.js check"

echo ""
success "ErgoTrack is ready for production deployment! 🎉"