package app

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

func (s *Service) ImportTemplate(importType string) (string, error) {
	switch importType {
	case "master_records":
		return `type,name,status,metadata
vendor,PT Example Vendor,active,"{""bpGroup"":""LOCAL"",""paymentTerm"":""N30""}"
customer,PT Example Customer,active,"{""bpGroup"":""LOCAL"",""paymentTerm"":""N30""}"
`, nil
	case "transactions":
		return "type,company_id,description,amount\nPayment Request,1,Payment sample,125000000\nExpense Request,1,Expense sample,75000000\n", nil
	case "budgets":
		return "fiscal_year,period_month,company_id,account_id,amount,status\n2026,7,1,6,250000000,Published\n", nil
	case "operational_transactions":
		return "flow,step,reference_number,partner_name,amount,status\npurchase_to_pay_ap,Vendor Invoice,AP-INV-IMPORT-001,PT Example Vendor,100000000,Submitted\n", nil
	default:
		return "", errors.New("template import tidak tersedia")
	}
}

func (s *Service) ImportCSV(ctx context.Context, actor User, importType string, reader io.Reader, ip, device string) (ImportResult, error) {
	result := ImportResult{Type: importType}
	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true
	rows, err := csvReader.ReadAll()
	if err != nil {
		return result, err
	}
	if len(rows) <= 1 {
		return result, errors.New("file CSV kosong atau tidak punya data")
	}
	headers := normalizeHeaders(rows[0])
	for index, row := range rows[1:] {
		data := rowMap(headers, row)
		if err := s.importRow(ctx, actor, importType, data); err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("baris %d: %s", index+2, err.Error()))
			continue
		}
		result.Inserted++
	}
	s.Audit(ctx, actor.ID, "Data Import", "Import CSV", importType, fmt.Sprint(result.Inserted), nil, result, ip, device)
	return result, nil
}

func (s *Service) importRow(ctx context.Context, actor User, importType string, data map[string]string) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			if importErr, ok := recovered.(importError); ok {
				err = importErr
				return
			}
			err = fmt.Errorf("%v", recovered)
		}
	}()
	switch importType {
	case "master_records":
		typ := required(data, "type")
		name := required(data, "name")
		status := defaultImport(data["status"], "active")
		metadata := defaultImport(data["metadata"], "{}")
		_, err := s.CreateMasterRecord(ctx, actor, MasterRecordInput{Type: typ, Name: name, Status: status, Metadata: metadata}, "", "")
		return err
	case "transactions":
		amount, err := strconv.ParseFloat(required(data, "amount"), 64)
		if err != nil {
			return errors.New("amount tidak valid")
		}
		companyID := parseIntDefault(data["company_id"], 1)
		_, err = s.CreateTransaction(ctx, actor, TransactionInput{
			Type:        defaultImport(data["type"], "Payment Request"),
			CompanyID:   companyID,
			Description: required(data, "description"),
			Amount:      amount,
		}, "", "")
		return err
	case "budgets":
		year := parseIntDefault(data["fiscal_year"], 2026)
		month := parseIntDefault(data["period_month"], 1)
		companyID := parseIntDefault(data["company_id"], 1)
		accountID := parseIntDefault(data["account_id"], 1)
		amount, err := strconv.ParseFloat(required(data, "amount"), 64)
		if err != nil {
			return errors.New("amount tidak valid")
		}
		status := defaultImport(data["status"], "Draft")
		_, err = s.sql.ExecContext(ctx, `INSERT INTO budgets (fiscal_year, period_month, company_id, account_id, amount, status)
			VALUES (?, ?, ?, ?, ?, ?)`, year, month, companyID, accountID, amount, status)
		return err
	case "operational_transactions":
		amount, err := strconv.ParseFloat(required(data, "amount"), 64)
		if err != nil {
			return errors.New("amount tidak valid")
		}
		_, err = s.sql.ExecContext(ctx, `INSERT INTO operational_transactions (flow, step, reference_number, partner_name, amount, status, created_by)
			VALUES (?, ?, ?, ?, ?, ?, ?)`, required(data, "flow"), required(data, "step"), required(data, "reference_number"), required(data, "partner_name"), amount, defaultImport(data["status"], "Submitted"), actor.ID)
		return err
	default:
		return errors.New("jenis import tidak didukung")
	}
}

func normalizeHeaders(headers []string) []string {
	normalized := make([]string, len(headers))
	for i, header := range headers {
		normalized[i] = strings.ToLower(strings.TrimSpace(header))
	}
	return normalized
}

func rowMap(headers, row []string) map[string]string {
	data := map[string]string{}
	for i, header := range headers {
		if i < len(row) {
			data[header] = strings.TrimSpace(row[i])
		}
	}
	return data
}

func required(data map[string]string, key string) string {
	value := strings.TrimSpace(data[key])
	if value == "" {
		panicSafe(fmt.Sprintf("%s wajib diisi", key))
	}
	return value
}

func defaultImport(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func parseIntDefault(value string, fallback int64) int64 {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func panicSafe(message string) {
	panic(importError(message))
}

type importError string

func (e importError) Error() string { return string(e) }
