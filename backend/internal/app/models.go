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

type UserInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role"`
	Status   string `json:"status"`
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

type BankAccountMaster struct {
	ID            int64     `json:"id"`
	BankCode      string    `json:"bankCode"`
	BankName      string    `json:"bankName"`
	AccountNo     string    `json:"accountNo"`
	AccountHolder string    `json:"accountHolder"`
	Branch        string    `json:"branch"`
	COAAccountID  int64     `json:"coaAccountId"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
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

type BAItem struct {
	ID                string  `json:"id"`
	Category          string  `json:"category"` // "Operating & Mining" or "MDO"
	Area              string  `json:"area"`     // e.g. "WM1"
	Material          string  `json:"material"` // e.g. "Top Soil", "Saprolite", "Limonite", "Overburden/ Waste"
	Unit              string  `json:"unit"`     // "LCM", "BCM", "WMT"
	DistanceWeightAvg float64 `json:"distanceWeightAvg"`
	InitialVolume     float64 `json:"initialVolume"`
	AdjustedVolume    float64 `json:"adjustedVolume"`
	Rate              float64 `json:"rate"`
	SubtotalInitial   float64 `json:"subtotalInitial"`
	SubtotalAdjusted  float64 `json:"subtotalAdjusted"`
}

type BGGRouteRow struct {
	RouteNo         int     `json:"routeNo"`
	DistanceMeters  float64 `json:"distanceMeters"`
	InvoiceDistance float64 `json:"invoiceDistance"`
	Volume          float64 `json:"volume"`
	VolXDistance    float64 `json:"volXDistance"`
	LoadingPoint    string  `json:"loadingPoint"`
	DumpingPoint    string  `json:"dumpingPoint"`
}

type BGGDailySeamEntry struct {
	Date      string  `json:"date"`
	Ritation  int     `json:"ritation"`
	Seam7Ton  float64 `json:"seam7Ton"`
	Seam8Ton  float64 `json:"seam8Ton"`
	Seam9Ton  float64 `json:"seam9Ton"`
	Seam10Ton float64 `json:"seam10Ton"`
	TotalTon  float64 `json:"totalTon"`
	Notes     string  `json:"notes"`
}

type BGGPendingOBEntry struct {
	Period          string  `json:"period"`
	InvoiceVolumeCG float64 `json:"invoiceVolumeCG"`
	PendingOBVolume float64 `json:"pendingOBVolume"`
	CummPendingOB   float64 `json:"cummPendingOB"`
	Status          string  `json:"status"`
}

type BGGSignOff struct {
	SurveyorBGG  string `json:"surveyorBGG"`
	SurveyorAAP  string `json:"surveyorAAP"`
	KabagEngBGG  string `json:"kabagEngBGG"`
	KabagProdBGG string `json:"kabagProdBGG"`
	KabagAAP     string `json:"kabagAAP"`
	KTTBGG       string `json:"kttBGG"`
	PJOAAP       string `json:"pjoAAP"`
}

type BGGJointSurveyData struct {
	LocationPit        string              `json:"locationPit"`
	OriginalTopoDate   string              `json:"originalTopoDate"`
	SurveyTopoDate     string              `json:"surveyTopoDate"`
	VolumeBGG          float64             `json:"volumeBGG"`
	VolumeAAP          float64             `json:"volumeAAP"`
	VolumeDifference   float64             `json:"volumeDifference"`
	DiffPercentage     float64             `json:"diffPercentage"`
	TolerancePass      bool                `json:"tolerancePass"`
	AgreedSurveyVolume float64             `json:"agreedSurveyVolume"`
	CoalVolumeBCM      float64             `json:"coalVolumeBCM"`
	CoalVolumeTon      float64             `json:"coalVolumeTon"`
	NettOBVolume       float64             `json:"nettOBVolume"`
	StrippingRatio     float64             `json:"strippingRatio"`
	OBRoutes           []BGGRouteRow       `json:"obRoutes"`
	OBActualAvgDist    float64             `json:"obActualAvgDist"`
	OBInvoiceAvgDist   float64             `json:"obInvoiceAvgDist"`
	OBOverDistanceHm   float64             `json:"obOverDistanceHm"`
	CoalRoutes         []BGGRouteRow       `json:"coalRoutes"`
	CoalAvgDist        float64             `json:"coalAvgDist"`
	CoalOverDistanceM  float64             `json:"coalOverDistanceM"`
	DailySeamData      []BGGDailySeamEntry `json:"dailySeamData"`
	PendingOBData      []BGGPendingOBEntry `json:"pendingOBData"`
	InventoryCoalAwal  float64             `json:"inventoryCoalAwal"`
	InventorySeam      string              `json:"inventorySeam"`
	SignOff            BGGSignOff          `json:"signOff"`
}

type BATracker struct {
	ID                  int64               `json:"id"`
	BANumber            string              `json:"baNumber"`
	DraftBARefNo        string              `json:"draftBARefNo,omitempty"`
	SignedBANumber      string              `json:"signedBANumber,omitempty"`
	CustomerCode        string              `json:"customerCode"`
	CustomerID          int64               `json:"customerId,omitempty"`
	WorkPeriod          string              `json:"workPeriod"`
	WorkAmount          float64             `json:"workAmount"`
	InitialWorkAmount   float64             `json:"initialWorkAmount"`
	AdjustedWorkAmount  float64             `json:"adjustedWorkAmount"`
	Step1Locked         bool                `json:"step1Locked"`
	Items               []BAItem            `json:"items,omitempty"`
	BGGData             *BGGJointSurveyData `json:"bggData,omitempty"`
	WorkEndDate         *time.Time          `json:"workEndDate"`
	BASubmittedDate     *time.Time          `json:"baSubmittedDate"`
	BASentDate          *time.Time          `json:"baSentDate"`
	InternalRoutingDate *time.Time          `json:"internalRoutingDate"`
	BASignedDate        *time.Time          `json:"baSignedDate"`
	LeadTimeDays        int                 `json:"leadTimeDays"`
	StatusBA            string              `json:"statusBA"`
	PICAAP              string              `json:"picAAP"`
	InvoiceNoLinked     string              `json:"invoiceNoLinked"`
	InvoiceID           int64               `json:"invoiceId,omitempty"`
	InvoiceIssuedDate   *time.Time          `json:"invoiceIssuedDate"`
	LagBAToInvoiceDays  int                 `json:"lagBAToInvoiceDays"`
	NotesBottleneck     string              `json:"notesBottleneck"`
	Notes               string              `json:"notes"`
	DraftBAPath         string              `json:"draftBAPath"`
	FinalBAPath         string              `json:"finalBAPath"`
	VerifiedBy          string              `json:"verifiedBy,omitempty"`
	VerifiedAt          *time.Time          `json:"verifiedAt,omitempty"`
	ApprovedBy          string              `json:"approvedBy,omitempty"`
	ApprovedAt          *time.Time          `json:"approvedAt,omitempty"`
	CreatedAt           time.Time           `json:"createdAt"`
}

type InvoiceMaster struct {
	ID                 int64      `json:"id"`
	InvoiceNo          string     `json:"invoiceNo"`
	InvoiceCategory    string     `json:"invoiceCategory,omitempty"` // "Operation & Mining", "MDO", "General"
	CustomerCode       string     `json:"customerCode"`
	CustomerID         int64      `json:"customerId,omitempty"`
	ProjectSite        string     `json:"projectSite"`
	ContractNo         string     `json:"contractNo"`
	Contractor         string     `json:"contractor"`
	ActivityGroup      string     `json:"activityGroup"`
	BANoReference      string     `json:"baNoReference"`
	BAID               int64      `json:"baId,omitempty"`
	BADate             *time.Time `json:"baDate"`
	WorkPeriod         string     `json:"workPeriod"`
	JobType            string     `json:"jobType"`
	VolumeUnit         string     `json:"volumeUnit"`
	Volume             float64    `json:"volume"`
	Rate               float64    `json:"rate"`
	RevenueGross       float64    `json:"revenueGross"`
	SolarDeduction     float64    `json:"solarDeduction"`
	SubTotalDPP        float64    `json:"subTotalDPP"`
	PPN11              float64    `json:"ppn11"`
	PPNRate            float64    `json:"ppnRate,omitempty"`
	PPh23              float64    `json:"pph23"`
	PPhRate            float64    `json:"pphRate,omitempty"`
	TotalInvoice       float64    `json:"totalInvoice"`
	OtherDeduction     float64    `json:"otherDeduction"`
	TotalReceipt       float64    `json:"totalReceipt"`
	InvoiceDate        time.Time  `json:"invoiceDate"`
	TerminDays         int        `json:"terminDays"`
	DueDate            time.Time  `json:"dueDate"`
	TotalPaid          float64    `json:"totalPaid"`
	Outstanding        float64    `json:"outstanding"`
	Status             string     `json:"status"`
	AgingDays          int        `json:"agingDays"`
	AgingBucket        string     `json:"agingBucket"`
	BankAccountID      int64      `json:"bankAccountId,omitempty"`
	BankName           string     `json:"bankName"`
	BankAccountName    string     `json:"bankAccountName"`
	BankAccountNo      string     `json:"bankAccountNo"`
	BankBranch         string     `json:"bankBranch"`
	Notes              string     `json:"notes"`
	VerifiedBy         string     `json:"verifiedBy,omitempty"`
	VerifiedAt         *time.Time `json:"verifiedAt,omitempty"`
	ApprovedManagerBy  string     `json:"approvedManagerBy,omitempty"`
	ApprovedManagerAt  *time.Time `json:"approvedManagerAt,omitempty"`
	ApprovedDirectorBy string     `json:"approvedDirectorBy,omitempty"`
	ApprovedDirectorAt *time.Time `json:"approvedDirectorAt,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type DocumentApprovalAction struct {
	Action string `json:"action"` // "verify", "approve_tier1", "approve_tier2", "reject"
	Note   string `json:"note"`
}

type PaymentLog struct {
	ID                 int64      `json:"id"`
	InvoiceNo          string     `json:"invoiceNo"`
	InvoiceID          int64      `json:"invoiceId,omitempty"`
	CustomerCode       string     `json:"customerCode"`
	CustomerID         int64      `json:"customerId,omitempty"`
	AmountPaid         float64    `json:"amountPaid"`
	PaymentDate        time.Time  `json:"paymentDate"`
	BankAccountID      int64      `json:"bankAccountId,omitempty"`
	ReceivingBank      string     `json:"receivingBank"`
	RefNo              string     `json:"refNo"`
	PaymentPeriod      string     `json:"paymentPeriod"`
	Notes              string     `json:"notes"`
	DaysLateOrEarly    int        `json:"daysLateOrEarly"`
	CreatedBy          string     `json:"createdBy"`
	VerificationStatus string     `json:"verificationStatus"` // "Verified", "Pending", "Rejected"
	VerifiedBy         string     `json:"verifiedBy"`
	VerifiedAt         *time.Time `json:"verifiedAt"`
	ProofDocumentPath  string     `json:"proofDocumentPath"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type VariableSOW struct {
	ID                 int64     `json:"id"`
	Category           string    `json:"category"`
	ItemName           string    `json:"itemName"`
	RateUSD            float64   `json:"rateUSD"`
	RateIDR            float64   `json:"rateIDR"`
	Tier1Rate          float64   `json:"tier1Rate,omitempty"`
	Tier2Rate          float64   `json:"tier2Rate,omitempty"`
	Tier3Rate          float64   `json:"tier3Rate,omitempty"`
	SplitPercentage    float64   `json:"splitPercentage,omitempty"`
	BaseDistanceMeters float64   `json:"baseDistanceMeters,omitempty"`
	Unit               string    `json:"unit"`
	Customer           string    `json:"customer"`
	CustomerCode       string    `json:"customerCode"`
	ContractNo         string    `json:"contractNo"`
	Description        string    `json:"description"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"createdAt"`
}

type RaiseFallMaster struct {
	ID            int64     `json:"id"`
	Period        string    `json:"period"`
	CustomerCode  string    `json:"customerCode"`
	ProjectSite   string    `json:"projectSite"`
	ContractNo    string    `json:"contractNo"`
	WeightFuelA   float64   `json:"weightFuelA"`
	WeightLaborB  float64   `json:"weightLaborB"`
	WeightFixedC  float64   `json:"weightFixedC"`
	BaseFuelFo    float64   `json:"baseFuelFo"`
	BaseLaborLo   float64   `json:"baseLaborLo"`
	BaseForexXo   float64   `json:"baseForexXo"`
	ActualFuelFn  float64   `json:"actualFuelFn"`
	ActualLaborLn float64   `json:"actualLaborLn"`
	ActualMRateXn float64   `json:"actualMRateXn"`
	RFIndexResult float64   `json:"rfIndexResult"`
	Notes         string    `json:"notes"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type DailyExchangeRate struct {
	ID         int64   `json:"id"`
	Period     string  `json:"period"`
	No         int     `json:"no"`
	DateStr    string  `json:"dateStr"`
	KursJual   float64 `json:"kursJual"`
	KursBeli   float64 `json:"kursBeli"`
	KursTengah float64 `json:"kursTengah"`
}

type CoalIndexWeekly struct {
	ID          int64   `json:"id"`
	MonthlyID   int64   `json:"monthlyId"`
	WeekNumber  int     `json:"weekNumber"`
	ReleaseDate string  `json:"releaseDate"`
	ICI3Price   float64 `json:"ici3Price"`
	ICI4Price   float64 `json:"ici4Price"`
	R3Price     float64 `json:"r3Price"`
}

type CoalIndexMonthly struct {
	ID         int64             `json:"id"`
	Period     string            `json:"period"`
	AvgICI3    float64           `json:"avgIci3"`
	AvgICI4    float64           `json:"avgIci4"`
	AvgR3      float64           `json:"avgR3"`
	ActiveTier string            `json:"activeTier"` // "Tier 1", "Tier 2", "Tier 3"
	Status     string            `json:"status"`     // "Draft", "Verified", "Locked"
	Notes      string            `json:"notes"`
	Weeks      []CoalIndexWeekly `json:"weeks"`
	UpdatedAt  time.Time         `json:"updatedAt"`
}

type MiningInvoiceCalcInput struct {
	CustomerCode       string  `json:"customerCode"`
	WorkPeriod         string  `json:"workPeriod"`
	ClaimedOBVolume    float64 `json:"claimedOBVolume"`
	PendingOBVolume    float64 `json:"pendingOBVolume"`
	CoalVolume         float64 `json:"coalVolume"`
	SumproductDistance float64 `json:"sumproductDistance"`
	ActualFuelFn       float64 `json:"actualFuelFn"`
	DPSolarDeduction   float64 `json:"dpSolarDeduction"`
	DPTransportDeduct  float64 `json:"dpTransportDeduct"`
}

type MiningInvoiceCalcResult struct {
	ActiveTier           string  `json:"activeTier"`
	AvgR3                float64 `json:"avgR3"`
	OB1RateTier          float64 `json:"ob1RateTier"`
	OB2RateTier          float64 `json:"ob2RateTier"`
	CoalRate             float64 `json:"coalRate"`
	OverDistanceOBRate   float64 `json:"overDistanceOBRate"`
	RaiseFallFactor      float64 `json:"raiseFallFactor"`
	OB1Amount            float64 `json:"ob1Amount"`
	OB2Amount            float64 `json:"ob2Amount"`
	OBPendingAmount      float64 `json:"obPendingAmount"`
	TotalOBAmount        float64 `json:"totalOBAmount"`
	CoalAmount           float64 `json:"coalAmount"`
	OverDistanceOBAmount float64 `json:"overDistanceOBAmount"`
	OverDistanceCWAmount float64 `json:"overDistanceCWAmount"`
	TotalODAmount        float64 `json:"totalODAmount"`
	RaiseFallAmount      float64 `json:"raiseFallAmount"`
	GrossAmount          float64 `json:"grossAmount"`
	TotalDeduction       float64 `json:"totalDeduction"`
	SubtotalDPP          float64 `json:"subtotalDPP"`
	PPN12                float64 `json:"ppn12"`
	PPh23                float64 `json:"pph23"`
	TotalInvoice         float64 `json:"totalInvoice"`
}

