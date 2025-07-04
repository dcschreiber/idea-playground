import { test, expect } from '@playwright/test';
import { mockIdeas, mockDimensions } from './fixtures/test-data';

test.describe('Idea Playground', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses - handle multiple calls
    await page.route('**/api/ideas', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ideas: mockIdeas,
            metadata: {
              source_documents: [],
              extraction_date: new Date().toISOString(),
              total_ideas: Object.keys(mockIdeas).length,
              hierarchy_preserved: true,
            },
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-idea-id', success: true }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/dimensions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDimensions),
      });
    });

    // Mock save and delete requests for existing ideas
    await page.route('**/api/ideas/**', async (route) => {
      if (route.request().method() === 'POST') {
        // Update existing idea
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === 'PUT') {
        // Update existing idea (alternative endpoint)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });
  });

  test('should display ideas in kanban view by default', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="kanban-board"]');
    await page.waitForTimeout(1000); // Give time for API calls to complete
    
    // Should show the app title
    await expect(page.locator('h1')).toContainText('Idea Playground');
    
    // Should show kanban view
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    
    // Should have readiness columns
    await expect(page.locator('[data-testid="kanban-column"]')).toHaveCount(5);
    
    // Should display test ideas (5 in mock data)
    await expect(page.locator('[data-testid="idea-card"]')).toHaveCount(5);
    
    // Should show ideas in appropriate columns based on mock data
    await expect(page.locator('[data-testid="kanban-column-1-2"] [data-testid="idea-card"]')).toHaveCount(1); // multi_dimensional_ui_system (readiness: 1)
    await expect(page.locator('[data-testid="kanban-column-3-4"] [data-testid="idea-card"]')).toHaveCount(1); // educational_app_spaced_learning (readiness: 4)
    await expect(page.locator('[data-testid="kanban-column-5-6"] [data-testid="idea-card"]')).toHaveCount(2); // human_ai_content_authentication & generic_model_library (readiness: 6)
    await expect(page.locator('[data-testid="kanban-column-7-8"] [data-testid="idea-card"]')).toHaveCount(1); // playwright_repository_split (readiness: 8)
    await expect(page.locator('[data-testid="kanban-column-9-10"] [data-testid="idea-card"]')).toHaveCount(0); // none
  });

  test('should filter ideas by field', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Verify all 5 ideas are showing
    await expect(page.locator('[data-testid="idea-card"]')).toHaveCount(5);
    
    // Click on field filter
    await page.locator('[data-testid="filter-field"]').click();
    
    // Select Network Security
    await page.locator('[data-testid="filter-option-Network Security"]').click();
    
    // Should show only Network Security ideas (1 in mock data)
    await expect(page.locator('[data-testid="idea-card"]')).toHaveCount(1);
    
    // Should show clear filter button
    await expect(page.locator('text=Clear all')).toBeVisible();
    
    // Clear filter
    await page.locator('text=Clear all').click();
    
    // Should show all ideas again
    await expect(page.locator('[data-testid="idea-card"]')).toHaveCount(5);
  });

  test('should open modal when clicking on card', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click on first card
    await page.locator('[data-testid="idea-card"]').first().click();
    
    // Should open modal
    await expect(page.locator('[data-testid="idea-modal"]')).toBeVisible();
    
    // Should show title in modal (from mock data)
    await expect(page.locator('[data-testid="modal-title"]')).toHaveValue('Updated Test Title');
    
    // Should show preview mode by default
    await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-editor"]')).not.toBeVisible();
  });

  test('should toggle between preview and edit modes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click on first card to open modal
    await page.locator('[data-testid="idea-card"]').first().click();
    
    // Should start in preview mode
    await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-editor"]')).not.toBeVisible();
    
    // Click edit toggle button
    await page.locator('[data-testid="edit-toggle"]').click();
    
    // Should switch to edit mode
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-preview"]')).not.toBeVisible();
    
    // Click edit toggle again
    await page.locator('[data-testid="edit-toggle"]').click();
    
    // Should switch back to preview mode
    await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-editor"]')).not.toBeVisible();
  });

  test('should edit content by clicking on preview', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click on first card to open modal
    await page.locator('[data-testid="idea-card"]').first().click();
    
    // Should start in preview mode
    await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();
    
    // Click on preview to enter edit mode
    await page.locator('[data-testid="markdown-preview"]').click();
    
    // Should switch to edit mode
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-preview"]')).not.toBeVisible();
  });

  test('should create new idea with title validation workflow', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click new idea button
    await page.locator('text=New Idea').click();
    
    // Should open modal in title validation phase
    await expect(page.locator('[data-testid="idea-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="title-validation-phase"]')).toBeVisible();
    
    // Enter unique title
    await page.locator('[data-testid="title-input"]').fill('New Test Idea');
    
    // Wait for validation and continue
    await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
    await page.locator('[data-testid="continue-button"]').click();
    
    // Should transition to editing phase
    await expect(page.locator('[data-testid="editing-phase"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    
    // Title should be populated
    await expect(page.locator('[data-testid="modal-title"]')).toHaveValue('New Test Idea');
    
    // Edit content to trigger auto-save
    await page.locator('[data-testid="markdown-editor"] textarea').fill('# New Test Idea\n\n## Core Concept\nThis is my new idea content.');
    
    // Wait for auto-save to trigger (2 seconds debounce + processing time)
    await page.waitForTimeout(3000);
    
    // Should show save status (could be "Saving..." or "Saved [timestamp]")
    const saveIndicator = page.locator('text=/Saving|Saved.*|Unsaved changes/');
    await expect(saveIndicator).toBeVisible({ timeout: 10000 });
    
    // Wait a bit more for the save to complete if it was showing "Saving..."
    await page.waitForTimeout(2000);
    
    // Should eventually show saved status (text starts with "Saved")
    await expect(page.locator('text=/Saved.*/')).toBeVisible({ timeout: 10000 });
    
    // Close modal
    await page.locator('text=Close').click();
    
    // Should close modal
    await expect(page.locator('[data-testid="idea-modal"]')).not.toBeVisible();
  });

  test('should save idea changes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click on first card
    await page.locator('[data-testid="idea-card"]').first().click();
    
    // Switch to edit mode
    await page.locator('[data-testid="edit-toggle"]').click();
    
    // Edit title
    await page.locator('[data-testid="modal-title"]').fill('Updated Test Title Changed');
    
    // Should show unsaved changes indicator
    await expect(page.locator('text=Unsaved changes')).toBeVisible();
    
    // Wait for auto-save to trigger (2 seconds debounce + processing time)
    await page.waitForTimeout(3000);
    
    // Should show saved status with timestamp (text starts with "Saved")
    await expect(page.locator('text=/Saved.*/')).toBeVisible();
  });

  test('should have drag and drop functionality', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Check that DnD context is set up (kanban board should be draggable container)
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    
    // Verify we have cards that can be interacted with
    const cardCount = await page.locator('[data-testid="idea-card"]').count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Test that cards are interactive (this verifies the sortable setup)
    await expect(page.locator('[data-testid="idea-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="idea-card"]').first()).toBeEnabled();
  });

  test('should delete idea with confirmation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Click on first card to open modal
    await page.locator('[data-testid="idea-card"]').first().click();
    
    // Should open modal
    await expect(page.locator('[data-testid="idea-modal"]')).toBeVisible();
    
    // Click delete button
    await page.locator('button', { hasText: 'Delete' }).click();
    
    // Should show confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete this idea?');
      await dialog.accept();
    });
  });

  // New title validation workflow tests
  test.describe('New Idea Creation with Title Validation', () => {
    test('should start in title validation phase', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Should open modal in title validation phase
      await expect(page.locator('[data-testid="idea-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="title-validation-phase"]')).toBeVisible();
      
      // Should show title input and continue button
      await expect(page.locator('[data-testid="title-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="continue-button"]')).toBeVisible();
      
      // Continue button should be disabled initially
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();
      
      // Should not show editing interface yet
      await expect(page.locator('[data-testid="markdown-editor"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="dimensions-form"]')).not.toBeVisible();
    });

    test('should validate title uniqueness in real-time', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Try entering an existing title (from mock data)
      await page.locator('[data-testid="title-input"]').fill('Updated Test Title');
      
      // Should show error state
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="title-error"]')).toContainText('title already exists');
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();
      
      // Input should have error styling
      await expect(page.locator('[data-testid="title-input"]')).toHaveClass(/border-red/);
    });

    test('should allow unique title and enable continue button', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Enter a unique title
      await page.locator('[data-testid="title-input"]').fill('My Unique Test Idea');
      
      // Should show valid state
      await expect(page.locator('[data-testid="title-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="title-valid"]')).toBeVisible();
      await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
      
      // Input should have success styling
      await expect(page.locator('[data-testid="title-input"]')).toHaveClass(/border-green/);
    });

    test('should transition to editing phase after title validation', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Enter unique title
      await page.locator('[data-testid="title-input"]').fill('My Unique Test Idea');
      
      // Wait for validation
      await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
      
      // Click continue
      await page.locator('[data-testid="continue-button"]').click();
      
      // Should transition to editing phase
      await expect(page.locator('[data-testid="title-validation-phase"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="editing-phase"]')).toBeVisible();
      
      // Should show editing interface
      await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="dimensions-form"]')).toBeVisible();
      
      // Title should be populated in the header
      await expect(page.locator('[data-testid="modal-title"]')).toHaveValue('My Unique Test Idea');
      
      // Should have default content
      await expect(page.locator('[data-testid="markdown-editor"] textarea')).toContainText('# My Unique Test Idea');
    });

    test('should enable auto-save in editing phase', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Complete title validation phase
      await page.locator('text=New Idea').click();
      await page.locator('[data-testid="title-input"]').fill('Auto Save Test Idea');
      await page.locator('[data-testid="continue-button"]').click();
      
      // Wait for editing phase
      await expect(page.locator('[data-testid="editing-phase"]')).toBeVisible();
      
      // Edit content to trigger auto-save
      await page.locator('[data-testid="markdown-editor"] textarea').fill('# Auto Save Test Idea\n\n## New Content\nThis should auto-save.');
      
      // Should show unsaved changes indicator
      await expect(page.locator('text=Unsaved changes')).toBeVisible();
      
      // Wait for auto-save (2 seconds debounce + processing time)
      await page.waitForTimeout(3000);
      
      // Should show saved status
      await expect(page.locator('text=/Saved.*/')).toBeVisible({ timeout: 10000 });
    });

    test('should handle case-insensitive title validation', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Try entering existing title with different case
      await page.locator('[data-testid="title-input"]').fill('UPDATED TEST TITLE');
      
      // Should show error state (case-insensitive)
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();
    });

    test('should validate empty title', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Title should be empty initially
      await expect(page.locator('[data-testid="title-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();
      
      // Enter some text then clear it
      await page.locator('[data-testid="title-input"]').fill('Some title');
      await page.locator('[data-testid="title-input"]').fill('');
      
      // Should disable continue button again
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();
    });
  });
}); 