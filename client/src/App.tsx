import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { HomePage } from './pages/HomePage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { RepositoriesPage } from './pages/RepositoriesPage.js';
import { NewVerificationPage } from './pages/NewVerificationPage.js';
import { RunsHistoryPage } from './pages/RunsHistoryPage.js';
import { LiveVerificationRoomPage } from './pages/LiveVerificationRoomPage.js';
import { MemoryPage } from './pages/MemoryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AssistantDrawer } from './components/AssistantDrawer.js';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Extract runId if path is /runs/:id
  const runIdMatch = currentPath.match(/^\/runs\/([^/?#]+)/);
  const activeRunId = runIdMatch ? runIdMatch[1] : undefined;

  const isExperienceHome = currentPath === '/';

  const renderContent = () => {
    if (isExperienceHome) {
      return (
        <HomePage
          onNavigate={navigate}
          onEnterWorkspace={() => navigate('/workspace')}
        />
      );
    }
    if (currentPath === '/workspace') {
      return <OverviewPage onNavigate={navigate} />;
    }
    if (currentPath === '/repositories') {
      return <RepositoriesPage onNavigate={navigate} />;
    }
    if (currentPath === '/verify/new') {
      return <NewVerificationPage onNavigate={navigate} />;
    }
    if (currentPath === '/runs') {
      return <RunsHistoryPage onNavigate={navigate} />;
    }
    if (activeRunId) {
      return (
        <LiveVerificationRoomPage
          runId={activeRunId}
          onNavigate={navigate}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />
      );
    }
    if (currentPath === '/memory') {
      return <MemoryPage />;
    }
    if (currentPath === '/settings') {
      return <SettingsPage />;
    }
    return <OverviewPage onNavigate={navigate} />;
  };

  return (
    <div className="flex h-screen bg-raze-bg text-text-primary overflow-hidden">
      {/* Show Persistent Sidebar on Platform Workspace Routes */}
      {!isExperienceHome && (
        <Sidebar
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar on Workspace Views */}
        {!isExperienceHome && (
          <Navbar
            currentPath={currentPath}
            onNavigate={navigate}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            sseConnected={Boolean(activeRunId)}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${isExperienceHome ? 'p-0' : 'bg-[#020204] relative'}`}>
          {!isExperienceHome && (
            <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-brand-magenta/8 rounded-full blur-[140px] pointer-events-none" />
          )}
          {renderContent()}
        </main>
      </div>

      {/* Contextual AI Evidence Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        runId={activeRunId}
      />
    </div>
  );
}
