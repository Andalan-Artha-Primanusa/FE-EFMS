package httpapi

import (
	"financeerp/backend/internal/app"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) operationalTransactions(c *fiber.Ctx) error {
	items, err := api.service.OperationalTransactions(c.UserContext(), c.Query("flow"))
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) createOperationalTransaction(c *fiber.Ctx) error {
	var input app.OperationalInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.CreateOperationalTransaction(c.UserContext(), currentFiberUser(c), input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}
