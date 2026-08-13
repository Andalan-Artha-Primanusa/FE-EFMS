package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) closingPeriods(c *fiber.Ctx) error {
	items, err := api.service.ClosingPeriods(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) closePeriod(c *fiber.Ctx) error {
	var input struct {
		Period string `json:"period"`
	}
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.ClosePeriod(c.UserContext(), currentFiberUser(c), input.Period, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}
