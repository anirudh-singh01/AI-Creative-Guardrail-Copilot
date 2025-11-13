import React, { useRef } from 'react'
import { fabric } from 'fabric'
import { Upload, Type, Square, Scissors, Layers, Sparkles, Wand2, X } from 'lucide-react'
import useStore from '../store/useStore'
import { loadSampleCreative } from '../utils/sampleCreative'
import api from '../services/api'

const LeftSidebar = () => {
  const packshotInputRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const { canvas, setLoading, isLoading } = useStore()
  const [showImageGenerator, setShowImageGenerator] = React.useState(false)
  const [imagePrompt, setImagePrompt] = React.useState('')
  const [imageSize, setImageSize] = React.useState('1024x1024')
  const [imageQuality, setImageQuality] = React.useState('standard')
  const [imageStyle, setImageStyle] = React.useState('vivid')

  const handleLoadSample = async () => {
    if (!canvas) {
      alert('Canvas not initialized')
      return
    }

    if (!confirm('Load sample creative? This will replace your current canvas.')) {
      return
    }

    setLoading(true)
    try {
      await loadSampleCreative(canvas)
      alert('Sample creative loaded! Check the compliance panel for violations.')
    } catch (error) {
      console.error('Failed to load sample creative:', error)
      alert(`Failed to load sample: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082', '#FF6347'
  ]

  const fonts = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Comic Sans MS',
    'Impact',
    'Trebuchet MS',
    'Lucida Console'
  ]

  const handleUpload = (type) => {
    const inputRef = type === 'packshot' ? packshotInputRef : backgroundInputRef
    inputRef.current?.click()
  }

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0]
    if (!file || !canvas) return

    // Validate file type - only accept JPG and PNG
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG or PNG image file')
      e.target.value = '' // Reset input
      return
    }

    // Validate file extension as well
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      alert('Please upload a JPG or PNG image file')
      e.target.value = '' // Reset input
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (!event.target?.result) return
      fabric.Image.fromURL(event.target.result, (img) => {
        if (!img || !canvas) return
        
        // Scale to fit canvas while maintaining aspect ratio
        const maxWidth = 400
        const maxHeight = 400
        const imgWidth = img.width || 1
        const imgHeight = img.height || 1
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1)
        
        img.scale(scale)
        
        // Position in safe zone (avoiding top 200px and bottom 250px)
        const topUnsafeHeight = 200
        const bottomUnsafeHeight = 250
        const safeTop = topUnsafeHeight
        const safeBottom = canvas.height - bottomUnsafeHeight
        const safeCenter = safeTop + (safeBottom - safeTop) / 2
        
        // Enable scaling and rotation
        img.set({
          left: canvas.width / 2 - (imgWidth * scale) / 2,
          top: safeCenter - (imgHeight * scale) / 2,
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
        })
        
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      }, { crossOrigin: 'anonymous' })
    }
    reader.onerror = () => {
      alert('Failed to read file')
    }
    reader.readAsDataURL(file)
    
    // Reset input to allow uploading the same file again
    e.target.value = ''
  }

  const handleAddText = () => {
    if (!canvas) return

    // Position in safe zone (avoiding top 200px and bottom 250px)
    const topUnsafeHeight = 200
    const bottomUnsafeHeight = 250
    const safeTop = topUnsafeHeight
    const safeBottom = canvas.height - bottomUnsafeHeight
    const safeCenter = safeTop + (safeBottom - safeTop) / 2

    const text = new fabric.Textbox('Double click to edit', {
      left: canvas.width / 2,
      top: safeCenter,
      fontSize: 40,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  const handleAddTagText = () => {
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
  }

  const handleAddShape = (shapeType) => {
    if (!canvas) return

    // Position in safe zone (avoiding top 200px and bottom 250px)
    const topUnsafeHeight = 200
    const bottomUnsafeHeight = 250
    const safeTop = topUnsafeHeight
    const safeBottom = canvas.height - bottomUnsafeHeight
    const safeCenter = safeTop + (safeBottom - safeTop) / 2

    let shape
    const size = 100

    switch (shapeType) {
      case 'rect':
        shape = new fabric.Rect({
          left: canvas.width / 2,
          top: safeCenter,
          width: size,
          height: size,
          fill: '#FF0000',
          originX: 'center',
          originY: 'center',
        })
        break
      case 'circle':
        shape = new fabric.Circle({
          left: canvas.width / 2,
          top: safeCenter,
          radius: size / 2,
          fill: '#FF0000',
          originX: 'center',
          originY: 'center',
        })
        break
      case 'triangle':
        shape = new fabric.Triangle({
          left: canvas.width / 2,
          top: safeCenter,
          width: size,
          height: size,
          fill: '#FF0000',
          originX: 'center',
          originY: 'center',
        })
        break
      default:
        return
    }

    canvas.add(shape)
    canvas.setActiveObject(shape)
    canvas.renderAll()
  }

  const handleRemoveBackground = async () => {
    if (!canvas) return
    
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'image') {
      alert('Please select an image to remove background')
      return
    }

    setLoading(true)
    try {
      // Get image as data URL (PNG format to preserve transparency)
      const dataUrl = activeObject.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // Higher resolution for better quality
      })
      
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      })
      
      if (!response.ok) {
        throw new Error('Background removal failed')
      }
      
      const blob = await response.blob()
      const processedImageUrl = URL.createObjectURL(blob)
      
      // Replace the layer with the processed image
      fabric.Image.fromURL(processedImageUrl, (img) => {
        if (!img || !canvas) return
        
        // Preserve original dimensions and position
        const originalWidth = (activeObject.width || 0) * (activeObject.scaleX || 1)
        const originalHeight = (activeObject.height || 0) * (activeObject.scaleY || 1)
        const originalLeft = activeObject.left || 0
        const originalTop = activeObject.top || 0
        const originalAngle = activeObject.angle || 0
        
        // Scale to match original size (prevent division by zero)
        const imgWidth = img.width || 1
        const imgHeight = img.height || 1
        const scaleX = imgWidth > 0 ? originalWidth / imgWidth : 1
        const scaleY = imgHeight > 0 ? originalHeight / imgHeight : 1
        
        img.set({
          left: originalLeft,
          top: originalTop,
          angle: originalAngle,
          scaleX: scaleX,
          scaleY: scaleY,
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
        })
        
        // Replace the old image with the new one
        canvas.remove(activeObject)
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
        
        // Clean up the object URL
        URL.revokeObjectURL(processedImageUrl)
      }, { crossOrigin: 'anonymous' })
    } catch (error) {
      console.error('Background removal failed:', error)
      alert('Background removal failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleColorSelect = (color) => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      activeObject.set('fill', color)
      canvas.renderAll()
    }
  }

  const handleFontSelect = (font) => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === 'textbox') {
      activeObject.set('fontFamily', font)
      canvas.renderAll()
    }
  }

  return (
    <div className="hidden md:flex w-64 lg:w-72 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-lg border-r border-neon-purple/30 flex-col overflow-y-auto shadow-neon-sm animate-slide-in">
      <div className="p-4 border-b border-neon-purple/30">
        <h2 className="text-lg font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">Tools</h2>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Sample Creative Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Sample</h3>
          <button
            onClick={handleLoadSample}
            className="w-full px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center gap-2 justify-center disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
            disabled={!canvas || isLoading}
            title="Load sample creative with pre-loaded violations"
          >
            <Sparkles size={18} />
            Load Sample Creative
          </button>
        </div>

        {/* Upload Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Upload</h3>
          <button
            onClick={() => handleUpload('packshot')}
            className="w-full px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl hover:from-neon-cyan/90 hover:to-neon-purple/90 flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
          >
            <Upload size={18} />
            Upload Packshot
          </button>
          <input
            ref={packshotInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e, 'packshot')}
            className="hidden"
          />
          <button
            onClick={() => handleUpload('background')}
            className="w-full px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl hover:from-neon-purple/90 hover:to-neon-cyan/90 flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
          >
            <Upload size={18} />
            Upload Background
          </button>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e, 'background')}
            className="hidden"
          />
        </div>

        {/* Add Elements */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Add Elements</h3>
          <button
            onClick={handleAddText}
            className="w-full px-4 py-2 bg-gradient-to-r from-neon-yellow/80 to-neon-cyan text-gray-900 rounded-xl hover:from-neon-yellow hover:to-neon-cyan flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105 font-semibold"
          >
            <Type size={18} />
            Add Text
          </button>
          <button
            onClick={handleAddTagText}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105"
            title="Add required TAG text (Only at Tesco)"
          >
            <Type size={18} />
            Add TAG Text
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAddShape('rect')}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 shadow-card hover:shadow-neon-sm border border-neon-purple/30"
              title="Rectangle"
            >
              <Square size={20} className="text-neon-cyan" />
            </button>
            <button
              onClick={() => handleAddShape('circle')}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 shadow-card hover:shadow-neon-sm border border-neon-purple/30"
              title="Circle"
            >
              <div className="w-5 h-5 rounded-full border-2 border-neon-cyan"></div>
            </button>
            <button
              onClick={() => handleAddShape('triangle')}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 shadow-card hover:shadow-neon-sm border border-neon-purple/30"
              title="Triangle"
            >
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-neon-cyan"></div>
            </button>
          </div>
        </div>

        {/* AI Image Generation */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">AI Tools</h3>
          <button
            onClick={() => setShowImageGenerator(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-xl hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105 disabled:opacity-50"
            disabled={isLoading}
          >
            <Wand2 size={18} />
            Generate Image (AI)
          </button>
          <button
            onClick={handleRemoveBackground}
            className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:to-pink-600 flex items-center gap-2 justify-center transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105 disabled:opacity-50"
            disabled={isLoading}
          >
            <Scissors size={18} />
            Remove Background
          </button>
        </div>

        {/* Color Palette */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Color Palette</h3>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color, index) => (
              <button
                key={index}
                onClick={() => handleColorSelect(color)}
                className="w-10 h-10 rounded-xl border-2 border-gray-600 hover:border-neon-cyan transition-all duration-300 shadow-card hover:shadow-neon-sm transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Font Selector */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Font</h3>
          <select
            onChange={(e) => handleFontSelect(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300 shadow-card"
            defaultValue="Arial"
          >
            {fonts.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Layer List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase flex items-center gap-2">
            <Layers size={16} className="text-neon-cyan" />
            Layers
          </h3>
          <LayerList />
        </div>
      </div>

      {/* Text-to-Image Generator Modal */}
      {showImageGenerator && (
        <ImageGeneratorModal
          prompt={imagePrompt}
          setPrompt={setImagePrompt}
          size={imageSize}
          setSize={setImageSize}
          quality={imageQuality}
          setQuality={setImageQuality}
          style={imageStyle}
          setStyle={setImageStyle}
          onClose={() => setShowImageGenerator(false)}
          canvas={canvas}
        />
      )}
    </div>
  )
}

// Image Generator Modal Component
const ImageGeneratorModal = ({ prompt, setPrompt, size, setSize, quality, setQuality, style, setStyle, onClose, canvas }) => {
  const { setLoading, isLoading } = useStore()
  const [error, setError] = React.useState('')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    if (!canvas) {
      setError('Canvas not initialized')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await api.generateImage(prompt.trim(), size, quality, style)
      
      // Check if request failed (success: false or no success field but has error)
      if (result.success === false || (result.error && !result.success)) {
        const errorData = result
        const errorMessage = errorData.error || errorData.details || 'Failed to generate image'
        
        // Special handling for billing errors
        if (errorData.code === 'billing_hard_limit_reached' || errorMessage.toLowerCase().includes('billing')) {
          setError(`${errorMessage}\n\nVisit https://platform.openai.com/account/billing to update your billing settings.`)
        } else {
          setError(errorMessage)
        }
        return // Don't proceed with adding image to canvas
      }
      
      // Check if we have a valid image URL
      if (result.success && result.url) {
        // Add generated image to canvas
        fabric.Image.fromURL(result.url, (img) => {
          if (!img || !canvas) {
            setError('Failed to load generated image')
            return
          }
          
          // Scale to fit canvas while maintaining aspect ratio
          const maxWidth = 400
          const maxHeight = 400
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
          
          img.scale(scale)
          
          // Position in safe zone
          const topUnsafeHeight = 200
          const bottomUnsafeHeight = 250
          const safeTop = topUnsafeHeight
          const safeBottom = canvas.height - bottomUnsafeHeight
          const safeCenter = safeTop + (safeBottom - safeTop) / 2
          
          img.set({
            left: canvas.width / 2 - (img.width * scale) / 2,
            top: safeCenter - (img.height * scale) / 2,
            hasControls: true,
            hasBorders: true,
            lockRotation: false,
            lockScalingX: false,
            lockScalingY: false,
            lockUniScaling: false,
          })
          
          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.renderAll()
          
          // Close modal after successful generation
          onClose()
          setPrompt('') // Clear prompt
        }, { crossOrigin: 'anonymous' })
      } else {
        setError(result.error || result.details || 'Failed to generate image')
      }
    } catch (err) {
      // Extract error data from Axios error response
      const errorData = err.response?.data || {}
      const statusCode = err.response?.status
      
      // Log full error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Image generation error:', {
          status: statusCode,
          error: errorData.error,
          details: errorData.details,
          code: errorData.code,
          fullError: err
        })
      }
      
      // Build error message from various possible locations
      let errorMessage = errorData.error || 
                        errorData.details || 
                        errorData.message ||
                        err.message ||
                        'Failed to generate image. Please try again.'
      
      // Special handling for billing errors (402 Payment Required)
      if (statusCode === 402 || 
          errorData.code === 'billing_hard_limit_reached' || 
          errorMessage.toLowerCase().includes('billing') ||
          errorMessage.toLowerCase().includes('payment required')) {
        const billingMessage = errorData.details || errorData.error || errorMessage
        setError(`${billingMessage}\n\nVisit https://platform.openai.com/account/billing to update your billing settings.`)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-neon-purple/30 shadow-neon-lg animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
            Generate Image with AI
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm whitespace-pre-line">
            {error}
            {(error.toLowerCase().includes('billing') || error.toLowerCase().includes('payment required')) && (
              <a 
                href="https://platform.openai.com/account/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block mt-2 text-neon-cyan hover:text-neon-purple underline font-medium"
              >
                Open Billing Settings →
              </a>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Describe the image you want to generate
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A modern product packshot with vibrant colors, professional lighting..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300 resize-none"
              rows={4}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Be descriptive for better results. DALL-E 3 will automatically enhance your prompt.
            </p>
          </div>

          {/* Size Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Image Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
              disabled={isLoading}
            >
              <option value="1024x1024">Square (1024×1024)</option>
              <option value="1792x1024">Landscape (1792×1024)</option>
              <option value="1024x1792">Portrait (1024×1792)</option>
            </select>
          </div>

          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
              disabled={isLoading}
            >
              <option value="standard">Standard</option>
              <option value="hd">HD (Higher quality, slower)</option>
            </select>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-neon-purple/30 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
              disabled={isLoading}
            >
              <option value="vivid">Vivid (More dramatic, hyper-real)</option>
              <option value="natural">Natural (More natural, less hyper-real)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-gray-200 rounded-xl transition-all duration-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-xl hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 flex items-center justify-center gap-2 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const LayerList = () => {
  const { canvas, selectedObject, setSelectedObject } = useStore()
  const [objects, setObjects] = React.useState([])

  React.useEffect(() => {
    if (!canvas) return

    const updateObjects = () => {
      const objs = canvas.getObjects().filter(
        obj => obj.name !== 'safeZone' && 
               obj.name !== 'unsafeZoneTop' && 
               obj.name !== 'unsafeZoneBottom'
      )
      setObjects([...objs])
    }

    updateObjects()

    canvas.on('object:added', updateObjects)
    canvas.on('object:removed', updateObjects)
    canvas.on('object:modified', updateObjects)

    return () => {
      canvas.off('object:added', updateObjects)
      canvas.off('object:removed', updateObjects)
      canvas.off('object:modified', updateObjects)
    }
  }, [canvas])

  if (!canvas) {
    return (
      <div className="text-sm text-gray-400 p-2">
        No layers yet
      </div>
    )
  }

  if (objects.length === 0) {
    return (
      <div className="text-sm text-gray-400 p-2">
        No layers yet
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {objects.map((obj, index) => (
        <div
          key={obj.name || `obj-${index}`}
          onClick={() => {
            canvas.setActiveObject(obj)
            canvas.renderAll()
            setSelectedObject(obj)
          }}
          className={`p-2 rounded-xl cursor-pointer text-sm flex items-center justify-between transition-all duration-300 ${
            selectedObject === obj
              ? 'bg-gradient-to-r from-neon-purple/30 to-neon-cyan/30 border-2 border-neon-cyan shadow-neon-sm text-gray-100'
              : 'bg-slate-700/30 hover:bg-slate-700/50 border-2 border-transparent hover:border-neon-purple/30 text-gray-300'
          }`}
        >
          <span className="truncate">
            {obj.type === 'textbox' ? `Text: ${obj.text?.substring(0, 20)}` : 
             obj.type === 'image' ? 'Image' :
             obj.type === 'rect' ? 'Rectangle' :
             obj.type === 'circle' ? 'Circle' :
             obj.type === 'triangle' ? 'Triangle' :
             obj.type || 'Object'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              canvas.remove(obj)
              canvas.renderAll()
              if (selectedObject === obj) {
                setSelectedObject(null)
              }
            }}
            className="text-red-400 hover:text-red-300 ml-2 transition-colors duration-200"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export default LeftSidebar

