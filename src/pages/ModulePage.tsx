import { Check, Download, Eye, FilePlus2, FolderUp, Pencil, Play, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { MasterDataForm } from "../components/MasterDataForm";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { RecordDialog } from "../components/RecordDialog";
import { expandMasterRecord, schemaFor } from "../data/masterSchemas";
import { approvalAction, cancelTransaction, closePeriod, deleteMasterRecord, downloadTemplate, generateJournal, importCSV, runReconciliation, type MasterRecord, type Permission, type Transaction, type User } from "../lib/api";
import { formatCell, humanize } from "../lib/format";
import { authorized } from "../lib/auth";
import type { ViewConfig } from "../data/navigation";

export function ModulePage({
  config,
  rows,
  loading,
  query,
  user,
  permissions,
  onCreateTransaction,
  onEditTransaction,
  onNotice,
  onRefresh
}: {
  config: ViewConfig;
  rows: any[];
  loading: boolean;
  query: string;
  user: User;
  permissions: Permission[];
  onCreateTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const permModule = (config as { menuPermissionModule?: string }).menuPermissionModule ?? "";
  const canWrite = authorized(user, permModule, "write");
  const canManage = authorized(user, permModule, "manage");
  const canAct = authorized(user, permModule, "approve") || authorized(user, permModule, "post");
  const canWriteOrManage = canWrite || canManage;
  const filteredRows = rows.filter((row) => JSON.stringify(row ?? {}).toLowerCase().includes(query.trim().toLowerCase()));
  const isTransaction = config.endpoint.startsWith("/api/transactions");
  const isMasterData = config.endpoint.startsWith("/api/master-data");
  const masterSchema = schemaFor(config.masterType);
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmAction, setConfirmAction] = useState<null | {
    title: string;
    message: string;
    label: string;
    danger?: boolean;
    run: () => Promise<void>;
  }>(null);
  const statusOptions = Array.from(new Set(rows.map((row) => String(row?.status ?? row?.budgetStatus ?? row?.postingStatus ?? "")).filter(Boolean)));
  const typeOptions = Array.from(new Set(rows.map((row) => String(row?.type ?? row?.flow ?? row?.category ?? row?.module ?? "")).filter(Boolean)));
  const visibleRows = filteredRows.filter((row) => {
    const rowStatus = String(row?.status ?? row?.budgetStatus ?? row?.postingStatus ?? "");
    const rowType = String(row?.type ?? row?.flow ?? row?.category ?? row?.module ?? "");
    return (statusFilter === "All" || rowStatus === statusFilter) && (typeFilter === "All" || rowType === typeFilter);
  });
  const displayRows = isMasterData ? visibleRows.map((row) => expandMasterRecord(row)) : visibleRows;
  const columns = isMasterData
    ? masterSchema.tableColumns
    : Array.from(new Set(displayRows.flatMap((row) => Object.keys(row ?? {})))).filter((column) => column !== "id").slice(0, 8);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !config.importType) return;
    const result = await importCSV(config.importType, file);
    onNotice(`Import ${config.title}: ${result.inserted} masuk, ${result.skipped} dilewati.`);
    await onRefresh();
    event.target.value = "";
  }

  async function runProcess(action: string) {
    if (action === "journal") await generateJournal(config.title, `${config.title}-${Date.now()}`);
    if (action === "reconcile") await runReconciliation(config.title.includes("Vendor") ? "Vendor Reconciliation" : "Bank Reconciliation", new Date().toISOString().slice(0, 7));
    if (action === "close") await closePeriod(new Date().toISOString().slice(0, 7));
    onNotice(`Proses ${config.title} berhasil dijalankan.`);
    await onRefresh();
  }



  return <section className="module-view">
    <PageHeader
      title={config.title}
      description="Data modul ditarik langsung dari endpoint backend dan filter di bawah hanya memakai kolom yang tersedia dari API."
      meta={<span className="header-meta">{config.menuCode} · {visibleRows.length} dari {rows.length} data</span>}
    >
      <div className="filter-row">
        <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={!statusOptions.length}>
          <option>All</option>
          {statusOptions.map((status) => <option key={status}>{status}</option>)}
        </select></label>
        <label>Tipe<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} disabled={!typeOptions.length}>
          <option>All</option>
          {typeOptions.map((type) => <option key={type}>{type}</option>)}
        </select></label>
        <button className="ghost" onClick={() => { setStatusFilter("All"); setTypeFilter("All"); }}>Reset</button>
      </div>
    </PageHeader>
    <Panel title="Data" action={<div className="module-actions">
      {isMasterData && canWriteOrManage && <button className="primary compact" onClick={() => navigate(window.location.pathname + "/new")}><FilePlus2 size={16} /> Create</button>}
      {isTransaction && canWriteOrManage && <button className="primary compact" onClick={onCreateTransaction}><FilePlus2 size={16} /> Create</button>}
      {config.endpoint.includes("accounting") && <button className="ghost" onClick={() => runProcess("journal")}><Play size={16} /> Generate Journal</button>}
      {config.endpoint.includes("reconciliations") && <button className="ghost" onClick={() => runProcess("reconcile")}><RefreshCw size={16} /> Run Reconcile</button>}
      {config.endpoint.includes("closing-periods") && <button className="ghost" onClick={() => runProcess("close")}><Check size={16} /> Close Period</button>}
      {config.importType && (canWriteOrManage) && <>
      <button className="ghost" onClick={() => downloadTemplate(config.importType!)}><Download size={16} /> Template</button>
      <label className="ghost import-trigger"><FolderUp size={16} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={upload} /></label>
      </>}
    </div>}>
      {loading ? <div className="empty">Memuat data...</div> : (
        <DataTable<any>
          data={displayRows}
          keyExtractor={(row, index) => row?.id ?? row?.code ?? index}
          columns={[
            ...columns.map((column) => ({
              header: humanize(column),
              accessorKey: column,
              cell: (row: any) => formatCell(row?.[column])
            })),
            ...((isTransaction || isMasterData) ? [{
              header: "Aksi",
              align: "right" as const,
              cell: (row: any) => {
                const index = displayRows.findIndex(r => r === row);
                return (
                  <div className="row-actions justify-end">
                    {isMasterData && (
                      <>
                        <button className="icon-mini" title="View" onClick={() => setViewRecord(row)}><Eye size={15} /></button>
                        {canWriteOrManage && <>
                          <button className="icon-mini" title="Edit" onClick={() => navigate(`${window.location.pathname}/${row.id}/edit`)}><Pencil size={15} /></button>
                          <button className="icon-mini danger" title="Delete" onClick={() => setConfirmAction({
                            title: "Delete master data",
                            message: `Nonaktifkan master data ${row.code ?? row.name}? Data akan tetap ada untuk audit dan referensi transaksi.`,
                            label: "Delete",
                            danger: true,
                            run: async () => { await deleteMasterRecord(row.id); onNotice("Master data dinonaktifkan."); await onRefresh(); }
                          })}><Trash2 size={15} /></button>
                        </>}
                      </>
                    )}
                    {isTransaction && (
                      <>
                        <button className="icon-mini" title="View" onClick={() => setViewRecord(row)}><Eye size={15} /></button>
                        {canWriteOrManage && <button className="icon-mini" title="Edit" onClick={() => onEditTransaction(row)}><Pencil size={15} /></button>}
                        {canAct && <>
                          <button className="icon-mini" title="Approve" onClick={() => setConfirmAction({
                            title: "Approve transaksi",
                            message: `Approve ${row.number}? Transaksi akan lanjut ke proses berikutnya.`,
                            label: "Approve",
                            run: async () => { await approvalAction(row.id, "approve", "Approved from module"); onNotice("Transaksi approved."); await onRefresh(); }
                          })}><Check size={15} /></button>
                          <button className="icon-mini" title="Reject" onClick={() => setConfirmAction({
                            title: "Reject transaksi",
                            message: `Reject ${row.number}? Transaksi akan dikembalikan dari workflow approval.`,
                            label: "Reject",
                            danger: true,
                            run: async () => { await approvalAction(row.id, "reject", "Rejected from module"); onNotice("Transaksi rejected."); await onRefresh(); }
                          })}><XCircle size={15} /></button>
                        </>}
                        {canWriteOrManage && <button className="icon-mini" title="Generate Journal" onClick={() => setConfirmAction({
                          title: "Generate journal",
                          message: `Generate journal untuk ${row.number}?`,
                          label: "Generate",
                          run: async () => { await generateJournal("Transaction Request", row.number); onNotice("Journal generated."); await onRefresh(); }
                        })}><Play size={15} /></button>}
                        {canWriteOrManage && <button className="icon-mini danger" title="Cancel" onClick={() => setConfirmAction({
                          title: "Cancel transaksi",
                          message: `Cancel ${row.number}? Data tidak dihapus fisik, status akan menjadi Cancelled untuk audit trail.`,
                          label: "Cancel transaksi",
                          danger: true,
                          run: async () => { await cancelTransaction(row.id); onNotice("Transaksi dicancel."); await onRefresh(); }
                        })}><Trash2 size={15} /></button>}
                      </>
                    )}
                  </div>
                );
              }
            }] : [])
          ]}
          emptyMessage={query || statusFilter !== "All" || typeFilter !== "All" ? "Tidak ada data yang cocok dengan filter." : "Belum ada data dari API untuk modul ini."}
        />
      )}
    </Panel>
    {viewRecord && <RecordDialog title={`Detail ${config.title}`} record={viewRecord} onClose={() => setViewRecord(null)} />}
    {confirmAction && <ConfirmDialog
      title={confirmAction.title}
      message={confirmAction.message}
      confirmLabel={confirmAction.label}
      danger={confirmAction.danger}
      onCancel={() => setConfirmAction(null)}
      onConfirm={async () => {
        await confirmAction.run();
        setConfirmAction(null);
      }}
    />}
  </section>;
}
