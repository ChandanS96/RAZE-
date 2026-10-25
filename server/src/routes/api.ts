import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RepositoryService } from '../services/repository-service.js';
import { VerificationEngine } from '../engine/verification-engine.js';
import { EventBroadcaster } from '../engine/event-broadcaster.js';
import { MemoryService } from '../services/memory-service.js';
import { EvidenceService } from '../services/evidence-service.js';
import { LlmAssistantService } from '../services/llm-assistant-service.js';

export const apiRouter = Router();

// ==========================================
// 1. Health & Status
// ==========================================
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'RAZE Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    database: 'node:sqlite (WAL mode enabled)'
  });
});

apiRouter.get('/settings/status', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
  res.json({
    operatingMode: hasKey ? 'CLOUD_LLM_PROVIDER' : 'LOCAL_DETERMINISTIC_ENGINE',
    hasApiKey: hasKey,
    activeProvider: process.env.OPENAI_API_KEY ? 'OpenAI' : process.env.GEMINI_API_KEY ? 'Google Gemini' : 'Local Fallback',
    sandboxMode: 'SHADOW_WORKSPACE_ISOLATION',
    circuitBreakerEnabled: true,
    supportedRunners: ['Node.js node:test', 'tsx ESM test runner', 'StrykerJS-compatible AST Mutator'],
    maxRepairRetries: 3
  });
});

// ==========================================
// 2. Repositories
// ==========================================
apiRouter.get('/repositories', (req: Request, res: Response) => {
  try {
    const repos = RepositoryService.getAllRepositories();
    res.json(repos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/repositories/:id/files', (req: Request, res: Response) => {
  try {
    const files = RepositoryService.getRepositoryFiles(req.params.id as string);
    res.json(files);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

apiRouter.get('/repositories/:id/file', (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Query parameter "path" is required' });
    }
    const result = RepositoryService.getFileContent(req.params.id as string, filePath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. Verification Runs
// ==========================================
const createRunSchema = z.object({
  repositoryId: z.string(),
  targetFile: z.string().default('src/pricing.ts'),
  bugTitle: z.string().default('Defect #104: Boundary range failure in calculateDiscount'),
  bugDescription: z.string().default('Negative discount values accepted in calculateDiscount, resulting in price inflation'),
  maxRetries: z.number().min(1).max(5).default(3),
  triggerTrustCollapseDemo: z.boolean().default(true)
});

apiRouter.post('/runs', async (req: Request, res: Response) => {
  try {
    const parsed = createRunSchema.parse(req.body);
    const run = await VerificationEngine.createRun(parsed);

    // Launch verification asynchronously in background
    setTimeout(() => {
      VerificationEngine.startVerificationWorkflow(run.id, 1).catch(err => {
        console.error('Async verification workflow error:', err);
      });
    }, 100);

    res.status(201).json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/runs', (req: Request, res: Response) => {
  try {
    const runs = VerificationEngine.getAllRuns();
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/runs/:id', (req: Request, res: Response) => {
  try {
    const run = VerificationEngine.getRunById(req.params.id as string);
    if (!run) {
      return res.status(404).json({ error: 'Verification run not found' });
    }
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Real-time Event Stream
apiRouter.get('/runs/:id/events', (req: Request, res: Response) => {
  const runId = req.params.id as string;
  const lastEventId = (req.headers['last-event-id'] as string) || (req.query.lastEventId as string);
  EventBroadcaster.subscribe(runId, res, lastEventId);
});

// Downloadable Evidence Report (JSON / Markdown)
apiRouter.get('/runs/:id/evidence', (req: Request, res: Response) => {
  try {
    const run = VerificationEngine.getRunById(req.params.id as string);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const format = (req.query.format as string) || 'markdown';
    if (format === 'json') {
      const jsonReport = EvidenceService.generateJsonReport(run);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="evidence-report-${run.id}.json"`);
      return res.send(jsonReport);
    } else {
      const mdReport = EvidenceService.generateMarkdownReport(run);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="evidence-report-${run.id}.md"`);
      return res.send(mdReport);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retry / Rechallenge Run
apiRouter.post('/runs/:id/retry', async (req: Request, res: Response) => {
  try {
    const run = VerificationEngine.getRunById(req.params.id as string);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const nextAttempt = run.currentAttempt + 1;
    setTimeout(() => {
      VerificationEngine.startVerificationWorkflow(run.id, nextAttempt).catch(err => {
        console.error('Workflow retry error:', err);
      });
    }, 100);

    res.json({ message: `Retry scheduled for attempt #${nextAttempt}`, runId: run.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Human Decision Sign-Off with exact patch hash verification
const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REQUEST_CHANGES']),
  reviewedPatchHash: z.string(),
  reviewer: z.string().default('Lead Engineer'),
  notes: z.string().default('')
});

apiRouter.post('/runs/:id/decision', (req: Request, res: Response) => {
  try {
    const parsed = decisionSchema.parse(req.body);
    const result = VerificationEngine.recordHumanDecision(
      req.params.id as string,
      parsed.decision,
      parsed.reviewedPatchHash,
      parsed.reviewer,
      parsed.notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Human decision recorded successfully', runId: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. Verification Memory
// ==========================================
apiRouter.get('/memory', (req: Request, res: Response) => {
  try {
    const repoId = req.query.repoId as string | undefined;
    const records = MemoryService.getAllMemory(repoId);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/memory/search', (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const repoId = (req.query.repoId as string) || '';
    const records = MemoryService.searchMemory(repoId, q);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/memory/:id', (req: Request, res: Response) => {
  try {
    const success = MemoryService.deleteMemory(req.params.id as string);
    if (!success) {
      return res.status(404).json({ error: 'Memory record not found' });
    }
    res.json({ message: 'Memory record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. Contextual AI Assistant
// ==========================================
const chatSchema = z.object({
  runId: z.string().optional(),
  question: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  runContext: z.any().optional()
});

apiRouter.post('/assistant/chat', async (req: Request, res: Response) => {
  try {
    const parsed = chatSchema.parse(req.body);
    const response = await LlmAssistantService.answerQuestion(
      parsed.runId,
      parsed.question,
      parsed.history as any,
      parsed.runContext
    );
    res.json(response);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
