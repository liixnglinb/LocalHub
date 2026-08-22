import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import AuthGate from './components/AuthGate'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const WebLinks = lazy(() => import('./pages/WebLinks'))
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const LearningHub = lazy(() => import('./pages/LearningHub'))
const SmartNotes = lazy(() => import('./pages/SmartNotes'))
const MindMap = lazy(() => import('./pages/MindMap'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const BabyCare = lazy(() => import('./pages/BabyCare'))
const Blog = lazy(() => import('./pages/Blog'))
const ToolHubs = lazy(() => import('./pages/ToolHubs'))
const ClassSchedule = lazy(() => import('./pages/ClassSchedule'))
const Planner = lazy(() => import('./pages/Planner'))
const AgentSkills = lazy(() => import('./pages/AgentSkills'))
const AINews = lazy(() => import('./pages/AINews'))
const Jianlai = lazy(() => import('./pages/Jianlai'))


function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        {({ onLogout, user }) => (
          <Layout>
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-[var(--text-3)] text-lg">加载中...</div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard onLogout={onLogout} user={user} />} />
                <Route path="/profile" element={<Profile user={user} onLogout={onLogout} />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/web-links" element={<WebLinks />} />
                <Route path="/mindmap" element={<MindMap />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/prompts" element={<PromptLibrary />} />
                <Route path="/learning" element={<LearningHub />} />
                <Route path="/smart-notes" element={<SmartNotes />} />
                <Route path="/baby-care" element={<BabyCare />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/tools" element={<ToolHubs />} />
                <Route path="/schedule" element={<ClassSchedule />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/agents" element={<AgentSkills />} />
                <Route path="/news" element={<AINews />} />
                <Route path="/jianlai" element={<Jianlai />} />

                {/* 未知路径重定向回首页，避免空白页 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        )}
      </AuthGate>
    </ErrorBoundary>
  )
}

export default App