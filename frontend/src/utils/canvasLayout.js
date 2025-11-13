import { fabric } from 'fabric'

/**
 * Canvas Layout Adaptation Utilities
 * Handles resizing and repositioning canvas elements while preserving ratios
 */

/**
 * Adapt canvas layout to new dimensions
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {number} newWidth - New canvas width
 * @param {number} newHeight - New canvas height
 */
export function adaptCanvasLayout(canvas, newWidth, newHeight) {
  if (!canvas) return

  const oldWidth = canvas.width
  const oldHeight = canvas.height
  
  // If dimensions haven't changed, just update overlays
  if (oldWidth === newWidth && oldHeight === newHeight) {
    redrawUnsafeZones(canvas, newWidth, newHeight)
    canvas.renderAll()
    return
  }
  
  // Calculate scaling factors (prevent division by zero)
  const scaleX = oldWidth > 0 ? newWidth / oldWidth : 1
  const scaleY = oldHeight > 0 ? newHeight / oldHeight : 1
  const scale = Math.min(scaleX, scaleY) // Use minimum to preserve aspect ratios
  
  // Get all objects (excluding unsafe zone overlays)
  const objects = canvas.getObjects().filter(
    obj => obj.name !== 'unsafeZoneTop' && obj.name !== 'unsafeZoneBottom'
  )
  
  // Store original positions and scales
  const originalData = objects.map(obj => ({
    obj,
    left: obj.left || 0,
    top: obj.top || 0,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
    width: obj.width || 0,
    height: obj.height || 0,
    angle: obj.angle || 0,
  }))
  
  // Resize canvas
  canvas.setDimensions({ width: newWidth, height: newHeight })
  
  // Reposition and scale all objects
  objects.forEach((obj, index) => {
    const original = originalData[index]
    
    // Calculate center of old canvas
    const oldCenterX = oldWidth / 2
    const oldCenterY = oldHeight / 2
    
    // Calculate center of new canvas
    const newCenterX = newWidth / 2
    const newCenterY = newHeight / 2
    
    // Calculate relative position from old center
    const relativeX = original.left - oldCenterX
    const relativeY = original.top - oldCenterY
    
    // Apply scaling to position (maintain relative position from center)
    const newLeft = newCenterX + relativeX * scale
    const newTop = newCenterY + relativeY * scale
    
    // Calculate new scale while preserving aspect ratio
    const newScaleX = (original.scaleX || 1) * scale
    const newScaleY = (original.scaleY || 1) * scale
    
    // Update object properties
    obj.set({
      left: newLeft,
      top: newTop,
      scaleX: newScaleX,
      scaleY: newScaleY,
    })
    
    // Ensure object stays within bounds (with safe zone consideration)
    const topUnsafeHeight = 200
    const bottomUnsafeHeight = 250
    const objWidth = (original.width || 0) * newScaleX
    const objHeight = (original.height || 0) * newScaleY
    
    // Constrain to safe zones
    if (obj.left < 0) obj.left = 0
    if (obj.top < topUnsafeHeight) obj.top = topUnsafeHeight + 10
    if (obj.left + objWidth > newWidth) obj.left = Math.max(0, newWidth - objWidth)
    if (obj.top + objHeight > newHeight - bottomUnsafeHeight) {
      obj.top = Math.max(topUnsafeHeight + 10, newHeight - bottomUnsafeHeight - objHeight - 10)
    }
  })
  
  // Redraw unsafe zone overlays
  redrawUnsafeZones(canvas, newWidth, newHeight)
  
  // Re-render canvas
  canvas.renderAll()
}

/**
 * Redraw unsafe zone overlays
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function redrawUnsafeZones(canvas, width, height) {
  const topUnsafeHeight = 200
  const bottomUnsafeHeight = 250
  
  // Remove existing unsafe zone overlays
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
}

