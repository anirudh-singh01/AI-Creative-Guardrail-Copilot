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

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

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

    // Use @imgly/background-removal-node for real background removal
    // This runs locally and is free
    console.log('Starting background removal...')
    
    // Dynamic import since it's an ESM module
    const { removeBackground } = await import('@imgly/background-removal-node')
    
    // Convert buffer to Blob as required by the library
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    
    // Process the image
    const processedBlob = await removeBackground(blob, {
      progress: (key, current, total) => {
        console.log(`Downloading model ${key}: ${current} of ${total}`)
      }
    })
    
    // Convert result Blob back to Buffer
    const arrayBuffer = await processedBlob.arrayBuffer()
    const processedBuffer = Buffer.from(arrayBuffer)

    // Return PNG with transparent background
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', 'attachment; filename=removed-bg.png')
    res.send(processedBuffer)
    console.log('Background removal complete')
    
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

    // Check if Groq is configured (free alternative)
    const hasGroq = process.env.GROQ_API_KEY && 
                   process.env.GROQ_API_KEY !== 'your-groq-api-key-here'

    if (!hasOpenAI && !hasGroq) {
      // Fallback: return sanitized version without LLM
      const text = headline || subhead || ''
      const sanitized = text
        .replace(/\b(best|cheapest|lowest price|guaranteed|always|never|100%|free|no risk|proven|miracle|instant|secret)\b/gi, '')
        .trim()
      
      return res.json({
        success: true,
        correctedHeadline: headline ? sanitized : null,
        correctedSubhead: subhead ? sanitized : null,
        message: 'Copy fixed (fallback mode - LLM not configured). Get free Groq API key at https://console.groq.com/keys'
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
      let correctedText
      
      if (hasGroq) {
        // Use Groq API (free, very fast)
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile', // Free model on Groq
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
        })

        if (!groqResponse.ok) {
          throw new Error(`Groq API error: ${groqResponse.statusText}`)
        }

        const groqData = await groqResponse.json()
        correctedText = groqData.choices[0]?.message?.content?.trim() || textToFix
      } else {
        // Use OpenAI GPT-4
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

        correctedText = completion.choices[0]?.message?.content?.trim() || textToFix
      }

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

// Text-to-image generation endpoint using DALL-E or Hugging Face (free)
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

    // Check if Hugging Face is configured (free alternative)
    const hfKey = process.env.HUGGINGFACE_API_KEY
    const hasHuggingFace = hfKey && 
                          hfKey !== 'your-huggingface-api-key-here' &&
                          hfKey.trim().length > 0

    // Check if Replicate is configured (more reliable free alternative)
    const replicateKey = process.env.REPLICATE_API_TOKEN
    const hasReplicate = replicateKey && 
                        replicateKey !== 'your-replicate-api-token-here' &&
                        replicateKey.trim().length > 0

    // Debug logging
    console.log('API Key Check:', {
      hasOpenAI: !!hasOpenAI,
      hasHuggingFace: !!hasHuggingFace,
      hasReplicate: !!hasReplicate,
      hfKeyPresent: !!hfKey,
      hfKeyLength: hfKey ? hfKey.length : 0
    })

    // Use Replicate (most reliable), Hugging Face, or OpenAI
    if (!hasOpenAI && !hasHuggingFace && !hasReplicate) {
      return res.status(400).json({ 
        error: 'No image generation API configured',
        message: 'Please configure one of: OPENAI_API_KEY, HUGGINGFACE_API_KEY, or REPLICATE_API_TOKEN in backend/.env file. Get free Replicate API token at https://replicate.com/account/api-tokens (recommended - most reliable)'
      })
    }

    // Validate size (DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792)
    // Hugging Face Stable Diffusion supports various sizes
    const validSizes = ['1024x1024', '1792x1024', '1024x1792']
    const imageSize = validSizes.includes(size) ? size : '1024x1024'
    
    // Parse dimensions for Hugging Face
    const [width, height] = imageSize.split('x').map(Number)

    // Validate quality (standard or hd)
    const imageQuality = quality === 'hd' ? 'hd' : 'standard'

    // Validate style (vivid or natural)
    const imageStyle = style === 'natural' ? 'natural' : 'vivid'

    let imageBuffer
    let imageUrl = null // For OpenAI responses

    try {
      // Priority: Replicate (most reliable) > Hugging Face > OpenAI
      if (hasReplicate) {
        // Use Replicate API (free tier, very reliable)
        console.log('Using Replicate API for image generation...')
        
        // Use Stable Diffusion XL model on Replicate
        // Model version: stability-ai/sdxl (latest)
        const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b', // SDXL model version
            input: {
              prompt: prompt.trim(),
              width: width,
              height: height,
              num_inference_steps: imageQuality === 'hd' ? 50 : 30,
              guidance_scale: imageStyle === 'vivid' ? 7.5 : 5.0,
            }
          })
        })
        
        if (!replicateResponse.ok) {
          const replicateError = await replicateResponse.text()
          throw new Error(`Replicate API error: ${replicateError}`)
        }
        
        const prediction = await replicateResponse.json()
        console.log(`Replicate prediction created: ${prediction.id}`)
        
        // Poll for result (Replicate is async)
        let result = null
        let attempts = 0
        const maxAttempts = 60 // 2 minutes max wait
        
        while (!result && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
          
          const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            }
          })
          
          const status = await statusResponse.json()
          
          if (status.status === 'succeeded' && status.output && status.output[0]) {
            result = status.output[0]
            break
          } else if (status.status === 'failed') {
            throw new Error(`Replicate prediction failed: ${status.error || 'Unknown error'}`)
          }
          
          attempts++
          console.log(`  Replicate status: ${status.status} (attempt ${attempts}/${maxAttempts})`)
        }
        
        if (!result) {
          throw new Error('Replicate prediction timed out')
        }
        
        // Download the generated image
        console.log(`Downloading image from Replicate: ${result}`)
        const imageResponse = await fetch(result)
        if (!imageResponse.ok) {
          throw new Error('Failed to download image from Replicate')
        }
        
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
        console.log('✅ Successfully generated image using Replicate API')
        
      } else if (hasHuggingFace) {
        // Use Hugging Face Stable Diffusion API (free)
        // Try multiple models and endpoints for reliability
        const models = [
          'runwayml/stable-diffusion-v1-5',  // More reliable, widely available
          'stabilityai/stable-diffusion-xl-base-1.0',  // Higher quality
          'CompVis/stable-diffusion-v1-4'  // Fallback
        ]
        
        let lastError = null
        // Note: imageBuffer is declared in outer scope, we'll set it here
        
        // Try each model until one works
        // Since standard endpoint is deprecated, try router endpoint formats directly
        for (const hfModel of models) {
          try {
            console.log(`Attempting Hugging Face image generation with model: ${hfModel}`)
            
            // Try multiple endpoint formats (router endpoint first since standard is deprecated)
            const endpointFormats = [
              // Try router endpoint formats first
              `https://router.huggingface.co/hf-inference/models/${hfModel}`,
              `https://router.huggingface.co/models/${hfModel}`,
              // Fallback to standard endpoint (might still work for some models)
              `https://api-inference.huggingface.co/models/${hfModel}`,
            ]
            
            let modelSuccess = false
            
            for (const endpointUrl of endpointFormats) {
              try {
                console.log(`  Trying endpoint: ${endpointUrl}`)
                
                const hfResponse = await fetch(endpointUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    inputs: prompt.trim(),
                    parameters: {
                      width: width,
                      height: height,
                      num_inference_steps: imageQuality === 'hd' ? 50 : 30,
                      guidance_scale: imageStyle === 'vivid' ? 7.5 : 5.0,
                    },
                    options: {
                      wait_for_model: true
                    }
                  })
                })
                
                // Handle response
                if (hfResponse.ok) {
                  imageBuffer = Buffer.from(await hfResponse.arrayBuffer())
                  console.log(`✅ Successfully generated image using: ${endpointUrl}`)
                  modelSuccess = true
                  break // Success, exit endpoint format loop
                } else {
                  const errorText = await hfResponse.text()
                  const status = hfResponse.status
                  
                  // Skip deprecated endpoint errors, try next format
                  if (status === 410 || errorText.includes('router.huggingface.co')) {
                    console.log(`  Endpoint deprecated (${status}), trying next format...`)
                    continue
                  }
                  
                  // Handle model loading (503)
                  if (status === 503) {
                    console.log(`  Model is loading, waiting 15 seconds and retrying...`)
                    await new Promise(resolve => setTimeout(resolve, 15000))
                    
                    const retryResponse = await fetch(endpointUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        inputs: prompt.trim(),
                        parameters: {
                          width: width,
                          height: height,
                          num_inference_steps: imageQuality === 'hd' ? 50 : 30,
                          guidance_scale: imageStyle === 'vivid' ? 7.5 : 5.0,
                        },
                        options: {
                          wait_for_model: true
                        }
                      })
                    })
                    
                    if (retryResponse.ok) {
                      imageBuffer = Buffer.from(await retryResponse.arrayBuffer())
                      console.log(`✅ Successfully generated image after retry using: ${endpointUrl}`)
                      modelSuccess = true
                      break // Success, exit endpoint format loop
                    } else {
                      const retryError = await retryResponse.text()
                      console.log(`  Retry failed (${retryResponse.status}): ${retryError.substring(0, 100)}`)
                      continue // Try next endpoint format
                    }
                  } else {
                    console.log(`  Endpoint failed (${status}): ${errorText.substring(0, 100)}`)
                    lastError = { status, error: errorText, model: hfModel, endpoint: endpointUrl }
                    continue // Try next endpoint format
                  }
                }
              } catch (endpointError) {
                console.log(`  Endpoint error: ${endpointError.message}`)
                lastError = { error: endpointError.message, model: hfModel, endpoint: endpointUrl }
                continue // Try next endpoint format
              }
            }
            
            if (modelSuccess) {
              break // Success, exit model loop
            } else {
              console.log(`All endpoints failed for ${hfModel}, trying next model...`)
              // Continue to next model
            }
          } catch (modelError) {
            console.error(`Error with model ${hfModel}:`, modelError.message)
            lastError = { error: modelError.message, model: hfModel }
            // Continue to next model
          }
        }
        
        // If all models failed, throw error
        if (!imageBuffer) {
          throw new Error(`All Hugging Face models failed. Last error: ${JSON.stringify(lastError)}`)
        }
        
        // imageBuffer is already set from the loop above, continue to save it
      } else {
        // Use OpenAI DALL-E 3
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt.trim(),
          size: imageSize,
          quality: imageQuality,
          style: imageStyle,
          n: 1,
        })

        imageUrl = response.data[0]?.url

        if (!imageUrl) {
          throw new Error('No image URL returned from OpenAI')
        }

        // Download the image and save it locally
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error('Failed to download generated image')
        }

        imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      }
      
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
        imageUrl: imageUrl || fileUrl, // OpenAI URL or local file URL
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

