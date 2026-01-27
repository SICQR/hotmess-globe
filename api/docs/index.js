import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * API documentation endpoint
 * Serves OpenAPI spec and Swagger UI
 */
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const format = url.searchParams.get('format') || 'html';

  // Read OpenAPI spec
  const specPath = path.join(__dirname, 'openapi.yaml');
  let spec;
  
  try {
    spec = fs.readFileSync(specPath, 'utf8');
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'OpenAPI spec not found' }));
    return;
  }

  // Return raw YAML
  if (format === 'yaml') {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.end(spec);
    return;
  }

  // Return JSON
  if (format === 'json') {
    // Simple YAML to JSON conversion (basic)
    // For production, use a proper yaml parser
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ note: 'Use format=yaml for the OpenAPI spec' }));
    return;
  }

  // Return Swagger UI HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotmess Globe API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #FF1493; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/docs?format=yaml',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        withCredentials: true
      });
    };
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.end(html);
}
