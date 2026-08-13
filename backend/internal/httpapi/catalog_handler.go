package httpapi

import (
	"strconv"

	"financeerp/backend/internal/app"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) financeFlow(c *fiber.Ctx) error {
	data, err := api.service.FinanceFlow(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(data)
}

func (api *fiberAPI) modules(c *fiber.Ctx) error {
	return c.JSON(api.service.Modules())
}

func (api *fiberAPI) roles(c *fiber.Ctx) error {
	roles, err := api.service.Roles(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(roles)
}

func (api *fiberAPI) myPermissions(c *fiber.Ctx) error {
	permissions, err := api.service.PermissionsForRole(c.UserContext(), currentFiberUser(c).Role)
	if err != nil {
		return err
	}
	return c.JSON(permissions)
}

func (api *fiberAPI) masterData(c *fiber.Ctx) error {
	items, err := api.service.MasterRecords(c.UserContext(), c.Query("type"))
	if err != nil {
		return err
	}
	return c.JSON(items)
}

func (api *fiberAPI) numberPreview(c *fiber.Ctx) error {
	objectCode := c.Query("object")
	objectType := c.Query("type", "*")
	if objectCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "object wajib diisi")
	}
	number, err := api.service.PreviewNumber(c.UserContext(), objectCode, objectType)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"object": objectCode, "type": objectType, "nextNumber": number})
}

func (api *fiberAPI) createMasterData(c *fiber.Ctx) error {
	var input app.MasterRecordInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.CreateMasterRecord(c.UserContext(), currentFiberUser(c), input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (api *fiberAPI) updateMasterData(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "master data id tidak valid")
	}
	var input app.MasterRecordInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	item, err := api.service.UpdateMasterRecord(c.UserContext(), currentFiberUser(c), id, input, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(item)
}

func (api *fiberAPI) deleteMasterData(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "master data id tidak valid")
	}
	if err := api.service.DeleteMasterRecord(c.UserContext(), currentFiberUser(c), id, c.IP(), c.Get("User-Agent")); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"status": "inactive"})
}
