import React from "react";
import { Queue, PrintTemplateConfig } from "../types";
import { QRCodeSVG } from "qrcode.react";

interface PrintableTicketProps {
  queue: Queue | null;
  config: PrintTemplateConfig;
  className?: string; // allow overriding wrapper classes
  key?: string | number;
}

export default function PrintableTicket({ queue, config, className = "" }: PrintableTicketProps) {
  if (!queue) return null;

  // Track URL formulation
  const trackUrl = `${window.location.origin}${window.location.pathname}?track_queue=${queue.id}`;

  // Format date
  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: "บริการทั่วไป",
      financial: "บริการการเงิน",
      document: "บริการเอกสาร",
      consulting: "บริการให้คำปรึกษา",
    };
    return labels[type] || "บริการทั่วไป";
  };

  // Base multiplier
  const mult = config.fontSizeMultiplier;

  return (
    <div 
      className={`print-ticket-container relative flex flex-col text-slate-900 font-sans ${className}`}
      style={{ 
        padding: `${config.margins}px`,
        backgroundColor: "white", 
        width: "100%" 
      }}
    >
      {/* Thermal paper serrated effect (simulated for UI, hidden in print) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,#f8fafc_21%)] bg-[length:8px_8px] bg-repeat-x print:hidden"></div>

      {/* Header */}
      {config.showHeader && (
        <div className="text-center w-full mb-4">
          {config.headerLogoUrl && (
            <img 
              src={config.headerLogoUrl} 
              alt="Logo" 
              className="mx-auto mb-2 object-contain grayscale"
              style={{ maxHeight: `${3 * mult}rem` }}
            />
          )}
          {config.headerText && (
            <div 
              className="font-bold tracking-tight whitespace-pre-line" 
              style={{ fontSize: `${1 * mult}rem`, lineHeight: 1.3 }}
            >
              {config.headerText}
            </div>
          )}
          <div className="border-b-2 border-dashed border-black my-3 w-full opacity-60"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="text-center w-full mb-4 space-y-3">
        {config.showServiceName && (
          <div 
            className="inline-block px-3 py-1 rounded-full border border-black font-bold"
            style={{ fontSize: `${0.875 * mult}rem` }}
          >
            {getServiceLabel(queue.serviceType)}
          </div>
        )}
        
        {config.showQueueNumber && (
          <div 
            className="font-black tracking-wider my-4"
            style={{ fontSize: `${3.5 * mult}rem`, lineHeight: 1 }}
          >
            {queue.queueNo}
          </div>
        )}

        <div className="w-full space-y-1 mt-2 text-left">
          <div className="flex justify-between font-bold" style={{ fontSize: `${0.75 * mult}rem` }}>
            <span>ผู้รับบริการ:</span>
            <span>{queue.customerName}</span>
          </div>
          {queue.phoneNumber && (
            <div className="flex justify-between font-bold" style={{ fontSize: `${0.75 * mult}rem` }}>
              <span>เบอร์โทรศัพท์:</span>
              <span>{queue.phoneNumber}</span>
            </div>
          )}
          {config.showCounter && queue.counterNo && (
            <div className="flex justify-between font-bold" style={{ fontSize: `${0.75 * mult}rem` }}>
              <span>ช่องบริการ:</span>
              <span>{queue.counterNo}</span>
            </div>
          )}
          {config.showDateTime && (
            <div className="flex justify-between font-bold" style={{ fontSize: `${0.75 * mult}rem` }}>
              <span>เวลา:</span>
              <span>{formatDate(queue.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(config.showFooter || config.showQrCode) && (
        <div className="text-center w-full mt-2">
          <div className="border-t-2 border-dashed border-black mb-3 w-full opacity-60"></div>
          
          {config.showQrCode && (
            <div className="flex flex-col items-center mb-3">
              <QRCodeSVG 
                value={trackUrl} 
                size={80 * mult}
                level="M"
                includeMargin={false}
              />
              <div 
                className="font-medium text-slate-800 mt-2 whitespace-pre-line"
                style={{ fontSize: `${0.65 * mult}rem`, lineHeight: 1.2 }}
              >
                สแกน QR Code นี้
                เพื่อดูสถานะคิวสดบนมือถือ
              </div>
            </div>
          )}

          {config.showFooter && config.footerText && (
            <div 
              className="font-medium whitespace-pre-line text-slate-800"
              style={{ fontSize: `${0.75 * mult}rem`, lineHeight: 1.4 }}
            >
              {config.footerText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
