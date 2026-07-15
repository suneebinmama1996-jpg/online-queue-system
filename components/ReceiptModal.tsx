import React, { useState, useEffect } from "react";
import { Printer, X, Check, Layers } from "lucide-react";
import { Queue, PrintTemplateConfig } from "../types";
import { defaultPrintConfig } from "../lib/print";
import PrintableTicket from "./PrintableTicket";

interface ReceiptModalProps {
  queue?: Queue | null;
  queues?: Queue[];
  onClose: () => void;
}

export default function ReceiptModal({ queue, queues, onClose }: ReceiptModalProps) {
  const [config, setConfig] = useState<PrintTemplateConfig>(defaultPrintConfig);

  useEffect(() => {
    const saved = localStorage.getItem("print_template_config");
    if (saved) {
      try {
        setConfig({ ...defaultPrintConfig, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to load print config", e);
      }
    }
  }, []);

  const itemsToPrint = queues && queues.length > 0 ? queues : queue ? [queue] : [];

  if (itemsToPrint.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in print:p-0 print:bg-white print:block">
      {/* Hidden container for print view - displays all tickets */}
      <div id="receipt-print-area" className="hidden print:block w-full">
        <style>
          {`
            @media print {
              @page { margin: 0; size: 58mm auto; }
              body { margin: 0; padding: 0; background-color: white; }
              .print-ticket-container { page-break-after: always; width: 100% !important; max-width: 100% !important; margin: 0 !important; }
            }
          `}
        </style>
        {itemsToPrint.map((q, idx) => (
          <PrintableTicket key={q.id || idx} queue={q} config={config} />
        ))}
      </div>

      {/* UI for Screen View */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col border border-slate-100 max-h-[90vh] print:hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {itemsToPrint.length > 1 ? <Layers className="w-5 h-5 text-pink-400" /> : <Printer className="w-5 h-5 text-pink-400" />}
            <span className="font-bold text-sm">
              {itemsToPrint.length > 1 ? `พิมพ์บัตรคิวทั้งหมด (${itemsToPrint.length} คิว)` : 'ตั๋วคิว/พิมพ์ใบรับคิว (Queue Ticket)'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container - Printable Area Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col items-center">
          {itemsToPrint.length > 1 && (
            <div className="mb-4 text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-full">
              กำลังดูตัวอย่างคิวแรก จากทั้งหมด {itemsToPrint.length} คิว
            </div>
          )}
          {/* Printable Ticket Preview */}
          <div className="bg-white w-full max-w-[280px] shadow-md border border-slate-200">
            <PrintableTicket queue={itemsToPrint[0]} config={config} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ปิดหน้าจอ
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-600/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {itemsToPrint.length > 1 ? 'พิมพ์ทั้งหมด' : 'พิมพ์ตั๋วคิว'}
          </button>
        </div>
      </div>
    </div>
  );
}
