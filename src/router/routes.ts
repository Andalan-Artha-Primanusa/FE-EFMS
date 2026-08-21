export const routes = {
  dashboard: "/",
  login: "/login",
  accountSettings: "/account-settings",
  rbac: "/rbac-management",

  transaction: {
    new: "/transaction/new",
    edit: (id: number | string) => `/transaction/${id}/edit`,
  },

  variableSOW: {
    list: "/variable-sow",
    new: "/variable-sow/new",
    edit: (id: number | string) => `/variable-sow/${id}/edit`,
  },

  finance: {
    dashboard: "/finance-ar-dashboard",
    baTracker: "/berita-acara-ba-tracker",
    invoiceManagement: "/invoice-management",
    paymentReceiptLog: "/payment-receipt-log",
    customerCreditTerms: "/customer-master-credit-terms",
  },

  accounting: {
    journalEntry: "/general-journal",
    journalApproval: "/journal-approval",
    journalPosting: "/journal-posting",
    generalLedger: "/general-ledger",
    trialBalance: "/trial-balance",
    closingPeriod: "/closing-period",
  },

  masterData: {
    coalIndex: "/coal-index",
    raiseFall: "/raise-fall",
    currency: "/currency",
  },
} as const;
