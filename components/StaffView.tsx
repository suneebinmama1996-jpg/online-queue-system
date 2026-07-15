import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Settings, 
  RefreshCw, 
  Trash2, 
  Phone, 
  User, 
  Layers, 
  Volume2, 
  Check, 
  X, 
  Play, 
  HelpCircle,
  Printer,
  ChevronRight,
  Database,
  Grid,
  Info
} from "lucide-react";
import { Queue, Branch, Service } from "../types";

interface StaffViewProps {
  queues: Queue[];
  branches: Branch[];
  services: Service[];
  onAddQueue: (name: string, phone: string, serviceType: string, branchId: string) => Promise<Queue>;
  onCallQueue: (id: string, counterNo: string) => Promise<any>;
  onUpdateStatus: (id: string, status: 'waiting' | 'calling' | 'completed' | 'cancelled') => Promise<any>;
  onResetQueues: () => Promise<any>;
  onSelectReceiptQueue: (queue: Queue) => void;
  onSelectReceiptQueues: (queues: Queue[]) => void;
}

export default function StaffView({
  queues,
  branches,
  services,
  onAddQueue,
  onCallQueue,
  onUpdateStatus,
  onResetQueues,
  onSelectReceiptQueue,
  onSelectReceiptQueues,
}: StaffViewProps) {
  // Ensure we have fallbacks so we never crash
  const activeServices = services && services.length > 0 ? services : [
    { id: "general", name: "บริการทั่วไป", prefix: "A", description: "รับฝาก-ถอน ฝากเช็ค หรือฝากส่งเอกสารทั่วไป" },
    { id: "financial", name: "การเงิน/ชำระเงิน", prefix: "B", description: "ชำระเงินค่าสินค้า ธุรกรรมการเงินขนาดใหญ่" },
    { id: "document", name: "งานเอกสาร/ติดต่อสอบถาม", prefix: "C", description: "ขอหนังสือรับรอง ออกใบกำกับภาษี ตรวจสอบสิทธิ์" },
    { id: "consulting", name: "ปรึกษา/วิเคราะห์ข้อมูล", prefix: "D", description: "ให้คำปรึกษาทางธุรกิจ วินิจฉัยเคส หรือสมัครสมาชิก" }
  ];

  const activeBranches = branches && branches.length > 0 ? branches : [
    { id: "main", name: "สาขาหลัก (สำนักงานใหญ่)" }
  ];

  // Selected Branch for Staff Desk
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem("staff_selected_branch_id") || "main";
  });

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem("staff_selected_branch_id", branchId);
  };

  // Manual queue state
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualService, setManualService] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Set default manual service once services load
  useEffect(() => {
    if (activeServices.length > 0 && !manualService) {
      setManualService(activeServices[0].id);
    }
  }, [services]);

  // Counter setting for active staff member
  const [activeCounter, setActiveCounter] = useState("ช่องบริการ 1");

  // Table filtering
  const [filterType, setFilterType] = useState<"all" | "waiting" | "calling" | "completed_cancelled">("all");

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const name = manualName || "ลูกค้าทั่วไป (Walk-in)";
      const phone = manualPhone || "";
      const addedQueue = await onAddQueue(name, phone, manualService || activeServices[0].id, selectedBranchId);
      
      // Auto open receipt printing dialog
      onSelectReceiptQueue(addedQueue);
      
      setManualName("");
      setManualPhone("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleResetConfirm = async () => {
    if (window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการล้างคิวทั้งหมดสำหรับวันนี้? ข้อมูลไม่สามารถกู้คืนได้")) {
      await onResetQueues();
    }
  };

  const getServiceLabel = (type: string) => {
    const srv = activeServices.find((s) => s.id === type);
    return srv ? srv.name : "บริการทั่วไป";
  };

  // Filter queues to current branch only!
  const branchQueues = queues.filter((q) => q.branchId === selectedBranchId);

  // Stats
  const totalToday = branchQueues.length;
  const waitingCount = branchQueues.filter((q) => q.status === "waiting").length;
  const callingCount = branchQueues.filter((q) => q.status === "calling").length;
  const completedCount = branchQueues.filter((q) => q.status === "completed").length;

  // Filter queues by status
  const filteredQueues = branchQueues.filter((q) => {
    if (filterType === "waiting") return q.status === "waiting";
    if (filterType === "calling") return q.status === "calling";
    if (filterType === "completed_cancelled") return q.status === "completed" || q.status === "cancelled";
    return true; // all
  }).sort((a, b) => {
    // Sort logic: active (calling) first, then waiting (by date), then completed (by date descending)
    const statusWeight = { calling: 0, waiting: 1, completed: 2, cancelled: 3 };
    const weightDiff = statusWeight[a.status] - statusWeight[b.status];
    if (weightDiff !== 0) return weightDiff;
    
    // Within same status
    if (a.status === "completed" || a.status === "cancelled") {
      return new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime();
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Branch Switcher for Staff Desk */}
      <div className="bg-white text-slate-800 rounded-3xl border border-pink-100 p-5 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-pink-600 rounded-2xl text-lg text-white">🏬</span>
          <div>
            <h3 className="text-sm font-bold font-sans">เลือกสาขาเจ้าหน้าที่ประจำการ</h3>
            <p className="text-[10px] text-slate-500 font-sans">ระบบจะดึงและเรียกคิวเฉพาะสาขาที่เลือก เพื่อแยกรูปแบบการทำงานอย่างเป็นอิสระต่อกัน</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {activeBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelectBranch(branch.id)}
              className={`flex-1 md:flex-none py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedBranchId === branch.id
                  ? "bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-600/20"
                  : "bg-pink-50/40 border-pink-100 text-pink-700 hover:bg-pink-50 hover:text-pink-900"
              }`}
            >
              {branch.name}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Quick Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "คิวทั้งหมดวันนี้", value: totalToday, color: "bg-pink-50 border-pink-100 text-pink-700" },
          { label: "คิวที่กำลังรอ", value: waitingCount, color: "bg-amber-50 border-amber-100 text-amber-700" },
          { label: "กำลังเรียกบริการ", value: callingCount, color: "bg-rose-50 border-rose-100 text-rose-700" },
          { label: "บริการเสร็จแล้ว", value: completedCount, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${stat.color} flex flex-col justify-between shadow-xs`}>
            <span className="text-2xs font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
            <span className="text-3xl font-extrabold mt-1 tracking-tight">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: Forms and Config (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Counter Config */}
          <div className="bg-white rounded-3xl border border-pink-100/70 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-slate-400" />
              กำหนดช่องบริการของเจ้าหน้าที่
            </h3>
            <div className="space-y-2">
              <label className="text-2xs font-semibold text-slate-500">เลือกช่องบริการประจำเครื่องเพื่อใช้ในการกดเรียกคิว</label>
              <div className="grid grid-cols-3 gap-2">
                {["ช่องบริการ 1", "ช่องบริการ 2", "ช่องบริการ 3"].map((counter) => (
                  <button
                    key={counter}
                    onClick={() => setActiveCounter(counter)}
                    className={`py-2 px-3 text-2xs rounded-xl font-bold border-2 transition-all cursor-pointer ${
                      activeCounter === counter
                        ? "border-pink-600 bg-pink-50 text-pink-700 shadow-2xs"
                        : "border-pink-100 hover:border-pink-200 bg-pink-50/20 text-slate-600"
                    }`}
                  >
                    {counter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Add Queue */}
          <div className="bg-white rounded-3xl border border-pink-100/70 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-slate-400" />
              ออกคิวสำหรับลูกค้าที่เข้ามาติดต่อ (Walk-in)
            </h3>
            
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600">ประเภทบริการ</label>
                <select
                  value={manualService}
                  onChange={(e) => setManualService(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden font-bold"
                >
                  {activeServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} (คิว {service.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600">ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="เช่น คุณ สมชาย"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600">เบอร์โทรศัพท์ (มีขีดคั่นได้)</label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="เช่น 081-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-pink-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAdding ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    ออกบัตรคิวและปริ้นท์ตั๋ว
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Clear Database button */}
          <div className="bg-red-50/40 rounded-3xl border border-red-100 p-5 shadow-xs flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-2xs font-bold text-red-800">ระบบรีเซ็ตคิวรายวัน</span>
              <span className="text-[10px] text-slate-400">ล้างข้อมูลคิวทั้งหมดเพื่อเริ่มวันใหม่</span>
            </div>
            <button
              onClick={handleResetConfirm}
              className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-2xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ล้างคิวทั้งหมด
            </button>
          </div>

        </div>

        {/* RIGHT COMPONENT: Main Active Queues Board (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-pink-100/70 shadow-sm overflow-hidden">
          
          {/* Header & Filters */}
          <div className="p-5 border-b border-pink-100 bg-pink-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                <Users className="w-4 h-4 text-pink-500" />
                ตารางบริหารจัดการคิวของแผนก
              </h3>
              <p className="text-2xs text-slate-400 font-sans">กดปุ่มเรียกคิว สั่งพิมพ์ หรืออัปเดตสเตตัสคิว</p>
            </div>

            {/* Filter buttons & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-white border border-pink-100 rounded-xl p-1 shadow-inner gap-0.5 shrink-0">
                {[
                  { id: "all", label: "ทั้งหมด" },
                  { id: "waiting", label: "รอเรียก" },
                  { id: "calling", label: "กำลังเรียก" },
                  { id: "completed_cancelled", label: "จบงาน" },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setFilterType(btn.id as any)}
                    className={`px-2.5 py-1 text-2xs rounded-lg font-bold transition-all cursor-pointer ${
                      filterType === btn.id
                        ? "bg-pink-600 text-white"
                        : "text-pink-700 hover:text-pink-900 hover:bg-pink-50/50"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => onSelectReceiptQueues(filteredQueues)}
                disabled={filteredQueues.length === 0}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-2xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์ทั้งหมด
              </button>
            </div>
          </div>

          {/* Active Queues Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-2xs border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-3 px-4">บัตรคิว</th>
                  <th className="py-3 px-4">ชื่อลูกค้า</th>
                  <th className="py-3 px-4">ประเภทบริการ</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      <div className="max-w-[150px] mx-auto space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-2xs">ไม่มีข้อมูลคิวตามเงื่อนไขที่เลือก</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueues.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Queue Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900">
                        {q.queueNo}
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{q.customerName}</div>
                        {q.phoneNumber && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5 font-mono">
                            <Phone className="w-2.5 h-2.5 inline" /> {q.phoneNumber}
                          </div>
                        )}
                      </td>

                      {/* Service Type Label */}
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-medium text-slate-600">
                          {getServiceLabel(q.serviceType)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {q.status === "waiting" && (
                          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            รอคิว
                          </span>
                        )}
                        {q.status === "calling" && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse w-fit">
                              เรียก ({q.counterNo})
                            </span>
                          </div>
                        )}
                        {q.status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            เสร็จสิ้น
                          </span>
                        )}
                        {q.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            ยกเลิก
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Print receipt */}
                          <button
                            onClick={() => onSelectReceiptQueue(q)}
                            title="พิมพ์สลิปคิว"
                            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Call queue action (for Waiting or Recalling) */}
                          {(q.status === "waiting" || q.status === "calling") && (
                            <button
                              onClick={() => onCallQueue(q.id, activeCounter)}
                              title={q.status === "calling" ? "กดเรียกซ้ำ" : "เรียกคิวมาที่จุดบริการนี้"}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-2xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              {q.status === "calling" ? "เรียกซ้ำ" : "เรียกคิว"}
                            </button>
                          )}

                          {/* 3. Serve completed or cancel */}
                          {q.status === "calling" && (
                            <>
                              <button
                                onClick={() => onUpdateStatus(q.id, "completed")}
                                title="บริการเสร็จสิ้น"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onUpdateStatus(q.id, "cancelled")}
                                title="ยกเลิกคิว"
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* 4. Delete/Restore logic */}
                          {(q.status === "completed" || q.status === "cancelled") && (
                            <span className="text-[10px] text-slate-400 font-mono italic">
                              {q.completedAt ? new Date(q.completedAt).toLocaleTimeString("th-TH") : ""} น.
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
