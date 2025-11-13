import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import useStore from '../store/useStore'
import { Download } from 'lucide-react'
import { exportCreative, downloadFile } from '../utils/exportCreative'

const CanvasArea = () => {
  const canvasRef = useRef(null)
  const { canvas, setCanvas, currentFormat, setSelectedObject, isLoading, setLoading } = useStore()
  const [isDragging, setIsDragging] = useState(false)

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

    // Draw unsafe zone overlays
    const drawUnsafeZones = () => {
      const width = fabricCanvas.width
      const height = fabricCanvas.height
      const topUnsafeHeight = 200
      const bottomUnsafeHeight = 250

      // Remove existing unsafe zone overlays
      const existingOverlays = fabricCanvas.getObjects().filter(
        obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
      )
      existingOverlays.forEach(overlay => fabricCanvas.remove(overlay))

      // Top unsafe zone overlay (transparent red)
      const topUnsafeZone = new fabric.Rect({
        left: 0,
        top: 0,
        width: width,
        height: topUnsafeHeight,
        fill: 'rgba(255, 0, 0, 0.3)', // Transparent red
        stroke: '#FF0000',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        name: 'unsafeZoneTop',
        excludeFromExport: true,
      })

      // Bottom unsafe zone overlay (transparent red)
      const bottomUnsafeZone = new fabric.Rect({
        left: 0,
        top: height - bottomUnsafeHeight,
        width: width,
        height: bottomUnsafeHeight,
        fill: 'rgba(255, 0, 0, 0.3)', // Transparent red
        stroke: '#FF0000',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        name: 'unsafeZoneBottom',
        excludeFromExport: true,
      })

      fabricCanvas.add(topUnsafeZone)
      fabricCanvas.add(bottomUnsafeZone)
      fabricCanvas.sendToBack(topUnsafeZone)
      fabricCanvas.sendToBack(bottomUnsafeZone)
    }

    drawUnsafeZones()

    // Prevent objects from entering unsafe zones and enable snapping
    const topUnsafeHeight = 200
    const bottomUnsafeHeight = 250

    const preventUnsafeZoneEntry = (obj) => {
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

      // Prevent entering top unsafe zone
      if (objTop < topUnsafeHeight) {
        obj.top = topUnsafeHeight
      }

      // Prevent entering bottom unsafe zone
      if (objBottom > height - bottomUnsafeHeight) {
        obj.top = height - bottomUnsafeHeight - objHeight
      }

      // Keep object within canvas bounds
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

    // Handle object moving - prevent unsafe zone entry
    fabricCanvas.on('object:moving', (e) => {
      const obj = e.target
      
      // Skip unsafe zone overlays
      if (obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom') {
        return
      }

      preventUnsafeZoneEntry(obj)
      fabricCanvas.renderAll()
    })

    // Handle object resizing - prevent unsafe zone entry
    fabricCanvas.on('object:scaling', (e) => {
      const obj = e.target
      if (!obj) return
      
      // Skip unsafe zone overlays
      if (obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom') {
        return
      }

      // Calculate current object bounds (with null checks)
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      const objTop = obj.top || 0
      const objBottom = objTop + objHeight

      // Prevent top from going into unsafe zone
      if (objTop < topUnsafeHeight) {
        // Adjust position to keep top edge at safe zone boundary
        obj.top = topUnsafeHeight
      }

      // Prevent bottom from going into unsafe zone
      if (objBottom > fabricCanvas.height - bottomUnsafeHeight) {
        // Limit height so bottom edge stays at safe zone boundary
        const objHeightValue = obj.height || 1
        const maxAllowedHeight = fabricCanvas.height - bottomUnsafeHeight - objTop
        if (maxAllowedHeight > 0 && objHeightValue > 0) {
          const maxScaleY = maxAllowedHeight / objHeightValue
          if (obj.scaleY > maxScaleY) {
            obj.scaleY = maxScaleY
          }
        } else {
          // If object is too large, move it up
          obj.top = topUnsafeHeight
          const safeZoneHeight = fabricCanvas.height - bottomUnsafeHeight - topUnsafeHeight
          if (objHeightValue > 0 && safeZoneHeight > 0) {
            const maxScaleY = safeZoneHeight / objHeightValue
            if (obj.scaleY > maxScaleY) {
              obj.scaleY = maxScaleY
            }
          }
        }
      }
    })

    // Handle object modified (after resize/rotate) - final check
    fabricCanvas.on('object:modified', (e) => {
      const obj = e.target
      
      // Skip unsafe zone overlays
      if (obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom') {
        return
      }

      preventUnsafeZoneEntry(obj)
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
              
              // Position in safe zone (avoiding top 200px and bottom 250px)
              const topUnsafeHeight = 200
              const bottomUnsafeHeight = 250
              const safeTop = topUnsafeHeight
              const safeBottom = fabricCanvas.height - bottomUnsafeHeight
              const safeCenter = safeTop + (safeBottom - safeTop) / 2
              
              // Enable scaling and rotation
              img.set({
                left: fabricCanvas.width / 2 - (img.width * scale) / 2,
                top: safeCenter - (img.height * scale) / 2,
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
    
    // Redraw unsafe zone overlays
    const topUnsafeHeight = 200
    const bottomUnsafeHeight = 250
    
    const existingOverlays = canvas.getObjects().filter(
      obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
    )
    existingOverlays.forEach(overlay => canvas.remove(overlay))
    
    // Top unsafe zone overlay
    const topUnsafeZone = new fabric.Rect({
      left: 0,
      top: 0,
      width: width,
      height: topUnsafeHeight,
      fill: 'rgba(255, 0, 0, 0.3)',
      stroke: '#FF0000',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      name: 'unsafeZoneTop',
      excludeFromExport: true,
    })
    
    // Bottom unsafe zone overlay
    const bottomUnsafeZone = new fabric.Rect({
      left: 0,
      top: height - bottomUnsafeHeight,
      width: width,
      height: bottomUnsafeHeight,
      fill: 'rgba(255, 0, 0, 0.3)',
      stroke: '#FF0000',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      name: 'unsafeZoneBottom',
      excludeFromExport: true,
    })
    
    canvas.add(topUnsafeZone)
    canvas.add(bottomUnsafeZone)
    canvas.sendToBack(topUnsafeZone)
    canvas.sendToBack(bottomUnsafeZone)
    
    // Ensure all objects stay out of unsafe zones
    const allObjects = canvas.getObjects().filter(
      obj => obj && obj.name !== 'unsafeZoneTop' && obj.name !== 'unsafeZoneBottom'
    )
    allObjects.forEach(obj => {
      if (!obj) return
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      const objTop = obj.top || 0
      const objBottom = objTop + objHeight
      
      if (objTop < topUnsafeHeight) {
        obj.top = topUnsafeHeight
      }
      if (objBottom > height - bottomUnsafeHeight) {
        obj.top = Math.max(topUnsafeHeight, height - bottomUnsafeHeight - objHeight)
      }
    })
    
    canvas.renderAll()
  }, [currentFormat, canvas])

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
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg border-b border-neon-purple/30 px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 shadow-neon-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-300">Canvas:</span>
          <span className="text-xs sm:text-sm font-medium bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">{canvas?.width || 1080} × {canvas?.height || 1080}</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleExport(currentFormat, 'jpg')}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-xs sm:text-sm hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center justify-center gap-1 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
            disabled={isLoading}
            title="Export as JPG (< 500KB)"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export </span>JPG
          </button>
          <button
            onClick={() => handleExport(currentFormat, 'png')}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl text-xs sm:text-sm hover:from-neon-cyan/90 hover:to-neon-purple/90 flex items-center justify-center gap-1 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
            disabled={isLoading}
            title="Export as PNG (< 500KB)"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export </span>PNG
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 relative">
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

