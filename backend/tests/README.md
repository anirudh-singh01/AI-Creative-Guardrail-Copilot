# Compliance Engine Test Suite

## Overview

Comprehensive test suite for validating the compliance checker and auto-fix functionality.

## Running Tests

```bash
cd backend
npm test
# or
npm run test:compliance
# or
node tests/compliance.test.js
```

## Test Cases

### Test Canvas Objects

1. **textInUnsafeTop** - Text at top: 50px (violates < 200px rule)
2. **textInUnsafeBottom** - Text at top: 900px (violates > 830px rule for 1080px canvas)
3. **smallFont** - Font size: 16px (violates >= 20px rule)
4. **wrongTag** - Text: "Only at Tesc" (incorrect tag format)
5. **lowContrastText** - Color: #cccccc on white (violates contrast ratio >= 4.5:1)
6. **noDisclaimer** - Missing required disclaimer text

## Test Results

### ✅ TEST 1: violationCheck()
- **Status:** PASS
- **Detected:** 10 violations
- **Validates:** All violation types are detected correctly

### ✅ TEST 2: autoFix()
- **Status:** PASS
- **Fixes Applied:**
  - ✓ Text moved out of unsafe zones
  - ✓ Font size increased to >= 20px
  - ✓ Disclaimer inserted automatically
  - ✓ Tag text corrected/added
  - ✓ Contrast increased automatically

### ✅ TEST 3: violationCheck() after autoFix()
- **Status:** PASS
- **Result:** 0 violations remaining
- **Validates:** Auto-fix resolves all violations

## Expected Output

```
=== COMPLIANCE ENGINE & AUTO-FIX VALIDATION ===

[TEST 1] violationCheck(): PASS
[TEST 2] autoFix(): PASS
[TEST 3] violationCheck() after fix: PASS

✅ ALL TESTS PASSED
```

## Test Coverage

- ✅ Unsafe zone detection (top and bottom)
- ✅ Font size validation
- ✅ Contrast ratio checking
- ✅ Tag text validation
- ✅ Disclaimer requirement checking
- ✅ Auto-fix for all violation types
- ✅ Zero violations after fix

