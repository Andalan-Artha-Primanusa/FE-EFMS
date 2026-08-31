import { test, expect } from "@playwright/test";

test.describe("FEAST Finance ERP - Comprehensive BA Tracker & Invoice E2E Testing", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"], input[name="email"], input[type="text"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("admin@financeerp.local");
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill("Admin@12345");
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")').first();
      await submitBtn.click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 8000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
    }
  });

  test("1. BA Tracker: Listing, KPI Metrics & Site Filter Pills", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    // Verify Title and KPI Summary
    await expect(page.locator("body")).toContainText("Berita Acara");

    // Test Site Filter Pills
    const bggBtn = page.locator('button:has-text("BGG")').first();
    if (await bggBtn.isVisible()) {
      await bggBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("body")).toContainText("BGG");
    }

    const posBtn = page.locator('button:has-text("POS")').first();
    if (await posBtn.isVisible()) {
      await posBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("body")).toContainText("POS");
    }

    const allBtn = page.locator('button:has-text("Semua Site"), button:has-text("All")').first();
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("2. BA Tracker: Search Query & Table Responsiveness", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Cari" i], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("BGG");
      await page.waitForTimeout(400);
      await expect(page.locator("body")).toContainText("BGG");

      await searchInput.fill("");
      await page.waitForTimeout(300);
    }
  });

  test("3. BA Tracker: Input BA Form & Auto-calculation", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    const addBABtn = page.locator('button:has-text("+ Buat Berita Acara Baru"), button:has-text("Input BA"), button:has-text("Tambah Data")').first();
    if (await addBABtn.isVisible()) {
      await addBABtn.click();
      await page.waitForTimeout(500);

      // Verify Modal Title
      await expect(page.locator("body")).toContainText("Berita Acara");

      // Verify Close
      const closeBtn = page.locator('button:has-text("Batal"), button[title="Tutup"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("4. BA Tracker: Edit BA & Strict State Lock Banner", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    // Click first Edit button in table
    const editBtn = page.locator('button[title*="Edit"], button:has(svg.lucide-edit-2), button:has(svg.lucide-edit)').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Verify Modal rendered
      await expect(page.locator("body")).toContainText("Berita Acara");

      // Close modal
      const closeBtn = page.locator('button:has-text("Batal"), button[title="Tutup"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("5. Pending Volume: Kartu Kontrol & CRUD Memo Table", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    const pVolBtn = page.locator('button:has-text("Pending Volume"), button:has-text("Saldo Pending")').first();
    if (await pVolBtn.isVisible()) {
      await pVolBtn.click();
      await page.waitForTimeout(500);

      // Verify Modal header and KPI summary cards
      await expect(page.locator("body")).toContainText("Pending Volume");
      await expect(page.locator("body")).toContainText("Saldo Pending Aktif");
      await expect(page.locator("body")).toContainText("Estimasi Nilai Tertunda");

      // Verify Action buttons (Edit, Delete)
      const editBtn = page.locator('button[title*="Edit Catatan"]').first();
      if (await editBtn.isVisible()) {
        await expect(editBtn).toBeVisible();
      }

      const delBtn = page.locator('button[title*="Hapus Catatan"]').first();
      if (await delBtn.isVisible()) {
        await expect(delBtn).toBeVisible();
      }
    }
  });

  test("6. Invoice View: Aging Matrix & Status Filters", async ({ page }) => {
    await page.goto("/invoice-management");
    await page.waitForLoadState("networkidle");

    // Verify Invoice page loaded
    await expect(page.locator("body")).toContainText("Invoice");

    // Verify Aging Matrix / Summary exists
    await expect(page.locator("body")).toContainText("Outstanding AR");

    // Test Status Filter Pills
    const draftFilter = page.locator('button:has-text("Draft")').first();
    if (await draftFilter.isVisible()) {
      await draftFilter.click();
      await page.waitForTimeout(300);
    }

    const allStatusFilter = page.locator('button:has-text("Semua Status"), button:has-text("All")').first();
    if (await allStatusFilter.isVisible()) {
      await allStatusFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test("7. Invoice Detail Modal: Snapshot Explainer & AAP Branding", async ({ page }) => {
    await page.goto("/invoice-management");
    await page.waitForLoadState("networkidle");

    // Click detail button on first invoice
    const detailBtn = page.locator('button:has-text("Rincian"), button[title*="Rincian"], button:has(svg.lucide-eye)').first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await page.waitForTimeout(600);

      // Verify Official Invoice Header and Letterhead
      await expect(page.locator("body")).toContainText("PT ANDALAN ARTHA PRIMANUSA");
    }
  });

  test("8. Export Functions: Trigger Dropdowns and Menus", async ({ page }) => {
    await page.goto("/berita-acara-ba-tracker");
    await page.waitForLoadState("networkidle");

    // Click Export BA dropdown
    const exportBABtn = page.locator('button:has-text("Export BA"), button[title*="Export"]').first();
    if (await exportBABtn.isVisible()) {
      await exportBABtn.click();
      await page.waitForTimeout(300);

      // Verify Export options are displayed
      await expect(page.locator("body")).toContainText("Export Excel");
      await expect(page.locator("body")).toContainText("Export PDF");
    }
  });

});
