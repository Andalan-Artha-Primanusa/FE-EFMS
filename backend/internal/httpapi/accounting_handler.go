package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) accountingRuns(c *fiber.Ctx) error {
	items, err := api.service.AccountingRuns(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) generateJournal(c *fiber.Ctx) error {
	var input struct {
		SourceModule    string `json:"sourceModule"`
		SourceReference string `json:"sourceReference"`
	}
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.GenerateJournal(c.UserContext(), currentFiberUser(c), input.SourceModule, input.SourceReference, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}
