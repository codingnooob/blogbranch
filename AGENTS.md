# Agent Guidelines

## Build/Test Commands
- `npm run build` - Build the project
- `npm run dev` - Start development server
- `npm run test` - Run all tests
- `npm run test -- --testNamePattern="specific test"` - Run single test
- `npm run lint` - Run linting
- `npm run typecheck` - Run type checking

## Code Style Guidelines

### Imports
- Use ES6 imports/exports
- Group imports: third-party libraries first, then internal modules
- Use absolute imports for internal modules when possible

### Formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas where appropriate
- Maximum line length: 80 characters

### Types
- Use TypeScript for all new code
- Prefer explicit type annotations
- Use interfaces for object shapes
- Avoid `any` type

### Naming Conventions
- camelCase for variables and functions
- PascalCase for classes and components
- UPPER_SNAKE_CASE for constants
- kebab-case for file names

### Error Handling
- Use try/catch blocks for async operations
- Return meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully