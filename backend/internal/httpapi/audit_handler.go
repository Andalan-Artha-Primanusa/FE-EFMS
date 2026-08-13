package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) auditLogs(c *fiber.Ctx) error {
	logs, err := api.service.AuditLogs(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(logs)
}
