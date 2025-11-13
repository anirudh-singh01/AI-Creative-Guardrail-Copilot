import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import OpenAI from 'openai'
import sharp from 'sharp'
import dotenv from 'dotenv'
import { checkCompliance, applyAutoFix } from './complianceChecker.js'
import { getRetailRules } from './retailRules.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '../assets')
const uploadsDir = path.join(assetsDir, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

// File filter to only accept JPG and PNG
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png']
  const allowedExtensions = ['.jpg', '.jpeg', '.png']
  const fileExt = path.extname(file.originalname).toLowerCase()
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPG and PNG images are allowed'), false)
  }
}

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
})

// Serve uploaded files
app.use('/assets', express.static(assetsDir))

// Upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file type. Only JPG and PNG are allowed.' })
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedMimes.includes(req.file.mimetype)) {
      // Delete the uploaded file if it's not the right type
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG images are allowed.' })
    }

    const fileUrl = `/assets/uploads/${req.file.filename}`
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      type: req.body.type || 'image',
      mimetype: req.file.mimetype,
    })
  } catch (error) {
    console.error('Upload error:', error)
    // Clean up file if error occurred
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError)
      }
    }
    res.status(500).json({ error: 'Upload failed', details: error.message })
  }
})

// Background removal endpoint - POST /api/remove-bg
app.post('/api/remove-bg', async (req, res) => {
  try {
    const { imageDataUrl } = req.body

    if (!imageDataUrl) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Extract base64 data from data URL
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // For prototype/mock: Use Sharp to create a simple transparency effect
    // In production, replace this with actual AI background removal:
    // - OpenAI Vision API with image segmentation
    // - remove.bg API
    // - Custom ML model
    
    let processedImage
    
    try {
      // Mock implementation: For prototype, we'll return the image with alpha channel
      // This simulates background removal - in production, replace with actual AI model
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata()
      
      // Process image: ensure PNG format with alpha channel
      // In a real implementation, you would:
      // 1. Send to AI model (OpenAI, remove.bg API, etc.)
      // 2. Get processed image with transparent background
      // 3. Return the processed PNG
      
      processedImage = await sharp(imageBuffer)
        .ensureAlpha() // Add alpha channel if missing
        .png({ 
          quality: 100,
          compressionLevel: 6,
          adaptiveFiltering: true
        })
        .toBuffer()
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // TODO: Replace with actual AI background removal
      // Example integration options:
      //
      // Option 1: OpenAI Vision API (when available)
      // const response = await openai.chat.completions.create({
      //   model: "gpt-4-vision-preview",
      //   messages: [{
      //     role: "user",
      //     content: [
      //       { type: "text", text: "Remove the background from this image, return PNG with transparency" },
      //       { type: "image_url", image_url: { url: imageDataUrl } }
      //     ]
      //   }]
      // })
      //
      // Option 2: remove.bg API
      // const FormData = require('form-data')
      // const form = new FormData()
      // form.append('image_file', imageBuffer)
      // const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      //   method: 'POST',
      //   headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
      //   body: form
      // })
      // processedImage = await response.buffer()
      //
      // Option 3: Custom ML model endpoint
      // const response = await fetch('https://your-ml-model-endpoint.com/remove-bg', {
      //   method: 'POST',
      //   body: imageBuffer
      // })
      // processedImage = await response.buffer()
      
    } catch (processingError) {
      console.error('Image processing error:', processingError)
      // Fallback: return original image with alpha channel
      processedImage = await sharp(imageBuffer)
        .ensureAlpha()
        .png()
        .toBuffer()
    }

    // Return PNG with transparent background
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', 'attachment; filename=removed-bg.png')
    res.send(processedImage)
  } catch (error) {
    console.error('Background removal error:', error)
    res.status(500).json({ error: 'Background removal failed', details: error.message })
  }
})

// Compliance checker endpoint
app.post('/api/check-compliance', async (req, res) => {
  try {
    const { canvasData, retailer } = req.body

    if (!canvasData) {
      return res.status(400).json({ error: 'No canvas data provided' })
    }

    // Load rules dynamically based on retailer
    const rules = retailer ? getRetailRules(retailer) : getRetailRules()
    
    // Use compliance checker module to check all rules
    const violations = checkCompliance(canvasData, rules)

    // Format violations to match expected structure
    const issues = violations.map(violation => ({
      id: violation.id,
      message: violation.message,
      fix: violation.fix,
      severity: violation.severity || 'medium',
      objectIndex: violation.objectIndex,
    }))

    res.json({
      success: true,
      issues: issues,
      violations: violations, // Include full violation data
      rules: {
        minFontSize: rules.minFontSize,
        unsafeTop: rules.unsafeTop,
        unsafeBottom: rules.unsafeBottom,
        requiredDisclaimer: rules.requiredDisclaimer,
        allowedTags: rules.allowedTagPhrases
      }
    })
  } catch (error) {
    console.error('Compliance check error:', error)
    res.status(500).json({ error: 'Compliance check failed', details: error.message })
  }
})

// Fix copy endpoint - POST /api/fix-copy
app.post('/api/fix-copy', async (req, res) => {
  try {
    const { headline, subhead, retailRulePack } = req.body

    if (!headline && !subhead) {
      return res.status(400).json({ error: 'Headline or subhead is required' })
    }

    // Check if OpenAI is configured
    const hasOpenAI = openai && 
                      process.env.OPENAI_API_KEY && 
                      process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' &&
                      process.env.OPENAI_API_KEY !== 'your-api-key-here'

    if (!hasOpenAI) {
      // Fallback: return sanitized version without LLM
      const text = headline || subhead || ''
      const sanitized = text
        .replace(/\b(best|cheapest|lowest price|guaranteed|always|never|100%|free|no risk|proven|miracle|instant|secret)\b/gi, '')
        .trim()
      
      return res.json({
        success: true,
        correctedHeadline: headline ? sanitized : null,
        correctedSubhead: subhead ? sanitized : null,
        message: 'Copy fixed (fallback mode - LLM not configured)'
      })
    }

    // Use provided rule pack or default
    const rules = retailRulePack || getRetailRules()

    // Build the text to fix
    const textToFix = [headline, subhead].filter(Boolean).join('\n')

    // Create comprehensive prompt for LLM
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

Return ONLY the corrected copy, maintaining the same structure (headline and subhead if both provided). Do not include explanations or notes.`

    const userPrompt = `Rewrite this text to be compliant with retailer rules, avoid claims, avoid misleading language, and enforce allowed terms:

${textToFix}

Return the corrected copy:`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })

      const correctedText = completion.choices[0]?.message?.content?.trim() || textToFix

      // Parse corrected text back into headline/subhead if both were provided
      let correctedHeadline = headline
      let correctedSubhead = subhead

      if (headline && subhead) {
        // Try to split by newline or common separators
        const lines = correctedText.split(/\n+/).map(line => line.trim()).filter(Boolean)
        if (lines.length >= 2) {
          correctedHeadline = lines[0]
          correctedSubhead = lines.slice(1).join(' ')
        } else {
          // If LLM returned single line, use it for headline
          correctedHeadline = correctedText
        }
      } else if (headline) {
        correctedHeadline = correctedText
      } else if (subhead) {
        correctedSubhead = correctedText
      }

      res.json({
        success: true,
        correctedHeadline: correctedHeadline,
        correctedSubhead: correctedSubhead,
        originalHeadline: headline,
        originalSubhead: subhead,
        message: 'Copy fixed successfully'
      })
    } catch (llmError) {
      console.error('LLM copy fix error:', llmError)
      
      // Fallback: basic sanitization
      const sanitizeText = (text) => {
        if (!text) return text
        const prohibited = rules.prohibitedClaims?.concat(rules.prohibitedWords || []) || []
        let sanitized = text
        prohibited.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi')
          sanitized = sanitized.replace(regex, '')
        })
        return sanitized.replace(/\s+/g, ' ').trim()
      }

      res.json({
        success: true,
        correctedHeadline: headline ? sanitizeText(headline) : null,
        correctedSubhead: subhead ? sanitizeText(subhead) : null,
        originalHeadline: headline,
        originalSubhead: subhead,
        message: 'Copy fixed (fallback mode)',
        warning: 'LLM processing failed, used basic sanitization'
      })
    }
  } catch (error) {
    console.error('Fix copy error:', error)
    res.status(500).json({ error: 'Fix copy failed', details: error.message })
  }
})

// Auto-fix endpoint
app.post('/api/auto-fix', async (req, res) => {
  try {
    const { canvasData, issues, retailer } = req.body

    if (!canvasData) {
      return res.status(400).json({ error: 'No canvas data provided' })
    }

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'No issues provided for auto-fix' })
    }

    // Load rules dynamically based on retailer
    const rules = retailer ? getRetailRules(retailer) : getRetailRules()

    // Use compliance checker module to apply fixes with OpenAI client for LLM fixes
    // Check if OpenAI API key is properly configured
    const hasOpenAI = openai && 
                      process.env.OPENAI_API_KEY && 
                      process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' &&
                      process.env.OPENAI_API_KEY !== 'your-api-key-here'
    
    const fixedCanvasData = await applyAutoFix(canvasData, issues, {
      openai: hasOpenAI ? openai : null,
      rules: rules
    })

    res.json({
      success: true,
      fixedCanvasData: fixedCanvasData,
      message: `Auto-fix applied to ${issues.length} violation(s)`,
      fixedIssues: issues.map(issue => issue.id),
    })
  } catch (error) {
    console.error('Auto-fix error:', error)
    res.status(500).json({ error: 'Auto-fix failed', details: error.message })
  }
})

// Export endpoint with format and size optimization
app.post('/api/export', async (req, res) => {
  try {
    const { imageDataUrl, format, fileType = 'jpg' } = req.body

    if (!imageDataUrl) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Convert data URL to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Process image with sharp
    let processedImage = sharp(imageBuffer)

    // Resize if needed based on format
    const baseSize = 2000
    const dimensions = {
      '1:1': { width: baseSize, height: baseSize },
      '9:16': { width: Math.round(baseSize * 9 / 16), height: baseSize },
      '16:9': { width: baseSize, height: Math.round(baseSize * 9 / 16) },
    }

    const { width, height } = dimensions[format] || dimensions['1:1']
    processedImage = processedImage.resize(width, height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })

    // Optimize to under 500KB
    let optimizedBuffer
    let quality = 90

    if (fileType === 'png') {
      optimizedBuffer = await processedImage.png({ quality }).toBuffer()
      while (optimizedBuffer.length > 500 * 1024 && quality > 20) {
        quality -= 5
        optimizedBuffer = await processedImage.png({ quality }).toBuffer()
      }
    } else {
      optimizedBuffer = await processedImage.jpeg({ quality }).toBuffer()
      while (optimizedBuffer.length > 500 * 1024 && quality > 20) {
        quality -= 5
        optimizedBuffer = await processedImage.jpeg({ quality }).toBuffer()
      }
    }

    const contentType = fileType === 'png' ? 'image/png' : 'image/jpeg'
    const extension = fileType === 'png' ? 'png' : 'jpg'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename=export-${format}.${extension}`)
    res.setHeader('Content-Length', optimizedBuffer.length)
    res.send(optimizedBuffer)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Export failed', details: error.message })
  }
})

// Text-to-image generation endpoint using DALL-E
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = req.body

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Check if OpenAI is configured
    const hasOpenAI = openai && 
                      process.env.OPENAI_API_KEY && 
                      process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' &&
                      process.env.OPENAI_API_KEY !== 'your-api-key-here'

    if (!hasOpenAI) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure your OpenAI API key in backend/.env file'
      })
    }

    // Validate size (DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792)
    const validSizes = ['1024x1024', '1792x1024', '1024x1792']
    const imageSize = validSizes.includes(size) ? size : '1024x1024'

    // Validate quality (standard or hd)
    const imageQuality = quality === 'hd' ? 'hd' : 'standard'

    // Validate style (vivid or natural)
    const imageStyle = style === 'natural' ? 'natural' : 'vivid'

    try {
      // Generate image using DALL-E 3
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt.trim(),
        size: imageSize,
        quality: imageQuality,
        style: imageStyle,
        n: 1, // DALL-E 3 only supports n=1
      })

      const imageUrl = response.data[0]?.url

      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI')
      }

      // Download the image and save it locally
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error('Failed to download generated image')
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      
      // Generate unique filename
      const timestamp = Date.now()
      const filename = `generated-${timestamp}.png`
      const filepath = path.join(uploadsDir, filename)

      // Save image using Sharp (ensures proper format)
      await sharp(imageBuffer)
        .png({ quality: 100 })
        .toFile(filepath)

      const fileUrl = `/assets/uploads/${filename}`

      res.json({
        success: true,
        url: fileUrl,
        imageUrl: imageUrl, // Original OpenAI URL
        filename: filename,
        prompt: prompt,
        size: imageSize,
        quality: imageQuality,
        style: imageStyle,
      })
    } catch (openaiError) {
      // Extract error code from various possible locations in OpenAI error structure
      const errorCode = openaiError.code || 
                       openaiError.error?.code || 
                       openaiError.error?.type ||
                       (openaiError.message?.toLowerCase().includes('billing') ? 'billing_hard_limit_reached' : null)
      
      // Check for billing limit error first (can be status 400 with specific error code)
      if (errorCode === 'billing_hard_limit_reached' || 
          openaiError.message?.toLowerCase().includes('billing hard limit')) {
        console.error('OpenAI DALL-E billing error:', openaiError.message)
        return res.status(402).json({ 
          success: false,
          error: 'Billing limit reached',
          details: 'Your OpenAI account has reached its billing hard limit. Please add payment method or increase your spending limit at https://platform.openai.com/account/billing',
          code: 'billing_hard_limit_reached'
        })
      }
      
      console.error('OpenAI DALL-E error:', openaiError)
      
      // Handle specific OpenAI errors
      if (openaiError.status === 400) {
        // Check if it's a content policy violation
        if (errorCode === 'content_policy_violation' || 
            openaiError.error?.type === 'content_policy_violation') {
          return res.status(400).json({ 
            success: false,
            error: 'Content policy violation',
            details: 'The prompt may contain content that violates OpenAI\'s usage policies. Please try a different prompt.'
          })
        }
        return res.status(400).json({ 
          success: false,
          error: 'Invalid prompt or request',
          details: openaiError.message || 'The request could not be processed. Please check your prompt and try again.'
        })
      } else if (openaiError.status === 429) {
        return res.status(429).json({ 
          success: false,
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again later.'
        })
      } else if (openaiError.status === 401) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid API key',
          details: 'Please check your OpenAI API key in backend/.env'
        })
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Image generation failed', 
        details: openaiError.message || 'Unknown error occurred'
      })
    }
  } catch (error) {
    console.error('Generate image error:', error)
    res.status(500).json({ error: 'Image generation failed', details: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Creative Guardrail Copilot API' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📁 Assets directory: ${assetsDir}`)
})

