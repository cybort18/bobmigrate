import archiver from 'archiver';
import { Response } from 'express';
import { GeneratedArtifacts } from '../types/index.js';

export class ZipPackager {
  public static streamMicroserviceZip(artifacts: GeneratedArtifacts, res: Response) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="bobmigrate-orders-service.zip"');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('[ZipPackager] Archive error:', err);
      res.status(500).send({ error: 'Failed to generate ZIP archive' });
    });

    archive.pipe(res);

    // 1. Add synthesized microservice files
    for (const file of artifacts.microserviceFiles) {
      archive.append(file.code, { name: `orders-service/${file.filePath}` });
    }

    // 2. Add OpenAPI spec
    archive.append(artifacts.openApiYaml, { name: 'orders-service/openapi.yaml' });

    // 3. Add Docker files
    archive.append(artifacts.dockerfile, { name: 'orders-service/Dockerfile' });
    archive.append(artifacts.dockerComposeYaml, { name: 'orders-service/docker-compose.yml' });

    // 4. Add Readme
    archive.append(artifacts.readmeMarkdown, { name: 'orders-service/README.md' });

    archive.finalize();
  }
}
