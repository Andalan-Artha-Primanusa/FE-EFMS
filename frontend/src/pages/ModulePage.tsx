import { Check, Download, Eye, FilePlus2, FolderUp, Pencil, Play, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MasterDataForm } from "../components/MasterDataForm";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { RecordDialog } from "../components/RecordDialog";
import { expandMasterRecord, schemaFor } from "../data/masterSchemas";
import { approvalAction, cancelTransaction, closePeriod, deleteMasterRecord, downloadTemplate, generateJournal, importCSV, runReconciliation, type MasterRecord, type Transaction } from "../lib/api";
import { formatCell, humanize } from "../lib/format";
import type { ViewConfig } from "../data/navigation";

export function ModulePage({
  config,
  rows,
  loading,
  query,
  onCreateTransaction,
  onEditTransaction,
  onNotice,
  onRefresh
}: {
  config: ViewConfig;
  rows: any[];
  loading: boolean;
  query: string;
  onCreateTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const filteredRows = rows.filter((row) => JSON.stringify(row ?? {}).toLowerCase().includes(query.trim().toLowerCase()));
  const isTransaction = config.endpoint.startsWith("/api/transactions");
  const isMasterData = config.endpoint.startsWith("/api/master-data");
  const masterSchema = schemaFor(config.masterType);
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [masterPage, setMasterPage] = useState<"list" | "create" | "edit" | "view">("list");
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

  function backToMasterList() {
    setMasterPage("list");
    setEditingMaster(null);
    setViewRecord(null);
  }

  if (isMasterData && config.masterType && masterPage === "create") {
    return <MasterDataForm
      type={config.masterType}
      onCancel={backToMasterList}
      onSaved={async () => {
        backToMasterList();
        onNotice("Master data tersimpan.");
        await onRefresh();
      }}
    />;
  }

  if (isMasterData && config.masterType && masterPage === "edit") {
    return <MasterDataForm
      type={config.masterType}
      record={editingMaster}
      onCancel={backToMasterList}
      onSaved={async () => {
        backToMasterList();
        onNotice("Master data tersimpan.");
        await onRefresh();
      }}
    />;
  }

  if (isMasterData && masterPage === "view" && viewRecord) {
    return <RecordDialog title={`Detail ${config.title}`} record={viewRecord} onClose={backToMasterList} page />;
  }

  return <section className="module-view">
    <PageHeader
      title={config.title}
      description="Data modul ditarik langsung dari endpoint backend dan filter di bawah hanya memakai kolom yang tersedia dari API."
      meta={<span className="header-meta">{visibleRows.length} dari {rows.length} data</span>}
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
      {isMasterData && <button className="primary compact" onClick={() => { setEditingMaster(null); setMasterPage("create"); }}><FilePlus2 size={16} /> Create</button>}
      {isTransaction && <button className="primary compact" onClick={onCreateTransaction}><FilePlus2 size={16} /> Create</button>}
      {config.endpoint.includes("accounting") && <button className="ghost" onClick={() => runProcess("journal")}><Play size={16} /> Generate Journal</button>}
      {config.endpoint.includes("reconciliations") && <button className="ghost" onClick={() => runProcess("reconcile")}><RefreshCw size={16} /> Run Reconcile</button>}
      {config.endpoint.includes("closing-periods") && <button className="ghost" onClick={() => runProcess("close")}><Check size={16} /> Close Period</button>}
      {config.importType && <>
      <button className="ghost" onClick={() => downloadTemplate(config.importType!)}><Download size={16} /> Template</button>
      <label className="ghost import-trigger"><FolderUp size={16} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={upload} /></label>
      </>}
    </div>}>
      {loading ? <div className="empty">Memuat data...</div> : <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.length ? columns.map((column) => <th key={column}>{humanize(column)}</th>) : <th>Data</th>}{(isTransaction || isMasterData) && <th>Aksi</th>}</tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => <tr key={row?.id ?? row?.code ?? index}>
              {columns.map((column) => <td key={column}>{formatCell(row?.[column])}</td>)}
              {isMasterData && <td><div className="row-actions">
                <button className="icon-mini" title="View" onClick={() => { setViewRecord(row); setMasterPage("view"); }}><Eye size={15} /></button>
                <button className="icon-mini" title="Edit" onClick={() => { setEditingMaster(visibleRows[index]); setMasterPage("edit"); }}><Pencil size={15} /></button>
                <button className="icon-mini danger" title="Delete" onClick={() => setConfirmAction({
                  title: "Delete master data",
                  message: `Nonaktifkan master data ${row.code ?? row.name}? Data akan tetap ada untuk audit dan referensi transaksi.`,
                  label: "Delete",
                  danger: true,
                  run: async () => { await deleteMasterRecord(row.id); onNotice("Master data dinonaktifkan."); await onRefresh(); }
                })}><Trash2 size={15} /></button>
              </div></td>}
              {isTransaction && <td><div className="row-actions">
                <button className="icon-mini" title="View" onClick={() => setViewRecord(row)}><Eye size={15} /></button>
                <button className="icon-mini" title="Edit" onClick={() => onEditTransaction(row)}><Pencil size={15} /></button>
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
                <button className="icon-mini" title="Generate Journal" onClick={() => setConfirmAction({
                  title: "Generate journal",
                  message: `Generate journal untuk ${row.number}?`,
                  label: "Generate",
                  run: async () => { await generateJournal("Transaction Request", row.number); onNotice("Journal generated."); await onRefresh(); }
                })}><Play size={15} /></button>
                <button className="icon-mini danger" title="Cancel" onClick={() => setConfirmAction({
                  title: "Cancel transaksi",
                  message: `Cancel ${row.number}? Data tidak dihapus fisik, status akan menjadi Cancelled untuk audit trail.`,
                  label: "Cancel transaksi",
                  danger: true,
                  run: async () => { await cancelTransaction(row.id); onNotice("Transaksi dicancel."); await onRefresh(); }
                })}><Trash2 size={15} /></button>
              </div></td>}
            </tr>)}
            {!visibleRows.length && <tr><td colSpan={Math.max(columns.length + (isTransaction || isMasterData ? 1 : 0), 1)} className="empty">{query || statusFilter !== "All" || typeFilter !== "All" ? "Tidak ada data yang cocok dengan filter." : "Belum ada data dari API untuk modul ini."}</td></tr>}
          </tbody>
        </table>
      </div>}
    </Panel>
    {!isMasterData && viewRecord && <RecordDialog title={`Detail ${config.title}`} record={viewRecord} onClose={() => setViewRecord(null)} />}
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
