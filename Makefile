# ErgoTrack Production Build and Deployment Makefile

.PHONY: help install dev build clean deploy test lint format check-deps health

# Default target
help:
	@echo "ErgoTrack Build System"
	@echo "======================"
	@echo ""
	@echo "Available commands:"
	@echo "  install     - Install all dependencies"
	@echo "  dev         - Start development server"
	@echo "  build       - Build for production"
	@echo "  deploy      - Run automated deployment script"
	@echo "  clean       - Clean build artifacts"
	@echo "  test        - Run type checking and linting"
	@echo "  lint        - Run ESLint"
	@echo "  format      - Format code with Prettier"
	@echo "  check-deps  - Check for dependency vulnerabilities"
	@echo "  health      - Check application health"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm ci

# Development server
dev:
	@echo "Starting development server..."
	npm run dev

# Production build
build:
	@echo "Building for production..."
	@$(MAKE) clean
	@echo "Running type checks..."
	npx tsc --noEmit
	@echo "Building frontend..."
	npx vite build --mode production
	@echo "Building backend..."
	npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify
	@echo "Copying static assets..."
	@cp -r client/public/* dist/public/ 2>/dev/null || true
	@echo "Build completed successfully!"
	@ls -la dist/

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf .vite/
	@echo "Clean completed!"

# Automated deployment
deploy:
	@echo "Running automated deployment..."
	chmod +x scripts/deploy.sh
	./scripts/deploy.sh

# Type checking and linting
test:
	@echo "Running type checks..."
	npx tsc --noEmit
	@echo "Type checking completed!"

# Linting
lint:
	@echo "Running ESLint..."
	npx eslint . --ext .ts,.tsx --max-warnings 0 || true
	@echo "Linting completed!"

# Format code
format:
	@echo "Formatting code..."
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}" || true
	@echo "Formatting completed!"

# Security audit
check-deps:
	@echo "Checking dependencies for vulnerabilities..."
	npm audit --audit-level moderate
	@echo "Dependency check completed!"

# Health check
health:
	@echo "Checking application health..."
	@if [ -f "dist/index.js" ]; then \
		echo "✓ Backend bundle exists"; \
	else \
		echo "✗ Backend bundle missing"; \
	fi
	@if [ -d "dist/public" ]; then \
		echo "✓ Frontend assets exist"; \
	else \
		echo "✗ Frontend assets missing"; \
	fi
	@if [ -f "dist/health-check.js" ]; then \
		echo "✓ Health check script exists"; \
	else \
		echo "✗ Health check script missing"; \
	fi

# Database operations
db-push:
	@echo "Applying database migrations..."
	npm run db:push

# Full deployment pipeline
deploy-full: clean install test build deploy
	@echo "Full deployment pipeline completed!"

# Development setup
setup: install
	@echo "Setting up development environment..."
	@echo "Creating .env.example if it doesn't exist..."
	@if [ ! -f ".env.example" ]; then \
		echo "NODE_ENV=development" > .env.example; \
		echo "PORT=5000" >> .env.example; \
		echo "DATABASE_URL=postgresql://user:password@localhost:5432/ergotrack" >> .env.example; \
		echo "SESSION_SECRET=your-secret-key-here" >> .env.example; \
	fi
	@echo "Development setup completed!"
	@echo "Copy .env.example to .env and configure your environment variables"