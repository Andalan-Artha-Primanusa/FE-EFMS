import React from "react";
import { GripVertical, ChevronUp, ChevronDown, X } from "lucide-react";

interface InvoiceActionCellProps {
  itemId: string;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
}

export function InvoiceActionCell({
  itemId,
  onMoveUp,
  onMoveDown,
  onRemove,
}: InvoiceActionCellProps) {
  return (
    <td className="p-1.5 text-center">
      <div className="flex items-center justify-center gap-0.5">
        <div
          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
          title="Drag baris"
        >
          <GripVertical size={13} />
        </div>
        <button
          type="button"
          onClick={() => onMoveUp(itemId)}
          className="p-1 text-slate-400 hover:text-[#A57C50] hover:bg-slate-200 rounded-[3px] transition cursor-pointer"
          title="Pindah ke atas"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(itemId)}
          className="p-1 text-slate-400 hover:text-[#A57C50] hover:bg-slate-200 rounded-[3px] transition cursor-pointer"
          title="Pindah ke bawah"
        >
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(itemId)}
          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] ml-0.5 transition cursor-pointer"
          title="Hapus baris"
        >
          <X size={13} />
        </button>
      </div>
    </td>
  );
}

interface InvoiceDescriptionCellProps {
  item: any;
  onUpdateField: (id: string, field: string, val: any) => void;
}

export function InvoiceDescriptionCell({
  item,
  onUpdateField,
}: InvoiceDescriptionCellProps) {
  return (
    <td className="p-2 font-bold text-slate-800">
      {item.isCustom ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#A57C50] outline-none"
            value={item.description || ""}
            placeholder="Deskripsi pekerjaan baru..."
            onChange={(e) => onUpdateField(item.id, "description", e.target.value)}
          />
          <span className="text-[10px] uppercase font-mono px-1 py-0.5 bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30 rounded-[3px] font-bold shrink-0">
            Kustom
          </span>
        </div>
      ) : (
        <div>
          <span>{item.subSection || item.description}</span>
          {item.period && (
            <span className="text-[10px] text-slate-500 font-mono font-normal ml-2">
              ({item.period})
            </span>
          )}
        </div>
      )}
    </td>
  );
}
