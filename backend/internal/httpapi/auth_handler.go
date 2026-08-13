package httpapi

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) login(c *fiber.Ctx) error {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	result, err := api.service.Login(c.UserContext(), strings.TrimSpace(input.Email), input.Password, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	return c.JSON(result)
}

func (api *fiberAPI) me(c *fiber.Ctx) error {
	return c.JSON(currentFiberUser(c))
}

func (api *fiberAPI) accepted(c *fiber.Ctx) error {
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"status": "accepted"})
}

func (api *fiberAPI) noContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}
