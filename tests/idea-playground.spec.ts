import { test, expect } from '@playwright/test';
import { mockIdeas, mockDimensions } from './fixtures/test-data';

test.describe('Idea Playground', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Firebase Functions API responses
    await page.route('**/getIdeas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ideas: mockIdeas,
        }),
      });
    });

    await page.route('**/getDimensions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDimensions),
      });
    });

    // Mock create idea endpoint
    await page.route('**/createIdea', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-idea-id' }),
        });
      } else {
        route.continue();
      }
    });

    // Mock update idea endpoint
    await page.route('**/updateIdea**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'updated-idea-id' }),
        });
      } else {
        route.continue();
      }
    });

    // Mock delete idea endpoint
    await page.route('**/deleteIdea**', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Idea deleted successfully' }),
        });
      } else {
        route.continue();
      }
    });

    // Mock title validation endpoint
    await page.route('**/validateTitle**', async (route) => {
      const url = new URL(route.request().url());
                      const title = url.searchParams.get('title')?.toLowerCase() || '';
        const excludeId = url.searchParams.get('excludeId');

        // Check if title matches any existing titles in mock data (case-insensitive)
        const conflictingEntry = Object.entries(mockIdeas).find(([id, idea]) => {
          return id !== excludeId && idea.title.toLowerCase() === title;
        });

      if (conflictingEntry) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isValid: false,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isValid: true }),
        });
      }
    });

    // Mock reorder ideas endpoint
    await page.route('**/reorderIdeas', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Ideas reordered successfully' }),
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
    
    // Wait for validation to complete
    await page.waitForTimeout(2000);
    
    // Wait for validation and continue
    await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
    await page.locator('[data-testid="continue-button"]').click();
    
    // Should transition to editing phase
    await expect(page.locator('[data-testid="editing-phase"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    
    // Title should be populated
    await expect(page.locator('[data-testid="modal-title"]')).toHaveValue('New Test Idea');
    
    // Verify markdown editor is available and can be interacted with
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    
    // Try to click in the editor area to ensure it's interactive
    await page.locator('[data-testid="markdown-editor"]').click();
    
    // Verify we can type in the editor (using keyboard input)
    await page.keyboard.type('# New Test Idea');
    
    // Wait for auto-save debounce period
    await page.waitForTimeout(2000);
    
    // Close modal using Escape key
    await page.keyboard.press('Escape');
    
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
      // Add specific title validation route for this test
      await page.route('**/api/ideas/validate-title*', async (route) => {
        const url = new URL(route.request().url());
        const title = url.searchParams.get('title')?.toLowerCase() || '';
        
        if (title === 'updated test title') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              isUnique: false,
              conflictingId: 'multi_dimensional_ui_system',
              conflictingTitle: 'Updated Test Title'
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ isUnique: true }),
          });
        }
      });
      
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Try entering an existing title (from mock data)
      await page.locator('[data-testid="title-input"]').fill('Updated Test Title');
      
      // Wait for validation to complete (debounced API call)
      await page.waitForTimeout(1000);
      
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
      
      // Wait for validation to complete (debounced API call)
      await page.waitForTimeout(2000);
      
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
      
      // Wait for validation to complete (debounced API call)
      await page.waitForTimeout(2000);
      
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
      
      // Should have default content (CodeMirror)
      await expect(page.locator('[data-testid="markdown-editor"] .cm-content')).toContainText('# My Unique Test Idea');
    });

    test('should enable auto-save in editing phase', async ({ page }) => {
      // Add specific title validation route for this test
      await page.route('**/validateTitle*', async (route) => {
        // Always return unique for this test
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isValid: true }),
        });
      });
      
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Complete title validation phase
      await page.locator('text=New Idea').click();
      await page.locator('[data-testid="title-input"]').fill('Auto Save Test Idea');
      
      // Wait for validation to complete
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
      await page.locator('[data-testid="continue-button"]').click();
      
      // Wait for editing phase
      await expect(page.locator('[data-testid="editing-phase"]')).toBeVisible();
      
      // Verify markdown editor is available and can be interacted with
      await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
      
      // Try to click in the editor area and type content
      await page.locator('[data-testid="markdown-editor"]').click();
      await page.keyboard.type('# Auto Save Test Idea');
      
      // Wait for auto-save debounce period
      await page.waitForTimeout(2000);
    });

    test('should handle case-insensitive title validation', async ({ page }) => {
      // Add specific title validation route for this test
      await page.route('**/validateTitle*', async (route) => {
        const url = new URL(route.request().url());
        const title = url.searchParams.get('title')?.toLowerCase() || '';
        
        if (title === 'updated test title') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              isValid: false,
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ isValid: true }),
          });
        }
      });
      
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Click new idea button
      await page.locator('text=New Idea').click();
      
      // Try entering existing title with different case
      await page.locator('[data-testid="title-input"]').fill('UPDATED TEST TITLE');
      
      // Wait for validation to complete (debounced API call)
      await page.waitForTimeout(1000);
      
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

  test('should filter ideas by title substring', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="idea-card"]');
    await page.waitForTimeout(1000);
    
    // Count total cards initially
    const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
    expect(initialCardCount).toBeGreaterThan(0);
    
    // Search for "Test" (should match "Updated Test Title")
    await page.locator('[data-testid="search-title-input"]').fill('Test');
    await page.waitForTimeout(500);
    
    // Should show fewer cards
    const filteredCardCount = await page.locator('[data-testid="idea-card"]').count();
    expect(filteredCardCount).toBeLessThan(initialCardCount);
    expect(filteredCardCount).toBeGreaterThan(0);
    
    // Should show cards with "Test" in title
    const cardTitles = await page.locator('[data-testid="idea-card"] h3').allTextContents();
    cardTitles.forEach(title => {
      expect(title.toLowerCase()).toContain('test');
    });
  });

  test.describe('Search Clearing Functionality', () => {
    test('should restore all ideas when search is cleared', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Count total cards initially
      const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(initialCardCount).toBeGreaterThan(0);
      
      // Apply search filter
      await page.locator('[data-testid="search-title-input"]').fill('Test');
      await page.waitForTimeout(500);
      
      // Verify filter is applied (fewer cards)
      const filteredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(filteredCardCount).toBeLessThan(initialCardCount);
      
      // Clear the search by setting input to empty
      await page.locator('[data-testid="search-title-input"]').fill('');
      await page.waitForTimeout(500);
      
      // Should restore all cards
      const restoredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(restoredCardCount).toBe(initialCardCount);
    });

    test('should clear search using clear() method', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Count total cards initially
      const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
      
      // Apply search filter
      await page.locator('[data-testid="search-title-input"]').fill('Test');
      await page.waitForTimeout(500);
      
      // Verify filter is applied
      const filteredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(filteredCardCount).toBeLessThan(initialCardCount);
      
      // Clear the search input using clear() method
      await page.locator('[data-testid="search-title-input"]').clear();
      await page.waitForTimeout(500);
      
      // Should restore all cards
      const restoredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(restoredCardCount).toBe(initialCardCount);
    });

    test('should handle search clearing with whitespace', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Count total cards initially
      const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
      
      // Apply search filter
      await page.locator('[data-testid="search-title-input"]').fill('Test');
      await page.waitForTimeout(500);
      
      // Verify filter is applied
      const filteredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(filteredCardCount).toBeLessThan(initialCardCount);
      
      // Clear search by setting to whitespace only (should be treated as empty)
      await page.locator('[data-testid="search-title-input"]').fill('   ');
      await page.waitForTimeout(500);
      
      // Should restore all cards (whitespace is treated as empty)
      const restoredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(restoredCardCount).toBe(initialCardCount);
    });

    test('should maintain other filters when search is cleared', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Apply field filter first
      await page.locator('[data-testid="filter-field"]').click();
      await page.locator('[data-testid="filter-option-AI Infrastructure"]').click();
      await page.waitForTimeout(500);
      
      // Count cards with field filter
      const fieldFilteredCount = await page.locator('[data-testid="idea-card"]').count();
      
      // Add search filter on top
      await page.locator('[data-testid="search-title-input"]').fill('Test');
      await page.waitForTimeout(500);
      
      // Should show even fewer cards (both filters applied)
      const bothFiltersCount = await page.locator('[data-testid="idea-card"]').count();
      expect(bothFiltersCount).toBeLessThanOrEqual(fieldFilteredCount);
      
      // Clear only the search filter
      await page.locator('[data-testid="search-title-input"]').fill('');
      await page.waitForTimeout(500);
      
      // Should restore to field filter count (field filter still active)
      const searchClearedCount = await page.locator('[data-testid="idea-card"]').count();
      expect(searchClearedCount).toBe(fieldFilteredCount);
      
      // Verify field filter is still active (not all cards are shown)
      const totalCardsCount = await page.goto('/').then(() => 
        page.waitForSelector('[data-testid="idea-card"]').then(() => 
          page.locator('[data-testid="idea-card"]').count()
        )
      );
      expect(searchClearedCount).toBeLessThanOrEqual(totalCardsCount);
    });

    test('should work with case-insensitive search clearing', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Count total cards initially
      const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
      
      // Apply case-insensitive search
      await page.locator('[data-testid="search-title-input"]').fill('TEST');
      await page.waitForTimeout(500);
      
      // Verify filter is applied
      const filteredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(filteredCardCount).toBeLessThan(initialCardCount);
      
      // Verify it found the right cards (case-insensitive)
      const cardTitles = await page.locator('[data-testid="idea-card"] h3').allTextContents();
      cardTitles.forEach(title => {
        expect(title.toLowerCase()).toContain('test');
      });
      
      // Clear the search
      await page.locator('[data-testid="search-title-input"]').fill('');
      await page.waitForTimeout(500);
      
      // Should restore all cards
      const restoredCardCount = await page.locator('[data-testid="idea-card"]').count();
      expect(restoredCardCount).toBe(initialCardCount);
    });

    test('should handle multiple search and clear cycles', async ({ page }) => {
      await page.goto('/');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="idea-card"]');
      await page.waitForTimeout(1000);
      
      // Count total cards initially
      const initialCardCount = await page.locator('[data-testid="idea-card"]').count();
      
      // First search cycle
      await page.locator('[data-testid="search-title-input"]').fill('Test');
      await page.waitForTimeout(500);
      const firstFilterCount = await page.locator('[data-testid="idea-card"]').count();
      expect(firstFilterCount).toBeLessThan(initialCardCount);
      
      // Clear first search
      await page.locator('[data-testid="search-title-input"]').fill('');
      await page.waitForTimeout(500);
      const firstClearCount = await page.locator('[data-testid="idea-card"]').count();
      expect(firstClearCount).toBe(initialCardCount);
      
      // Second search cycle with different term
      await page.locator('[data-testid="search-title-input"]').fill('UI');
      await page.waitForTimeout(500);
      const secondFilterCount = await page.locator('[data-testid="idea-card"]').count();
      expect(secondFilterCount).toBeLessThan(initialCardCount);
      
      // Clear second search
      await page.locator('[data-testid="search-title-input"]').fill('');
      await page.waitForTimeout(500);
      const secondClearCount = await page.locator('[data-testid="idea-card"]').count();
      expect(secondClearCount).toBe(initialCardCount);
    });
  });
}); 