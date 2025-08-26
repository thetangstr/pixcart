#!/bin/bash

echo "🧹 Cleaning up Oil Painting App for v0.1 Production"

# Create archive directory for old files
mkdir -p .archive/old-api-endpoints
mkdir -p .archive/old-evaluation-pages
mkdir -p .archive/test-files

# Archive old/duplicate API endpoints (keeping only production ones)
echo "📦 Archiving old API endpoints..."
mv app/api/convert/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/convert-v2/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/convert-v3/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/demo-convert/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/test-iteration/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/test-oil-painting/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/test-simple-oil/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/convert-oil-painting/route.ts .archive/old-api-endpoints/ 2>/dev/null
mv app/api/convert-oil-expert/route.ts .archive/old-api-endpoints/ 2>/dev/null

# Keep: convert-production-optimized, convert-production, convert-replicate, convert-enhanced, convert-dual

# Archive evaluation pages (consolidate into admin dashboard)
echo "📦 Archiving evaluation pages..."
mv app/evaluation/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/evaluation-dashboard/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/quality-evaluation/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/style-comparison/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/comfyui-evaluation/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/human-eval/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/test-models/page.tsx .archive/old-evaluation-pages/ 2>/dev/null
mv app/testing/page.tsx .archive/old-evaluation-pages/ 2>/dev/null

# Archive test files
echo "📦 Archiving test files..."
mv test-*.js .archive/test-files/ 2>/dev/null
mv test-*.ts .archive/test-files/ 2>/dev/null
mv test-*.sh .archive/test-files/ 2>/dev/null
mv test-*.json .archive/test-files/ 2>/dev/null
mv test-*.png .archive/test-files/ 2>/dev/null
mv setup-*.sh .archive/test-files/ 2>/dev/null

# Clean up root directory docs (keep only essential ones)
echo "📦 Organizing documentation..."
mkdir -p .archive/old-docs
mv COMFYUI_*.md .archive/old-docs/ 2>/dev/null
mv DEPLOYMENT_*.md .archive/old-docs/ 2>/dev/null
mv IMPLEMENTATION_*.md .archive/old-docs/ 2>/dev/null
mv IMPROVEMENT_*.md .archive/old-docs/ 2>/dev/null
mv LARGE_SCALE_*.md .archive/old-docs/ 2>/dev/null
mv MARKETING_*.md .archive/old-docs/ 2>/dev/null
mv MIGRATION_*.md .archive/old-docs/ 2>/dev/null
mv OIL_PAINTING_*.md .archive/old-docs/ 2>/dev/null
mv PLAYWRIGHT_*.md .archive/old-docs/ 2>/dev/null
mv READY_*.md .archive/old-docs/ 2>/dev/null
mv REPLICATE_*.md .archive/old-docs/ 2>/dev/null
mv RL_*.md .archive/old-docs/ 2>/dev/null
mv SOCIAL_*.md .archive/old-docs/ 2>/dev/null
mv SUBJECT_*.md .archive/old-docs/ 2>/dev/null
mv A1111_*.md .archive/old-docs/ 2>/dev/null
mv AUTHENTICATION_*.md .archive/old-docs/ 2>/dev/null
mv GOOGLE_*.md .archive/old-docs/ 2>/dev/null

# Keep: README.md, CLAUDE.md, PRODUCTION_STRATEGY.md, V0.1_PRODUCTIONIZATION_PLAN.md

# Remove old build directories
echo "🗑️ Removing old build artifacts..."
rm -rf .next.old/
rm -rf examples/

# Clean up unused config files
echo "📦 Archiving unused configs..."
mv oil_painting_presets.json .archive/ 2>/dev/null
mv production_configs.json .archive/ 2>/dev/null
mv style_test_config.json .archive/ 2>/dev/null
mv visualization_data.json .archive/ 2>/dev/null
mv optimization_report.txt .archive/ 2>/dev/null
mv optimized-prompts.md .archive/ 2>/dev/null
mv oil_painting_research_report.md .archive/ 2>/dev/null
mv extreme_preservation_mode.ts .archive/ 2>/dev/null
mv fix_animal_conversion.ts .archive/ 2>/dev/null

echo "✅ Cleanup complete! Files archived in .archive/"
echo ""
echo "📊 Current structure:"
echo "- Production API endpoints: convert-production-optimized, convert-production"
echo "- Admin dashboard: /admin/models (with model switching)"
echo "- Main user flow: /upload → optimized SDXL pipeline"
echo "- Tests: Organized in /tests directory"
echo ""
echo "💡 To restore any archived files: check .archive/ directory"