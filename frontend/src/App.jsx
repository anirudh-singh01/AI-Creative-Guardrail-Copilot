import LeftSidebar from './components/LeftSidebar'
import CanvasArea from './components/CanvasArea'
import RightSidebar from './components/RightSidebar'
import FormatSelector from './components/FormatSelector'
import ProjectControls from './components/ProjectControls'

function App() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-neon-purple/20 backdrop-blur-lg border-b border-neon-purple/30 px-3 sm:px-6 py-3 sm:py-4 shadow-neon-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="animate-fade-in">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple bg-clip-text text-transparent">
              AI Creative Guardrail Copilot
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Build compliant creatives with AI assistance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto animate-fade-in">
            <FormatSelector />
            <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-neon-cyan/50 to-transparent"></div>
            <ProjectControls />
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar />
        <CanvasArea />
        <RightSidebar />
      </div>
      
      <footer className="bg-gradient-to-r from-neon-purple/10 via-neon-cyan/10 to-neon-purple/10 backdrop-blur-lg border-t border-neon-purple/30 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-center">
        <p className="text-xs sm:text-sm text-gray-300 flex flex-wrap items-center justify-center gap-2">
          <span>Powered by</span>
          <span className="font-bold bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-yellow bg-clip-text text-transparent">
            Team Pikachu
          </span>
          <span className="text-neon-yellow animate-pulse-neon">⚡</span>
        </p>
      </footer>
    </div>
  )
}

export default App

