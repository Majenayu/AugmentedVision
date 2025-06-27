# Overview

This is a full-stack web application built with TypeScript, React, Express.js, and Drizzle ORM. The project follows a monorepo structure with separate client and server directories, shared types/schemas, and modern tooling for development and deployment.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Modern React application with TypeScript for type safety
- **Vite**: Fast build tool and development server with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built UI components with Radix UI primitives
- **TanStack Query**: Data fetching and state management for server state
- **React Hook Form**: Form handling with validation

## Backend Architecture
- **Express.js**: RESTful API server with TypeScript
- **Drizzle ORM**: Type-safe SQL ORM for database operations
- **PostgreSQL**: Primary database (configured via Neon serverless)
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple
- **In-Memory Storage**: Fallback storage implementation for development

# Key Components

## Database Layer
- **Schema Definition**: Centralized schema in `shared/schema.ts` using Drizzle
- **User Management**: Basic user table with username/password authentication
- **Migrations**: Drizzle Kit for database migrations and schema changes
- **Storage Interface**: Abstracted storage layer supporting both database and in-memory implementations

## API Layer
- **Route Registration**: Centralized route handling in `server/routes.ts`
- **Storage Abstraction**: Interface-based storage system for CRUD operations
- **Error Handling**: Global error handling middleware
- **Request Logging**: Built-in request/response logging for API endpoints

## Development Tooling
- **TypeScript**: Strict typing across frontend, backend, and shared code
- **Path Aliases**: Configured aliases for clean imports (`@/`, `@shared/`)
- **Hot Reloading**: Vite development server with HMR
- **Linting**: ESLint configuration for code quality

# Data Flow

1. **Client Requests**: React components make API calls through TanStack Query
2. **API Processing**: Express routes handle requests and delegate to storage layer
3. **Data Operations**: Storage interface performs CRUD operations (memory or database)
4. **Response Handling**: JSON responses sent back through Express middleware
5. **Client Updates**: TanStack Query manages caching and UI updates

# External Dependencies

## Core Framework Dependencies
- React ecosystem (React, React DOM, React Router)
- Express.js with TypeScript support
- Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- Vite with React plugin

## UI and Styling
- Tailwind CSS for styling
- Radix UI primitives for accessible components
- shadcn/ui component library
- Class Variance Authority for component variants

## Development Tools
- TypeScript compiler and type definitions
- ESBuild for server bundling
- PostCSS for CSS processing
- Cross-env for environment variable management

## Database and Storage
- PostgreSQL via Neon serverless
- Drizzle Kit for migrations
- connect-pg-simple for session storage
- Zod for schema validation

# Deployment Strategy

## Development
- Local development with `npm run dev`
- Vite dev server on port 5000 with proxy to Express API
- Hot module replacement for frontend changes
- TypeScript compilation in watch mode

## Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Single-command build process: `npm run build`

## Deployment Platform
- Configured for Replit deployment with autoscale
- Environment variables for database connection
- Port configuration for external access (port 80 mapping)

## Database Configuration
- PostgreSQL database via DATABASE_URL environment variable
- Drizzle migrations applied via `npm run db:push`
- Schema-first approach with type generation

# Changelog

Changelog:
- January 27, 2025. Successfully migrated project from Replit Agent to standard Replit environment  
- January 27, 2025. Added PDF report generation with comprehensive ergonomic assessment analysis
- June 13, 2025. Initial setup
- June 17, 2025. Fixed pose detection skeleton alignment issues and syntax errors in recording panel
- June 17, 2025. Added smart object detection system with COCO-SSD model for automatic weight estimation in manual mode
- June 17, 2025. Simplified object detection to show cropped photos of detected objects with manual weight input in grams
- June 17, 2025. Removed object detection analysis section from recording panel per user request
- June 17, 2025. Simplified live object detection to show only cropped photos with manual weight input in grams
- June 17, 2025. Modified object detection to analyze all recorded frames instead of current camera frame
- June 17, 2025. Added deduplication logic to show only unique objects, keeping highest confidence detection
- June 17, 2025. Fixed skeleton and enhanced view modes to properly use manual weight data from object detection
- June 18, 2025. Added Excel export functionality for graph data with separate sheets for each analysis type (Live, Recording, Estimated Weight, Manual Weight)
- June 18, 2025. Fixed skeleton color coding to properly reflect weight-adjusted RULA scores in manual mode
- June 18, 2025. Enhanced Excel export with detailed breakdown of body part scores, risk level changes, and comprehensive object data
- June 19, 2025. Removed enhanced view mode from recording panel, keeping only original and skeleton views
- June 19, 2025. Removed "Weight Estimated" analysis mode, keeping only Normal View and Manual Weight options
- June 19, 2025. Added second object detection scan feature to catch objects missed in the first detection
- June 26, 2025. Successfully migrated from Replit Agent to standard Replit environment with complete RULA to REBA methodology transition
- June 26, 2025. Removed intrusive risk level alert comment from live view interface per user request
- June 26, 2025. Added comprehensive image download feature for all recorded frames with original, skeleton, estimated weight skeleton, and manual weight skeleton formats in organized ZIP file structure
- June 27, 2025. Completed migration from Replit Agent to standard Replit environment with enhanced security practices
- June 27, 2025. Updated RULA calculator to include trunk assessment (full body) instead of upper body only, making it consistent with REBA methodology
- June 27, 2025. Enhanced RULA calculator to include complete upper body assessment with trunk/stomach area for comprehensive posture evaluation
- June 27, 2025. Updated skeleton visualization to show trunk keypoints (hips) in RULA mode for complete upper body representation
- June 27, 2025. Added proper error handling and debugging to PDF report generation functionality
- June 27, 2025. Fixed client/server separation and ensured robust security practices throughout the application
- June 27, 2025. Completed migration from Replit Agent to standard Replit environment with enhanced RULA score calculation accuracy
- June 27, 2025. Fixed RULA scoring matrices and added comprehensive debugging for pose-based score calculations
- June 27, 2025. Enhanced RULA scoring system with proper 1-7 scale range and improved angle calculations for better pose responsiveness
- June 27, 2025. Fixed photo capture alignment issues in RULA mode with improved horizontal mirroring and quality settings
- June 27, 2025. Fixed image stretching in downloaded photos and PDF reports by implementing proper aspect ratio calculations
- June 27, 2025. Standardized image dimensions to 640x480 with letterboxing to prevent distortion in captured frames
- June 27, 2025. Fixed skeleton alignment issues in REBA mode by implementing proper coordinate transformation and mirroring
- June 27, 2025. Enhanced object detection system with expanded object database, improved sensitivity, and automatic analysis for better handheld object recognition

# User Preferences

Preferred communication style: Simple, everyday language.