import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Layers, 
  Trash2, 
  Plus, 
  Info, 
  Check, 
  Volume2, 
  Tv, 
  Sliders,
  Sparkles, Settings, HelpCircle, MessageCircle
} from "lucide-react";
import { Branch, Service, LineConfig } from "../types";
import { speakThai } from "../lib/voice";

interface SettingsViewProps {
  branches: Branch[];
  services: Service[];
  onAddBranch: (name: string) => Promise<any>;
  onDeleteBranch: (id: string) => Promise<any>;
  onAddService: (id: string, name: string, prefix: string, description: string) => Promise<any>;
  onDeleteService: (id: string) => Promise<any>;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speechPitch: number;
  setSpeechPitch: (pitch: number) => void;
  selectedVoiceName: string;
  setSelectedVoiceName: (voiceName: string) => void;
  speechEngine: "google" | "local";
  setSpeechEngine: (engine: "google" | "local") => void;
  speechSuffix: string;
  setSpeechSuffix: (suffix: string) => void;
  lineConfig: LineConfig;
  onUpdateLineConfig: (config: Partial<LineConfig>) => Promise<any>;
}

export default function SettingsView({
  branches,
  services,
  onAddBranch,
  onDeleteBranch,
  onAddService,
  onDeleteService,
  speechRate,
  setSpeechRate,
  speechPitch,
  setSpeechPitch,
  selectedVoiceName,
  setSelectedVoiceName,
  speechEngine,
  setSpeechEngine,
  speechSuffix,
  setSpeechSuffix,
  lineConfig,
  onUpdateLineConfig,
}: SettingsViewProps) {
  // Branch form state
  const [branchName, setBranchName] = useState("");
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  // Service form state
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrefix, setServicePrefix] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);

  // Feedback notifications
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Line Settings state
  const [lineToken, setLineToken] = useState(lineConfig.token);
  const [lineChannelSecret, setLineChannelSecret] = useState(lineConfig.channelSecret || "");
  const [lineOaId, setLineOaId] = useState(lineConfig.lineOaId || "");
  const [simulateOnly, setSimulateOnly] = useState(lineConfig.simulateOnly);
  const [lineEnabled, setLineEnabled] = useState(lineConfig.enabled);
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [showConfigMsg, setShowConfigMsg] = useState(false);

  let origin = typeof window !== "undefined" ? window.location.origin : "";
  if (origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  const webhookUrl = `${origin}/api/webhook/line`;

  const handleSaveLineConfig = async () => {
    setIsSavingLine(true);
    try {
      await onUpdateLineConfig({
        token: lineToken,
        channelSecret: lineChannelSecret,
        lineOaId,
        simulateOnly,
        enabled: lineEnabled,
      });
      setShowConfigMsg(true);
      setTimeout(() => setShowConfigMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingLine(false);
    }
  };

  // Voice synthesis list states & test triggers
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showAllVoices, setShowAllVoices] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices();
        setAllVoices(list);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const thaiVoicesOnly = allVoices.filter((v) => 
    v.lang.toLowerCase().includes("th") || 
    v.lang.replace("_", "-").toLowerCase().startsWith("th")
  );

  const displayedVoices = showAllVoices ? allVoices : thaiVoicesOnly;

  const handleTestSpeech = () => {
    const suffix = localStorage.getItem("speech_suffix") || "ค่ะ";
    const suffixText = suffix === "none" ? "" : suffix;
    const testText = `ขอเชิญหมายเลข เอ หนึ่ง ศูนย์ หนึ่ง ที่ช่องบริการ หนึ่ง ${suffixText}`.trim();

    try {
      speakThai(
        testText,
        speechRate,
        () => {},
        () => {}
      );
    } catch (err) {
      console.error(err);
      triggerAlert("error", "ระบบสังเคราะห์เสียงล้มเหลว");
    }
  };

  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setIsAddingBranch(true);
    try {
      await onAddBranch(branchName.trim());
      setBranchName("");
      triggerAlert("success", "เพิ่มสาขาใหม่สำเร็จแล้ว!");
    } catch (err) {
      triggerAlert("error", "เกิดข้อผิดพลาดในการเพิ่มสาขา");
    } finally {
      setIsAddingBranch(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrefix.trim()) {
      triggerAlert("error", "กรุณากรอกชื่อบริการและรหัสเรียกคิว");
      return;
    }
    setIsAddingService(true);
    try {
      // If serviceId is empty, let server generate or create key
      const id = serviceId.trim() || "srv-" + Math.random().toString(36).substring(2, 7);
      await onAddService(
        id,
        serviceName.trim(),
        servicePrefix.trim().toUpperCase().substring(0, 1),
        serviceDesc.trim()
      );
      setServiceId("");
      setServiceName("");
      setServicePrefix("");
      setServiceDesc("");
      triggerAlert("success", "เพิ่ม/แก้ไข ประเภทบริการสำเร็จแล้ว!");
    } catch (err) {
      triggerAlert("error", "เกิดข้อผิดพลาดในการบันทึกบริการ");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleDeleteBranchClick = async (id: string, name: string) => {
    if (branches.length <= 1) {
      triggerAlert("error", "ต้องมีอย่างน้อยหนึ่งสาขา ไม่สามารถลบสาขาสุดท้ายได้");
      return;
    }
    if (window.confirm(`⚠️ คุณต้องการลบสาขา "${name}" ใช่หรือไม่? (คิวทั้งหมดในสาขานี้จะไม่แสดงบนบอร์ด)`)) {
      try {
        await onDeleteBranch(id);
        triggerAlert("success", `ลบสาขา ${name} เรียบร้อยแล้ว`);
      } catch (err) {
        triggerAlert("error", "ลบสาขาไม่สำเร็จ");
      }
    }
  };

  const handleDeleteServiceClick = async (id: string, name: string) => {
    if (services.length <= 1) {
      triggerAlert("error", "ต้องมีอย่างน้อยหนึ่งประเภทบริการ ไม่สามารถลบประเภทสุดท้ายได้");
      return;
    }
    if (window.confirm(`⚠️ คุณต้องการลบประเภทบริการ "${name}" ใช่หรือไม่?`)) {
      try {
        await onDeleteService(id);
        triggerAlert("success", `ลบประเภทบริการ ${name} เรียบร้อยแล้ว`);
      } catch (err) {
        triggerAlert("error", "ลบประเภทบริการไม่สำเร็จ");
      }
    }
  };

  const handleEditServiceClick = (srv: Service) => {
    setServiceId(srv.id);
    setServiceName(srv.name);
    setServicePrefix(srv.prefix);
    setServiceDesc(srv.description || "");
    triggerAlert("success", `โหลดข้อมูล "${srv.name}" เพื่อแก้ไขแล้ว`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Visual Toast Notification inside Settings */}
      {alert && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 transition-all ${
          alert.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-500" 
            : "bg-rose-600 text-white border-rose-500"
        }`}>
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          {alert.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-600 to-pink-800 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sliders className="w-32 h-32 rotate-12" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> ผู้ดูแลระบบ
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight">ตั้งค่าสาขาและแผนกบริการ</h2>
        <p className="text-xs text-pink-100 mt-1 max-w-xl">
          จัดการแยกคิวอิสระตามรายสาขาของคุณ และปรับแต่งปุ่มประเภทการรับบริการได้ด้วยตัวคุณเอง โดยทุกสาขาจะใช้เทคโนโลยีการทำงานเรียลไทม์ประสานเสียงเรียกคิวแบบเดียวกัน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1. BRANCH MANAGEMENT CARD */}
        <div className="bg-white rounded-3xl border border-pink-100/70 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-pink-50 rounded-xl text-pink-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">จัดการข้อมูลสาขา (Branches)</h3>
                <p className="text-2xs text-slate-500 font-sans">เพิ่ม ลบ หรือกำหนดสาขาของศูนย์บริการ</p>
              </div>
            </div>

            {/* List of Branches */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto mb-6 pr-1">
              {branches.map((branch) => (
                <div 
                  key={branch.id} 
                  className="flex items-center justify-between p-3.5 bg-pink-50/20 hover:bg-pink-50/50 border border-pink-100 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    <span className="text-xs font-bold text-slate-800">{branch.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteBranchClick(branch.id, branch.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="ลบสาขานี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Branch Form */}
          <form onSubmit={handleCreateBranch} className="border-t border-slate-100 pt-5 mt-auto">
            <label className="block text-2xs font-bold text-slate-700 mb-2">เพิ่มสาขาใหม่</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="เช่น สาขาลาดพร้าว, สาขาสยาม"
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-medium"
              />
              <button
                type="submit"
                disabled={isAddingBranch || !branchName.trim()}
                className="py-2.5 px-4 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสาขา
              </button>
            </div>
          </form>
        </div>

        {/* 2. SERVICE MANAGEMENT CARD */}
        <div className="bg-white rounded-3xl border border-pink-100/70 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-pink-50 rounded-xl text-pink-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">จัดการแผนกบริการ (Services)</h3>
                <p className="text-2xs text-slate-500 font-sans">ปรับเปลี่ยนประเภทการรับคิว รหัส และข้อมูลแนะนำ</p>
              </div>
            </div>

            {/* List of Services */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto mb-6 pr-1">
              {services.map((service) => (
                <div 
                  key={service.id} 
                  className="flex items-center justify-between p-3 bg-pink-50/20 hover:bg-pink-50/50 border border-pink-100 rounded-2xl transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 text-2xs font-extrabold px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-800 border border-pink-200 shrink-0">
                      {service.prefix}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{service.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{service.description || "ไม่มีคำอธิบาย"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditServiceClick(service)}
                      className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all cursor-pointer text-[10px] font-bold"
                      title="แก้ไขข้อมูล"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteServiceClick(service.id, service.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="ลบบริการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add / Edit Service Form */}
          <form onSubmit={handleCreateService} className="border-t border-slate-100 pt-5 space-y-3.5 mt-auto">
            <h4 className="text-2xs font-extrabold text-slate-800 flex justify-between">
              <span>{serviceId ? "📝 แก้ไขประเภทบริการ" : "✨ เพิ่มประเภทบริการใหม่"}</span>
              {serviceId && (
                <button
                  type="button"
                  onClick={() => {
                    setServiceId("");
                    setServiceName("");
                    setServicePrefix("");
                    setServiceDesc("");
                  }}
                  className="text-pink-600 hover:underline"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-600">ชื่อบริการ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="เช่น ฝาก-ถอน บัญชี"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600">อักษรนำคิว <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  maxLength={1}
                  value={servicePrefix}
                  onChange={(e) => setServicePrefix(e.target.value)}
                  placeholder="A"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-bold text-center uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600">รายละเอียดแนะนำบริการ</label>
              <input
                type="text"
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="เช่น ชำระค่าสาธารณูปโภค วินิจฉัยเคสเอกสาร"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingService || !serviceName.trim() || !servicePrefix.trim()}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              {serviceId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {serviceId ? "บันทึกข้อมูลแก้ไข" : "เพิ่มประเภทบริการ"}
            </button>
          </form>
        </div>

      </div>

      {/* 3. THAI SPEECH CUSTOMIZATION & TESTER CARD */}
      <div className="bg-white rounded-3xl border border-pink-100/70 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-pink-100/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-50 rounded-xl text-pink-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">ตั้งค่าเสียงเรียกคิวภาษาไทย (Thai Voice Synthesizer)</h3>
              <p className="text-2xs text-slate-500 font-sans">ปรับเปลี่ยนความถี่ โทนเสียง และทดลองเลือกเสียงผู้หญิง/ผู้ชาย</p>
            </div>
          </div>

          {/* Toggle Show All Voices */}
          <label className="flex items-center gap-1.5 text-2xs font-bold text-pink-700 bg-pink-50/70 hover:bg-pink-50 px-3 py-1.5 rounded-xl cursor-pointer select-none border border-pink-100 transition-all shrink-0">
            <input
              type="checkbox"
              checked={showAllVoices}
              onChange={(e) => setShowAllVoices(e.target.checked)}
              className="rounded-sm border-pink-300 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>แสดงเสียงทุกภาษาทั้งหมด ({allVoices.length} เสียง)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Voice Engine select dropdown */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-700">ระบบสังเคราะห์เสียง (Voice Engine)</label>
            <select
              value={speechEngine}
              onChange={(e) => setSpeechEngine(e.target.value as "google" | "local")}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 font-bold text-slate-700"
            >
              <option value="google">Google Cloud (เสียงออนไลน์ผู้หญิงสุภาพ - แนะนำสูงสุด ⭐)</option>
              <option value="local">Web Speech API (เสียงระบบเครื่อง/บราวเซอร์ - ปรับแต่งได้)</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              * แนะนำ "Google Cloud" เพื่อความเสียงผู้หญิงแท้และนุ่มนวลเสถียรที่สุดในทุกบราวเซอร์
            </p>
          </div>

          {/* 2. Suffix select dropdown */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-700">คำลงท้ายเสียงเรียก (Speech Suffix)</label>
            <select
              value={speechSuffix}
              onChange={(e) => setSpeechSuffix(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 font-bold text-slate-700"
            >
              <option value="ค่ะ">ลงท้ายด้วย "ค่ะ" (ผู้หญิงสุภาพ) 👩‍💼</option>
              <option value="ครับ">ลงท้ายด้วย "ครับ" (ผู้ชายสุภาพ) 👨‍💼</option>
              <option value="none">ไม่มีคำลงท้าย (เว้นว่าง)</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              * กำหนดคำปิดท้ายประโยคเมื่อเรียกคิว (บอร์ดเจ้าหน้าที่และ TV จะใช้ค่าเดียวกันนี้)
            </p>
          </div>

          {/* 3. Rate slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-2xs font-bold text-slate-700">
              <span>ความเร็วเสียงเรียก (Speech Rate):</span>
              <span className="text-pink-600 font-mono font-extrabold">{speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>ช้ามาก</span>
              <span>ปานกลาง (0.65x)</span>
              <span>เร็วปกติ (1.0x)</span>
            </div>
          </div>

          {/* 4. Pitch or Voice Character (only relevant for local) */}
          <div className="space-y-1.5">
            {speechEngine === "local" ? (
              <>
                <label className="block text-2xs font-bold text-slate-700">เสียงระบบเครื่อง (Voice Character)</label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 font-bold text-slate-700"
                >
                  <option value="">-- ใช้เสียงผู้หญิงจำลอง (ค่าเริ่มต้น) --</option>
                  {displayedVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} [{v.lang}]
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400">
                  {thaiVoicesOnly.length === 0 ? "⚠️ ไม่พบเสียงภาษาไทยในอุปกรณ์นี้" : `พบเสียงไทย ${thaiVoicesOnly.length} เสียง`}
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-between text-2xs font-bold text-slate-700">
                  <span>โทนเสียงแหลม-ทุ้ม (Speech Pitch):</span>
                  <span className="text-pink-600 font-mono font-extrabold">{speechPitch}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>เสียงทุ้ม (0.5)</span>
                  <span>มาตรฐาน (1.25)</span>
                  <span>เสียงสูง (2.0)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live Audio Test Actions & Advice */}
        <div className="bg-pink-50/20 border border-pink-100 p-5 rounded-2xl flex flex-col lg:flex-row justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <p className="font-extrabold text-pink-700 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4" />
              💡 ทำอย่างไรเมื่อเสียงยังเป็นเสียงผู้ชาย แม้จะปรับระดับแล้ว?
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
              <li>
                <strong>บราวเซอร์บางตัวถูกล็อกเสียงผู้ชายเริ่มต้น:</strong> เบราว์เซอร์หรือโทรศัพท์บางเครื่องอาจไม่มีไฟล์ผู้หญิงภาษาไทยติดตั้งมาจากโรงงาน ทำให้ระบบจำยอมต้องใช้เสียงผู้ชายออฟไลน์แทน
              </li>
              <li>
                <strong>วิธีแก้ไขด่วน (เลือกเสียงภาษาอื่น):</strong> ลองทำเครื่องหมายที่ช่อง <strong>"แสดงเสียงทุกภาษาทั้งหมด"</strong> ด้านบนขวา แล้วเลือกตัวเลือกเสียงผู้หญิงภาษาอื่นที่มีคำว่า <code className="bg-pink-100/80 text-pink-700 px-1 py-0.5 rounded font-mono font-bold">Female</code> หรือ <code className="bg-pink-100/80 text-pink-700 px-1 py-0.5 rounded font-mono font-bold">Natural</code> ที่เป็นแบบ <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-bold">Local/ออฟไลน์</code> บางเสียงจะสามารถอ่านข้อความคิวภาษาไทยเป็นเสียงผู้หญิงตามระดับความเร็วและโทนความแหลมที่ท่านต้องการได้สมบูรณ์แบบ!
              </li>
              <li>
                <strong>แนะนำสูงสุดสำหรับพีซีและมือถือ:</strong> แนะนำให้เข้าใช้งานผ่านเบราว์เซอร์ <strong>Google Chrome</strong> เพราะจะมีเสียงอัจฉริยะ <strong>"Google ภาษาไทย"</strong> ซึ่งเป็นเสียงผู้หญิงที่ไพเราะและเสถียรที่สุดฟรีทันที!
              </li>
            </ul>
          </div>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleTestSpeech}
              className="w-full lg:w-auto py-3.5 px-6 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-pink-600/10 active:scale-95 animate-pulse"
            >
              <Volume2 className="w-4 h-4" />
              🔊 ทดลองกดฟังเสียงเรียกคิว (Test Speech)
            </button>
          </div>
        </div>
      </div>

      {/* LINE Configuration settings */}
      <div className="bg-white rounded-3xl border border-pink-100/70 p-5 lg:p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-pink-600" />
          การตั้งค่าระบบแจ้งเตือน LINE OA
        </h3>
        
        <div className="space-y-6 max-w-2xl">
          {/* Token Enable Toggle */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">เปิดใช้งานแจ้งเตือน LINE</span>
              <span className="text-2xs text-slate-400">ส่งข้อความเตือนไปยังลูกค้าอัตโนมัติ</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={lineEnabled}
                onChange={(e) => setLineEnabled(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Simulation Mode Toggle */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">จำลองการส่งในจอโทรศัพท์</span>
              <span className="text-2xs text-slate-400">แสดงผลผ่านกล่อง LINE Mockup เท่านั้น</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={simulateOnly}
                onChange={(e) => setSimulateOnly(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          {/* Real Token Input (Hidden if simulate-only is ticked) */}
          {!simulateOnly && (
            <div className="space-y-5 animate-slide-up bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  LINE OA Channel Access Token
                </label>
                <input
                  type="password"
                  value={lineToken}
                  onChange={(e) => setLineToken(e.target.value)}
                  placeholder="พิมพ์หรือวาง Channel Access Token"
                  className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  LINE OA Channel Secret (Optional)
                </label>
                <input
                  type="password"
                  value={lineChannelSecret}
                  onChange={(e) => setLineChannelSecret(e.target.value)}
                  placeholder="พิมพ์หรือวาง Channel Secret"
                  className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  LINE OA Basic ID (@ID)
                </label>
                <input
                  type="text"
                  value={lineOaId}
                  onChange={(e) => setLineOaId(e.target.value)}
                  placeholder="เช่น @123abcde"
                  className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-mono"
                />
              </div>

              <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl space-y-2 mt-2">
                <p className="text-xs font-bold text-pink-800">Webhook URL สำหรับนำไปใส่ใน LINE Developers Console:</p>
                <code className="block w-full p-3 bg-white rounded-lg border border-pink-200 text-xs text-pink-700 break-all select-all">
                  {webhookUrl}
                </code>
                <p className="text-xs text-pink-600 leading-normal">อย่าลืมเปิด Use webhook ในหน้าต่าง Messaging API ด้วย</p>
              </div>
            </div>
          )}

          {/* Save Settings */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveLineConfig}
              disabled={isSavingLine}
              className="w-full sm:w-auto px-8 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-pink-600/20"
            >
              {isSavingLine ? "กำลังบันทึก..." : "บันทึกตั้งค่า LINE"}
            </button>

            {showConfigMsg && (
              <div className="mt-3 p-3 text-center text-xs font-medium text-emerald-600 bg-emerald-50 rounded-xl animate-fade-in border border-emerald-100">
                ✓ อัพเดตตั้งค่า LINE สำเร็จ!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Helper Info Footer */}
      <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-4 flex gap-3 text-2xs text-pink-800 leading-relaxed">
        <Info className="w-5 h-5 text-pink-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">ข้อมูลแนะนำ:</span> แผนกบริการแต่ละตัวจะเชื่อมโยงกับรหัสคิว เช่น (A) หรือ (B)
          เมื่อลูกค้าเข้ามาจอง จะได้รับการจัดเรียงรหัสคิวแยกจากกันของแผนกนั้นๆ และระบบจำแนกรายสาขาให้อย่างอัตโนมัติ
          ทำให้การให้บริการหน้าสาขามีประสิทธิภาพสูงสุด
        </div>
      </div>
    </div>
  );
}
