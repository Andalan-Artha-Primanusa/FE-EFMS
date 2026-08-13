package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) importTemplate(c *fiber.Ctx) error {
	importType := c.Params("type")
	template, err := api.service.ImportTemplate(importType)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="`+importType+`-template.csv"`)
	return c.SendString(template)
}

func (api *fiberAPI) importCSV(c *fiber.Ctx) error {
	header, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	file, err := header.Open()
	if err != nil {
		return err
	}
	defer file.Close()
	result, err := api.service.ImportCSV(c.UserContext(), currentFiberUser(c), c.Params("type"), file, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(result)
}
