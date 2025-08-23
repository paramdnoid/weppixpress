import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

// swagger/swagger.js

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'File Manager API',
      version: '1.0.0',
      description: 'A comprehensive file management API with authentication'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // Use broad globs so it works regardless of cwd
  apis: [
    path.join(process.cwd(), '**/routes/*.js'),
    path.join(process.cwd(), '**/controllers/*.js')
  ]
};

function setupSwagger(app) {
  const swaggerSpec = swaggerJSDoc(options);

  // Serve the Swagger UI at /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true
    }
  }));

  // Also expose the raw JSON at /api-docs.json for tooling
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(swaggerSpec);
  });
}

export { setupSwagger };
export default setupSwagger;
