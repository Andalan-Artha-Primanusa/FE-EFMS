package httpapi

import "github.com/gofiber/fiber/v2"

func (api *fiberAPI) reportCatalog(c *fiber.Ctx) error {
	reports, err := api.service.ReportCatalog(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(reports)
}

func (api *fiberAPI) financialSummary(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"reports": []fiber.Map{
			{"name": "Balance Sheet", "period": "Jul 2026", "status": "Ready", "export": []string{"Excel", "PDF", "Print"}},
			{"name": "Profit and Loss", "period": "Jul 2026", "status": "Ready", "export": []string{"Excel", "PDF", "Print"}},
			{"name": "Cash Flow Statement", "period": "Jul 2026", "status": "Review", "export": []string{"Excel", "PDF", "Print"}},
			{"name": "Budget versus Actual", "period": "YTD 2026", "status": "Ready", "export": []string{"Excel", "PDF", "Print"}},
		},
	})
}

func (api *fiberAPI) managementDashboard(c *fiber.Ctx) error {
	indicators, err := api.service.ManagementIndicators(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(indicators)
}
