'use client';

/**
 * Test Page for Widget Creation Wizard
 *
 * Simple page to test the wizard UI in isolation.
 * To test: Visit http://localhost:3000/test-wizard
 */

import { useState } from 'react';
import { WidgetCreationWizard } from '@/components/WidgetCreationWizard';

export default function TestWizardPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Widget Creation Wizard Test</h1>
        <p className="text-muted-foreground">
          Test the conversational widget creation interface
        </p>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Open Wizard
        </button>

        <WidgetCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onWidgetCreated={(widgetId) => {
            console.log('Widget created:', widgetId);
            setIsWizardOpen(false);
          }}
        />
      </div>
    </div>
  );
}
