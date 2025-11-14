import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import useStore from '../store/useStore'
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { exportCreative, downloadFile } from '../utils/exportCreative'

const CanvasArea = () => {
  const canvasRef = useRef(null)
  const { canvas, setCanvas, currentFormat, setSelectedObject, isLoading, setLoading } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)

  useEffect(() => {
    if (!canvasRef.current) return

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    })

    // Enable bounding box controls
    fabricCanvas.selection = true
    fabricCanvas.selectionColor = 'rgba(100, 100, 255, 0.3)'
    fabricCanvas.selectionBorderColor = '#646cff'
    fabricCanvas.selectionLineWidth = 2

    setCanvas(fabricCanvas)

    // Update zoom level display when zoom changes (only from button clicks)
    fabricCanvas.on('zoom', () => {
      const currentZoom = fabricCanvas.getZoom()
      setZoomLevel(Math.round(currentZoom * 100))
    })

    // Handle object selection
    fabricCanvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length > 0) {
        useStore.getState().setSelectedObject(e.selected[0])
      }
    })

    fabricCanvas.on('selection:updated', (e) => {
      if (e.selected && e.selected.length > 0) {
        useStore.getState().setSelectedObject(e.selected[0])
      }
    })

    fabricCanvas.on('selection:cleared', () => {
      useStore.getState().setSelectedObject(null)
    })

    // Handle delete key
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvas.getActiveObject()) {
        fabricCanvas.remove(fabricCanvas.getActiveObject())
        fabricCanvas.renderAll()
        useStore.getState().setSelectedObject(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // Unsafe zone logic (no visual overlays - just enforcement)
    // The unsafe zones are still enforced but not visually displayed

    // Allow objects to move freely anywhere on canvas
    // Only keep objects within canvas bounds (no unsafe zone restrictions)
    const keepObjectInBounds = (obj) => {
      if (!obj) return
      
      const width = fabricCanvas.width
      const height = fabricCanvas.height
      
      // Calculate object bounds (with null checks)
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      const objLeft = obj.left || 0
      const objTop = obj.top || 0
      const objRight = objLeft + objWidth
      const objBottom = objTop + objHeight

      // Keep object within canvas bounds only
      if (objLeft < 0) {
        obj.left = 0
      }
      if (objRight > width) {
        obj.left = width - objWidth
      }
      if (objTop < 0) {
        obj.top = 0
      }
      if (objBottom > height) {
        obj.top = height - objHeight
      }
    }

    // Handle object moving - only keep within canvas bounds
    fabricCanvas.on('object:moving', (e) => {
      const obj = e.target
      keepObjectInBounds(obj)
      fabricCanvas.renderAll()
    })

    // Handle object resizing - only keep within canvas bounds
    fabricCanvas.on('object:scaling', (e) => {
      const obj = e.target
      if (!obj) return
      keepObjectInBounds(obj)
      fabricCanvas.renderAll()
    })

    // Handle object modified (after resize/rotate) - final check
    fabricCanvas.on('object:modified', (e) => {
      const obj = e.target
      keepObjectInBounds(obj)
      fabricCanvas.renderAll()
    })

    // Handle drag and drop
    const handleDrop = (e) => {
      e.preventDefault()
      setIsDragging(false)
      
      const files = Array.from(e.dataTransfer.files)
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (event) => {
            // Validate file type
            const fileType = file.type.toLowerCase()
            if (!fileType.includes('jpeg') && !fileType.includes('jpg') && !fileType.includes('png')) {
              alert('Please upload a JPG or PNG image file')
              return
            }
            
            fabric.Image.fromURL(event.target.result, (img) => {
              // Scale to fit canvas while maintaining aspect ratio
              const maxWidth = 400
              const maxHeight = 400
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
              
              img.scale(scale)
              
              // Position in center of canvas (can be moved anywhere)
              img.set({
                left: fabricCanvas.width / 2 - (img.width * scale) / 2,
                top: fabricCanvas.height / 2 - (img.height * scale) / 2,
                hasControls: true,
                hasBorders: true,
                lockRotation: false,
                lockScalingX: false,
                lockScalingY: false,
                lockUniScaling: false,
              })
              
              fabricCanvas.add(img)
              fabricCanvas.setActiveObject(img)
              fabricCanvas.renderAll()
            })
          }
          reader.readAsDataURL(file)
        }
      })
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = () => {
      setIsDragging(false)
    }

    const container = fabricCanvas.getElement()?.parentElement
    if (container) {
      container.addEventListener('drop', handleDrop)
      container.addEventListener('dragover', handleDragOver)
      container.addEventListener('dragleave', handleDragLeave)
    }

    return () => {
      if (container) {
        container.removeEventListener('drop', handleDrop)
        container.removeEventListener('dragover', handleDragOver)
        container.removeEventListener('dragleave', handleDragLeave)
      }
      window.removeEventListener('keydown', handleKeyDown)
      if (fabricCanvas) {
        fabricCanvas.dispose()
      }
    }
  }, [])

  // Update canvas dimensions based on format (only if not generated)
  useEffect(() => {
    if (!canvas) return

    const dimensions = {
      '1:1': { width: 1080, height: 1080 },
      '9:16': { width: 608, height: 1080 },
      '16:9': { width: 1080, height: 608 },
    }

    const { width, height } = dimensions[currentFormat] || dimensions['1:1']
    
    // Only update if dimensions actually changed
    if (canvas.width === width && canvas.height === height) {
      return
    }
    
    canvas.setDimensions({ width, height })
    
    // Remove any existing unsafe zone overlays (if they exist)
    const existingOverlays = canvas.getObjects().filter(
      obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
    )
    existingOverlays.forEach(overlay => canvas.remove(overlay))
    
    // Ensure all objects stay within canvas bounds (no unsafe zone restrictions)
    const allObjects = canvas.getObjects().filter(
      obj => obj && obj.name !== 'unsafeZoneTop' && obj.name !== 'unsafeZoneBottom'
    )
    allObjects.forEach(obj => {
      if (!obj) return
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      const objLeft = obj.left || 0
      const objTop = obj.top || 0
      const objRight = objLeft + objWidth
      const objBottom = objTop + objHeight
      
      // Only keep within canvas bounds
      if (objLeft < 0) {
        obj.left = 0
      }
      if (objRight > width) {
        obj.left = width - objWidth
      }
      if (objTop < 0) {
        obj.top = 0
      }
      if (objBottom > height) {
        obj.top = height - objHeight
      }
    })
    
    canvas.renderAll()
  }, [currentFormat, canvas])

  const handleZoomIn = () => {
    if (!canvas) return
    const currentZoom = canvas.getZoom()
    const newZoom = Math.min(currentZoom * 1.2, 3) // Max 300%
    canvas.setZoom(newZoom)
    setZoomLevel(Math.round(newZoom * 100))
    canvas.renderAll()
  }

  const handleZoomOut = () => {
    if (!canvas) return
    const currentZoom = canvas.getZoom()
    const newZoom = Math.max(currentZoom / 1.2, 0.1) // Min 10%
    canvas.setZoom(newZoom)
    setZoomLevel(Math.round(newZoom * 100))
    canvas.renderAll()
  }

  const handleZoomReset = () => {
    if (!canvas) return
    canvas.setZoom(1)
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoomLevel(100)
    canvas.renderAll()
  }

  const handleExport = async (format, fileType) => {
    if (!canvas) return

    setLoading(true)
    try {
      // Use exportCreative utility with browser compression
      const downloadUrl = await exportCreative(canvas, format, fileType)
      
      // Download the file
      const filename = `creative-export-${format}-${Date.now()}.${fileType}`
      downloadFile(downloadUrl, filename)
      
      // Show success message with file size info
      const blob = await fetch(downloadUrl).then(r => r.blob())
      const sizeKB = (blob.size / 1024).toFixed(2)
      console.log(`Export successful: ${sizeKB} KB`)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900/50 to-slate-800/50 overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-lg border-b border-neon-purple/30 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-neon-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-medium">Canvas Size:</span>
            <span className="text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">{canvas?.width || 1080} × {canvas?.height || 1080}px</span>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 border-l border-neon-purple/30 pl-4">
            <span className="text-sm text-gray-400 font-medium hidden sm:inline">Zoom:</span>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-all duration-300 border border-neon-purple/30 hover:border-neon-purple/50 disabled:opacity-50"
              disabled={!canvas || isLoading}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-all duration-300 border border-neon-purple/30 hover:border-neon-purple/50 text-xs font-medium disabled:opacity-50"
              disabled={!canvas || isLoading}
              title="Reset Zoom"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-all duration-300 border border-neon-purple/30 hover:border-neon-purple/50 disabled:opacity-50"
              disabled={!canvas || isLoading}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleExport(currentFormat, 'jpg')}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-lg text-sm hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-[1.02] font-medium"
            disabled={isLoading}
            title="Export as JPG (< 500KB)"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export </span>JPG
          </button>
          <button
            onClick={() => handleExport(currentFormat, 'png')}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-lg text-sm hover:from-neon-cyan/90 hover:to-neon-purple/90 flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-[1.02] font-medium"
            disabled={isLoading}
            title="Export as PNG (< 500KB)"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export </span>PNG
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col items-center gap-3 border border-neon-purple/30 shadow-neon-lg animate-fade-in">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan border-t-transparent"></div>
              <p className="text-gray-200 font-medium bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">Processing...</p>
            </div>
          </div>
        )}
        <div className="flex justify-center items-center min-h-full">
          <div
            id="canvas-container"
            className={`relative ${isDragging ? 'border-blue-500 bg-blue-50' : ''}`}
          >
            <canvas ref={canvasRef} />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-20 pointer-events-none">
                <p className="text-blue-600 font-semibold text-lg">Drop image here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasArea

