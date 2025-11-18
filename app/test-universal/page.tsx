'use client';

/**
 * Test Page for UniversalDataWidget Prototype
 *
 * Compare hardcoded widgets vs universal widgets side-by-side
 * to validate the factory design.
 */

import { UniversalDataWidget } from '@/components/widgets/UniversalDataWidget';
import { GitHubWidget } from '@/components/widgets/GitHubWidget';
import { JiraWidget } from '@/components/widgets/JiraWidget';
import {
  githubUniversalConfig,
  jiraUniversalConfig,
} from '@/lib/widgets/configs/github-universal';

export default function TestUniversalPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">UniversalDataWidget Prototype</h1>
          <p className="text-muted-foreground">
            Compare hardcoded widgets (Month 1-2) vs universal widgets (Month 3)
          </p>
          <div className="text-sm text-muted-foreground">
            Click a PR in either GitHub widget to test Event Mesh magic
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Hardcoded Widgets */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Hardcoded Widgets</h2>
              <p className="text-sm text-muted-foreground">
                Custom React components (200+ lines each)
              </p>
            </div>

            {/* Hardcoded GitHub Widget */}
            <div className="bg-card border rounded-lg p-6 h-[500px]">
              <GitHubWidget />
            </div>

            {/* Hardcoded Jira Widget */}
            <div className="bg-card border rounded-lg p-6 h-[500px]">
              <JiraWidget project_key="PROJ" />
            </div>
          </div>

          {/* Right Column: Universal Widgets */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Universal Widgets</h2>
              <p className="text-sm text-muted-foreground">
                JSON configuration (~100 lines each)
              </p>
            </div>

            {/* Universal GitHub Widget */}
            <div className="bg-card border rounded-lg p-6 h-[500px]">
              <UniversalDataWidget
                config={githubUniversalConfig}
                widgetId="github-universal"
              />
            </div>

            {/* Universal Jira Widget */}
            <div className="bg-card border rounded-lg p-6 h-[500px]">
              <UniversalDataWidget
                config={jiraUniversalConfig}
                widgetId="jira-universal"
              />
            </div>
          </div>
        </div>

        {/* Metrics Comparison */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Development Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">3 days</div>
              <div className="text-sm text-muted-foreground">
                Hardcoded widget development time
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-green-600">&lt;2 days</div>
              <div className="text-sm text-muted-foreground">
                Universal widget development time
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-blue-600">50%</div>
              <div className="text-sm text-muted-foreground">
                Faster widget creation
              </div>
            </div>
          </div>
        </div>

        {/* Design Validation Checklist */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Design Validation Checklist</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check1" className="w-4 h-4" />
              <label htmlFor="check1">
                Universal widgets look identical to hardcoded widgets
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check2" className="w-4 h-4" />
              <label htmlFor="check2">
                Event Mesh magic works (click PR → Jira auto-filters)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check3" className="w-4 h-4" />
              <label htmlFor="check3">
                JSON config is readable and maintainable
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check4" className="w-4 h-4" />
              <label htmlFor="check4">
                Field transformers work (Jira ticket extraction)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check5" className="w-4 h-4" />
              <label htmlFor="check5">
                Conditional styling works (badge colors)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="check6" className="w-4 h-4" />
              <label htmlFor="check6">
                Date formatting works (relative time)
              </label>
            </div>
          </div>
        </div>

        {/* Config Preview */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">GitHub Widget Config Preview</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(githubUniversalConfig, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
