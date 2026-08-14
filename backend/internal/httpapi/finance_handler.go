package httpapi

import (
	"encoding/json"
	"log"
	"regexp"
	"strconv"

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
