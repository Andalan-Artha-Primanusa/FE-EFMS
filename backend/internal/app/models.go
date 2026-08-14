package app

import "time"

type User struct {
	ID               int64      `json:"id"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Role             string     `json:"role"`
	Status           string     `json:"status"`
	TwoFactorEnabled bool       `json:"twoFactorEnabled"`
	LastLoginAt      *time.Time `json:"lastLoginAt"`
}

type LoginResult struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type KPI struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
	Delta float64 `json:"delta"`
	Tone  string  `json:"tone"`
}

type ChartPoint struct {
	Label   string  `json:"label"`
	Revenue float64 `json:"revenue,omitempty"`
	Expense float64 `json:"expense,omitempty"`
	Inflow  float64 `json:"inflow,omitempty"`
	Outflow float64 `json:"outflow,omitempty"`
	Value   float64 `json:"value,omitempty"`
}

type Dashboard struct {
	KPIs             []KPI         `json:"kpis"`
	MonthlyFinance   []ChartPoint  `json:"monthlyFinance"`
	CashFlow         []ChartPoint  `json:"cashFlow"`
	AgingReceivable  []ChartPoint  `json:"agingReceivable"`
	AgingPayable     []ChartPoint  `json:"agingPayable"`
	PendingApprovals []Transaction `json:"pendingApprovals"`
	CashPosition     []ChartPoint  `json:"cashPosition"`
}

type Module struct {
	Group string   `json:"group"`
	Items []string `json:"items"`
}

type FlowStage struct {
	Order       int      `json:"order"`
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Modules     []string `json:"modules"`
}

type Permission struct {
	Module      string `json:"module"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

type RoleAccess struct {
	Role        string       `json:"role"`
	Permissions []Permission `json:"permissions"`
	Scopes      []string     `json:"scopes"`
}

type MasterRecord struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Metadata  string    `json:"metadata"`
	CreatedAt time.Time `json:"createdAt"`
}

type MasterRecordInput struct {
	Type     string `json:"type"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Metadata string `json:"metadata"`
}

type Transaction struct {
	ID           int64     `json:"id"`
	Number       string    `json:"number"`
	Type         string    `json:"type"`
	Requester    string    `json:"requester"`
	Company      string    `json:"company"`
	Description  string    `json:"description"`
	Amount       float64   `json:"amount"`
	Status       string    `json:"status"`
	BudgetStatus string    `json:"budgetStatus"`
	CreatedAt    time.Time `json:"createdAt"`
}

type TransactionInput struct {
	Type        string  `json:"type"`
	CompanyID   int64   `json:"companyId"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
}

type ApprovalAction struct {
	Action string `json:"action"`
	Note   string `json:"note"`
}

type BudgetValidationInput struct {
	CompanyID int64   `json:"companyId"`
	AccountID int64   `json:"accountId"`
	Amount    float64 `json:"amount"`
}

type BudgetValidationResult struct {
	Status          string  `json:"status"`
	BudgetAmount    float64 `json:"budgetAmount"`
	Utilized        float64 `json:"utilized"`
	Reserved        float64 `json:"reserved"`
	AvailableAmount float64 `json:"availableAmount"`
	Message         string  `json:"message"`
}

type OperationalTransaction struct {
	ID              int64     `json:"id"`
	Flow            string    `json:"flow"`
	Step            string    `json:"step"`
	ReferenceNumber string    `json:"referenceNumber"`
	PartnerName     string    `json:"partnerName"`
	Amount          float64   `json:"amount"`
	Status          string    `json:"status"`
	AccountingState string    `json:"accountingState"`
	CreatedAt       time.Time `json:"createdAt"`
}

type OperationalInput struct {
	Flow            string  `json:"flow"`
	Step            string  `json:"step"`
	ReferenceNumber string  `json:"referenceNumber"`
	PartnerName     string  `json:"partnerName"`
	Amount          float64 `json:"amount"`
}

type AccountingRun struct {
	ID              int64     `json:"id"`
	RunNumber       string    `json:"runNumber"`
	SourceModule    string    `json:"sourceModule"`
	SourceReference string    `json:"sourceReference"`
	JournalNumber   string    `json:"journalNumber"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"createdAt"`
}

type ReconciliationJob struct {
	ID             int64     `json:"id"`
	Type           string    `json:"type"`
	Period         string    `json:"period"`
	MatchedCount   int64     `json:"matchedCount"`
	UnmatchedCount int64     `json:"unmatchedCount"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
}

type ClosingPeriod struct {
	ID        int64      `json:"id"`
	Period    string     `json:"period"`
	Step      string     `json:"step"`
	Progress  int        `json:"progress"`
	Status    string     `json:"status"`
	LockedAt  *time.Time `json:"lockedAt"`
	CreatedAt time.Time  `json:"createdAt"`
}

type ReportCatalogItem struct {
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Exports     []string `json:"exports"`
	Filters     []string `json:"filters"`
	Description string   `json:"description"`
}

type ManagementIndicator struct {
	Code   string  `json:"code"`
	Label  string  `json:"label"`
	Value  float64 `json:"value"`
	Unit   string  `json:"unit"`
	Status string  `json:"status"`
}

type ImportResult struct {
	Type     string   `json:"type"`
	Inserted int      `json:"inserted"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
}

type AuditLog struct {
	ID            int64     `json:"id"`
	User          string    `json:"user"`
	Module        string    `json:"module"`
	Action        string    `json:"action"`
	ReferenceType string    `json:"referenceType"`
	ReferenceID   string    `json:"referenceId"`
	IPAddress     string    `json:"ipAddress"`
	Device        string    `json:"device"`
	CreatedAt     time.Time `json:"createdAt"`
}

type CustomerMaster struct {
	ID             int64     `json:"id"`
	Code           string    `json:"code"`
	FullName       string    `json:"fullName"`
	GroupParent    string    `json:"groupParent"`
	ProjectSite    string    `json:"projectSite"`
	TerminDays     int       `json:"terminDays"`
	ContactAR      string    `json:"contactAR"`
	EmailAR        string    `json:"emailAR"`
	Phone          string    `json:"phone"`
	ContractNo     string    `json:"contractNo"`
	ContractValue  float64   `json:"contractValue"`
	AvgPaymentDays float64   `json:"avgPaymentDays"`
	Notes          string    `json:"notes"`
	CreatedAt      time.Time `json:"createdAt"`
}

type BATracker struct {
	ID                 int64      `json:"id"`
	BANumber           string     `json:"baNumber"`
	CustomerCode       string     `json:"customerCode"`
	WorkPeriod         string     `json:"workPeriod"`
	WorkAmount         float64    `json:"workAmount"`
	WorkEndDate        *time.Time `json:"workEndDate"`
	BASubmittedDate    *time.Time `json:"baSubmittedDate"`
	BASignedDate       *time.Time `json:"baSignedDate"`
	LeadTimeDays       int        `json:"leadTimeDays"`
	StatusBA           string     `json:"statusBA"`
	PICAAP             string     `json:"picAAP"`
	InvoiceNoLinked    string     `json:"invoiceNoLinked"`
	InvoiceIssuedDate  *time.Time `json:"invoiceIssuedDate"`
	LagBAToInvoiceDays int        `json:"lagBAToInvoiceDays"`
	NotesBottleneck    string     `json:"notesBottleneck"`
	Notes              string     `json:"notes"`
	DraftBAPath        string     `json:"draftBAPath"`
	FinalBAPath        string     `json:"finalBAPath"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type InvoiceMaster struct {
	ID             int64      `json:"id"`
	InvoiceNo      string     `json:"invoiceNo"`
	CustomerCode   string     `json:"customerCode"`
	ProjectSite    string     `json:"projectSite"`
	ContractNo     string     `json:"contractNo"`
	Contractor     string     `json:"contractor"`
	ActivityGroup  string     `json:"activityGroup"`
	BANoReference  string     `json:"baNoReference"`
	BADate         *time.Time `json:"baDate"`
	WorkPeriod     string     `json:"workPeriod"`
	JobType        string     `json:"jobType"`
	VolumeUnit     string     `json:"volumeUnit"`
	Volume         float64    `json:"volume"`
	Rate           float64    `json:"rate"`
	RevenueGross   float64    `json:"revenueGross"`
	SolarDeduction float64    `json:"solarDeduction"`
	SubTotalDPP    float64    `json:"subTotalDPP"`
	PPN11          float64    `json:"ppn11"`
	PPh23          float64    `json:"pph23"`
	TotalInvoice   float64    `json:"totalInvoice"`
	OtherDeduction float64    `json:"otherDeduction"`
	TotalReceipt   float64    `json:"totalReceipt"`
	InvoiceDate    time.Time  `json:"invoiceDate"`
	TerminDays     int        `json:"terminDays"`
	DueDate        time.Time  `json:"dueDate"`
	TotalPaid      float64    `json:"totalPaid"`
	Outstanding    float64    `json:"outstanding"`
	Status         string     `json:"status"`
	AgingDays      int        `json:"agingDays"`
	AgingBucket    string     `json:"agingBucket"`
	Notes          string     `json:"notes"`
	CreatedAt      time.Time  `json:"createdAt"`
}

type PaymentLog struct {
	ID              int64     `json:"id"`
	InvoiceNo       string    `json:"invoiceNo"`
	CustomerCode    string    `json:"customerCode"`
	AmountPaid      float64   `json:"amountPaid"`
	PaymentDate     time.Time `json:"paymentDate"`
	ReceivingBank   string    `json:"receivingBank"`
	RefNo           string    `json:"refNo"`
	PaymentPeriod   string    `json:"paymentPeriod"`
	Notes           string    `json:"notes"`
	DaysLateOrEarly int       `json:"daysLateOrEarly"`
	CreatedAt       time.Time `json:"createdAt"`
}

type VariableSOW struct {
	ID          int64     `json:"id"`
	Category    string    `json:"category"`
	ItemName    string    `json:"itemName"`
	RateUSD     float64   `json:"rateUSD"`
	Unit        string    `json:"unit"`
	Customer    string    `json:"customer"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}
