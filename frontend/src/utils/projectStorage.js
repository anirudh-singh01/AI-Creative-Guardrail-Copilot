import { fabric } from 'fabric'

/**
 * Project Storage Utility
 * Handles saving and loading projects to/from localStorage
 */

const STORAGE_KEY = 'creative-builder-project'
const STORAGE_VERSION = '1.0'

/**
 * Save project to localStorage
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Object} state - Application state (format, compliance issues, etc.)
 * @returns {Promise<boolean>} Success status
 */
export async function saveProject(canvas, state) {
  try {
    if (!canvas) {
      throw new Error('Canvas is not initialized')
    }

    // Get canvas JSON with all objects
    // Convert images to data URLs for storage
    const processedObjects = await Promise.all(
      canvas.getObjects().map(async (obj) => {
        if (obj.type === 'image') {
          try {
            // Get image as data URL
            const dataUrl = obj.toDataURL({ format: 'png', quality: 1.0 })
            const objData = obj.toObject(['includeDefaultValues'])
            // Replace src with data URL
            if (objData.src) {
              objData.src = dataUrl
            }
            return objData
          } catch (error) {
            console.warn('Failed to convert image to data URL:', error)
            return obj.toObject(['includeDefaultValues'])
          }
        }
        return obj.toObject(['includeDefaultValues'])
      })
    )
    
    // Extract asset paths for reference (backup - only non-data URLs)
    const assetPaths = []
    canvas.getObjects().forEach(obj => {
      if (obj.type === 'image') {
        const src = obj.getSrc() || obj.src || obj._element?.src
        if (src && !src.startsWith('data:')) {
          // Only store external URLs (not data URLs)
          assetPaths.push({
            src: src,
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX || 1,
            scaleY: obj.scaleY || 1,
            angle: obj.angle || 0,
            width: obj.width,
            height: obj.height,
          })
        }
      }
    })

    // Prepare project data
    const projectData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      canvas: {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: canvas.backgroundColor,
        objects: processedObjects,
      },
      assets: assetPaths,
      state: {
        currentFormat: state.currentFormat || '1:1',
        complianceIssues: state.complianceIssues || [],
      },
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData))
    
    return true
  } catch (error) {
    console.error('Failed to save project:', error)
    return false
  }
}

/**
 * Load project from localStorage
 * @returns {Object|null} Project data or null if not found
 */
export function loadProject() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }

    const projectData = JSON.parse(stored)
    
    // Validate version
    if (projectData.version !== STORAGE_VERSION) {
      console.warn('Project version mismatch, may need migration')
    }

    return projectData
  } catch (error) {
    console.error('Failed to load project:', error)
    return null
  }
}

/**
 * Restore canvas from project data
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Object} projectData - Project data from localStorage
 * @returns {Promise<boolean>} Success status
 */
export async function restoreCanvas(canvas, projectData) {
  try {
    if (!canvas || !projectData) {
      throw new Error('Canvas or project data is missing')
    }

    // Clear existing canvas
    canvas.clear()
    canvas.setBackgroundColor(projectData.canvas.backgroundColor || '#ffffff', () => {
      canvas.renderAll()
    })

    // Restore canvas dimensions
    canvas.setDimensions({
      width: projectData.canvas.width || 1080,
      height: projectData.canvas.height || 1080,
    })

    // Restore objects from canvas JSON
    if (projectData.canvas.objects && Array.isArray(projectData.canvas.objects)) {
      // Filter out unsafe zone overlays from saved data
      const validObjects = projectData.canvas.objects.filter(
        obj => obj.name !== 'unsafeZoneTop' && obj.name !== 'unsafeZoneBottom'
      )

      // Load objects from JSON (images are included as data URLs)
      await new Promise((resolve, reject) => {
        canvas.loadFromJSON(
          {
            ...projectData.canvas,
            objects: validObjects,
          },
          () => {
            // Redraw unsafe zones
            redrawUnsafeZones(canvas)
            canvas.renderAll()
            resolve()
          },
          (error) => {
            console.error('Error loading canvas JSON:', error)
            // Fallback: try restoring from asset paths
            restoreImages(canvas, projectData.assets).then(() => {
              redrawUnsafeZones(canvas)
              canvas.renderAll()
              resolve()
            }).catch(reject)
          }
        )
      })
    } else if (projectData.assets && projectData.assets.length > 0) {
      // Fallback: If no objects in JSON, restore images from asset paths
      await restoreImages(canvas, projectData.assets)
      redrawUnsafeZones(canvas)
      canvas.renderAll()
    } else {
      // No objects to restore, just redraw unsafe zones
      redrawUnsafeZones(canvas)
      canvas.renderAll()
    }

    return true
  } catch (error) {
    console.error('Failed to restore canvas:', error)
    return false
  }
}

/**
 * Restore images from asset paths
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} assets - Array of asset path objects
 * @returns {Promise<void>}
 */
async function restoreImages(canvas, assets) {
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return
  }

  const imagePromises = assets.map(asset => {
    return new Promise((resolve, reject) => {
      if (!asset || !asset.src) {
        resolve() // Skip invalid assets
        return
      }
      
      // Check if src is a data URL or URL
      if (asset.src.startsWith('data:') || asset.src.startsWith('http')) {
        fabric.Image.fromURL(asset.src, (img) => {
          if (img && canvas) {
            img.set({
              left: asset.left || 0,
              top: asset.top || 0,
              scaleX: asset.scaleX || 1,
              scaleY: asset.scaleY || 1,
              angle: asset.angle || 0,
            })
            canvas.add(img)
            resolve()
          } else {
            reject(new Error('Failed to load image'))
          }
        }, { crossOrigin: 'anonymous' })
      } else {
        // Try to load from relative path
        fabric.Image.fromURL(asset.src, (img) => {
          if (img && canvas) {
            img.set({
              left: asset.left || 0,
              top: asset.top || 0,
              scaleX: asset.scaleX || 1,
              scaleY: asset.scaleY || 1,
              angle: asset.angle || 0,
            })
            canvas.add(img)
            resolve()
          } else {
            console.warn('Could not restore image:', asset.src)
            resolve() // Continue even if one image fails
          }
        }, { crossOrigin: 'anonymous' })
      }
    })
  })

  await Promise.allSettled(imagePromises)
}

/**
 * Redraw unsafe zone overlays
 * @param {Object} canvas - Fabric.js canvas instance
 */
function redrawUnsafeZones(canvas) {
  const topUnsafeHeight = 200
  const bottomUnsafeHeight = 250
  const width = canvas.width
  const height = canvas.height

  // Remove existing overlays
  const existingOverlays = canvas.getObjects().filter(
    obj => obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom'
  )
  existingOverlays.forEach(overlay => canvas.remove(overlay))

  // Top unsafe zone
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

  // Bottom unsafe zone
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
}

/**
 * Check if a saved project exists
 * @returns {boolean}
 */
export function hasSavedProject() {
  return localStorage.getItem(STORAGE_KEY) !== null
}

/**
 * Delete saved project
 */
export function deleteProject() {
  localStorage.removeItem(STORAGE_KEY)
}

