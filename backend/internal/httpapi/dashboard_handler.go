package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) dashboard(c *fiber.Ctx) error {
	data, err := api.service.Dashboard(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(data)
}
