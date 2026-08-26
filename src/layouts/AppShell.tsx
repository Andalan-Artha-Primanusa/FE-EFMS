import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams, useOutlet } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Search, UserCog, X } from "lucide-react";
import { NotificationPanel } from "../components/NotificationPanel";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ACCOUNT_SETTINGS_VIEW, menu, menuPermissionMap, titleFromSlug, viewMap, viewPath } from "../data/navigation";
import { api, type AuditLog, type Dashboard, type Permission, type RoleAccess, type Transaction, type User } from "../lib/api";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";
import { DashboardPage } from "../pages/DashboardPage";

import { ModulePage } from "../pages/ModulePage";
import { RBACPage } from "../pages/RBACPage";
import { canAccessMenu, isSuperAdminRole } from "../lib/auth";
import { routes } from "../router/routes";

import { VariableSOWPage } from "../pages/VariableSOWPage";
import { VariableSOWFormPage } from "../pages/VariableSOWFormPage";
import { MasterRaiseFallPage } from "../pages/MasterRaiseFallPage";
import { CoalIndexPage } from "../pages/CoalIndexPage";
import { GeneralJournalPage } from "../pages/GeneralJournalPage";

export function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const activeView = location.pathname.startsWith("/transaction/") 
    ? "Transaction Form"
    : location.pathname.startsWith("/variable-sow/new") || location.pathname.startsWith("/variable-sow/edit")
    ? "Variable SOW Form"
    : location.pathname === "/account-settings"
    ? ACCOUNT_SETTINGS_VIEW
    : titleFromSlug(params.slug || params["*"]?.split('/')[0]) ?? "Finance Dashboard";
  const [viewRows, setViewRows] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleAccess[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [dash, trx] = await Promise.all([api<Dashboard>("/api/dashboard"), api<Transaction[]>("/api/transactions")]);
    setDashboard(dash ?? null);
    setTransactions(Array.isArray(trx) ? trx : []);
  }

  async function refreshNotifications() {
    const items = await api<AuditLog[]>("/api/audit-logs");
    setNotifications(Array.isArray(items) ? items : []);
  }

  async function refreshAccess() {
    const [myPermissions, roleAccess] = await Promise.all([
      api<Permission[]>("/api/permissions/my"),
      isSuperAdminRole(user.role) ? api<RoleAccess[]>("/api/roles") : Promise.resolve([])
    ]);
    setPermissions(Array.isArray(myPermissions) ? myPermissions : []);
    setRoles(Array.isArray(roleAccess) ? roleAccess : []);
  }

  async function loadView(view: string) {
    const config = viewMap[view];
    if (!config || view === "Finance Dashboard") {
      setViewRows([]);
      return;
    }
    setViewLoading(true);
    try {
      const data = await api<any>(config.endpoint);
      const rows = Array.isArray(data)
        ? data
        : data?.reports ?? data?.kpis ?? data?.indicators ?? Object.entries(data ?? {}).map(([key, value]) => ({ metric: key, value }));
      setViewRows(Array.isArray(rows) ? rows : []);
    } finally {
      setViewLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => {
      setDashboard(null);
      setTransactions([]);
      setNotice("Backend belum mengirim data dashboard.");
    });
    refreshNotifications().catch(() => setNotifications([]));
    refreshAccess().catch(() => {
      setPermissions([]);
      setRoles([]);
    });
  }, []);

  useEffect(() => {
    loadView(activeView).catch((err) => setNotice(err instanceof Error ? err.message : "Gagal memuat data"));
  }, [activeView]);

  function openView(item: string) {
    navigate(viewPath(item));
    setSidebarOpen(false);
  }

  function logout() {
    localStorage.clear();
    onLogout();
  }

  async function refreshAll() {
    await Promise.all([refresh(), loadView(activeView), refreshNotifications()]);
  }

  const activeConfig = activeView === "Account Settings" || activeView === "RBAC Management" || activeView === "Role and Permission" ? { title: activeView, endpoint: "" } : viewMap[activeView] ?? viewMap["Finance Dashboard"];
  const visibleMenu = menu.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessMenu(item, user.role, permissions))
  })).filter((group) => group.items.length > 0);

  return (
    <div className={`app-shell bg-finance-canvas text-finance-ink ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-full">
            <img src={sidebarCollapsed ? "/app-icon.webp" : "/feast-logo.webp"} alt="FEAST Financial Enterprise Andalan System" />
          </div>
        </div>
        <nav>
          {visibleMenu.map((group) => {
            const Icon = group.icon;
            return <details key={group.group} open={["Dashboard", "Finance", "Transaction Request", "Accounting", "Master Data"].includes(group.group)}>
              <summary title={group.group}><Icon size={18} /> <span>{group.group}</span> <ChevronDown size={15} /></summary>
              {group.items.map((item) => <button className={activeView === item ? "active" : ""} key={item} title={item} onClick={() => openView(item)}>{item}</button>)}
            </details>;
          })}
        </nav>
      </aside>
      <main className="workspace">
        <header className="sticky top-0 z-20 topbar">
          <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20} /></button>
          <button className="icon-btn desktop-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}><Menu size={20} /></button>
          <div>
            <p className="eyebrow">Finance Command Center</p>
            <h2>{activeConfig.title}</h2>
          </div>
          <div className="top-actions">
            <div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari transaksi, vendor, akun..." /></div>
            <button className="icon-btn notification-button" onClick={async () => { setNotificationOpen(!notificationOpen); await refreshNotifications(); }}><Bell size={19} />{notifications.length > 0 && <b>{notifications.length}</b>}</button>
            <button className="user-pill" onClick={async () => { navigate("/account-settings"); setNotificationOpen(false); await refreshNotifications(); }}>
              <UserCog size={17} />
              <span>{user.name}</span>
              <small>{user.role}</small>
            </button>
            <button className="icon-btn" onClick={logout}><LogOut size={19} /></button>
          </div>
        </header>

        <ErrorBoundary key={location.pathname} fallbackTitle={`Gagal memuat modul "${activeView}"`}>
          <Outlet context={{ 
            user, permissions, roles, notice, setNotice, 
            dashboard, transactions, query, refresh 
          }} />
          {outlet ? null : activeView === "Variable SOW Form"
            ? <VariableSOWFormPage />
            : activeView === "Variable SOW"
            ? <VariableSOWPage viewTitle={activeView} query={query} onNotice={setNotice} />
            : <ModulePage
                config={activeConfig}
                rows={viewRows}
                loading={viewLoading}
                query={query}
                onCreateTransaction={() => navigate(routes.transaction.new)}
                onEditTransaction={(transaction) => navigate(routes.transaction.edit(transaction.id), { state: { transaction } })}
                onNotice={setNotice}
                onRefresh={async () => { await refreshAll(); }}
              />
          }
        </ErrorBoundary>
      </main>
      <NotificationPanel items={notifications} open={notificationOpen} onClose={() => setNotificationOpen(false)} />
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-item toast-${toast.tone}`}
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id));
                }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
