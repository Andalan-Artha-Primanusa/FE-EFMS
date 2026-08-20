import { ArrowLeft } from "lucide-react";
import { formatCell, humanize } from "../lib/format";

export function RecordDialog({
  title,
  record,
  onClose,
  page = false
}: {
  title: string;
  record: Record<string, unknown>;
  onClose: () => void;
  page?: boolean;
}) {
  const entries = Object.entries(record).filter(([key]) => key !== "id");
  const content = <section className={page ? "entity-page record-page" : "modal record-modal"}>
      {page && <div className="entity-page-head">
        <button type="button" className="ghost" onClick={onClose}><ArrowLeft size={16} /> Back</button>
        <span className="header-meta">View Mode</span>
      </div>}
      <div className="panel-head">
        <h3>{title}</h3>
        {!page && <button type="button" className="icon-btn" onClick={onClose}>x</button>}
      </div>
      <dl className="record-grid">
        {entries.map(([key, value]) => <div key={key}>
          <dt>{humanize(key)}</dt>
          <dd>{formatCell(value)}</dd>
        </div>)}
      </dl>
    </section>;
  if (page) return content;
  return <div className="modal-backdrop">{content}</div>;
}
