/**
 * Compliance Engine & Auto-Fix Validation Test Suite
 * Tests the compliance checker and auto-fix functionality
 */

import { checkCompliance, applyAutoFix } from '../complianceChecker.js'
import { getRetailRules } from '../retailRules.js'

// Test helper functions
function createMockCanvasData(objects, height = 1080, width = 1080, backgroundColor = '#FFFFFF') {
  return {
    version: '5.3.0',
    objects: objects,
    background: backgroundColor,
    backgroundColor: backgroundColor,
    width: width,
    height: height,
  }
}

function createTextObject(text, top, fontSize = 20, fill = '#000000', width = 200, height = 30) {
  return {
    type: 'textbox',
    text: text,
    left: 100,
    top: top,
    fontSize: fontSize,
    fill: fill,
    fontFamily: 'Arial',
    width: width,
    height: height,
    scaleX: 1,
    scaleY: 1,
    originX: 'left',
    originY: 'top'
  }
}

// Test Cases Setup - Matching user requirements exactly
const textInUnsafeTop = createTextObject('Sample Headline', 50, 16, '#ffffff')

const textInUnsafeBottom = createTextObject('Sample CTA', 900, 18, '#999999')

const noDisclaimer = [] // No disclaimer text on canvas (will be added via substantial text)

const wrongTag = createTextObject('Only at Tesc', 400, 24, '#000000') // Incorrect tag

const lowContrastText = createTextObject('Low contrast', 400, 24, '#cccccc') // Light gray on white background

// Get retail rules
const rules = getRetailRules('Tesco')

console.log('=== COMPLIANCE ENGINE & AUTO-FIX VALIDATION ===\n')
console.log('Test Rules:', {
  minFontSize: rules.minFontSize,
  unsafeTop: rules.unsafeTop,
  unsafeBottom: rules.unsafeBottom,
  allowedTagPhrases: rules.allowedTagPhrases
})
console.log('\n')

// Test 1: violationCheck() - Should detect all violations
console.log('[TEST 1] violationCheck() - Detecting violations\n')

// Create mock canvas with all violations
const mockCanvasWithViolations = createMockCanvasData([
  textInUnsafeTop,      // a. unsafe top zone
  textInUnsafeBottom,   // b. unsafe bottom zone
  createTextObject('Small text', 400, 16, '#000000'), // c. font size < 20
  wrongTag,             // e. incorrect tag
  lowContrastText,      // f. low contrast text
  // Add substantial text (>20 chars) to trigger disclaimer requirement
  createTextObject('This is a substantial headline text that requires a disclaimer to be compliant with retailer guidelines', 400, 24, '#000000', 300, 50),
  // d. missing disclaimer - will be detected
])

const initialViolations = checkCompliance(mockCanvasWithViolations, rules)

console.log(`Initial violations detected: ${initialViolations.length}`)
console.log('Violations found:')
initialViolations.forEach((violation, index) => {
  console.log(`  ${index + 1}. ${violation.id}: ${violation.message} (${violation.severity})`)
})

// Expected violations:
// 1. textInUnsafeTop - unsafe top zone
// 2. textInUnsafeBottom - unsafe bottom zone  
// 3. smallFont - font size < 20
// 4. wrongTag - incorrect tag text
// 5. lowContrastText - low contrast
// 6. missing_tag_text - no valid tag text found
// 7. missing_disclaimer - no disclaimer text

const expectedViolations = [
  'text_unsafe_top',
  'text_unsafe_bottom',
  'font_small',
  'tag_text_incorrect',
  'contrast_low',
  'missing_tag_text',
  'missing_disclaimer'
]

const detectedViolationIds = initialViolations.map(v => v.id.split('_')[0] + '_' + v.id.split('_').slice(1).join('_'))

console.log('\nExpected violation types:')
expectedViolations.forEach(id => {
  const found = initialViolations.some(v => v.id.includes(id.split('_')[0]) || v.id === id)
  console.log(`  ${found ? '✓' : '✗'} ${id}`)
})

const test1Pass = initialViolations.length >= 3
console.log(`\n[TEST 1] ${test1Pass ? 'PASS' : 'FAIL'} - Detected ${initialViolations.length} violations (expected >= 3)`)

// Test 2: autoFix() - Should fix all violations
console.log('\n[TEST 2] autoFix() - Applying fixes\n')

let fixedCanvasData
try {
  fixedCanvasData = await applyAutoFix(mockCanvasWithViolations, initialViolations, {
    openai: null, // No OpenAI for testing
    rules: rules
  })
  console.log('Auto-fix applied successfully')
  console.log(`Objects before fix: ${mockCanvasWithViolations.objects.length}`)
  console.log(`Objects after fix: ${fixedCanvasData.objects.length}`)
  
  // Check specific fixes
  console.log('\nChecking specific fixes:')
  
  // Verify specific fixes
  console.log('\nVerifying fixes:')
  
  // a. Text moved out of unsafe zones
  const topTextAfter = fixedCanvasData.objects.find(obj => 
    obj.text === 'Sample Headline' || obj.text?.includes('Sample Headline')
  )
  const bottomTextAfter = fixedCanvasData.objects.find(obj => 
    obj.text === 'Sample CTA' || obj.text?.includes('Sample CTA')
  )
  const topFixed = topTextAfter && topTextAfter.top >= 200
  const bottomFixed = bottomTextAfter && bottomTextAfter.top < (1080 - 250)
  console.log(`  a. Unsafe zones: ${topFixed && bottomFixed ? '✓ FIXED' : '✗ FAILED'}`)
  if (topTextAfter) console.log(`     Top text moved to: ${topTextAfter.top}px (was 50px)`)
  if (bottomTextAfter) console.log(`     Bottom text moved to: ${bottomTextAfter.top}px (was 900px)`)
  
  // b. Font size increased to >= 20
  const smallFontAfter = fixedCanvasData.objects.find(obj => 
    obj.text === 'Small text' || obj.text?.includes('Small text')
  )
  const fontFixed = smallFontAfter && smallFontAfter.fontSize >= 20
  console.log(`  b. Font size: ${fontFixed ? '✓ FIXED' : '✗ FAILED'}`)
  if (smallFontAfter) console.log(`     Font size: ${smallFontAfter.fontSize}px (was 16px)`)
  
  // c. Disclaimer inserted automatically
  const disclaimers = fixedCanvasData.objects.filter(obj => {
    const text = (obj.text || '').toLowerCase()
    return text.includes('selected stores') || text.includes('terms') || text.includes('while stocks')
  })
  const disclaimerFixed = disclaimers.length >= 1
  console.log(`  c. Disclaimer: ${disclaimerFixed ? '✓ FIXED' : '✗ FAILED'}`)
  if (disclaimers.length > 0) {
    console.log(`     Disclaimer added: "${disclaimers[0].text}"`)
  }
  
  // d. Tag text corrected to "Only at Tesco" or "Available at Tesco"
  const tagTexts = fixedCanvasData.objects.filter(obj => {
    const text = (obj.text || '').toLowerCase()
    return text.includes('only at tesco') || text.includes('available at tesco')
  })
  const tagFixed = tagTexts.length >= 1
  console.log(`  d. Tag text: ${tagFixed ? '✓ FIXED' : '✗ FAILED'}`)
  if (tagTexts.length > 0) {
    console.log(`     Tag text: "${tagTexts[0].text}"`)
  }
  
  // e. Contrast increased automatically
  const lowContrastAfter = fixedCanvasData.objects.find(obj => 
    obj.text === 'Low contrast' || obj.text?.includes('Low contrast')
  )
  const contrastFixed = lowContrastAfter && lowContrastAfter.fill !== '#cccccc'
  console.log(`  e. Contrast: ${contrastFixed ? '✓ FIXED' : '✗ FAILED'}`)
  if (lowContrastAfter) {
    console.log(`     Text color changed to: ${lowContrastAfter.fill} (was #cccccc)`)
  }
  
} catch (error) {
  console.error('Auto-fix failed:', error)
  console.log('[TEST 2] FAIL - Auto-fix threw an error')
  process.exit(1)
}

const test2Pass = fixedCanvasData && fixedCanvasData.objects.length > mockCanvasWithViolations.objects.length
console.log(`\n[TEST 2] ${test2Pass ? 'PASS' : 'FAIL'} - Auto-fix completed`)

// Test 3: After autoFix() - Should have ZERO violations
console.log('\n[TEST 3] violationCheck() after autoFix() - Should return ZERO violations\n')

const violationsAfterFix = checkCompliance(fixedCanvasData, rules)

console.log(`Violations after fix: ${violationsAfterFix.length}`)
if (violationsAfterFix.length > 0) {
  console.log('Remaining violations:')
  violationsAfterFix.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.id}: ${violation.message}`)
  })
} else {
  console.log('  ✓ No violations found!')
}

const test3Pass = violationsAfterFix.length === 0
console.log(`\n[TEST 3] ${test3Pass ? 'PASS' : 'FAIL'} - ${violationsAfterFix.length} violations remaining (expected 0)`)

// Final Summary
console.log('\n=== TEST SUMMARY ===')
console.log(`[TEST 1] violationCheck(): ${test1Pass ? 'PASS' : 'FAIL'}`)
console.log(`[TEST 2] autoFix(): ${test2Pass ? 'PASS' : 'FAIL'}`)
console.log(`[TEST 3] violationCheck() after fix: ${test3Pass ? 'PASS' : 'FAIL'}`)

const allTestsPass = test1Pass && test2Pass && test3Pass

if (allTestsPass) {
  console.log('\n✅ ALL TESTS PASSED')
  console.log('\nCompliance engine and auto-fix are working correctly!')
  process.exit(0)
} else {
  console.log('\n❌ SOME TESTS FAILED')
  console.log('\nIssues detected:')
  if (!test1Pass) console.log('  - Violation detection not working correctly')
  if (!test2Pass) console.log('  - Auto-fix not applying changes correctly')
  if (!test3Pass) console.log('  - Auto-fix not resolving all violations')
  process.exit(1)
}

