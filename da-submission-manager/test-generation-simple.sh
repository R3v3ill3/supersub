#!/bin/bash
# Simple test script to verify AI generation with real data

set -e

API_URL="${API_URL:-http://localhost:3000}"
echo "🧪 Testing AI Generation"
echo "API URL: $API_URL"
echo ""

# Step 1: Create a test submission
echo "📝 Step 1: Creating test submission..."
SUBMISSION_RESPONSE=$(curl -s -X POST "$API_URL/api/dev/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_first_name": "Test",
    "applicant_last_name": "Resident",
    "site_address": "940 Currumbin Creek Road",
    "application_number": "COM/2025/271",
    "applicant_email": "test@example.com"
  }')

SUBMISSION_ID=$(echo "$SUBMISSION_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SUBMISSION_ID" ]; then
  echo "❌ Failed to create submission"
  echo "$SUBMISSION_RESPONSE"
  exit 1
fi

echo "✓ Created submission: $SUBMISSION_ID"
echo ""

# Step 2: Save survey response with concerns that include measurements
echo "📝 Step 2: Selecting concerns (including bulk_excavation with measurements)..."
curl -s -X POST "$API_URL/api/survey/$SUBMISSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1",
    "selected_keys": [
      "bulk_excavation",
      "seqrp_non_compliance",
      "strategic_framework_non_compliance",
      "rural_zone_code_non_compliance",
      "community_needs_and_infrastructure",
      "traffic_and_parking_issues",
      "amenity_and_environmental_concerns"
    ],
    "ordered_keys": [
      "bulk_excavation",
      "seqrp_non_compliance",
      "strategic_framework_non_compliance",
      "rural_zone_code_non_compliance",
      "community_needs_and_infrastructure",
      "traffic_and_parking_issues",
      "amenity_and_environmental_concerns"
    ],
    "user_style_sample": "I am writing to formally object to this development application."
  }' > /dev/null

echo "✓ Survey saved with 7 concerns"
echo ""

# Step 3: Generate submission
echo "🤖 Step 3: Generating submission with AI..."
echo "This may take 10-15 seconds..."
echo ""

GENERATION_RESPONSE=$(curl -s -X POST "$API_URL/api/generate/$SUBMISSION_ID" \
  -H "Content-Type: application/json")

# Extract the preview text
PREVIEW=$(echo "$GENERATION_RESPONSE" | grep -o '"preview":"[^"]*"' | cut -d'"' -f4 | sed 's/\\n/\n/g')

if [ -z "$PREVIEW" ]; then
  echo "❌ Generation failed"
  echo "$GENERATION_RESPONSE"
  exit 1
fi

echo "✅ Generation completed!"
echo ""
echo "=" | tr '=' '=' | head -c 60
echo ""
echo "📊 VALIDATION RESULTS"
echo "=" | tr '=' '=' | head -c 60
echo ""

# Check for critical measurements
PASS_COUNT=0
FAIL_COUNT=0

check_content() {
  local search="$1"
  local description="$2"
  
  if echo "$PREVIEW" | grep -q "$search"; then
    echo "  ✓ $description"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✗ MISSING: $description"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo ""
echo "Checking for critical measurements:"
check_content "12,600" "12,600 m³ (cut volume)"
check_content "2,400" "2,400 m³ (fill volume)"
check_content "7,000" "7,000 m³ (soil export)"
check_content "steep batters" "Technical term: steep batters"
check_content "retaining walls" "Technical term: retaining walls"

echo ""
echo "Checking for planning references:"
check_content "Regional Landscape and Rural Production Area" "SEQRP designation"
check_content "Gold Coast City Plan" "Planning framework reference"
check_content "Rural Zone" "Zone code reference"

# Count words
WORD_COUNT=$(echo "$PREVIEW" | wc -w | tr -d ' ')
echo ""
echo "Word count: $WORD_COUNT / 2500 ($(( WORD_COUNT * 100 / 2500 ))%)"

# Summary
echo ""
echo "=" | tr '=' '=' | head -c 60
echo ""
echo "📈 SUMMARY"
echo ""
echo "✓ Passed: $PASS_COUNT checks"
echo "✗ Failed: $FAIL_COUNT checks"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ TEST PASSED - All measurements preserved!"
  echo "   The AI is correctly including specific data."
  EXIT_CODE=0
else
  echo "⚠️  TEST FAILED - Some measurements missing"
  echo "   The AI may be summarizing or losing details."
  EXIT_CODE=1
fi

# Save output
OUTPUT_FILE="test-output-$(date +%s).txt"
echo "$PREVIEW" > "$OUTPUT_FILE"
echo ""
echo "📄 Full output saved to: $OUTPUT_FILE"
echo ""

# Show first 500 characters of output
echo "=" | tr '=' '=' | head -c 60
echo ""
echo "📝 PREVIEW (first 500 chars):"
echo "=" | tr '=' '=' | head -c 60
echo ""
echo "$PREVIEW" | head -c 500
echo "..."
echo ""

exit $EXIT_CODE

