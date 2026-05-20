#!/bin/bash
# =============================================================================
# OWASP ZAP Baseline Security Scan
# =============================================================================
# Usage:
#   ./scripts/security_scan.sh [TARGET_URL]
#
# Examples:
#   ./scripts/security_scan.sh                    # Scans localhost:3000
#   ./scripts/security_scan.sh https://tu-app.com # Scans production
#
# Requirements:
#   - Docker installed and running
#   - Target application must be accessible from the scanner
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default target
TARGET_URL=${1:-"http://localhost:3000"}
REPORT_DIR="security_reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="zap_report_${TIMESTAMP}.html"
MD_REPORT="zap_report_${TIMESTAMP}.md"

echo -e "${YELLOW}🔍 OWASP ZAP Baseline Security Scan${NC}"
echo "   Target: $TARGET_URL"
echo "   Report: $REPORT_DIR/$REPORT_FILE"
echo ""

# Create reports directory
mkdir -p "$REPORT_DIR"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}⏳ This may take 10-30 minutes depending on app size...${NC}"
echo ""

# Run ZAP baseline scan
docker run --rm -v "$(pwd)/$REPORT_DIR:/zap/wrk" \
    -t owasp/zap2docker-stable zap-baseline.py \
    -t "$TARGET_URL" \
    -r "$REPORT_FILE" \
    -w "$MD_REPORT" \
    -I  # Ignore warning level (only report FAIL)

# Check exit code
EXIT_CODE=$?

echo ""
echo -e "${GREEN}✅ Scan complete!${NC}"
echo ""
echo "📊 Reports saved to: $REPORT_DIR/"
echo "   HTML: $REPORT_FILE"
echo "   Markdown: $MD_REPORT"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 No security issues found!${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS found — review the report${NC}"
elif [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}🚨 FAILURES found — action required!${NC}"
fi

echo ""
echo "To view the HTML report, open:"
echo "   $REPORT_DIR/$REPORT_FILE"
echo ""

exit $EXIT_CODE
