# Overview

This is a full-stack web application built with a React frontend and Express backend, using TypeScript throughout. The application follows a modern monorepo structure with shared schemas and types between client and server. It uses Drizzle ORM for database operations with PostgreSQL as the primary database, though it includes an in-memory storage implementation for development.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** for fast development and optimized production builds
- **shadcn/ui** component library built on Radix UI primitives for consistent design
- **Tailwind CSS** for styling with custom design tokens
- **TanStack Query** for server state management and API caching
- **React Hook Form** with Zod validation for form handling

## Backend Architecture
- **Express.js** with TypeScript for the REST API server
- **Drizzle ORM** for type-safe database operations
- **Neon Database** (PostgreSQL) for production data storage
- **In-memory storage** fallback for development/testing
- **Session-based authentication** with PostgreSQL session store

## Build System
- **Vite** for frontend bundling and development server
- **esbuild** for backend compilation
- **TypeScript** for type checking across the entire codebase
- **ESM modules** throughout the application

# Key Components

## Database Layer
- **Schema Definition**: Centralized in `shared/schema.ts` using Drizzle
- **User Management**: Basic user schema with username/password authentication
- **Migrations**: Managed through Drizzle Kit with PostgreSQL dialect
- **Storage Interface**: Abstracted storage layer with both PostgreSQL and in-memory implementations

## API Layer
- **RESTful Design**: All API routes prefixed with `/api`
- **Type Safety**: Shared TypeScript types between client and server
- **Request Logging**: Comprehensive logging of API requests with response times
- **Error Handling**: Centralized error handling middleware

## Frontend Components
- **Component Library**: shadcn/ui components with consistent theming
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Client-side routing (structure to be implemented)

# Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **API Processing**: Express routes handle requests, validate input, and interact with storage
3. **Database Operations**: Drizzle ORM performs type-safe database queries
4. **Response Handling**: API responses are cached and managed by TanStack Query
5. **UI Updates**: React components re-render based on query state changes

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL driver for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **class-variance-authority**: Utility for component variants
- **zod**: Runtime type validation
- **react-hook-form**: Form state management

## Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **cross-env**: Environment variable management

# Deployment Strategy

## Development
- **Local Development**: `npm run dev` starts both frontend and backend concurrently
- **Hot Reload**: Vite provides instant feedback during development
- **Environment Variables**: Database connection managed through `DATABASE_URL`

## Production
- **Build Process**: `npm run build` compiles both frontend and backend
- **Frontend**: Static assets served from `dist/public`
- **Backend**: Compiled Node.js server in `dist/index.js`
- **Database**: PostgreSQL database with automatic migrations
- **Deployment**: Configured for autoscale deployment on Replit

## Replit Configuration
- **Port Configuration**: Application runs on port 5000
- **Module System**: Uses Node.js 20 with web module support
- **Workflow Integration**: Parallel start tasks for development
- **Asset Management**: Static assets served through Vite in development

# Changelog
- June 13, 2025. Initial setup

# User Preferences

Preferred communication style: Simple, everyday language.