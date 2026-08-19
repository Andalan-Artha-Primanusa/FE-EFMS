package httpapi

import (
	"strconv"
	"strings"

	"financeerp/backend/internal/app"

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

func (api *fiberAPI) users(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "user_management", "manage"); err != nil {
		return err
	}
	users, err := api.service.Users(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(users)
}

func (api *fiberAPI) createUser(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "user_management", "manage"); err != nil {
		return err
	}
	var input app.UserInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	actor := currentFiberUser(c)
	user, err := api.service.CreateUser(c.UserContext(), actor, input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(user)
}

func (api *fiberAPI) updateUser(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "user_management", "manage"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid user ID")
	}
	var input app.UserInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	actor := currentFiberUser(c)
	user, err := api.service.UpdateUser(c.UserContext(), actor, id, input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(user)
}

func (api *fiberAPI) deleteUser(c *fiber.Ctx) error {
	if err := checkRolePermission(c, api.service, "user_management", "manage"); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid user ID")
	}
	actor := currentFiberUser(c)
	if err := api.service.DeleteUser(c.UserContext(), actor, id, c.IP(), c.Get("User-Agent")); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
