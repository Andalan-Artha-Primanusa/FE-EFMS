package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) reconciliations(c *fiber.Ctx) error {
	items, err := api.service.Reconciliations(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) createReconciliation(c *fiber.Ctx) error {
	var input struct {
		Type   string `json:"type"`
		Period string `json:"period"`
	}
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.CreateReconciliation(c.UserContext(), currentFiberUser(c), input.Type, input.Period, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}
