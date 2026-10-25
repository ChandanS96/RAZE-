import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase } from './db/database.js';
import { RepositoryService } from './services/repository-service.js';
import { MemoryService } from './services/memory-service.js';
import { apiRouter } from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for Vite frontend dev server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID']
}));

app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database, repositories, and historical verification memory
try {
  getDatabase();
  RepositoryService.initializeRepositories();
  MemoryService.seedInitialMemory();
  console.log('✅ RAZE SQLite database initialized and seeded successfully.');
} catch (err) {
  console.error('❌ Failed to initialize database:', err);
}

// Mount API routes
app.use('/api', apiRouter);

// Serve frontend in production if built
const clientDist = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 RAZE Server running at http://localhost:${PORT}`);
  console.log(`   Health status: http://localhost:${PORT}/api/health`);
  console.log(`   Repositories:  http://localhost:${PORT}/api/repositories`);
});
