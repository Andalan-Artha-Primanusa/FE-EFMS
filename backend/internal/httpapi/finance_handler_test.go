package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"financeerp/backend/internal/app"
	"financeerp/backend/internal/config"
	"financeerp/backend/internal/security"

	"github.com/gofiber/fiber/v2"
)

func createTestToken(role string, cfg config.Config) string {
	userID := int64(1)
	if role != "Super Admin" {
		userID = 99
	}
	token, _ := security.Sign(security.Claims{
		UserID: userID,
		Email:  "testuser@financeerp.local",
		Role:   role,
		Exp:    time.Now().Add(1 * time.Hour).Unix(),
	}, cfg.AppSecret)
	return token
}

func TestVerifyBATracker_SuperAdmin(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	token := createTestToken("Super Admin", cfg)
	body, _ := json.Marshal(map[string]string{
		"action": "verify",
		"note":   "Verifikasi Berita Acara oleh Super Admin",
	})

	req := httptest.NewRequest("POST", "/api/finance/ba-trackers/102/verify", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestVerifyBATracker_UnauthorizedRole(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	token := createTestToken("Department User", cfg)
	body, _ := json.Marshal(map[string]string{
		"action": "verify",
		"note":   "Attempt by unauthorized role",
	})

	req := httptest.NewRequest("POST", "/api/finance/ba-trackers/102/verify", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("Expected status 403 Forbidden for unauthorized role, got %d", resp.StatusCode)
	}
}

func TestApproveBATracker_Manager(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	token := createTestToken("Finance Manager", cfg)
	body, _ := json.Marshal(map[string]string{
		"action": "approve",
		"note":   "Disetujui oleh Finance Manager",
	})

	req := httptest.NewRequest("POST", "/api/finance/ba-trackers/102/approve", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestInvoiceWorkflow_SuperAdmin(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	token := createTestToken("Super Admin", cfg)

	// Step 1: Verify Invoice
	body1, _ := json.Marshal(map[string]string{"action": "verify", "note": "SPV Verify"})
	req1 := httptest.NewRequest("POST", "/api/finance/invoices/50/verify", bytes.NewReader(body1))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+token)

	resp1, _ := fiberApp.Test(req1, -1)
	if resp1.StatusCode != fiber.StatusOK {
		t.Fatalf("Invoice verify failed, got %d", resp1.StatusCode)
	}

	// Step 2: Approve Tier 1
	body2, _ := json.Marshal(map[string]string{"action": "approve", "note": "Tier 1 Approval"})
	req2 := httptest.NewRequest("POST", "/api/finance/invoices/50/approve-tier1", bytes.NewReader(body2))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)

	resp2, _ := fiberApp.Test(req2, -1)
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("Invoice approve tier 1 failed, got %d", resp2.StatusCode)
	}

	// Step 3: Approve Tier 2
	body3, _ := json.Marshal(map[string]string{"action": "approve", "note": "Tier 2 Approval"})
	req3 := httptest.NewRequest("POST", "/api/finance/invoices/50/approve-tier2", bytes.NewReader(body3))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("Authorization", "Bearer "+token)

	resp3, _ := fiberApp.Test(req3, -1)
	if resp3.StatusCode != fiber.StatusOK {
		t.Fatalf("Invoice approve tier 2 failed, got %d", resp3.StatusCode)
	}
}

func TestVerifyPayment_SuperAdmin(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	token := createTestToken("Super Admin", cfg)
	body, _ := json.Marshal(map[string]string{
		"verifiedBy": "Super Admin Auditor",
	})

	req := httptest.NewRequest("PUT", "/api/finance/payments/1/verify", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected status 200 for payment verify, got %d", resp.StatusCode)
	}
}

func TestSaveBATracker_RBAC(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	// 1. Department User should be forbidden (403)
	depToken := createTestToken("Department User", cfg)
	baBody, _ := json.Marshal(map[string]any{
		"customerCode": "POS",
		"workPeriod":   "Juni 2026",
		"workAmount":   500000000,
	})
	req1 := httptest.NewRequest("POST", "/api/finance/ba-trackers", bytes.NewReader(baBody))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+depToken)
	resp1, _ := fiberApp.Test(req1, -1)
	if resp1.StatusCode != fiber.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for Department User creating BA, got %d", resp1.StatusCode)
	}

	// 2. Admin Finance Site should be allowed (200)
	siteToken := createTestToken("Admin Finance Site", cfg)
	req2 := httptest.NewRequest("POST", "/api/finance/ba-trackers", bytes.NewReader(baBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+siteToken)
	resp2, _ := fiberApp.Test(req2, -1)
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Admin Finance Site creating BA, got %d", resp2.StatusCode)
	}
}

func TestSaveInvoice_RBAC(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	invBody, _ := json.Marshal(map[string]any{
		"invoiceNo":    "099/POS-AAP/RF/VI/2026",
		"customerCode": "POS",
		"totalInvoice": 1000000000,
		"subTotalDPP":  1000000000,
	})

	// 1. Department User should be forbidden (403)
	depToken := createTestToken("Department User", cfg)
	req1 := httptest.NewRequest("POST", "/api/finance/invoices", bytes.NewReader(invBody))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+depToken)
	resp1, _ := fiberApp.Test(req1, -1)
	if resp1.StatusCode != fiber.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for Department User creating invoice, got %d", resp1.StatusCode)
	}

	// 2. Admin Finance HO should be allowed (200)
	hoToken := createTestToken("Admin Finance HO", cfg)
	req2 := httptest.NewRequest("POST", "/api/finance/invoices", bytes.NewReader(invBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+hoToken)
	resp2, _ := fiberApp.Test(req2, -1)
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Admin Finance HO creating invoice, got %d", resp2.StatusCode)
	}
}

func TestSavePayment_And_Reconciliation(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	treasuryToken := createTestToken("Treasury", cfg)

	// Create payment
	payBody, _ := json.Marshal(map[string]any{
		"invoiceNo":          "019/SBS-AAP/RF/VI/2026",
		"customerCode":       "SBS",
		"amountPaid":         250000000,
		"receivingBank":      "Bank Mandiri Escrow",
		"refNo":              "TRF-SBS-TEST-001",
		"verificationStatus": "Verified",
	})
	req := httptest.NewRequest("POST", "/api/finance/payments", bytes.NewReader(payBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+treasuryToken)
	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Treasury saving payment, got %d", resp.StatusCode)
	}
}

func TestDeleteInvoice_WithPayment_Blocked(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	mgrToken := createTestToken("Finance Manager", cfg)

	// Invoice ID 8 has payments recorded in global store ("012/SBS-AAP/XI/2025")
	req := httptest.NewRequest("DELETE", "/api/finance/invoices/8", nil)
	req.Header.Set("Authorization", "Bearer "+mgrToken)
	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request when deleting invoice with payments, got %d", resp.StatusCode)
	}
}

func TestMasterData_RBAC(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	// 1. Department User should be forbidden (403) from saving customer
	depToken := createTestToken("Department User", cfg)
	custBody, _ := json.Marshal(map[string]any{
		"code":     "NEWCUS",
		"fullName": "PT New Customer Mining",
	})
	req1 := httptest.NewRequest("POST", "/api/finance/customers", bytes.NewReader(custBody))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+depToken)
	resp1, _ := fiberApp.Test(req1, -1)
	if resp1.StatusCode != fiber.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for Department User saving customer, got %d", resp1.StatusCode)
	}

	// 2. Finance Manager should be allowed (200)
	mgrToken := createTestToken("Finance Manager", cfg)
	req2 := httptest.NewRequest("POST", "/api/finance/customers", bytes.NewReader(custBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+mgrToken)
	resp2, _ := fiberApp.Test(req2, -1)
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Finance Manager saving customer, got %d", resp2.StatusCode)
	}
}

func TestUserManagement_RBAC_CRUD(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)

	// 1. Department User should be forbidden (403)
	depToken := createTestToken("Department User", cfg)
	userBody, _ := json.Marshal(map[string]any{
		"name":     "Budi Santoso",
		"email":    "budi.santoso@financeerp.local",
		"password": "Password@123",
		"role":     "SPV Verificator",
		"status":   "active",
	})
	req1 := httptest.NewRequest("POST", "/api/users", bytes.NewReader(userBody))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+depToken)
	resp1, _ := fiberApp.Test(req1, -1)
	if resp1.StatusCode != fiber.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for Department User creating user, got %d", resp1.StatusCode)
	}

	// 2. Super Admin should be allowed to Create User (201)
	adminToken := createTestToken("Super Admin", cfg)
	req2 := httptest.NewRequest("POST", "/api/users", bytes.NewReader(userBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+adminToken)
	resp2, err := fiberApp.Test(req2, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	if resp2.StatusCode != fiber.StatusCreated {
		t.Fatalf("Expected 201 Created for Super Admin creating user, got %d", resp2.StatusCode)
	}

	// 3. Super Admin should be able to List Users (200)
	req3 := httptest.NewRequest("GET", "/api/users", nil)
	req3.Header.Set("Authorization", "Bearer "+adminToken)
	resp3, _ := fiberApp.Test(req3, -1)
	if resp3.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Super Admin listing users, got %d", resp3.StatusCode)
	}

	// 4. Super Admin should be able to Update User Role (200)
	updateBody, _ := json.Marshal(map[string]any{
		"name":   "Budi Santoso Updated",
		"email":  "budi.santoso@financeerp.local",
		"role":   "Finance Manager",
		"status": "active",
	})
	req4 := httptest.NewRequest("PUT", "/api/users/2", bytes.NewReader(updateBody))
	req4.Header.Set("Content-Type", "application/json")
	req4.Header.Set("Authorization", "Bearer "+adminToken)
	resp4, _ := fiberApp.Test(req4, -1)
	if resp4.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for Super Admin updating user, got %d", resp4.StatusCode)
	}

	// 5. Super Admin cannot delete root user ID 1 (400)
	req5 := httptest.NewRequest("DELETE", "/api/users/1", nil)
	req5.Header.Set("Authorization", "Bearer "+adminToken)
	resp5, _ := fiberApp.Test(req5, -1)
	if resp5.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request when attempting to delete root user ID 1, got %d", resp5.StatusCode)
	}
}

func TestCoalIndex_GetAndSave(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)
	token := createTestToken("Super Admin", cfg)

	// 1. GET /api/master-data/coal-index
	req := httptest.NewRequest("GET", "/api/master-data/coal-index", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for GET coal-index, got %d", resp.StatusCode)
	}

	// 2. POST /api/master-data/coal-index (Save with weekly data)
	newIndex := app.CoalIndexMonthly{
		Period: "Agustus 2026",
		Weeks: []app.CoalIndexWeekly{
			{WeekNumber: 1, ReleaseDate: "2026-08-07", ICI3Price: 94.0, ICI4Price: 62.0},
			{WeekNumber: 2, ReleaseDate: "2026-08-14", ICI3Price: 95.0, ICI4Price: 63.0},
		},
	}
	body, _ := json.Marshal(newIndex)
	req2 := httptest.NewRequest("POST", "/api/master-data/coal-index", bytes.NewReader(body))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2, err := fiberApp.Test(req2, -1)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for POST coal-index, got %d", resp2.StatusCode)
	}

	var saved app.CoalIndexMonthly
	_ = json.NewDecoder(resp2.Body).Decode(&saved)
	if saved.ActiveTier != "Tier 3" {
		t.Fatalf("Expected ActiveTier to be Tier 3 (Avg R3 = 78.5 > 75), got %s", saved.ActiveTier)
	}
}

func TestCalculateMiningInvoice(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)
	token := createTestToken("Super Admin", cfg)

	calcInput := app.MiningInvoiceCalcInput{
		CustomerCode:       "BGG",
		WorkPeriod:         "Juni 2026",
		ClaimedOBVolume:    161986.67,
		PendingOBVolume:    48224.49,
		CoalVolume:         46683.48,
		SumproductDistance: 1239.00,
		ActualFuelFn:       21601.53,
		DPSolarDeduction:   3749363200.0,
	}

	body, _ := json.Marshal(calcInput)
	req := httptest.NewRequest("POST", "/api/finance/invoices/calculate-mining", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Calc request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for calculate-mining, got %d", resp.StatusCode)
	}

	var res app.MiningInvoiceCalcResult
	_ = json.NewDecoder(resp.Body).Decode(&res)
	if res.ActiveTier != "Tier 3" {
		t.Fatalf("Expected ActiveTier Tier 3 for Juni 2026, got %s", res.ActiveTier)
	}
	if res.OB1RateTier != 29500 {
		t.Fatalf("Expected OB1RateTier 29500 for Tier 3, got %f", res.OB1RateTier)
	}
	if res.OB2RateTier != 28750 {
		t.Fatalf("Expected OB2RateTier 28750 for Tier 3, got %f", res.OB2RateTier)
	}
	if res.SubtotalDPP <= 0 {
		t.Fatalf("Expected SubtotalDPP > 0, got %f", res.SubtotalDPP)
	}
}

func TestGenerateInvoiceFromBA_BGG(t *testing.T) {
	cfg := config.Config{AppSecret: "secret123", CORSOrigin: "http://127.0.0.1:5175"}
	svc := app.New(nil, cfg)
	fiberApp := NewFiberApp(svc, cfg)
	token := createTestToken("Super Admin", cfg)

	req := httptest.NewRequest("POST", "/api/finance/ba-trackers/12/generate-invoice", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := fiberApp.Test(req, -1)
	if err != nil {
		t.Fatalf("Generate invoice request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Expected 200 OK for generate-invoice, got %d", resp.StatusCode)
	}

	var inv app.InvoiceMaster
	_ = json.NewDecoder(resp.Body).Decode(&inv)
	if inv.CustomerCode != "BGG" {
		t.Fatalf("Expected CustomerCode BGG, got %s", inv.CustomerCode)
	}
	if inv.TotalInvoice <= 0 {
		t.Fatalf("Expected TotalInvoice > 0, got %f", inv.TotalInvoice)
	}
}


