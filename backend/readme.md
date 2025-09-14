# weppiXPRESS Backend

A robust Node.js/Express backend application following modern best practices.

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   ├── database.js         # Database configuration
│   ├── redis.js           # Redis configuration
│   ├── server.js          # Server configuration
│   └── index.js           # Configuration exports
├── src/
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation schemas
│   ├── database/        # Database migrations
│   ├── websockets/      # WebSocket handlers
│   └── app.js          # Express app configuration
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── scripts/            # Utility scripts
├── docs/              # Documentation
├── server.js          # Application entry point
├── ecosystem.config.js # PM2 configuration
└── .env.example       # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MariaDB/MySQL
- Redis
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment file:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables in `.env`
5. Run database migrations:
   ```bash
   npm run migrate
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:watch` - Run tests in watch mode

### Database
- `npm run migrate` - Run database migrations
- `npm run db:migrate` - Alias for migrate
- `npm run db:seed` - Seed database with sample data

### Code Quality
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run build` - Run linting and tests

### Maintenance
- `npm run clean` - Clean logs and temporary files
- `npm run logs` - View application logs
- `npm run logs:error` - View error logs
- `npm run security:audit` - Check for security vulnerabilities
- `npm run security:fix` - Fix security issues

### Deployment
- `npm run deploy` - Deploy to production server
- `npm run pm2:start` - Start with PM2
- `npm run pm2:stop` - Stop PM2 processes
- `npm run pm2:restart` - Restart PM2 processes
- `npm run pm2:logs` - View PM2 logs

## 🏗️ Architecture

### Configuration Management
- Centralized configuration in `/config` directory
- Environment-specific settings
- Type-safe configuration exports

### Middleware Stack
- Request context and monitoring
- Security middleware (helmet, CORS, rate limiting)
- Input sanitization and validation
- Error handling and logging

### Service Layer
- Business logic separated from controllers
- Database abstraction
- Caching layer
- External service integrations

### Error Handling
- Centralized error handling middleware
- Structured error responses
- Comprehensive logging
- Circuit breaker pattern for external services

## 🔒 Security Features

- Helmet.js for security headers
- Rate limiting with Redis
- Input sanitization (XSS, NoSQL injection)
- JWT authentication with refresh tokens
- 2FA support
- CORS configuration
- File upload validation

## 🚀 Performance Optimizations

- Compression middleware
- Connection pooling
- Caching strategies
- Request timeout handling
- WebSocket support
- Graceful shutdown handling

## 📊 Monitoring & Logging

- Winston logging with multiple transports
- Request/response monitoring
- Error tracking and metrics
- Health check endpoints
- Performance monitoring

## 🧪 Testing

- Unit tests for individual functions
- Integration tests for API endpoints
- Test database configuration
- Mocking external dependencies

## 📚 API Documentation

API documentation is available at `/api-docs` when running the server.

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Run linting and tests before committing

## 📄 License

This project is licensed under the MIT License.