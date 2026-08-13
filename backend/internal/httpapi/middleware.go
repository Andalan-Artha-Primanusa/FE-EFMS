package httpapi

import (
	"errors"
	"strings"

	"financeerp/backend/internal/app"
	"financeerp/backend/internal/security"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) auth(c *fiber.Ctx) error {
	header := c.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return fiber.NewError(fiber.StatusUnauthorized, "token diperlukan")
	}
	claims, err := security.Verify(strings.TrimPrefix(header, "Bearer "), api.cfg.AppSecret)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	user, err := api.service.UserByID(c.UserContext(), claims.UserID)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	c.Locals("user", user)
	return c.Next()
}

func currentFiberUser(c *fiber.Ctx) app.User {
	user, _ := c.Locals("user").(app.User)
	return user
}

func fiberError(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		code = fiberErr.Code
	}
	return c.Status(code).JSON(fiber.Map{"error": err.Error()})
}
