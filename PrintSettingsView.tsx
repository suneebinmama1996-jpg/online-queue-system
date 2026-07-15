import React, { useState, useEffect } from "react";
import { PrintTemplateConfig } from "../types";
import { defaultPrintConfig } from "../lib/print";
import { Printer, Save, Check, Type, Layers, LayoutTemplate, Image as ImageIcon } from "lucide-react";
import PrintableTicket from "./PrintableTicket"; // We will create this
import { Queue } from "../types";

export default function PrintSettingsView() {
  const [config, setConfig] = useState<PrintTemplateConfig>(() => {
    const saved = localStorage.getItem("print_template_config");
    if (saved) {
      try {
        return { ...defaultPrintConfig, ...JSON.parse(saved) };
      } catch (e) {
        return defaultPrintConfig;
      }
    }
    return defaultPrintConfig;
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("print_template_config", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTextChange = (field: keyof PrintTemplateConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field: keyof PrintTemplateConfig) => {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNumberChange = (field: keyof PrintTemplateConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Dummy queue for preview
  const dummyQueue: Queue = {
    id: "preview-123",
    queueNo: "A001",
    customerName: "สมชาย ใจดี",
    phoneNumber: "0812345678",
    serviceType: "general",
    status: "waiting",
    branchId: "b1",
    createdAt: new Date().toISOString()
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ตั้งค่าแม่แบบการพิมพ์</h1>
            <p className="text-sm text-slate-500">กำหนดรูปแบบสลิปบัตรคิวสำหรับเครื่องพิมพ์ความร้อน (Thermal Printer)</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors"
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? "บันทึกแล้ว" : "บันทึกแม่แบบ"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          
          {/* Header Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-pink-500" />
              ส่วนหัวสลิป (Header)
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showHeader} 
                  onChange={() => handleToggle("showHeader")}
                  className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                />
                <span className="font-medium text-slate-700">แสดงส่วนหัวสลิป</span>
              </label>

              {config.showHeader && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความส่วนหัว (รองรับการขึ้นบรรทัดใหม่)</label>
                    <textarea 
                      value={config.headerText}
                      onChange={(e) => handleTextChange("headerText", e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[80px]"
                      placeholder="ชื่อร้าน/สาขา"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">URL โลโก้ (ใส่เพื่อให้แสดงรูปแทน/เหนือข้อความ)</label>
                    <div className="flex gap-2">
                      <ImageIcon className="w-5 h-5 text-slate-400 mt-2.5" />
                      <input 
                        type="text" 
                        value={config.headerLogoUrl}
                        onChange={(e) => handleTextChange("headerLogoUrl", e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" />
              ส่วนข้อมูลหลัก (Main Content)
            </h3>
            <div className="space-y-3">
              {[
                { field: "showDateTime", label: "แสดงวัน-เวลา (Date & Time)" },
                { field: "showQueueNumber", label: "แสดงเลขคิว (Queue Number)" },
                { field: "showServiceName", label: "แสดงชื่อบริการ (Service Name)" },
                { field: "showCounter", label: "แสดงเลขช่องบริการ (ถ้ามี)" },
                { field: "showQrCode", label: "แสดง QR Code ตรวจสอบคิวสด" },
              ].map((item) => (
                <label key={item.field} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config[item.field as keyof PrintTemplateConfig] as boolean} 
                    onChange={() => handleToggle(item.field as keyof PrintTemplateConfig)}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-pink-500" />
              ส่วนท้ายสลิป (Footer)
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showFooter} 
                  onChange={() => handleToggle("showFooter")}
                  className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                />
                <span className="font-medium text-slate-700">แสดงส่วนท้ายสลิป</span>
              </label>

              {config.showFooter && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความส่วนท้าย (แจ้งเตือน/ขอบคุณ)</label>
                  <textarea 
                    value={config.footerText}
                    onChange={(e) => handleTextChange("footerText", e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[80px]"
                    placeholder="กรุณารอเรียกคิวบริเวณหน้าห้องบริการ"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Layout & Font Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pink-500" />
              ขนาดและระยะ (Size & Margins)
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">ขนาดฟอนต์โดยรวม (Font Size Multiplier)</label>
                  <span className="text-sm font-bold text-pink-600">{config.fontSizeMultiplier.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="2" step="0.1" 
                  value={config.fontSizeMultiplier}
                  onChange={(e) => handleNumberChange("fontSizeMultiplier", parseFloat(e.target.value))}
                  className="w-full accent-pink-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">ระยะขอบสลิป (Padding / Margins - px)</label>
                  <span className="text-sm font-bold text-pink-600">{config.margins}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="40" step="2" 
                  value={config.margins}
                  onChange={(e) => handleNumberChange("margins", parseInt(e.target.value))}
                  className="w-full accent-pink-600"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Live Preview Panel */}
        <div className="bg-slate-100 rounded-3xl p-6 border-4 border-slate-200 flex flex-col items-center sticky top-6">
          <h3 className="text-lg font-bold text-slate-600 mb-6 uppercase tracking-wider text-center">Live Preview</h3>
          
          <div className="bg-white shadow-xl max-w-[320px] w-full overflow-hidden transition-all duration-300">
            {/* We will render PrintableTicket inside here */}
            <PrintableTicket queue={dummyQueue} config={config} />
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500 font-medium">รองรับเครื่องพิมพ์สลิปความร้อน (Thermal Printer) ขนาด 58mm และ 80mm</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Icon for slider
function Sliders(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="14" y2="14"/><line x1="4" x2="20" y1="7" y2="7"/>
    </svg>
  );
}
