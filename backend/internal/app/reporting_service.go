package app

import "context"

func (s *Service) ReportCatalog(ctx context.Context) ([]ReportCatalogItem, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT code, name, category, JSON_UNQUOTE(exports), JSON_UNQUOTE(filters), description FROM report_catalog ORDER BY category, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ReportCatalogItem
	for rows.Next() {
		var item ReportCatalogItem
		var exportsJSON, filtersJSON string
		if err := rows.Scan(&item.Code, &item.Name, &item.Category, &exportsJSON, &filtersJSON, &item.Description); err != nil {
			return nil, err
		}
		_ = decodeJSONStringArray(exportsJSON, &item.Exports)
		_ = decodeJSONStringArray(filtersJSON, &item.Filters)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) ManagementIndicators(ctx context.Context) ([]ManagementIndicator, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT code, label, value, unit, status FROM management_indicators ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ManagementIndicator
	for rows.Next() {
		var item ManagementIndicator
		if err := rows.Scan(&item.Code, &item.Label, &item.Value, &item.Unit, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
