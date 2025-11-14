import useStore from '../store/useStore'
import { adaptCanvasLayout } from '../utils/canvasLayout'

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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
      <span className="text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap uppercase tracking-wider">Format:</span>
      <div className="flex gap-2 flex-wrap">
        {formats.map((format) => (
          <button
            key={format.value}
            onClick={() => handleGenerate(format)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
              currentFormat === format.value
                ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-neon-sm'
                : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 border border-neon-purple/30 hover:border-neon-purple/50'
            }`}
            title={`Set canvas to ${format.label} (${format.generateWidth}×${format.generateHeight})`}
          >
            <span className="hidden sm:inline">{format.label}</span>
            <span className="sm:hidden">{format.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default FormatSelector

