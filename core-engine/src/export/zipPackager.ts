import archiver from 'archiver';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';
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

    // 1. Check if real orders-service created by IBM Bob exists on disk
    const rootPath1 = path.resolve(process.cwd(), 'orders-service');
    const rootPath2 = path.resolve(process.cwd(), '../orders-service');
    const actualDir = fs.existsSync(rootPath1) ? rootPath1 : (fs.existsSync(rootPath2) ? rootPath2 : null);

    if (actualDir) {
      console.log(`[ZipPackager] Packaging real orders-service codebase from: ${actualDir}`);
      archive.directory(actualDir, 'orders-service', (entry) => {
        // Exclude dependencies and database binaries
        if (
          entry.name.includes('node_modules') ||
          entry.name.endsWith('.db') ||
          entry.name.endsWith('.db-journal') ||
          entry.name.includes('.git')
        ) {
          return false;
        }
        return entry;
      });
    } else if (artifacts.microserviceFiles) {
      // Fallback: Add synthesized microservice files from in-memory artifacts
      for (const file of artifacts.microserviceFiles) {
        archive.append(file.code, { name: `orders-service/${file.filePath}` });
      }
    }

    // 2. Add OpenAPI spec
    if (artifacts.openApiYaml) {
      archive.append(artifacts.openApiYaml, { name: 'orders-service/openapi.yaml' });
    }

    // 3. Add Docker files
    if (artifacts.dockerfile) {
      archive.append(artifacts.dockerfile, { name: 'orders-service/Dockerfile' });
    }
    if (artifacts.dockerComposeYaml) {
      archive.append(artifacts.dockerComposeYaml, { name: 'orders-service/docker-compose.yml' });
    }

    // 4. Add Readme
    if (artifacts.readmeMarkdown) {
      archive.append(artifacts.readmeMarkdown, { name: 'orders-service/README.md' });
    }

    archive.finalize();
  }
}
