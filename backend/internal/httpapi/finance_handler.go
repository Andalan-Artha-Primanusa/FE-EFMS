package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"regexp"
	"strconv"
	"strings"

	"financeerp/backend/internal/app"

	"github.com/gofiber/fiber/v2"
)

var jsonDateEmptyRegex = regexp.MustCompile(`"([^"]*(?:Date|Time|date|time))":\s*""`)

func parseCleanJSONBody[T any](c *fiber.Ctx, out *T) error {
	raw := c.Body()
	if len(raw) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Empty request body")
	}
	cleaned := jsonDateEmptyRegex.ReplaceAll(raw, []byte(`"$1":null`))
	if err := json.Unmarshal(cleaned, out); err != nil {
		log.Printf("[JSON Unmarshal Error] %v | Cleaned: %s", err, string(cleaned))
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body: "+err.Error())
	}
	return nil
}

func (api *fiberAPI) financeDashboard(c *fiber.Ctx) error {
	data, err := api.service.GetFinanceDashboard(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

// ================= BA TRACKER HANDLERS =================

func (api *fiberAPI) baTrackers(c *fiber.Ctx) error {
	data, err := api.service.GetBATrackers(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveBATracker(c *fiber.Ctx) error {
	var body app.BATracker
	if err := parseCleanJSONBody(c, &body); err != nil {
		return err
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveBATracker(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteBATracker(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteBATracker(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ================= INVOICE HANDLERS =================

func (api *fiberAPI) financeInvoices(c *fiber.Ctx) error {
	data, err := api.service.GetFinanceInvoices(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveInvoice(c *fiber.Ctx) error {
	var body app.InvoiceMaster
	if err := parseCleanJSONBody(c, &body); err != nil {
		return err
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveInvoice(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteInvoice(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func checkRolePermission(c *fiber.Ctx, module string, action string) error {
	u := currentFiberUser(c)
	role := strings.TrimSpace(u.Role)
	if app.IsSuperAdminRole(role) {
		return nil
	}

	allowed := false
	switch module {
	case "ba_tracker":
		switch action {
		case "verify":
			allowed = role == "Finance Specialist" || role == "Finance Specialist AAP" || role == "SPV Verificator" || role == "SPV Site" || role == "SPV" || role == "Finance Manager" || role == "FATB Manager" || role == "Manager" || role == "Finance Admin" || role == "Admin Finance HO" || role == "Super Admin" || role == "Superadmin"
		case "approve":
			allowed = role == "FATB Manager" || role == "Finance Manager" || role == "Manager" || role == "General Manager" || role == "Director" || role == "Direktur" || role == "Finance Admin" || role == "Super Admin" || role == "Superadmin"
		case "write", "save", "delete":
			allowed = role == "Finance Specialist" || role == "Finance Specialist AAP" || role == "Admin Finance Site" || role == "Admin Finance HO" || role == "Finance Admin" || role == "Finance Manager" || role == "FATB Manager" || role == "Manager" || role == "SPV Site" || role == "SPV Verificator" || role == "SPV" || role == "Super Admin" || role == "Superadmin"
		}
	case "invoice":
		switch action {
		case "verify":
			allowed = role == "SPV Verificator" || role == "SPV Site" || role == "SPV" || role == "Finance Manager" || role == "Manager" || role == "Finance Admin" || role == "Admin Finance HO"
		case "approve_tier1":
			allowed = role == "Finance Manager" || role == "Manager" || role == "General Manager" || role == "Finance Admin"
		case "approve_tier2":
			allowed = role == "Director" || role == "Direktur" || role == "General Manager" || role == "Finance Manager" || role == "Manager"
		case "write", "save", "delete":
			allowed = role == "Admin Finance Site" || role == "Admin Finance HO" || role == "Finance Admin" || role == "Account Receivable Officer" || role == "Finance Manager" || role == "Manager"
		}
	case "payment":
		switch action {
		case "verify":
			allowed = role == "Finance Specialist" || role == "SPV Verificator" || role == "SPV" || role == "Treasury" || role == "Finance Manager" || role == "Manager" || role == "Finance Admin"
		case "write", "save", "delete":
			allowed = role == "Treasury Admin" || role == "AR Admin" || role == "Account Receivable Officer" || role == "Treasury" || role == "Finance Admin" || role == "Finance Manager" || role == "Manager"
		}
	case "customer", "master_data":
		allowed = role == "Finance Manager" || role == "Manager" || role == "Finance Admin" || role == "Admin Finance HO" || role == "Account Receivable Officer"
	}

	if !allowed {
		return fiber.NewError(fiber.StatusForbidden, fmt.Sprintf("Akses Ditolak: Role '%s' tidak memiliki izin untuk %s %s", u.Role, action, module))
	}
	return nil
}

func (api *fiberAPI) verifyBATracker(c *fiber.Ctx) error {
	if err := checkRolePermission(c, "ba_tracker", "verify"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	var req app.DocumentApprovalAction
	_ = c.BodyParser(&req)
	user := currentFiberUser(c)
	actor := "SPV Verifikator"
	if user.Name != "" {
		actor = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.VerifyBATracker(c.Context(), id, req.Action, req.Note, actor)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) approveBATracker(c *fiber.Ctx) error {
	if err := checkRolePermission(c, "ba_tracker", "approve"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	var req app.DocumentApprovalAction
	_ = c.BodyParser(&req)
	user := currentFiberUser(c)
	actor := "Manager Operasional/Finance"
	if user.Name != "" {
		actor = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.ApproveBATracker(c.Context(), id, req.Action, req.Note, actor)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) verifyInvoice(c *fiber.Ctx) error {
	if err := checkRolePermission(c, "invoice", "verify"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	var req app.DocumentApprovalAction
	_ = c.BodyParser(&req)
	user := currentFiberUser(c)
	actor := "SPV Verifikator"
	if user.Name != "" {
		actor = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.VerifyInvoice(c.Context(), id, req.Action, req.Note, actor)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) approveInvoiceTier1(c *fiber.Ctx) error {
	if err := checkRolePermission(c, "invoice", "approve_tier1"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	var req app.DocumentApprovalAction
	_ = c.BodyParser(&req)
	user := currentFiberUser(c)
	actor := "Finance Manager"
	if user.Name != "" {
		actor = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.ApproveInvoiceTier1(c.Context(), id, req.Action, req.Note, actor)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) approveInvoiceTier2(c *fiber.Ctx) error {
	if err := checkRolePermission(c, "invoice", "approve_tier2"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	var req app.DocumentApprovalAction
	_ = c.BodyParser(&req)
	user := currentFiberUser(c)
	actor := "Direktur Utama"
	if user.Name != "" {
		actor = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.ApproveInvoiceTier2(c.Context(), id, req.Action, req.Note, actor)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

// ================= PAYMENT HANDLERS =================

func (api *fiberAPI) financePayments(c *fiber.Ctx) error {
	data, err := api.service.GetFinancePayments(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) savePayment(c *fiber.Ctx) error {
	var body app.PaymentLog
	if err := parseCleanJSONBody(c, &body); err != nil {
		return err
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SavePayment(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) verifyPayment(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	type reqBody struct {
		VerifiedBy string `json:"verifiedBy"`
	}
	var body reqBody
	_ = parseCleanJSONBody(c, &body)
	res, err := api.service.VerifyPayment(c.Context(), id, body.VerifiedBy)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deletePayment(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeletePayment(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ================= CUSTOMER HANDLERS =================

func (api *fiberAPI) financeCustomers(c *fiber.Ctx) error {
	data, err := api.service.GetFinanceCustomers(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveCustomer(c *fiber.Ctx) error {
	var body app.CustomerMaster
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body")
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveCustomer(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteCustomer(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteCustomer(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ================= VARIABLE SOW HANDLERS =================

func (api *fiberAPI) variableSOWs(c *fiber.Ctx) error {
	data, err := api.service.GetVariableSOWs(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveVariableSOW(c *fiber.Ctx) error {
	var body app.VariableSOW
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body")
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveVariableSOW(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteVariableSOW(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteVariableSOW(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ================= RAISE & FALL HANDLERS =================

func (api *fiberAPI) raiseFallMasters(c *fiber.Ctx) error {
	data, err := api.service.GetRaiseFallMasters(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveRaiseFallMaster(c *fiber.Ctx) error {
	var body app.RaiseFallMaster
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body")
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveRaiseFallMaster(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteRaiseFallMaster(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteRaiseFallMaster(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ================= DAILY EXCHANGE RATE HANDLERS =================

func (api *fiberAPI) dailyExchangeRates(c *fiber.Ctx) error {
	data, err := api.service.GetDailyExchangeRates(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveDailyExchangeRate(c *fiber.Ctx) error {
	var body app.DailyExchangeRate
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body")
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveDailyExchangeRate(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) importBIExchangeRates(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "No file uploaded")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Failed to read uploaded file")
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Failed to read file buffer")
	}

	period := c.FormValue("period")
	if period == "" {
		period = "Juni 2026"
	}

	avgMRate, rfIndex, count, err := api.service.ImportBIExchangeRatesFromBytes(c.Context(), fileBytes, period)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	return c.JSON(fiber.Map{
		"message":       fmt.Sprintf("Berhasil mengimpor %d data kurs dari file Excel BI! Rata-rata M-Rate (Xn): Rp %.2f, RF Index: %.3f", count, avgMRate, rfIndex),
		"count":         count,
		"avgMRate":      avgMRate,
		"rfIndexResult": rfIndex,
	})
}

// ================= BANK ACCOUNT HANDLERS =================

func (api *fiberAPI) bankAccounts(c *fiber.Ctx) error {
	data, err := api.service.GetBankAccounts(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) saveBankAccount(c *fiber.Ctx) error {
	var body app.BankAccountMaster
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON body")
	}
	idParam := c.Params("id")
	if idParam != "" {
		id, _ := strconv.ParseInt(idParam, 10, 64)
		body.ID = id
	}
	res, err := api.service.SaveBankAccount(c.Context(), body)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(res)
}

func (api *fiberAPI) deleteBankAccount(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteBankAccount(c.Context(), id); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

