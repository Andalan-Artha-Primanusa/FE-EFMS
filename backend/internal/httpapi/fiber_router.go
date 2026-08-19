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
		BodyLimit:    100 * 1024 * 1024, // 100 MB Body Limit for large PDF attachments
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
		AllowHeaders:     "Authorization, Content-Type, Accept, Origin, X-Requested-With, Content-Disposition",
		ExposeHeaders:    "Content-Disposition",
		AllowCredentials: true,
		MaxAge:           86400,
	}))
	f.Get("/health", api.health)
	f.Get("/uploads/:filename", api.serveUploadedFile)
	f.Post("/api/auth/login", api.login)
	f.Post("/api/auth/forgot-password", api.accepted)

	secured := f.Group("/api", api.auth)
	secured.Get("/documents/:filename", api.serveUploadedFile)
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
	secured.Get("/finance/dashboard", api.financeDashboard)

	secured.Get("/finance/ba-trackers", api.baTrackers)
	secured.Post("/finance/ba-trackers", api.saveBATracker)
	secured.Put("/finance/ba-trackers/:id", api.saveBATracker)
	secured.Post("/finance/ba-trackers/:id/verify", api.verifyBATracker)
	secured.Post("/finance/ba-trackers/:id/approve", api.approveBATracker)
	secured.Delete("/finance/ba-trackers/:id", api.deleteBATracker)

	secured.Get("/finance/invoices", api.financeInvoices)
	secured.Post("/finance/invoices", api.saveInvoice)
	secured.Put("/finance/invoices/:id", api.saveInvoice)
	secured.Post("/finance/invoices/:id/verify", api.verifyInvoice)
	secured.Post("/finance/invoices/:id/approve-tier1", api.approveInvoiceTier1)
	secured.Post("/finance/invoices/:id/approve-tier2", api.approveInvoiceTier2)
	secured.Delete("/finance/invoices/:id", api.deleteInvoice)

	secured.Get("/finance/payments", api.financePayments)
	secured.Post("/finance/payments", api.savePayment)
	secured.Put("/finance/payments/:id/verify", api.verifyPayment)
	secured.Put("/finance/payments/:id", api.savePayment)
	secured.Delete("/finance/payments/:id", api.deletePayment)

	secured.Get("/finance/customers", api.financeCustomers)
	secured.Post("/finance/customers", api.saveCustomer)
	secured.Put("/finance/customers/:id", api.saveCustomer)
	secured.Delete("/finance/customers/:id", api.deleteCustomer)

	secured.Get("/master-data/bank-accounts", api.bankAccounts)
	secured.Post("/master-data/bank-accounts", api.saveBankAccount)
	secured.Put("/master-data/bank-accounts/:id", api.saveBankAccount)
	secured.Delete("/master-data/bank-accounts/:id", api.deleteBankAccount)

	secured.Get("/master-data/variable-sow", api.variableSOWs)
	secured.Post("/master-data/variable-sow", api.saveVariableSOW)
	secured.Put("/master-data/variable-sow/:id", api.saveVariableSOW)
	secured.Delete("/master-data/variable-sow/:id", api.deleteVariableSOW)

	secured.Get("/master-data/raise-fall", api.raiseFallMasters)
	secured.Post("/master-data/raise-fall", api.saveRaiseFallMaster)
	secured.Put("/master-data/raise-fall/:id", api.saveRaiseFallMaster)
	secured.Delete("/master-data/raise-fall/:id", api.deleteRaiseFallMaster)

	secured.Get("/master-data/daily-exchange-rates", api.dailyExchangeRates)
	secured.Post("/master-data/daily-exchange-rates", api.saveDailyExchangeRate)
	secured.Put("/master-data/daily-exchange-rates/:id", api.saveDailyExchangeRate)
	secured.Post("/master-data/import-bi-exchange-rates", api.importBIExchangeRates)

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
