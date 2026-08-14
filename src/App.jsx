import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const WebLinks = lazy(() => import('./pages/WebLinks'))
const CheckIn = lazy(() => import('./pages/CheckIn'))
const VideoWorkflow = lazy(() => import('./pages/VideoWorkflow'))
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const LearningHub = lazy(() => import('./pages/LearningHub'))
const SmartNotes = lazy(() => import('./pages/SmartNotes'))
const MindMap = lazy(() => import('./pages/MindMap'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const BabyCare = lazy(() => import('./pages/BabyCare'))

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-cyan-400 text-lg">加载中...</div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/web-links" element={<WebLinks />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/video-workflow" element={<VideoWorkflow />} />
            <Route path="/mindmap" element={<MindMap />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/prompts" element={<PromptLibrary />} />
            <Route path="/learning" element={<LearningHub />} />
            <Route path="/smart-notes" element={<SmartNotes />} />
            <Route path="/baby-care" element={<BabyCare />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

export default App