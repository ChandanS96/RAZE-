export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL,
  is_bundled_demo INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT NOT NULL DEFAULT 'main',
  test_command TEXT NOT NULL DEFAULT 'npm test',
  files_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_runs (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  base_commit TEXT NOT NULL,
  bug_report_json TEXT NOT NULL,
  status TEXT NOT NULL,
  current_attempt INTEGER NOT NULL DEFAULT 1,
  max_retries INTEGER NOT NULL DEFAULT 3,
  current_patch_hash TEXT,
  recommendation TEXT,
  trust_collapsed INTEGER NOT NULL DEFAULT 0,
  trust_collapse_reason TEXT,
  circuit_breaker_tripped INTEGER NOT NULL DEFAULT 0,
  circuit_breaker_reason TEXT,
  mutation_report_json TEXT,
  policy_result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  summary TEXT,
  findings_count INTEGER NOT NULL DEFAULT 0,
  logs_json TEXT NOT NULL DEFAULT '[]',
  artifacts_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS patch_attempts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  patch_hash TEXT NOT NULL,
  diff TEXT NOT NULL,
  files_changed_json TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  known_risks_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  test_passed_count INTEGER NOT NULL DEFAULT 0,
  test_failed_count INTEGER NOT NULL DEFAULT 0,
  counterexamples_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counterexamples (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  input_vector TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  actual_output TEXT NOT NULL,
  reproduction_command TEXT NOT NULL,
  failure_evidence TEXT NOT NULL,
  source_location TEXT,
  confirmed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  affected_file TEXT NOT NULL,
  line_range TEXT NOT NULL,
  detection_method TEXT NOT NULL,
  evidence TEXT NOT NULL,
  recommended_mitigation TEXT NOT NULL,
  is_confirmed INTEGER NOT NULL DEFAULT 1,
  blocks_release INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_memory (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  defect_pattern TEXT NOT NULL,
  bug_description TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  failed_patch_summary TEXT,
  counterexample_input TEXT,
  effective_regression_test TEXT,
  mutation_finding TEXT,
  security_finding TEXT,
  resolution_patch_hash TEXT,
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS human_decisions (
  run_id TEXT PRIMARY KEY,
  decision TEXT NOT NULL,
  reviewed_patch_hash TEXT NOT NULL,
  reviewer_notes TEXT,
  decided_at TEXT NOT NULL,
  reviewer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_repo ON verification_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON verification_runs(status);
CREATE INDEX IF NOT EXISTS idx_events_run_seq ON run_events(run_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_memory_repo ON verification_memory(repository_id);
`;
