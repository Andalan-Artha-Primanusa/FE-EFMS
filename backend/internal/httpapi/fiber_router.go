package httpapi

import (
	"financeerp/backend/internal/app"
	"financeerp/backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func NewFiberApp(service *app.Service, cfg config.Config) *fiber.App {
	api := &fiberAPI{service: service, cfg: cfg}
	f := fiber.New(fiber.Config{
		AppName:      "FinanceERP API",
		ErrorHandler: fiberError,
	})
	api.registerRoutes(f)
	return f
}

type fiberAPI struct {
	service *app.Service
	cfg     config.Config
}

func (api *fiberAPI) registerRoutes(f *fiber.App) {
	f.Use(cors.New(cors.Config{
		AllowOrigins:     api.cfg.CORSOrigin,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Authorization, Content-Type",
		ExposeHeaders:    "Content-Disposition",
		AllowCredentials: true,
		MaxAge:           86400,
	}))
	f.Get("/health", api.health)
	f.Post("/api/auth/login", api.login)
	f.Post("/api/auth/forgot-password", api.accepted)

	secured := f.Group("/api", api.auth)
	secured.Get("/auth/me", api.me)
	secured.Post("/auth/logout", api.noContent)
	secured.Post("/auth/change-password", api.accepted)
	secured.Get("/dashboard", api.dashboard)
	secured.Get("/finance-flow", api.financeFlow)
	secured.Get("/modules", api.modules)
	secured.Get("/roles", api.roles)
	secured.Get("/permissions/my", api.myPermissions)
	secured.Get("/number-ranges/preview", api.numberPreview)
	secured.Get("/master-data", api.masterData)
	secured.Post("/master-data", api.createMasterData)
	secured.Put("/master-data/:id", api.updateMasterData)
	secured.Delete("/master-data/:id", api.deleteMasterData)
	secured.Post("/budgets/validate", api.validateBudget)
	secured.Get("/transactions", api.transactions)
	secured.Post("/transactions", api.createTransaction)
	secured.Put("/transactions/:id", api.updateTransaction)
	secured.Delete("/transactions/:id", api.deleteTransaction)
	secured.Post("/approvals/:id/action", api.approvalAction)
	secured.Get("/operational-transactions", api.operationalTransactions)
	secured.Post("/operational-transactions", api.createOperationalTransaction)
	secured.Get("/accounting/runs", api.accountingRuns)
	secured.Post("/accounting/generate-journal", api.generateJournal)
	secured.Get("/reconciliations", api.reconciliations)
	secured.Post("/reconciliations", api.createReconciliation)
	secured.Get("/closing-periods", api.closingPeriods)
	secured.Post("/closing-periods/close", api.closePeriod)
	secured.Post("/documents", api.uploadDocument)
	secured.Get("/import/templates/:type", api.importTemplate)
	secured.Post("/imports/:type", api.importCSV)
	secured.Get("/audit-logs", api.auditLogs)
	secured.Get("/reports/catalog", api.reportCatalog)
	secured.Get("/reports/financial-summary", api.financialSummary)
	secured.Get("/management-dashboard", api.managementDashboard)
}
