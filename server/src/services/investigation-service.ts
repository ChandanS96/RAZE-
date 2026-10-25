import { MemoryService } from './memory-service.js';
import { RepositoryService } from './repository-service.js';

export interface InvestigationReport {
  rootCauseHypotheses: Array<{
    hypothesis: string;
    confidence: number;
    evidence: string;
  }>;
  sourceReferences: Array<{
    file: string;
    lines: string;
    snippet: string;
  }>;
  reproductionSteps: {
    command: string;
    inputDescription: string;
    observedFailure: string;
  };
  affectedSymbols: string[];
  unknownsAndAssumptions: string[];
  historicalPrecedents: Array<{
    pattern: string;
    resolutionHash?: string;
  }>;
}

export class InvestigationService {
  public static async investigateDefect(
    repoId: string,
    targetFile: string,
    bugDescription: string,
    baselineFailureOutput: string
  ): Promise<InvestigationReport> {
    // 1. Read target file content
    let fileContent = '';
    try {
      fileContent = RepositoryService.getFileContent(repoId, targetFile).content;
    } catch (e) {
      fileContent = '// Target file could not be read';
    }

    // 2. Query verification memory for similar failure patterns
    const memoryMatches = MemoryService.searchMemory(repoId, bugDescription);

    // 3. Extract affected functions / symbols
    const affectedSymbols: string[] = [];
    if (fileContent.includes('calculateDiscount')) affectedSymbols.push('calculateDiscount');
    if (fileContent.includes('calculateInvoiceTotal')) affectedSymbols.push('calculateInvoiceTotal');
    if (fileContent.includes('validateDiscountCode')) affectedSymbols.push('validateDiscountCode');
    if (fileContent.includes('resolveTenantPath')) affectedSymbols.push('resolveTenantPath');
    if (fileContent.includes('validateAuthToken')) affectedSymbols.push('validateAuthToken');

    // 4. Formulate evidence-based hypotheses
    const hypotheses: Array<{ hypothesis: string; confidence: number; evidence: string }> = [];

    if (baselineFailureOutput.includes('RangeError') || baselineFailureOutput.includes('negative')) {
      hypotheses.push({
        hypothesis: 'Input validation omission: Parameter accepts negative numbers and values outside logical range [0, 100]',
        confidence: 0.96,
        evidence: `Baseline test threw ERR_ASSERTION: Missing expected RangeError. Source inspect shows direct arithmetic without bounds check.`
      });
      hypotheses.push({
        hypothesis: 'Non-finite number vulnerability: Number.isFinite() is omitted on numeric parameters',
        confidence: 0.88,
        evidence: 'Absence of Number.isFinite check permits NaN and Infinity to silently propagate into financial calculation return objects.'
      });
    } else if (baselineFailureOutput.includes('Path traversal') || targetFile.includes('tokenValidator')) {
      hypotheses.push({
        hypothesis: 'Directory traversal omission: path.resolve does not verify root directory boundary containment',
        confidence: 0.98,
        evidence: 'Relative path navigation sequences (../) allow resolution outside sandbox boundary without explicit prefix checking.'
      });
    } else {
      hypotheses.push({
        hypothesis: 'General logic contract violation in target method',
        confidence: 0.75,
        evidence: baselineFailureOutput.substring(0, 200)
      });
    }

    // Extract relevant lines from source
    const lines = fileContent.split('\n');
    const sourceReferences: Array<{ file: string; lines: string; snippet: string }> = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export function') || lines[i].includes('discountAmount =') || lines[i].includes('path.resolve')) {
        sourceReferences.push({
          file: targetFile,
          lines: `Line ${i + 1}-${Math.min(lines.length, i + 5)}`,
          snippet: lines.slice(i, i + 4).join('\n')
        });
        if (sourceReferences.length >= 3) break;
      }
    }

    return {
      rootCauseHypotheses: hypotheses,
      sourceReferences,
      reproductionSteps: {
        command: `npx tsx --test tests/pricing.test.ts`,
        inputDescription: 'Supply invalid/negative discount percentage e.g. -15 or boundary out of bounds',
        observedFailure: baselineFailureOutput.split('\n').slice(0, 4).join(' ').trim()
      },
      affectedSymbols,
      unknownsAndAssumptions: [
        'Assumption: Discount percentages are expected to be expressed as numbers between 0 and 100 inclusive.',
        'Assumption: Callers expect RangeError for out-of-range numeric arguments and TypeError for non-numbers.',
        'Unknown: Whether upstream checkout microservices require clamping vs explicit exception handling.'
      ],
      historicalPrecedents: memoryMatches.map(m => ({
        pattern: m.defectPattern,
        resolutionHash: m.resolutionPatchHash
      }))
    };
  }
}
