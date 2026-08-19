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
