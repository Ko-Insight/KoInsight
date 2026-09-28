import cors from 'cors';
import express, { Request, Response } from 'express';
import { Server } from 'http';
import morgan from 'morgan';
import path from 'path';
import { openAiRouter } from './ai/open-ai-router';
import { basicAuth } from './auth/basic-auth-middleware';
import { booksRouter } from './books/books-router';
import { appConfig } from './config';
import { devicesRouter } from './devices/devices-router';
import { db } from './knex';
import { kopluginRouter } from './koplugin/koplugin-router';
import { kosyncRouter } from './kosync/kosync-router';
import { openLibraryRouter } from './open-library/open-library-router';
import { statsRouter } from './stats/stats-router';
import { uploadRouter } from './upload/upload-router';

async function setupServer() {
  const app = express();
  // Increase the limit to be able to upload the whole database
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(morgan('tiny'));

  // if (appConfig.env === 'development') {
  // Allow requests from dev build
  app.use(cors({ origin: '*' }));
  // }

  if (appConfig.auth) {
    app.use(basicAuth(appConfig.auth));
    console.info('Basic Auth enabled');
  }

  app.use('/', kosyncRouter); // Needs to be mounted at root to follow KoSync API
  app.use('/api/plugin', kopluginRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/books', booksRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/open-library', openLibraryRouter);
  app.use('/api/ai', openAiRouter);

  // Serve react app
  app.use(express.static(appConfig.webBuildPath));
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(appConfig.webBuildPath, 'index.html'));
  });

  // Start :)
  const server = app.listen(appConfig.port, appConfig.hostname, () => {
    console.info(`KoInsight back-end is running on http://${appConfig.hostname}:${appConfig.port}`);
  });

  return server;
}

function stopServer(signal: NodeJS.Signals, server: Server) {
  console.log(`Received ${signal.toString()}. Gracefully shutting down...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}

async function main() {
  console.log('Running database migrations');
  await db.migrate.latest({ directory: path.join(__dirname, 'db', 'migrations') });
  console.log('Database migrated successfully');

  setupServer().then((server) => {
    process.on('SIGINT', (signal) => stopServer(signal, server));
    process.on('SIGTERM', (signal) => stopServer(signal, server));
  });
}

main();
