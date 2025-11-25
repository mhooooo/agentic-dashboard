#!/bin/bash

echo "=================================================="
echo "Wizard Stage Integration Verification"
echo "=================================================="
echo ""

# Check if files exist
echo "📁 Checking files..."
files=(
  "components/WidgetCreationWizard.tsx"
  "app/test-wizard-stages/page.tsx"
  "docs/WIZARD_STAGE_INTEGRATION.md"
  "docs/WIZARD_COMPONENT_INTERFACES.md"
  "TASK_SUMMARY.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

echo ""
echo "🔍 Checking wizard component structure..."

# Check for key functions
if grep -q "handleVisualizationSelected" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 3 handler (handleVisualizationSelected)"
else
  echo "  ❌ Missing Stage 3 handler"
fi

if grep -q "handleDeploy" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Deploy handler (handleDeploy)"
else
  echo "  ❌ Missing deploy handler"
fi

if grep -q "DeploySuccessScreen" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Success screen component"
else
  echo "  ❌ Missing success screen"
fi

if grep -q "VisualizationSelectorPlaceholder" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 3 placeholder"
else
  echo "  ❌ Missing Stage 3 placeholder"
fi

if grep -q "WidgetPreviewPlaceholder" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 4 placeholder"
else
  echo "  ❌ Missing Stage 4 placeholder"
fi

echo ""
echo "🔍 Checking stage routing..."

if grep -q "stage === 'visualization'" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 3 routing"
else
  echo "  ❌ Missing Stage 3 routing"
fi

if grep -q "stage === 'preview'" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 4 routing"
else
  echo "  ❌ Missing Stage 4 routing"
fi

if grep -q "stage === 'deploy'" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 5 routing"
else
  echo "  ❌ Missing Stage 5 routing"
fi

echo ""
echo "🔍 Checking navigation handlers..."

if grep -q "handleVisualizationBack" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 3 back button"
else
  echo "  ❌ Missing Stage 3 back button"
fi

if grep -q "handlePreviewBack" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Stage 4 back button"
else
  echo "  ❌ Missing Stage 4 back button"
fi

if grep -q "handleViewDashboard" components/WidgetCreationWizard.tsx; then
  echo "  ✅ View dashboard handler"
else
  echo "  ❌ Missing view dashboard handler"
fi

if grep -q "handleCreateAnother" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Create another handler"
else
  echo "  ❌ Missing create another handler"
fi

echo ""
echo "🔍 Checking deploy API integration..."

if grep -q "/api/ai/widget-creation/deploy" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Deploy API endpoint"
else
  echo "  ❌ Missing deploy API endpoint"
fi

if grep -q "widgetDefinition" components/WidgetCreationWizard.tsx; then
  echo "  ✅ Widget definition payload"
else
  echo "  ❌ Missing widget definition"
fi

if grep -q "userIntent" components/WidgetCreationWizard.tsx; then
  echo "  ✅ User intent payload"
else
  echo "  ❌ Missing user intent"
fi

echo ""
echo "📊 Code statistics..."
echo "  Wizard component: $(wc -l < components/WidgetCreationWizard.tsx) lines"
echo "  Test page: $(wc -l < app/test-wizard-stages/page.tsx) lines"
echo "  Integration doc: $(wc -l < docs/WIZARD_STAGE_INTEGRATION.md) lines"
echo "  Interfaces doc: $(wc -l < docs/WIZARD_COMPONENT_INTERFACES.md) lines"

echo ""
echo "🏗️ Build test..."
npm run build > /tmp/build-output.txt 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ Build succeeds"
  route_count=$(grep -c "○\|ƒ" /tmp/build-output.txt | head -1)
  echo "  ✅ Generated routes successfully"
  if grep -q "test-wizard-stages" /tmp/build-output.txt; then
    echo "  ✅ Test page included in build"
  else
    echo "  ⚠️  Test page not found in build output"
  fi
else
  echo "  ❌ Build failed"
  echo ""
  echo "Build errors:"
  tail -20 /tmp/build-output.txt
fi

echo ""
echo "=================================================="
echo "Verification complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Visit: http://localhost:3000/test-wizard-stages"
echo "  3. Test all stage transitions"
echo ""
echo "For sub-agents:"
echo "  - See docs/WIZARD_COMPONENT_INTERFACES.md"
echo "  - See docs/WIZARD_STAGE_INTEGRATION.md"
echo ""
