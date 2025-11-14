import { useState } from 'react'
import LeftSidebar from './components/LeftSidebar'
import CanvasArea from './components/CanvasArea'
import RightSidebar from './components/RightSidebar'
import FormatSelector from './components/FormatSelector'
import ProjectControls from './components/ProjectControls'
import { Menu, X } from 'lucide-react'

function App() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-neon-purple/20 backdrop-blur-lg border-b border-neon-purple/30 px-4 sm:px-6 py-4 sm:py-5 shadow-neon-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="animate-fade-in flex-shrink-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple bg-clip-text text-transparent">
              AI Creative Guardrail Copilot
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
              Build compliant creatives with AI assistance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto animate-fade-in">
            <div className="flex-shrink-0">
              <FormatSelector />
            </div>
            <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-neon-cyan/50 to-transparent"></div>
            <div className="flex-shrink-0">
              <ProjectControls />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        {leftSidebarOpen && <LeftSidebar />}
        <CanvasArea />
        {rightSidebarOpen && <RightSidebar />}
      </div>
      
      <footer className="bg-gradient-to-r from-neon-purple/10 via-neon-cyan/10 to-neon-purple/10 backdrop-blur-lg border-t border-neon-purple/30 px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Left Hamburger - Below Left Sidebar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                leftSidebarOpen
                  ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-neon-sm'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 border border-neon-purple/30'
              }`}
              title={leftSidebarOpen ? 'Close Tools Panel' : 'Open Tools Panel'}
            >
              {leftSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-xs text-gray-400 hidden sm:inline">Tools</span>
          </div>
          
          {/* Center - Powered by */}
          <p className="text-xs sm:text-sm text-gray-300 flex flex-wrap items-center gap-2">
            <span>Powered by</span>
            <span className="font-bold bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-yellow bg-clip-text text-transparent">
              Team Pikachu
            </span>
            <span className="text-neon-yellow animate-pulse-neon">⚡</span>
          </p>
          
          {/* Right Hamburger - Below Right Sidebar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">Properties</span>
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                rightSidebarOpen
                  ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-neon-sm'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 border border-neon-purple/30'
              }`}
              title={rightSidebarOpen ? 'Close Properties Panel' : 'Open Properties Panel'}
            >
              {rightSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

