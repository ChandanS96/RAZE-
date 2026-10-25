import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  FileCode,
  Folder,
  File,
  Shield,
  Zap,
  Play,
  Hash,
  ChevronRight,
  ExternalLink,
  Code
} from 'lucide-react';
import {
  fetchRepositories,
  fetchRepositoryFiles,
  fetchFileContent,
  Repository
} from '../api/client.js';

interface RepositoriesPageProps {
  onNavigate: (path: string) => void;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({ onNavigate }) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [files, setFiles] = useState<Array<{ path: string; name: string; isDir: boolean; size: number }>>([]);
  const [selectedFile, setSelectedFile] = useState<string>('src/pricing.ts');
  const [fileContent, setFileContent] = useState<{ content: string; hash: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const data = await fetchRepositories();
      setRepos(data);
      if (data.length > 0) {
        selectRepository(data[0]);
      }
    } catch (err) {
      console.error('Failed to load repos:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectRepository = async (repo: Repository) => {
    setSelectedRepo(repo);
    try {
      const fileList = await fetchRepositoryFiles(repo.id);
      setFiles(fileList);

      // Select first non-dir file
      const firstFile = fileList.find(f => !f.isDir && (f.path.includes('src/') || f.path.endsWith('.ts')));
      if (firstFile) {
        selectFile(repo.id, firstFile.path);
      }
    } catch (err) {
      console.error('Failed to load repo files:', err);
    }
  };

  const selectFile = async (repoId: string, path: string) => {
    setSelectedFile(path);
    try {
      const content = await fetchFileContent(repoId, path);
      setFileContent(content);
    } catch (err) {
      console.error('Failed to load file content:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-brand-magenta" />
            <span>Repository Ecosystem & Source Browser</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Inspect managed target repositories, source code snapshots, and deliberate defect vectors.
          </p>
        </div>

        {selectedRepo && (
          <button
            onClick={() => onNavigate(`/verify/new?repo=${selectedRepo.id}&file=${encodeURIComponent(selectedFile)}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-neon to-brand-magenta hover:opacity-95 text-white text-xs font-bold transition-all shadow-lg shadow-brand-magenta/25 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Verify Defect in this Repository</span>
          </button>
        )}
      </div>

      {/* Repository Picker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repos.map((repo) => {
          const isSelected = selectedRepo?.id === repo.id;
          return (
            <div
              key={repo.id}
              onClick={() => selectRepository(repo)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'glass-panel-glow border-brand-magenta/60 ring-1 ring-brand-magenta/40 shadow-nebula-sm'
                  : 'bg-black/40 backdrop-blur-xl border-white/10 hover:border-brand-magenta/40 shadow-glass'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-magenta/15 text-brand-magenta flex items-center justify-center shadow-nebula-sm">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{repo.name}</span>
                      {repo.isBundledDemo && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30">
                          Bundled Demo
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono">{repo.defaultBranch}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/40">{repo.filesCount} files</span>
              </div>
              <p className="text-xs text-text-secondary mt-2.5 leading-relaxed">{repo.description}</p>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>Test: {repo.testCommand}</span>
                <span className="text-brand-magenta font-semibold">{isSelected ? 'Active Target' : 'Select'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* File Tree & File Content Browser */}
      {selectedRepo && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-2xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur-2xl shadow-glass">
          {/* File Tree (4 Cols) */}
          <div className="md:col-span-4 border-r border-white/10 bg-black/40 flex flex-col">
            <div className="p-3 border-b border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider flex items-center justify-between">
              <span>Repository Files</span>
              <span className="text-[10px] text-brand-magenta font-mono">{files.length} items</span>
            </div>
            <div className="p-2 space-y-0.5 overflow-y-auto max-h-[500px]">
              {files.map((file) => {
                const isSelected = selectedFile === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => !file.isDir && selectFile(selectedRepo.id, file.path)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                      file.isDir
                        ? 'text-white/40 font-semibold bg-white/[0.02] cursor-default my-0.5'
                        : isSelected
                        ? 'bg-brand-magenta/20 text-brand-magenta font-bold border border-brand-magenta/40 shadow-nebula-sm'
                        : 'text-text-secondary hover:text-white hover:bg-white/[0.04] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      {file.isDir ? (
                        <Folder className="w-3.5 h-3.5 text-brand-magenta flex-shrink-0" />
                      ) : (
                        <FileCode className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      )}
                      <span className="truncate">{file.path}</span>
                    </div>
                    {!file.isDir && file.size > 0 && (
                      <span className="text-[10px] text-text-muted/60 flex-shrink-0">{Math.round(file.size / 1024 * 10) / 10}kb</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source Code Viewer (8 Cols) */}
          <div className="md:col-span-8 flex flex-col bg-black/60">
            {/* File Info Bar */}
            <div className="p-3 bg-black/70 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-magenta" />
                <span className="font-mono text-white font-bold">{selectedFile}</span>
              </div>
              {fileContent && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                  <Hash className="w-3 h-3 text-brand-magenta" />
                  <span>SHA-256: {fileContent.hash.substring(0, 16)}...</span>
                </div>
              )}
            </div>

            {/* Code Body */}
            <div className="p-4 font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
              {fileContent ? (
                fileContent.content.split('\n').map((line, idx) => (
                  <div key={idx} className="flex items-start gap-4 hover:bg-bg-hover/60 py-0.5">
                    <span className="w-8 text-right text-[10px] text-text-muted/50 select-none flex-shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-text-primary whitespace-pre">{line}</span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-text-muted">Loading source content...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
