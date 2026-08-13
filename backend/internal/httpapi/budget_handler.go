package httpapi

import (
	"financeerp/backend/internal/app"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) validateBudget(c *fiber.Ctx) error {
	var input app.BudgetValidationInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	result, err := api.service.ValidateBudget(c.UserContext(), input)
	if err != nil {
		return err
	}
	return c.JSON(result)
}
