/**
 * Compliance Checker Module
 * Checks canvas elements against brand guidelines and compliance rules
 */

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// Calculate relative luminance for contrast calculation
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1 // Default to low contrast if colors invalid
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

// Get background color at text position (simplified - assumes canvas background)
function getBackgroundColor(canvasData, textObject) {
  // For now, return canvas background color or white as default
  // In a more advanced implementation, you could analyze the actual pixel colors
  // Check if backgroundColor is a hex color or RGB
  const bgColor = canvasData.backgroundColor || '#FFFFFF'
  
  // If it's already a hex color, return it
  if (typeof bgColor === 'string' && bgColor.startsWith('#')) {
    return bgColor
  }
  
  // If it's an RGB object, convert to hex
  if (typeof bgColor === 'object' && bgColor.r !== undefined) {
    const r = bgColor.r.toString(16).padStart(2, '0')
    const g = bgColor.g.toString(16).padStart(2, '0')
    const b = bgColor.b.toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  
  return '#FFFFFF' // Default to white
}

/**
 * Main compliance checker function
 * @param {Object} canvasData - Fabric.js canvas JSON data
 * @returns {Array} Array of violation objects
 */
export function checkCompliance(canvasData, rules = null) {
  const violations = []
  
  // Use provided rules or fallback to defaults
  // Rules should be loaded by caller (server.js) before calling this function
  let complianceRules = rules
  if (!complianceRules) {
    // Fallback to defaults if rules not provided
    complianceRules = {
      minFontSize: 20,
      unsafeTop: 200,
      unsafeBottom: 250,
      requiredDisclaimer: 'Selected stores. While stocks last.',
      allowedTagPhrases: ['Only at Tesco', 'Available at Tesco']
    }
  }
  
  const topUnsafeHeight = complianceRules.unsafeTop || 200
  const bottomUnsafeHeight = complianceRules.unsafeBottom || 250
  const canvasHeight = canvasData.height || 1080
  const minFontSize = complianceRules.minFontSize || 20
  const minContrastRatio = 4.5 // WCAG AA standard for normal text
  
  // Required disclaimer text (from rules)
  const requiredDisclaimer = complianceRules.requiredDisclaimer || 'Selected stores. While stocks last.'
  const requiredDisclaimers = [
    requiredDisclaimer.toLowerCase(),
    'terms and conditions',
    'terms & conditions',
    't&cs',
    'see terms',
    'subject to terms'
  ]
  
  // Required TAG texts (from rules)
  const requiredTagTexts = (complianceRules.allowedTagPhrases || ['Only at Tesco', 'Available at Tesco'])
    .map(tag => tag.toLowerCase())
  
  // Prohibited claims and words (from rules or defaults)
  const prohibitedClaims = complianceRules.prohibitedClaims || [
    'best', 'cheapest', 'lowest price', 'guaranteed', 'always', 'never', 
    '100%', 'free', 'no risk', 'proven', 'miracle', 'instant', 'secret'
  ]
  
  const prohibitedWords = complianceRules.prohibitedWords || [
    'free', 'guarantee', 'warranty', 'promise', 'certified', 'official', 
    'approved', 'recommended by doctors', 'clinically proven'
  ]
  
  if (!canvasData.objects || !Array.isArray(canvasData.objects)) {
    return violations
  }
  
  let textIndex = 0
  let tagTextFound = false
  let disclaimerFound = false
  
  canvasData.objects.forEach((obj, index) => {
    // Skip unsafe zone overlays
    if (obj.name === 'unsafeZoneTop' || obj.name === 'unsafeZoneBottom') {
      return
    }
    
    // Check text objects
    if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
      textIndex++
      const text = obj.text || ''
      const fontSize = obj.fontSize || 0
      const scaleX = obj.scaleX || 1
      const scaleY = obj.scaleY || 1
      const actualFontSize = fontSize * Math.max(scaleX, scaleY)
      
      // Calculate text position and bounds
      const textTop = obj.top || 0
      const textHeight = (obj.height || 0) * scaleY
      const textBottom = textTop + textHeight
      
      // Check 1: Text in unsafe top zone (200px)
      if (textTop < topUnsafeHeight) {
        violations.push({
          id: `text_unsafe_top_${textIndex}`,
          message: `Text "${text.substring(0, 30)}..." is in unsafe top zone (<200px)`,
          fix: 'move_text_out_of_unsafe_zone',
          objectIndex: index,
          severity: 'high'
        })
      }
      
      // Check 2: Text in unsafe bottom zone (250px)
      if (textBottom > canvasHeight - bottomUnsafeHeight) {
        violations.push({
          id: `text_unsafe_bottom_${textIndex}`,
          message: `Text "${text.substring(0, 30)}..." is in unsafe bottom zone (>${canvasHeight - bottomUnsafeHeight}px)`,
          fix: 'move_text_out_of_unsafe_zone',
          objectIndex: index,
          severity: 'high'
        })
      }
      
      // Check 3: Font size < 20px
      if (actualFontSize < minFontSize) {
        violations.push({
          id: `font_small_${textIndex}`,
          message: `Font too small (<${minFontSize}px). Current size: ${actualFontSize.toFixed(1)}px`,
          fix: 'increase_font_size',
          objectIndex: index,
          severity: 'medium'
        })
      }
      
      // Check 4: Contrast ratio too low
      const textColor = obj.fill || '#000000'
      
      // Handle text color format (hex, rgb, etc.)
      let textColorHex = textColor
      if (typeof textColor === 'object' && textColor.r !== undefined) {
        const r = Math.round(textColor.r).toString(16).padStart(2, '0')
        const g = Math.round(textColor.g).toString(16).padStart(2, '0')
        const b = Math.round(textColor.b).toString(16).padStart(2, '0')
        textColorHex = `#${r}${g}${b}`
      } else if (!textColor.startsWith('#')) {
        textColorHex = '#000000' // Default to black
      }
      
      const backgroundColor = getBackgroundColor(canvasData, obj)
      const contrastRatio = getContrastRatio(textColorHex, backgroundColor)
      
      if (contrastRatio < minContrastRatio) {
        violations.push({
          id: `contrast_low_${textIndex}`,
          message: `Text contrast too low (${contrastRatio.toFixed(2)}:1). Minimum required: ${minContrastRatio}:1`,
          fix: 'increase_text_contrast',
          objectIndex: index,
          severity: 'high'
        })
      }
      
      // Check 5: Check for disclaimer text
      const textLower = text.toLowerCase()
      const hasDisclaimer = requiredDisclaimers.some(disclaimer => 
        textLower.includes(disclaimer)
      )
      
      if (hasDisclaimer) {
        disclaimerFound = true
      }
      
      // Check 6: TAG text incorrect or missing
      const textLowerForTag = textLower
      const hasTagText = requiredTagTexts.some(tag => 
        textLowerForTag.includes(tag)
      )
      
      if (hasTagText) {
        tagTextFound = true
      } else {
        // Check if text mentions Tesco but doesn't have correct format
        if (textLowerForTag.includes('tesco') && text.length < 50) {
          // Text mentions Tesco but doesn't match required format
          violations.push({
            id: `tag_text_incorrect_${textIndex}`,
            message: `TAG text incorrect. Must contain "Only at Tesco" or "Available at Tesco". Current: "${text.substring(0, 40)}"`,
            fix: 'fix_tag_text',
            objectIndex: index,
            severity: 'high'
          })
        }
      }
      
      // Check 7: Prohibited claims detected
      const hasProhibitedClaim = prohibitedClaims.some(claim => 
        textLower.includes(claim)
      )
      
      if (hasProhibitedClaim) {
        violations.push({
          id: `prohibited_claim_${textIndex}`,
          message: `Text contains prohibited claim. Found: "${prohibitedClaims.find(c => textLower.includes(c))}"`,
          fix: 'fix_claims',
          objectIndex: index,
          severity: 'high'
        })
      }
      
      // Check 8: Unsafe/prohibited words detected
      const hasProhibitedWord = prohibitedWords.some(word => 
        textLower.includes(word)
      )
      
      if (hasProhibitedWord) {
        violations.push({
          id: `unsafe_word_${textIndex}`,
          message: `Text contains unsafe/prohibited word. Found: "${prohibitedWords.find(w => textLower.includes(w))}"`,
          fix: 'fix_unsafe_words',
          objectIndex: index,
          severity: 'medium'
        })
      }
    }
  })
  
  // Check 5: Missing required disclaimer text (check once after all objects)
  if (!disclaimerFound) {
    // Only flag if there's substantial content on the canvas
    const hasSubstantialText = canvasData.objects.some(obj => {
      if (obj.type !== 'textbox' && obj.type !== 'text' && obj.type !== 'i-text') return false
      const text = (obj.text || '').trim()
      return text.length > 20 // Only check if there's substantial text content
    })
    
    if (hasSubstantialText) {
      violations.push({
        id: 'missing_disclaimer',
        message: 'Missing required disclaimer text (e.g., "Terms and Conditions")',
        fix: 'add_disclaimer_text',
        objectIndex: null,
        severity: 'medium'
      })
    }
  }
  
  // Check 6: Missing TAG text
  if (!tagTextFound) {
    violations.push({
      id: 'missing_tag_text',
      message: 'Missing required TAG text. Must contain "Only at Tesco" or "Available at Tesco"',
      fix: 'add_tag_text',
      objectIndex: null,
      severity: 'high'
    })
  }
  
  return violations
}

/**
 * Darken or lighten a hex color
 * @param {string} hex - Hex color string
 * @param {number} percent - Percentage to darken (negative) or lighten (positive)
 * @returns {string} Adjusted hex color
 */
function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  if (isNaN(num)) return hex // Return original if invalid
  
  const r = (num >> 16) & 0xFF
  const g = (num >> 8) & 0xFF
  const b = num & 0xFF
  
  const newR = Math.min(255, Math.max(0, Math.round(r + r * percent)))
  const newG = Math.min(255, Math.max(0, Math.round(g + g * percent)))
  const newB = Math.min(255, Math.max(0, Math.round(b + b * percent)))
  
  return '#' + [newR, newG, newB].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Get luminance of a hex color
 * @param {string} hex - Hex color string
 * @returns {number} Luminance value (0-1)
 */
function getColorLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  return getLuminance(rgb.r, rgb.g, rgb.b)
}

/**
 * Fix text contrast by adjusting color brightness
 * @param {string} textColor - Current text color (hex)
 * @param {string} backgroundColor - Background color (hex)
 * @param {number} targetRatio - Target contrast ratio
 * @returns {string} Adjusted text color
 */
function fixTextContrast(textColor, backgroundColor, targetRatio = 4.5) {
  const bgLuminance = getColorLuminance(backgroundColor)
  const currentRatio = getContrastRatio(textColor, backgroundColor)
  
  if (currentRatio >= targetRatio) {
    return textColor // Already meets requirement
  }
  
  // If background is light, darken text; if dark, lighten text
  if (bgLuminance > 0.5) {
    // Light background - darken text
    let adjustedColor = textColor
    let attempts = 0
    while (getContrastRatio(adjustedColor, backgroundColor) < targetRatio && attempts < 20) {
      adjustedColor = adjustColorBrightness(adjustedColor, -0.1) // Darken by 10%
      attempts++
    }
    // If still not enough contrast, use pure black
    if (getContrastRatio(adjustedColor, backgroundColor) < targetRatio) {
      return '#000000'
    }
    return adjustedColor
  } else {
    // Dark background - lighten text
    let adjustedColor = textColor
    let attempts = 0
    while (getContrastRatio(adjustedColor, backgroundColor) < targetRatio && attempts < 20) {
      adjustedColor = adjustColorBrightness(adjustedColor, 0.1) // Lighten by 10%
      attempts++
    }
    // If still not enough contrast, use pure white
    if (getContrastRatio(adjustedColor, backgroundColor) < targetRatio) {
      return '#FFFFFF'
    }
    return adjustedColor
  }
}

/**
 * Apply auto-fix to canvas based on violations
 * @param {Object} canvasData - Fabric.js canvas JSON data
 * @param {Array} violations - Array of violation objects
 * @param {Object} options - Options including OpenAI client for LLM fixes
 * @returns {Promise<Object>} Fixed canvas data
 */
export async function applyAutoFix(canvasData, violations, options = {}) {
  const fixedData = JSON.parse(JSON.stringify(canvasData)) // Deep clone
  
  // Get rules from options or use defaults
  const rules = options.rules || {
    minFontSize: 20,
    unsafeTop: 200,
    unsafeBottom: 250,
    requiredDisclaimer: 'Selected stores. While stocks last.',
    allowedTagPhrases: ['Only at Tesco', 'Available at Tesco']
  }
  
  const topUnsafeHeight = rules.unsafeTop || 200
  const bottomUnsafeHeight = rules.unsafeBottom || 250
  const canvasHeight = fixedData.height || 1080
  const minFontSize = rules.minFontSize || 20
  const { openai } = options
  
  // Track which fixes have been applied to avoid duplicates
  const appliedFixes = new Set()
  
  // Sort violations by priority: high severity first, then by fix type
  const sortedViolations = [...violations].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1)
  })
  
  // Process violations in order
  for (const violation of sortedViolations) {
    const fixKey = `${violation.fix}_${violation.objectIndex || 'global'}`
    
    // Skip if this fix was already applied
    if (appliedFixes.has(fixKey)) {
      continue
    }
    
    if (!violation.fix) {
      continue
    }
    
    switch (violation.fix) {
      case 'move_text_out_of_unsafe_zone':
        if (violation.objectIndex !== null && violation.objectIndex !== undefined) {
          const obj = fixedData.objects[violation.objectIndex]
          if (obj && (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
            const textTop = obj.top || 0
            const textHeight = (obj.height || 0) * (obj.scaleY || 1)
            const textBottom = textTop + textHeight
            
            // Move to safe zone
            if (textTop < topUnsafeHeight) {
              obj.top = topUnsafeHeight + 10 // Add small margin
            } else if (textBottom > canvasHeight - bottomUnsafeHeight) {
              obj.top = Math.max(topUnsafeHeight + 10, canvasHeight - bottomUnsafeHeight - textHeight - 10)
            }
            appliedFixes.add(fixKey)
          }
        }
        break
        
      case 'increase_font_size':
        if (violation.objectIndex !== null && violation.objectIndex !== undefined) {
          const obj = fixedData.objects[violation.objectIndex]
          if (obj && (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
            const currentSize = (obj.fontSize || 0) * Math.max(obj.scaleX || 1, obj.scaleY || 1)
            if (currentSize < minFontSize) {
              // Calculate new font size to meet minimum
              const scaleFactor = minFontSize / Math.max(currentSize, 1)
              obj.fontSize = Math.max(obj.fontSize || 12, minFontSize)
              // Reset scale to maintain proper sizing
              obj.scaleX = 1
              obj.scaleY = 1
            }
            appliedFixes.add(fixKey)
          }
        }
        break
        
      case 'increase_text_contrast':
        if (violation.objectIndex !== null && violation.objectIndex !== undefined) {
          const obj = fixedData.objects[violation.objectIndex]
          if (obj && (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
            const textColor = obj.fill || '#000000'
            const backgroundColor = getBackgroundColor(fixedData, obj)
            
            // Handle color format
            let textColorHex = textColor
            if (typeof textColor === 'object' && textColor.r !== undefined) {
              const r = Math.round(textColor.r).toString(16).padStart(2, '0')
              const g = Math.round(textColor.g).toString(16).padStart(2, '0')
              const b = Math.round(textColor.b).toString(16).padStart(2, '0')
              textColorHex = `#${r}${g}${b}`
            } else if (!textColor.startsWith('#')) {
              textColorHex = '#000000'
            }
            
            // Fix contrast by adjusting color brightness
            const fixedColor = fixTextContrast(textColorHex, backgroundColor, 4.5)
            obj.fill = fixedColor
            appliedFixes.add(fixKey)
          }
        }
        break
        
      case 'add_disclaimer_text':
        // Check if disclaimer already exists
        const hasDisclaimer = fixedData.objects.some(obj => {
          if (obj.type !== 'textbox' && obj.type !== 'text' && obj.type !== 'i-text') return false
          const text = (obj.text || '').toLowerCase()
          return text.includes('terms') && (text.includes('condition') || text.includes('apply'))
        })
        
        if (!hasDisclaimer) {
          // Get disclaimer from rules
          const disclaimerTextValue = rules?.requiredDisclaimer || 'Selected stores. While stocks last.'
          const disclaimerText = {
            type: 'textbox',
            text: disclaimerTextValue,
            left: 50,
            top: canvasHeight - bottomUnsafeHeight - 30,
            fontSize: 20,
            fill: '#000000',
            fontFamily: 'Arial',
            width: 300,
            height: 20,
            originX: 'left',
            originY: 'top'
          }
          fixedData.objects.push(disclaimerText)
          appliedFixes.add(fixKey)
        }
        break
        
      case 'add_tag_text':
        // Check if tag text already exists
        const hasTagText = fixedData.objects.some(obj => {
          if (obj.type !== 'textbox' && obj.type !== 'text' && obj.type !== 'i-text') return false
          const text = (obj.text || '').toLowerCase()
          const allowedTags = (rules?.allowedTagPhrases || ['Only at Tesco', 'Available at Tesco']).map(t => t.toLowerCase())
          return allowedTags.some(tag => text.includes(tag))
        })
        
        if (!hasTagText) {
          // Get tag text from rules
          const tagTextValue = rules?.allowedTagPhrases?.[0] || 'Only at Tesco'
          const tagText = {
            type: 'textbox',
            text: tagTextValue,
            left: 50,
            top: topUnsafeHeight + 20,
            fontSize: 24,
            fill: '#0066CC',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            width: 200,
            height: 30,
            originX: 'left',
            originY: 'top'
          }
          fixedData.objects.push(tagText)
          appliedFixes.add(fixKey)
        }
        break
        
      case 'fix_tag_text':
      case 'fix_claims':
      case 'fix_unsafe_words':
        // Use /fix-copy endpoint to fix copy issues
        if (violation.objectIndex !== null && violation.objectIndex !== undefined) {
          const obj = fixedData.objects[violation.objectIndex]
          if (obj && (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
            try {
              const currentText = obj.text || ''
              
              // Call fix-copy endpoint (simulated - in production would be HTTP call)
              // For now, use direct LLM call if available
              if (openai) {
                // Import retail rules
                const { getRetailRules } = await import('./retailRules.js')
                const rules = getRetailRules()
                
                const systemPrompt = `You are a copy editor specializing in retail marketing compliance. Your task is to rewrite marketing copy to be compliant with retailer rules.

Key Requirements:
- Avoid claims and superlatives (best, cheapest, guaranteed, etc.)
- Avoid misleading language
- Use only allowed terms and phrases
- Enforce compliance with retailer guidelines
- Maintain the core message while ensuring compliance
- Keep the tone professional and factual
- If tag text is present, ensure it matches retailer-approved phrases

Retailer Rules:
- Allowed Tag Phrases: ${rules.allowedTagPhrases?.join(', ') || 'Only at Tesco, Available at Tesco'}
- Prohibited Claims: ${rules.prohibitedClaims?.join(', ') || 'best, cheapest, guaranteed'}
- Prohibited Words: ${rules.prohibitedWords?.join(', ') || 'free, guarantee, warranty'}
- Tone Guidelines: ${rules.toneGuidelines?.join('; ') || 'Avoid superlatives, use factual language'}
- Compliance Rules: ${rules.complianceRules?.join('; ') || 'No misleading claims, clear pricing'}

Return ONLY the corrected copy. Do not include explanations or notes.`

                const completion = await openai.chat.completions.create({
                  model: 'gpt-4',
                  messages: [
                    {
                      role: 'system',
                      content: systemPrompt
                    },
                    {
                      role: 'user',
                      content: `Rewrite this text to be compliant with retailer rules, avoid claims, avoid misleading language, and enforce allowed terms:\n\n${currentText}\n\nReturn the corrected copy:`
                    }
                  ],
                  temperature: 0.3,
                  max_tokens: 200
                })
                
                const correctedText = completion.choices[0]?.message?.content?.trim()
                if (correctedText && correctedText.length > 0) {
                  obj.text = correctedText
                  appliedFixes.add(fixKey)
                }
              } else {
                // Fallback: basic sanitization
                const { getRetailRules } = await import('./retailRules.js')
                const rules = getRetailRules()
                const prohibited = rules.prohibitedClaims?.concat(rules.prohibitedWords || []) || []
                let sanitized = currentText
                prohibited.forEach(word => {
                  const regex = new RegExp(`\\b${word}\\b`, 'gi')
                  sanitized = sanitized.replace(regex, '')
                })
                obj.text = sanitized.replace(/\s+/g, ' ').trim() || 'Only at Tesco'
                appliedFixes.add(fixKey)
              }
            } catch (llmError) {
              console.error('LLM copy fix failed:', llmError)
              // Fallback to default tag text
              const obj = fixedData.objects[violation.objectIndex]
              if (obj && (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text')) {
                obj.text = 'Only at Tesco'
                appliedFixes.add(fixKey)
              }
            }
          }
        } else if (violation.objectIndex === null || violation.objectIndex === undefined) {
          // Global fix - handled elsewhere
        }
        break
    }
  }
  
  return fixedData
}

