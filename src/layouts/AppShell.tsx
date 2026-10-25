import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams, useOutlet } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, UserCog, X } from "lucide-react";
import { NotificationPanel } from "../components/NotificationPanel";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ApprovalPinPrompt } from "../components/ConfirmDialog";
import { ACCOUNT_SETTINGS_VIEW, menu, menuCodeFor, menuPermissionModuleFor, titleFromSlug, viewMap, viewPath } from "../data/navigation";
import { api, getUnreadNotificationCount, useReloadOnSave, type AuditLog, type Dashboard, type Permission, type RoleAccess, type TCode, type Transaction, type User } from "../lib/api";
import { ModulePage } from "../pages/ModulePage";
import { authorized, canAccessMenu, canViewAuditTrail, filterRowsByCompanyScope, scopedEndpoint } from "../lib/auth";
import { routes } from "../router/routes";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PermissionDeniedPage } from "../pages/PermissionDeniedPage";

export function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const pathSlug = location.pathname.replace(/^\/+/, "").split("/")[0];
  const requestedSlug = params.slug || params["*"]?.split("/")[0] || pathSlug;
  const resolvedView = titleFromSlug(requestedSlug);
  const activeView = location.pathname.startsWith("/transaction/") 
    ? "Transaction Form"
    : location.pathname.startsWith("/variable-sow/")
    ? "Variable SOW Form"
    : location.pathname === "/account-settings"
    ? ACCOUNT_SETTINGS_VIEW
    : location.pathname === "/"
    ? "AR Dashboard"
    : resolvedView ?? "Finance Dashboard";
  const [viewRows, setViewRows] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== "undefined" && window.innerWidth > 767 && window.innerWidth <= 1280));
  const query = "";
  const [notifications, setNotifications] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tcodes, setTcodes] = useState<TCode[]>([]);
  const [roles, setRoles] = useState<RoleAccess[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notice, setNoticeState] = useState<{ id: number; message: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark", !dark);
    try { localStorage.setItem("theme", dark ? "light" : "dark"); } catch { /* storage diblokir: tema tetap berlaku untuk sesi ini */ }
    setDark(!dark);
  };

  const setNotice = useCallback((msg: string) => {
    if (!msg) {
      setNoticeState(null);
      return;
    }
    setNoticeState({ id: Date.now(), message: msg });
  }, []);

  async function refresh() {
    try {
      const [dash, trx] = await Promise.all([
        api<Dashboard>(scopedEndpoint("/api/dashboard", user)).catch(() => null),
        api<Transaction[]>(scopedEndpoint("/api/transactions", user)).catch(() => [])
      ]);
      setDashboard(dash ?? null);
      setTransactions(Array.isArray(trx) ? filterRowsByCompanyScope(trx, user) : []);
    } catch {
      // Graceful fallback
    }
  }

  async function refreshNotifications() {
    try {
      refreshUnread();
      if (!canViewAuditTrail({ ...user, permissions, tcodes })) {
        setNotifications([]);
        return;
      }
      const items = await api<AuditLog[]>("/api/audit-logs").catch(() => []);
      setNotifications(Array.isArray(items) ? filterRowsByCompanyScope(items, user) : []);
    } catch {
      setNotifications([]);
    }
  }

  async function refreshAccess() {
    try {
      const myPermResult = await api<{ permissions: Permission[]; tcodes: TCode[] }>("/api/permissions/my").catch(() => null);
      const myPerms = Array.isArray(myPermResult?.permissions) ? myPermResult!.permissions : [];
      const myTcodes = Array.isArray(myPermResult?.tcodes) ? myPermResult!.tcodes : [];
      setPermissions(myPerms);
      setTcodes(myTcodes);
      if (authorized({ ...user, permissions: myPerms, tcodes: myTcodes }, "user_management", "manage")) {
        const roleAccess = await api<RoleAccess[]>("/api/roles").catch(() => []);
        setRoles(Array.isArray(roleAccess) ? roleAccess : []);
      } else {
        setRoles([]);
      }
    } catch {
      setPermissions([]);
      setTcodes([]);
      setRoles([]);
    }
  }

  async function loadView(view: string) {
    const config = viewMap[view];
    if (!config || view === "Finance Dashboard") {
      setViewRows([]);
      return;
    }
    setViewLoading(true);
    try {
      const data = await api<any>(scopedEndpoint(config.endpoint, user));
      const rows = Array.isArray(data)
        ? data
        : data?.reports ?? data?.kpis ?? data?.indicators ?? Object.entries(data ?? {}).map(([key, value]) => ({ metric: key, value }));
      setViewRows(Array.isArray(rows) ? filterRowsByCompanyScope(rows, user) : []);
    } catch {
      setViewRows([]);
    } finally {
      setViewLoading(false);
    }
  }

  const refreshUnread = () => getUnreadNotificationCount().then((r) => setUnreadCount(Number(r?.count ?? 0))).catch(() => {});

  useEffect(() => {
    refresh();
    refreshNotifications();
    refreshAccess();
    const timer = setInterval(refreshUnread, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!outlet) {
      loadView(activeView).catch((err) => setNotice(err instanceof Error ? err.message : "Gagal memuat data"));
    }
  }, [activeView, outlet]);
  useReloadOnSave(() => { refreshUnread(); if (!outlet) loadView(activeView).catch(() => {}); });

  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 768px) and (max-width: 1280px)");
    const mobile = window.matchMedia("(max-width: 767px)");
    const onTablet = () => setSidebarCollapsed(tablet.matches);
    const onMobile = () => { if (!mobile.matches) setSidebarOpen(false); };
    tablet.addEventListener("change", onTablet);
    mobile.addEventListener("change", onMobile);
    return () => { tablet.removeEventListener("change", onTablet); mobile.removeEventListener("change", onMobile); };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNoticeState(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notice]);

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

  const activeConfig = {
    ...(viewMap[activeView] ?? viewMap["Finance Dashboard"]),
    menuCode: menuCodeFor(activeView),
    menuPermissionModule: menuPermissionModuleFor(activeView)
  };
  const visibleMenu = menu.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessMenu(item, user.role, permissions, tcodes, user))
  })).filter((group) => group.items.length > 0);
  const isUnknownModuleRoute = !outlet && Boolean(requestedSlug) && !resolvedView;
  const cannotAccessModuleRoute = !outlet && !isUnknownModuleRoute && activeView in viewMap && !canAccessMenu(activeView, user.role, permissions, tcodes, user);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

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
            const isOpen = Boolean(openGroups[group.group]);
            return (
              <details key={group.group} open={isOpen}>
                <summary 
                  title={group.group} 
                  onClick={(e) => {
                    e.preventDefault();
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setOpenGroups((prev) => ({ ...prev, [group.group]: true }));
                    } else toggleGroup(group.group);
                  }}
                  className="cursor-pointer select-none"
                >
                  <Icon size={18} /> 
                  <span>{group.group}</span> 
                  <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </summary>
                {isOpen && group.items.map((item) => (
                  <button 
                    className={activeView === item ? "active" : ""} 
                    key={item} 
                    title={item} 
                    onClick={() => openView(item)}
                  >
                    {item}
                  </button>
                ))}
              </details>
            );
          })}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-[29] bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="workspace">
        <header className="sticky top-0 z-20 topbar">
          <div className="topbar-main">
            <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20} /></button>
            <button className="icon-btn desktop-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}><Menu size={20} /></button>
            <div className="topbar-title">
              <h2>{activeConfig.title}</h2>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-btn notification-button" onClick={async () => { setNotificationOpen(!notificationOpen); await refreshNotifications(); }}><Bell size={19} />{unreadCount > 0 && <b>{unreadCount}</b>}</button>
            <button className="icon-btn" onClick={toggleTheme} title={dark ? "Light Mode" : "Dark Mode"}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button className="user-pill" onClick={async () => { navigate("/account-settings"); setNotificationOpen(false); await refreshNotifications(); }}>
              <UserCog size={17} />
              <span>{user.name}</span>
              <small>{user.role}</small>
            </button>
            <button className="icon-btn" onClick={logout}><LogOut size={19} /></button>
          </div>
        </header>

        <ErrorBoundary key={location.pathname} fallbackTitle={`Gagal memuat modul "${activeView}"`}>
          {outlet ? (
            <Outlet context={{ 
              user: { ...user, permissions, tcodes }, permissions, tcodes, roles, notice: notice?.message || "", setNotice,
              dashboard, transactions, query, refresh, notifications
            }} />
          ) : isUnknownModuleRoute ? (
            <NotFoundPage />
          ) : cannotAccessModuleRoute ? (
            <PermissionDeniedPage requiredView={activeView} />
          ) : (
            <ModulePage
              config={activeConfig}
              rows={viewRows}
              loading={viewLoading}
              query={query}
              user={user}
              permissions={permissions}
              onCreateTransaction={() => navigate(routes.transaction.new)}
              onEditTransaction={(transaction) => navigate(routes.transaction.edit(transaction.id), { state: { transaction } })}
              onNotice={setNotice}
              onRefresh={async () => { await refreshAll(); }}
            />
          )}
        </ErrorBoundary>
      </main>
      <NotificationPanel open={notificationOpen} onClose={() => setNotificationOpen(false)} onChange={refreshUnread} />
      <ApprovalPinPrompt />
      {notice && (
        <div
          key={notice.id}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-xl w-[92%] sm:w-auto flex flex-col overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md transition-all duration-300 pointer-events-auto cursor-pointer"
          onClick={() => setNotice("")}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setNotice("");
              }}
              className="p-1 transition rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="w-full bg-slate-800/80 h-0.5 overflow-hidden">
            <div
              className="h-full bg-amber-500/90"
              style={{
                animation: "toastProgress 5000ms linear forwards"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
