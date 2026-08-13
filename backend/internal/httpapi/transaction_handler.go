package httpapi

import (
	"strconv"

	"financeerp/backend/internal/app"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) transactions(c *fiber.Ctx) error {
	items, err := api.service.Transactions(c.UserContext(), c.Query("status"))
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) createTransaction(c *fiber.Ctx) error {
	var input app.TransactionInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.CreateTransaction(c.UserContext(), currentFiberUser(c), input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (api *fiberAPI) updateTransaction(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "transaction id tidak valid")
	}
	var input app.TransactionInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.UpdateTransaction(c.UserContext(), currentFiberUser(c), id, input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(item)
}

func (api *fiberAPI) deleteTransaction(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "transaction id tidak valid")
	}
	if err := api.service.CancelTransaction(c.UserContext(), currentFiberUser(c), id, c.IP(), c.Get("User-Agent")); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"status": "cancelled"})
}

func (api *fiberAPI) approvalAction(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "approval id tidak valid")
	}
	var action app.ApprovalAction
	if err := c.BodyParser(&action); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := api.service.Approve(c.UserContext(), currentFiberUser(c), id, action, c.IP(), c.Get("User-Agent")); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
