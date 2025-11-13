import imageCompression from 'browser-image-compression'
import { fabric } from 'fabric'

/**
 * Export creative with compression
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {string} format - Format: '1:1', '9:16', or '16:9'
 * @param {string} fileType - 'jpg' or 'png'
 * @returns {Promise<string>} Download URL
 */
export async function exportCreative(canvas, format, fileType = 'jpg') {
  if (!canvas) {
    throw new Error('Canvas is not initialized')
  }

  // Validate file type
  if (fileType !== 'jpg' && fileType !== 'png') {
    throw new Error('File type must be "jpg" or "png"')
  }

  // Calculate target dimensions based on format
  const currentWidth = canvas.width
  const currentHeight = canvas.height
  const baseSize = Math.max(currentWidth, currentHeight)
  
  const dimensions = {
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
  }

  const { width, height } = dimensions[format] || dimensions['1:1']

  // Store original canvas state
  const originalWidth = canvas.width
  const originalHeight = canvas.height
  const originalObjects = canvas.getObjects()

  try {
    // Temporarily resize canvas for export
    canvas.setDimensions({ width, height })
    canvas.renderAll()

    // Remove unsafe zone overlays before export
    const overlays = canvas.getObjects().filter(
      obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
    )
    overlays.forEach(overlay => canvas.remove(overlay))

    // Convert canvas to blob
    const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg'
    const dataUrl = canvas.toDataURL({
      format: fileType === 'png' ? 'png' : 'jpeg',
      quality: 1.0, // Start with high quality
      multiplier: 1,
    })

    // Convert data URL to blob
    const blob = await dataURLToBlob(dataUrl)

    // Compress image to target < 500KB
    const maxSizeMB = 0.5 // 500KB
    const maxWidthOrHeight = Math.max(width, height)
    
    // Initial compression options
    let compressionOptions = {
      maxSizeMB: maxSizeMB,
      maxWidthOrHeight: maxWidthOrHeight,
      useWebWorker: true,
      fileType: mimeType,
    }

    // Set initial quality based on file type
    if (fileType === 'png') {
      // PNG compression - use lower initial quality
      compressionOptions.initialQuality = 0.7
    } else {
      // JPG compression - start with higher quality
      compressionOptions.initialQuality = 0.8
    }

    let compressedBlob = await imageCompression(blob, compressionOptions)

    // If still too large, reduce quality iteratively
    if (compressedBlob.size > 500 * 1024) {
      let quality = compressionOptions.initialQuality
      let attempts = 0
      const maxAttempts = 15

      while (compressedBlob.size > 500 * 1024 && attempts < maxAttempts && quality > 0.1) {
        quality = Math.max(0.1, quality - 0.05)
        attempts++

        const newOptions = {
          ...compressionOptions,
          initialQuality: quality,
        }

        compressedBlob = await imageCompression(blob, newOptions)
      }
    }

    // If still too large, resize the image progressively using compression library
    if (compressedBlob.size > 500 * 1024) {
      let resizeFactor = 0.95
      let resizeAttempts = 0
      const maxResizeAttempts = 10

      while (compressedBlob.size > 500 * 1024 && resizeAttempts < maxResizeAttempts && resizeFactor > 0.5) {
        const newMaxDimension = Math.round(maxWidthOrHeight * resizeFactor)
        
        const resizeOptions = {
          maxSizeMB: maxSizeMB,
          maxWidthOrHeight: newMaxDimension,
          useWebWorker: true,
          fileType: mimeType,
          initialQuality: 0.6,
        }
        
        // Re-compress the original blob with smaller dimensions
        compressedBlob = await imageCompression(blob, resizeOptions)
        
        resizeFactor -= 0.05
        resizeAttempts++
      }
    }

    // Verify final size
    if (compressedBlob.size > 500 * 1024) {
      console.warn(`Warning: Compressed file is ${(compressedBlob.size / 1024).toFixed(2)} KB, target was < 500 KB`)
    }

    // Create download URL
    const downloadUrl = URL.createObjectURL(compressedBlob)

    return downloadUrl
  } finally {
    // Restore original canvas state
    canvas.setDimensions({ width: originalWidth, height: originalHeight })
    
    // Restore unsafe zone overlays
    const hasOverlays = canvas.getObjects().some(
      obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
    )
    
    if (!hasOverlays) {
      const topUnsafeHeight = 200
      const bottomUnsafeHeight = 250
      
      const topUnsafeZone = new fabric.Rect({
        left: 0,
        top: 0,
        width: originalWidth,
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
      
      const bottomUnsafeZone = new fabric.Rect({
        left: 0,
        top: originalHeight - bottomUnsafeHeight,
        width: originalWidth,
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
    }
    
    canvas.renderAll()
  }
}

/**
 * Convert data URL to blob
 * @param {string} dataURL - Data URL string
 * @returns {Promise<Blob>} Blob object
 */
function dataURLToBlob(dataURL) {
  return new Promise((resolve, reject) => {
    try {
      if (!dataURL || typeof dataURL !== 'string') {
        reject(new Error('Invalid data URL'))
        return
      }
      
      const arr = dataURL.split(',')
      if (arr.length < 2) {
        reject(new Error('Invalid data URL format'))
        return
      }
      
      const mimeMatch = arr[0].match(/:(.*?);/)
      if (!mimeMatch) {
        reject(new Error('Invalid MIME type in data URL'))
        return
      }
      
      const mime = mimeMatch[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      
      resolve(new Blob([u8arr], { type: mime }))
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Download file from URL
 * @param {string} url - Download URL
 * @param {string} filename - Filename for download
 */
export function downloadFile(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // Revoke URL after a delay to allow download to start
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 100)
}

