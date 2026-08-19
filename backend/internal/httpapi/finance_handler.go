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
	if err := checkRolePermission(c, api.service, "ba_tracker", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "ba_tracker", "save", "BATracker", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteBATracker(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "ba_tracker", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteBATracker(c.Context(), id); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "ba_tracker", "delete", "BATracker", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "invoice", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "invoice", "save", "InvoiceMaster", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteInvoice(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "invoice", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteInvoice(c.Context(), id); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "invoice", "delete", "InvoiceMaster", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
	return c.SendStatus(fiber.StatusNoContent)
}

func checkRolePermission(c *fiber.Ctx, svc *app.Service, module string, action string) error {
	u := currentFiberUser(c)
	role := strings.TrimSpace(u.Role)
	if app.IsSuperAdminRole(role) {
		return nil
	}

	if svc != nil && svc.HasPermission(c.UserContext(), role, module, action) {
		return nil
	}

	return fiber.NewError(fiber.StatusForbidden, fmt.Sprintf("Akses Ditolak: Role '%s' tidak memiliki izin untuk %s %s", u.Role, action, module))
}

func (api *fiberAPI) verifyBATracker(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "ba_tracker", "verify"); err != nil {
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
	api.service.Audit(c.Context(), user.ID, "ba_tracker", "verify", "BATracker", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) approveBATracker(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "ba_tracker", "approve"); err != nil {
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
	api.service.Audit(c.Context(), user.ID, "ba_tracker", "approve", "BATracker", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) verifyInvoice(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "invoice", "verify"); err != nil {
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
	api.service.Audit(c.Context(), user.ID, "invoice", "verify", "InvoiceMaster", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) approveInvoiceTier1(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "invoice", "approve_tier1"); err != nil {
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
	api.service.Audit(c.Context(), user.ID, "invoice", "approve_tier1", "InvoiceMaster", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) approveInvoiceTier2(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "invoice", "approve_tier2"); err != nil {
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
	api.service.Audit(c.Context(), user.ID, "invoice", "approve_tier2", "InvoiceMaster", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "payment", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "payment", "save", "PaymentLog", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) verifyPayment(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "payment", "verify"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	type reqBody struct {
		VerifiedBy string `json:"verifiedBy"`
	}
	var body reqBody
	_ = parseCleanJSONBody(c, &body)
	user := currentFiberUser(c)
	verifierName := body.VerifiedBy
	if verifierName == "" && user.Name != "" {
		verifierName = fmt.Sprintf("%s (%s)", user.Name, user.Role)
	}
	res, err := api.service.VerifyPayment(c.Context(), id, verifierName)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	api.service.Audit(c.Context(), user.ID, "payment", "verify", "PaymentLog", strconv.FormatInt(id, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deletePayment(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "payment", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeletePayment(c.Context(), id); err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "payment", "delete", "PaymentLog", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "customer", "save", "CustomerMaster", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteCustomer(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "master_data", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteCustomer(c.Context(), id); err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "customer", "delete", "CustomerMaster", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "variable_sow", "save", "VariableSOW", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteVariableSOW(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "master_data", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteVariableSOW(c.Context(), id); err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "variable_sow", "delete", "VariableSOW", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "raise_fall", "save", "RaiseFallMaster", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteRaiseFallMaster(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "master_data", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteRaiseFallMaster(c.Context(), id); err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "raise_fall", "delete", "RaiseFallMaster", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
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
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "exchange_rate", "save", "DailyExchangeRate", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) importBIExchangeRates(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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

	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "exchange_rate", "import", "BIExchangeRate", period, nil, map[string]any{"count": count, "avgMRate": avgMRate, "rfIndex": rfIndex}, c.IP(), c.Get("User-Agent"))

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
	if err := checkRolePermission(c, api.service, "master_data", "write"); err != nil {
		return err
	}
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
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "bank_account", "save", "BankAccountMaster", strconv.FormatInt(res.ID, 10), nil, res, c.IP(), c.Get("User-Agent"))
	return c.JSON(res)
}

func (api *fiberAPI) deleteBankAccount(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "master_data", "delete"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}
	if err := api.service.DeleteBankAccount(c.Context(), id); err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.Context(), user.ID, "bank_account", "delete", "BankAccountMaster", strconv.FormatInt(id, 10), nil, nil, c.IP(), c.Get("User-Agent"))
	return c.SendStatus(fiber.StatusNoContent)
}

