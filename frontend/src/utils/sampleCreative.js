import { fabric } from 'fabric'

/**
 * Create a sample creative with pre-loaded violations for testing auto-fix
 * @param {Object} canvas - Fabric.js canvas instance
 * @returns {Promise<void>}
 */
export async function loadSampleCreative(canvas) {
  if (!canvas) {
    throw new Error('Canvas is not initialized')
  }

  // Clear existing canvas
  canvas.clear()
  
  const width = canvas.width
  const height = canvas.height
  const topUnsafeHeight = 200
  const bottomUnsafeHeight = 250

  // Set background color (light blue gradient effect)
  canvas.setBackgroundColor('#E3F2FD', () => {
    canvas.renderAll()
  })

  // 1. BACKGROUND - Create a gradient-like background rectangle
  const backgroundRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: width,
    height: height,
    fill: '#BBDEFB',
    selectable: false,
    evented: false,
    name: 'background',
  })
  canvas.add(backgroundRect)
  canvas.sendToBack(backgroundRect)

  // 2. PACKSHOT - Create a placeholder packshot image using a rectangle with text
  const packshotSize = 300
  const packshotRect = new fabric.Rect({
    left: width / 2 - packshotSize / 2,
    top: height / 2 - packshotSize / 2 - 50,
    width: packshotSize,
    height: packshotSize,
    fill: '#FFFFFF',
    stroke: '#1976D2',
    strokeWidth: 3,
    rx: 10,
    ry: 10,
    name: 'packshot',
  })
  canvas.add(packshotRect)

  // Add packshot label
  const packshotLabel = new fabric.Text('PRODUCT', {
    left: width / 2,
    top: height / 2 - 50,
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#1976D2',
    fontWeight: 'bold',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    name: 'packshotLabel',
  })
  canvas.add(packshotLabel)

  // 3. HEADLINE - VIOLATION: Text in unsafe top zone + small font
  const headline = new fabric.Textbox('BEST PRICE GUARANTEED!', {
    left: width / 2,
    top: 100, // VIOLATION: In unsafe top zone (< 200px)
    width: width - 100,
    fontSize: 16, // VIOLATION: Font size < 20px
    fontFamily: 'Arial',
    fill: '#FF6B6B', // Light red - VIOLATION: Low contrast on light background
    fontWeight: 'bold',
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    name: 'headline',
  })
  canvas.add(headline)

  // 4. SUBHEADLINE - VIOLATION: Small font + prohibited claim
  const subheadline = new fabric.Textbox('Cheapest Deal Available Now', {
    left: width / 2,
    top: 150, // VIOLATION: In unsafe top zone
    width: width - 100,
    fontSize: 14, // VIOLATION: Font size < 20px
    fontFamily: 'Arial',
    fill: '#FF6B6B', // VIOLATION: Low contrast
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    name: 'subheadline',
  })
  canvas.add(subheadline)

  // 5. VALUE TILE - Create a value proposition tile
  const valueTile = new fabric.Rect({
    left: width / 2 - 150,
    top: height - 400,
    width: 300,
    height: 120,
    fill: '#4CAF50',
    stroke: '#2E7D32',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    name: 'valueTile',
  })
  canvas.add(valueTile)

  // Value tile text - VIOLATION: Small font
  const valueText = new fabric.Textbox('FREE SHIPPING', {
    left: width / 2,
    top: height - 380,
    width: 280,
    fontSize: 18, // VIOLATION: Font size < 20px
    fontFamily: 'Arial',
    fill: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    name: 'valueText',
  })
  canvas.add(valueText)

  // Value tile subtext
  const valueSubtext = new fabric.Textbox('On orders over £50', {
    left: width / 2,
    top: height - 350,
    width: 280,
    fontSize: 14, // VIOLATION: Font size < 20px
    fontFamily: 'Arial',
    fill: '#FFFFFF',
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    name: 'valueSubtext',
  })
  canvas.add(valueSubtext)

  // 6. TAG TEXT - VIOLATION: Missing required tag text ("Only at Tesco" or "Available at Tesco")
  // Intentionally missing to trigger violation

  // 7. DISCLAIMER - VIOLATION: Missing required disclaimer
  // Intentionally missing to trigger violation

  // 8. BOTTOM TEXT - VIOLATION: Text in unsafe bottom zone
  const bottomText = new fabric.Textbox('Terms and conditions apply', {
    left: width / 2,
    top: height - 200, // VIOLATION: In unsafe bottom zone (> height - 250px)
    width: width - 100,
    fontSize: 12, // VIOLATION: Font size < 20px
    fontFamily: 'Arial',
    fill: '#666666', // VIOLATION: Low contrast
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    name: 'bottomText',
  })
  canvas.add(bottomText)

  // Redraw unsafe zone overlays
  redrawUnsafeZones(canvas)
  
  canvas.renderAll()
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

