import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Default retail rules (fallback if JSON file not found)
 */
export const defaultRetailRules = {
  retailer: 'Tesco',
  minFontSize: 20,
  unsafeTop: 200,
  unsafeBottom: 250,
  requiredDisclaimer: 'Selected stores. While stocks last.',
  allowedTagPhrases: [
    'Only at Tesco',
    'Available at Tesco',
    'Exclusive to Tesco',
    'Tesco Exclusive'
  ],
  prohibitedClaims: [
    'best',
    'cheapest',
    'lowest price',
    'guaranteed',
    'always',
    'never',
    '100%',
    'free',
    'no risk',
    'proven',
    'miracle',
    'instant',
    'secret'
  ],
  prohibitedWords: [
    'free',
    'guarantee',
    'warranty',
    'promise',
    'certified',
    'official',
    'approved',
    'recommended by doctors',
    'clinically proven'
  ],
  requiredDisclaimers: [
    'Terms and Conditions apply',
    'Subject to availability',
    'See in-store for details',
    'Prices may vary'
  ],
  toneGuidelines: [
    'Avoid superlatives',
    'Use factual language',
    'Avoid absolute claims',
    'Include appropriate disclaimers',
    'Be clear and transparent'
  ],
  complianceRules: [
    'No misleading claims',
    'No unsubstantiated claims',
    'No false promises',
    'Clear pricing information',
    'Accurate product descriptions'
  ]
}

/**
 * Load retail rules from JSON file dynamically
 * @param {string} retailer - Retailer name (default: 'Tesco')
 * @returns {Object} Retail rules object
 */
export function getRetailRules(retailer = 'Tesco') {
  try {
    // Construct path to rules file
    const rulesPath = path.join(__dirname, '..', 'rules', `${retailer.toLowerCase()}.json`)
    
    // Check if file exists
    if (fs.existsSync(rulesPath)) {
      // Read and parse JSON file
      const rulesData = fs.readFileSync(rulesPath, 'utf8')
      const rules = JSON.parse(rulesData)
      
      // Merge with default rules, prioritizing JSON file values
      return {
        ...defaultRetailRules,
        retailer: retailer,
        minFontSize: rules.min_font_size || defaultRetailRules.minFontSize,
        unsafeTop: rules.unsafe_top || defaultRetailRules.unsafeTop,
        unsafeBottom: rules.unsafe_bottom || defaultRetailRules.unsafeBottom,
        requiredDisclaimer: rules.required_disclaimer || defaultRetailRules.requiredDisclaimer,
        allowedTagPhrases: rules.allowed_tags || defaultRetailRules.allowedTagPhrases,
        // Keep other default rules (prohibitedClaims, prohibitedWords, etc.)
      }
    } else {
      console.warn(`Rules file not found at ${rulesPath}, using default rules`)
      return defaultRetailRules
    }
  } catch (error) {
    console.error(`Error loading rules file for ${retailer}:`, error)
    console.warn('Using default rules')
    return defaultRetailRules
  }
}

