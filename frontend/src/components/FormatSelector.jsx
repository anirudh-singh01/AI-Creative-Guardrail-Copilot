import useStore from '../store/useStore'
import { adaptCanvasLayout } from '../utils/canvasLayout'
import { Sparkles } from 'lucide-react'

const FormatSelector = () => {
  const { currentFormat, setCurrentFormat, canvas, setLoading } = useStore()

  const formats = [
    { value: '1:1', label: 'Square (1:1)', generateWidth: 1080, generateHeight: 1080 },
    { value: '9:16', label: 'Story (9:16)', generateWidth: 1080, generateHeight: 1920 },
    { value: '16:9', label: 'Landscape (16:9)', generateWidth: 1920, generateHeight: 1080 },
  ]

  const handleGenerate = async (format) => {
    if (!canvas) {
      alert('Canvas not initialized')
      return
    }

    setLoading(true)
    try {
      const formatConfig = formats.find(f => f.value === format.value)
      if (!formatConfig) return

      // Adapt canvas layout to new dimensions
      adaptCanvasLayout(canvas, formatConfig.generateWidth, formatConfig.generateHeight)
      
      // Update format in store
      setCurrentFormat(format.value)
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Generate format error:', error)
      alert('Failed to generate format')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">Format:</span>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => setCurrentFormat(format.value)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                currentFormat === format.value
                  ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-neon-sm'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 border border-neon-purple/30'
              }`}
            >
              <span className="hidden sm:inline">{format.label}</span>
              <span className="sm:hidden">{format.value}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-neon-cyan/50 to-transparent"></div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">Generate:</span>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {formats.map((format) => (
            <button
              key={`generate-${format.value}`}
              onClick={() => handleGenerate(format)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 bg-gradient-to-r from-neon-purple to-neon-cyan text-white hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center gap-1 sm:gap-1.5 shadow-card hover:shadow-card-hover transform hover:scale-105"
              title={`Generate ${format.generateWidth}×${format.generateHeight}`}
            >
              <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{format.generateWidth}×{format.generateHeight}</span>
              <span className="sm:hidden">{format.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FormatSelector

