import useStore from '../store/useStore'
import { AlertCircle, CheckCircle2, Wrench, Plus } from 'lucide-react'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { fabric } from 'fabric'

const RightSidebar = () => {
  const { complianceIssues, setComplianceIssues, canvas, setLoading, selectedObject, setSelectedObject } = useStore()
  const [isChecking, setIsChecking] = useState(false)

  const handleQuickAddTagText = () => {
    if (!canvas) return

    // Check if tag text already exists
    const existingObjects = canvas.getObjects()
    const hasTagText = existingObjects.some(obj => {
      if (obj.type !== 'textbox' && obj.type !== 'text' && obj.type !== 'i-text') return false
      const text = (obj.text || '').toLowerCase()
      return text.includes('only at tesco') || text.includes('available at tesco')
    })

    if (hasTagText) {
      alert('TAG text already exists on canvas')
      return
    }

    // Position in safe zone (top safe area, below unsafe zone)
    const topUnsafeHeight = 200
    const tagText = new fabric.Textbox('Only at Tesco', {
      left: 50,
      top: topUnsafeHeight + 20,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#0066CC',
      fontWeight: 'bold',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      width: 200,
    })
    
    canvas.add(tagText)
    canvas.setActiveObject(tagText)
    canvas.renderAll()

    // Re-check compliance after adding
    setTimeout(async () => {
      try {
        const updatedCanvasData = canvas.toJSON()
        const complianceResponse = await fetch('/api/check-compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canvasData: updatedCanvasData }),
        })
        if (complianceResponse.ok) {
          const complianceResult = await complianceResponse.json()
          setComplianceIssues(complianceResult.issues || [])
        }
      } catch (error) {
        console.error('Compliance re-check failed:', error)
      }
    }, 300)
  }

  useEffect(() => {
    // Auto-check compliance when canvas changes
    if (canvas) {
      const checkCompliance = async () => {
        setIsChecking(true)
        try {
          const canvasData = canvas.toJSON()
          const response = await fetch('/api/check-compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvasData }),
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const result = await response.json()
          setComplianceIssues(result.issues || [])
        } catch (error) {
          console.error('Compliance check failed:', error)
        } finally {
          setIsChecking(false)
        }
      }

      // Debounce compliance checking
      const timeoutId = setTimeout(() => {
        checkCompliance()
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [canvas]) // setComplianceIssues is stable from Zustand, no need to include

  const handleFixAll = async () => {
    if (!canvas || complianceIssues.length === 0) return

    setLoading(true)
    try {
      const canvasData = canvas.toJSON()
      const response = await api.autoFix(canvasData, complianceIssues)
      
      if (response.fixedCanvasData) {
        // Store current viewport transform if needed
        const viewportTransform = canvas.viewportTransform
        
        // Load fixed canvas data
        canvas.loadFromJSON(response.fixedCanvasData, () => {
          // Restore viewport transform
          if (viewportTransform) {
            canvas.setViewportTransform(viewportTransform)
          }
          
          // Re-render canvas
          canvas.renderAll()
          
          // Clear selection
          canvas.discardActiveObject()
          
          // Re-check compliance after fixes
          setTimeout(async () => {
            try {
              const updatedCanvasData = canvas.toJSON()
              const complianceResponse = await fetch('/api/check-compliance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canvasData: updatedCanvasData }),
              })
              if (!complianceResponse.ok) {
                throw new Error(`HTTP error! status: ${complianceResponse.status}`)
              }
              const complianceResult = await complianceResponse.json()
              setComplianceIssues(complianceResult.issues || [])
            } catch (error) {
              console.error('Compliance re-check failed:', error)
            }
          }, 500)
        })
        
        const fixedCount = response.fixedIssues?.length || complianceIssues.length
        alert(`Auto-fix applied successfully! Fixed ${fixedCount} violation(s).`)
      } else {
        alert('Auto-fix completed but no changes were made.')
      }
    } catch (error) {
      console.error('Auto-fix failed:', error)
      alert(`Auto-fix failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hidden lg:flex w-80 xl:w-96 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-lg border-l border-neon-purple/30 flex-col overflow-hidden shadow-neon-sm animate-slide-in">
      {/* Compliance Checker Section */}
      <div className="flex-shrink-0 border-b border-neon-purple/30">
        <div className="p-4 border-b border-neon-purple/30">
          <h2 className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">Compliance Checker</h2>
          <p className="text-sm text-gray-300 mt-1">
            Real-time AI analysis
          </p>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          {isChecking ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-cyan border-t-transparent"></div>
            </div>
          ) : complianceIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-gray-400">
              <CheckCircle2 size={32} className="mb-2 text-neon-cyan" />
              <p className="text-sm">No issues found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {complianceIssues.map((issue, index) => {
                const severityColor = issue.severity === 'high' 
                  ? 'bg-red-900/30 border-red-500/50' 
                  : issue.severity === 'medium'
                  ? 'bg-orange-900/30 border-orange-500/50'
                  : 'bg-yellow-900/30 border-yellow-500/50'
                
                const severityTextColor = issue.severity === 'high'
                  ? 'text-red-300'
                  : issue.severity === 'medium'
                  ? 'text-orange-300'
                  : 'text-yellow-300'
                
                return (
                  <div
                    key={issue.id || index}
                    className={`p-3 ${severityColor} border rounded-xl shadow-card animate-fade-in`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle size={18} className={`${severityTextColor} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1">
                        <p className={`font-semibold ${severityTextColor} text-sm`}>
                          {issue.id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Violation'}
                        </p>
                        <p className={`${severityTextColor} text-xs mt-1`}>
                          {issue.message}
                        </p>
                        {issue.fix && (
                          <p className="text-gray-400 text-xs mt-1 italic">
                            Fix: {issue.fix.replace(/_/g, ' ')}
                          </p>
                        )}
                        {issue.severity && (
                          <span className={`inline-block mt-2 px-2 py-0.5 ${severityColor} ${severityTextColor} text-xs rounded-lg border`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        )}
                        {issue.id === 'missing_tag_text' && (
                          <button
                            onClick={handleQuickAddTagText}
                            className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center justify-center gap-1 transition-all duration-300"
                          >
                            <Plus size={14} />
                            Quick Add TAG Text
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {complianceIssues.length > 0 && (
          <div className="p-4 border-t border-neon-purple/30">
            <button
              onClick={handleFixAll}
              className="w-full px-4 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center justify-center gap-2 font-semibold transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
            >
              <Wrench size={18} />
              Fix All
            </button>
          </div>
        )}
      </div>

      {/* Object Attributes Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-neon-purple/30">
          <h2 className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">Properties</h2>
          <p className="text-sm text-gray-300 mt-1">
            Selected object attributes
          </p>
        </div>

        {selectedObject ? (
          <ObjectAttributes object={selectedObject} canvas={canvas} />
        ) : (
          <div className="p-4 text-center text-gray-400">
            <p className="text-sm">No object selected</p>
            <p className="text-xs mt-1">Click an object to edit properties</p>
          </div>
        )}
      </div>
    </div>
  )
}

const ObjectAttributes = ({ object, canvas }) => {
  const [attributes, setAttributes] = useState({
    fontSize: object.fontSize || '',
    fontFamily: object.fontFamily || 'Arial',
    fill: object.fill || '#000000',
    left: Math.round(object.left || 0),
    top: Math.round(object.top || 0),
    width: Math.round(object.width * (object.scaleX || 1) || 0),
    height: Math.round(object.height * (object.scaleY || 1) || 0),
    angle: Math.round(object.angle || 0),
    opacity: Math.round((object.opacity || 1) * 100),
    text: object.text || '',
  })

  useEffect(() => {
    if (object) {
      setAttributes({
        fontSize: object.fontSize || '',
        fontFamily: object.fontFamily || 'Arial',
        fill: object.fill || '#000000',
        left: Math.round(object.left || 0),
        top: Math.round(object.top || 0),
        width: Math.round(object.width * (object.scaleX || 1) || 0),
        height: Math.round(object.height * (object.scaleY || 1) || 0),
        angle: Math.round(object.angle || 0),
        opacity: Math.round((object.opacity || 1) * 100),
        text: object.text || '',
      })
    }
  }, [object])

  const updateAttribute = (key, value) => {
    if (!object || !canvas) return

    const newAttributes = { ...attributes, [key]: value }
    setAttributes(newAttributes)

    switch (key) {
      case 'fontSize':
        object.set('fontSize', parseFloat(value) || 20)
        break
      case 'fontFamily':
        object.set('fontFamily', value)
        break
      case 'fill':
        object.set('fill', value)
        break
      case 'left':
        object.set('left', parseFloat(value) || 0)
        break
      case 'top':
        object.set('top', parseFloat(value) || 0)
        break
      case 'width':
        const objectWidth = object.width || 1
        if (objectWidth > 0) {
          const scaleX = parseFloat(value) / objectWidth
          object.set('scaleX', scaleX)
        }
        break
      case 'height':
        const objectHeight = object.height || 1
        if (objectHeight > 0) {
          const scaleY = parseFloat(value) / objectHeight
          object.set('scaleY', scaleY)
        }
        break
      case 'angle':
        object.set('angle', parseFloat(value) || 0)
        break
      case 'opacity':
        object.set('opacity', parseFloat(value) / 100 || 1)
        break
      case 'text':
        if (object.type === 'textbox') {
          object.set('text', value)
        }
        break
      default:
        break
    }

    canvas.renderAll()
  }

  return (
    <div className="p-4 space-y-4">
      {/* Object Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Type
        </label>
        <div className="px-3 py-2 bg-slate-700/50 rounded-xl border border-neon-purple/30 text-sm text-gray-200">
          {object.type || 'Unknown'}
        </div>
      </div>

      {/* Text Content (for text objects) */}
      {object.type === 'textbox' && (
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Text Content
          </label>
          <textarea
            value={attributes.text}
            onChange={(e) => updateAttribute('text', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            rows={3}
          />
        </div>
      )}

      {/* Font Family (for text objects) */}
      {object.type === 'textbox' && (
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Font Family
          </label>
          <select
            value={attributes.fontFamily}
            onChange={(e) => updateAttribute('fontFamily', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            style={{ fontFamily: attributes.fontFamily }}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Impact">Impact</option>
          </select>
        </div>
      )}

      {/* Font Size (for text objects) */}
      {object.type === 'textbox' && (
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Font Size
          </label>
          <input
            type="number"
            value={attributes.fontSize}
            onChange={(e) => updateAttribute('fontSize', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            min="8"
            max="200"
          />
        </div>
      )}

      {/* Color */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={attributes.fill}
            onChange={(e) => updateAttribute('fill', e.target.value)}
            className="w-12 h-10 border border-neon-purple/30 rounded-xl cursor-pointer shadow-card hover:shadow-neon-sm transition-all duration-300"
          />
          <input
            type="text"
            value={attributes.fill}
            onChange={(e) => updateAttribute('fill', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            X Position
          </label>
          <input
            type="number"
            value={attributes.left}
            onChange={(e) => updateAttribute('left', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Y Position
          </label>
          <input
            type="number"
            value={attributes.top}
            onChange={(e) => updateAttribute('top', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
          />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Width
          </label>
          <input
            type="number"
            value={attributes.width}
            onChange={(e) => updateAttribute('width', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            min="1"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Height
          </label>
          <input
            type="number"
            value={attributes.height}
            onChange={(e) => updateAttribute('height', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            min="1"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Rotation: {attributes.angle}°
        </label>
        <input
          type="range"
          value={attributes.angle}
          onChange={(e) => updateAttribute('angle', e.target.value)}
          className="w-full accent-neon-cyan"
          min="0"
          max="360"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Opacity: {attributes.opacity}%
        </label>
        <input
          type="range"
          value={attributes.opacity}
          onChange={(e) => updateAttribute('opacity', e.target.value)}
          className="w-full accent-neon-purple"
          min="0"
          max="100"
        />
      </div>
    </div>
  )
}

export default RightSidebar

