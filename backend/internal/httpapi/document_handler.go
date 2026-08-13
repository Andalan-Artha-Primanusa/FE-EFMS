package httpapi

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) uploadDocument(c *fiber.Ctx) error {
	header, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	file, err := header.Open()
	if err != nil {
		return err
	}
	defer file.Close()
	module := defaultString(c.FormValue("module"), "Document Management")
	referenceID := defaultString(c.FormValue("referenceId"), "0")
	category := defaultString(c.FormValue("category"), "General")
	stored := fmt.Sprintf("%d-%s", time.Now().UnixNano(), safeFileName(header.Filename))
	target := filepath.Join(api.cfg.UploadDir, stored)
	out, err := os.Create(target)
	if err != nil {
		return err
	}
	defer out.Close()
	size, err := io.Copy(out, file)
	if err != nil {
		return err
	}
	user := currentFiberUser(c)
	api.service.Audit(c.UserContext(), user.ID, "Document Management", "Upload", module, referenceID, nil, map[string]any{"file": header.Filename, "stored": stored, "category": category, "size": size}, c.IP(), c.Get("User-Agent"))
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"fileName": header.Filename, "storedName": stored, "sizeBytes": size, "uploadDir": api.cfg.UploadDir})
}

func safeFileName(name string) string {
	name = filepath.Base(name)
	replacer := strings.NewReplacer(" ", "-", "/", "-", "\\", "-", ":", "-", "*", "-", "?", "-", "\"", "-", "<", "-", ">", "-", "|", "-")
	return strings.ToLower(replacer.Replace(name))
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
