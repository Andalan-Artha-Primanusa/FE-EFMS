package httpapi

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok", "time": time.Now()})
}
