package httpapi

import (
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func (api *fiberAPI) getUploadDir() string {
	localDir := "./uploads"
	_ = os.MkdirAll(localDir, 0o755)

	netDir := strings.TrimSpace(api.cfg.UploadDir)
	if netDir != "" && netDir != localDir {
		if err := os.MkdirAll(netDir, 0o755); err == nil {
			return netDir
		}
	}
	return localDir
}

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

	// Always ensure local ./uploads exists and save there
	localDir := "./uploads"
	_ = os.MkdirAll(localDir, 0o755)
	localTarget := filepath.Join(localDir, stored)

	out, err := os.Create(localTarget)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat file di folder uploads: "+err.Error())
	}
	defer out.Close()

	size, err := io.Copy(out, file)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal menyalin isi file: "+err.Error())
	}

	// Also copy to network share if configured and different
	netDir := strings.TrimSpace(api.cfg.UploadDir)
	if netDir != "" && netDir != localDir {
		go func(src, dstFolder, filename string) {
			_ = os.MkdirAll(dstFolder, 0o755)
			dstPath := filepath.Join(dstFolder, filename)
			inF, errO := os.Open(src)
			if errO != nil {
				return
			}
			defer inF.Close()
			outF, errC := os.Create(dstPath)
			if errC != nil {
				return
			}
			defer outF.Close()
			_, _ = io.Copy(outF, inF)
		}(localTarget, netDir, stored)
	}

	user := currentFiberUser(c)
	api.service.Audit(c.UserContext(), user.ID, "Document Management", "Upload", module, referenceID, nil, map[string]any{"file": header.Filename, "stored": stored, "category": category, "size": size}, c.IP(), c.Get("User-Agent"))

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"fileName":   header.Filename,
		"storedName": stored,
		"url":        "/uploads/" + stored,
		"sizeBytes":  size,
		"uploadDir":  localDir,
	})
}

func (api *fiberAPI) serveUploadedFile(c *fiber.Ctx) error {
	filename := filepath.Base(c.Params("filename"))
	if filename == "" || filename == "." || filename == "/" {
		return fiber.NewError(fiber.StatusBadRequest, "Nama file tidak valid")
	}

	searchPaths := []string{
		filepath.Join("./uploads", filename),
		filepath.Join("uploads", filename),
		filepath.Join(api.cfg.UploadDir, filename),
		filepath.Join(".", filename),
	}

	var target string
	for _, p := range searchPaths {
		if strings.TrimSpace(p) == "" {
			continue
		}
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			target = p
			break
		}
	}

	if target == "" {
		return fiber.NewError(fiber.StatusNotFound, "Dokumen PDF tidak ditemukan di server: "+filename)
	}

	ext := filepath.Ext(filename)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		if strings.EqualFold(ext, ".pdf") {
			mimeType = "application/pdf"
		} else {
			mimeType = "application/octet-stream"
		}
	}

	c.Set("Content-Type", mimeType)
	c.Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	return c.SendFile(target)
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
