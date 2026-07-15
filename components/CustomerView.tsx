import React, { useState, useEffect } from "react";
import { 
  Ticket, 
  User, 
  Phone, 
  Layers, 
  Users, 
  Hourglass, 
  CheckCircle2, 
  MessageSquare, 
  Bell, 
  Smartphone,
  ChevronRight,
  Send,
  X,
  Play
} from "lucide-react";
import { Queue, LineMessage, LineConfig, Branch, Service } from "../types";
import { speakThai, generateQueueSpeakText } from "../lib/voice";

interface CustomerViewProps {
  queues: Queue[];
  branches: Branch[];
  services: Service[];
  onBookQueue: (name: string, phone: string, serviceType: string, branchId: string) => Promise<any>;
  lineMessages: LineMessage[];
  lineConfig: LineConfig;
}

const colors = [
  { border: "border-pink-200", bg: "bg-pink-50/25", text: "text-pink-800", activeBorder: "border-pink-600 bg-pink-50/40" },
  { border: "border-rose-200", bg: "bg-rose-50/25", text: "text-rose-800", activeBorder: "border-rose-600 bg-rose-50/40" },
  { border: "border-fuchsia-200", bg: "bg-fuchsia-50/25", text: "text-fuchsia-800", activeBorder: "border-fuchsia-600 bg-fuchsia-50/40" },
  { border: "border-pink-100", bg: "bg-pink-50/15", text: "text-pink-700", activeBorder: "border-pink-500 bg-pink-50/30" },
  { border: "border-rose-100", bg: "bg-rose-50/15", text: "text-rose-700", activeBorder: "border-rose-500 bg-rose-50/30" },
  { border: "border-fuchsia-100", bg: "bg-fuchsia-50/15", text: "text-fuchsia-700", activeBorder: "border-fuchsia-500 bg-fuchsia-50/30" },
];

export default function CustomerView({ 
  queues, 
  branches,
  services,
  onBookQueue, 
  lineMessages, 
  lineConfig 
}: CustomerViewProps) {
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem("customer_selected_branch_id") || "main";
  });
  const [serviceType, setServiceType] = useState("");
  
  // Set default service type once services load
  useEffect(() => {
    if (activeServices.length > 0 && !serviceType) {
      setServiceType(activeServices[0].id);
    }
  }, [services]);

  const [myQueueId, setMyQueueId] = useState<string | null>(() => {
    return localStorage.getItem("my_queue_id");
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "status">("book");
  const [lineSimOpen, setLineSimOpen] = useState(true);

  // Sync tab with whether we have a booked queue
  useEffect(() => {
    if (myQueueId) {
      setActiveTab("status");
    } else {
      setActiveTab("book");
    }
  }, [myQueueId]);

  // Find my active queue
  const myQueue = queues.find((q) => q.id === myQueueId);

  // If queue is completed or cancelled, we can let user book again
  const isMyQueueFinished = myQueue ? (myQueue.status === "completed" || myQueue.status === "cancelled") : true;

  // Calculate waiting queues before me (filtered by the branch of my queue!)
  const getWaitingCountBeforeMe = () => {
    if (!myQueue || myQueue.status !== "waiting") return 0;
    
    const activeBranchQueues = queues.filter((q) => q.branchId === myQueue.branchId);
    const myIndex = activeBranchQueues.findIndex((q) => q.id === myQueue.id);
    if (myIndex === -1) return 0;
    
    // Count how many 'waiting' queues are before mine in the list for the same service
    return activeBranchQueues
      .slice(0, myIndex)
      .filter((q) => q.status === "waiting" && q.serviceType === myQueue.serviceType)
      .length;
  };

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem("customer_selected_branch_id", branchId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType) return;
    setIsSubmitting(true);
    try {
      const result = await onBookQueue(name, phone, serviceType, selectedBranchId);
      if (result && result.id) {
        setMyQueueId(result.id);
        localStorage.setItem("my_queue_id", result.id);
        setName("");
        setPhone("");
        setActiveTab("status");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetMyQueue = () => {
    setMyQueueId(null);
    localStorage.removeItem("my_queue_id");
    setActiveTab("book");
  };

  const getServiceLabel = (type: string) => {
    const service = activeServices.find((s) => s.id === type);
    return service ? service.name : "บริการทั่วไป";
  };

  const getBranchName = (branchId: string) => {
    const br = activeBranches.find((b) => b.id === branchId);
    return br ? br.name : "สาขาหลัก";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            รอรับบริการ (Waiting)
          </span>
        );
      case "calling":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
            กำลังเรียกคิว (Calling)
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            รับบริการเสร็จสิ้น (Completed)
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            คิวถูกยกเลิก (Cancelled)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto items-start">
      {/* LEFT: Booking Form or Status Tracker (8 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Tab Controls (Only show if there is an active queue) */}
        {myQueue && !isMyQueueFinished && (
          <div className="flex bg-pink-50/60 p-1.5 rounded-2xl border border-pink-100 shadow-inner">
            <button
              onClick={() => setActiveTab("book")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "book"
                  ? "bg-white text-slate-900 shadow-xs border border-pink-100"
                  : "text-pink-700 hover:text-pink-900 hover:bg-pink-50/40"
              }`}
            >
              จองคิวใหม่ (New Booking)
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "status"
                  ? "bg-white text-pink-600 shadow-xs border border-pink-200/40"
                  : "text-pink-700 hover:text-pink-900 hover:bg-pink-50/40"
              }`}
            >
              <Ticket className="w-4 h-4 text-pink-500" />
              ตั๋วคิวของคุณ ({myQueue.queueNo})
            </button>
          </div>
        )}

        {/* Tab 1: Booking Form */}
        {activeTab === "book" && (
          <div className="bg-white rounded-3xl border border-pink-100/70 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-50 rounded-2xl text-pink-600">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-sans">จองคิวรับบริการออนไลน์</h2>
                <p className="text-xs text-slate-500 font-sans">กรอกข้อมูลเพื่อจองคิวระบบออนไลน์และรับการแจ้งเตือนทันที</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Branch Selector */}
              <div className="space-y-2 mb-4 bg-pink-50/20 border border-pink-100/50 p-4 rounded-2xl">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="p-1 bg-pink-100 text-pink-600 rounded-lg">🏬</span>
                  กรุณาเลือกสาขาที่คุณเข้าใช้บริการ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
                  {activeBranches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleSelectBranch(branch.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border-2 gap-0.5 cursor-pointer ${
                        selectedBranchId === branch.id
                          ? "border-pink-600 bg-pink-50 text-pink-700 shadow-2xs"
                          : "border-pink-100 hover:border-pink-200 bg-white text-slate-600"
                      }`}
                    >
                      <span className="text-[9px] font-normal text-slate-400">สาขา</span>
                      <span className="truncate max-w-full">{branch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  เลือกบริการที่ต้องการติดต่อ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeServices.map((service, index) => {
                    const colorConfig = colors[index % colors.length];
                    const isActive = serviceType === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => setServiceType(service.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] ${
                          isActive
                            ? "border-pink-600 bg-pink-50/40 shadow-xs"
                            : `${colorConfig.border} ${colorConfig.bg} hover:border-slate-300`
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
                            รหัส {service.prefix}
                          </span>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-pink-600 animate-ping"></span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">{service.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          {service.description || "รับบริการติดต่อแผนกนี้"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  ชื่อ-นามสกุล ของท่าน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น คุณ สมศักดิ์ รักดี"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all outline-hidden"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  เบอร์โทรศัพท์มือถือ (เพื่อรับแจ้งเตือนผ่าน LINE)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all outline-hidden"
                />
                <p className="text-2xs text-slate-400">ระบบจะทำการสุ่มจำลองแจ้งเตือนส่งเข้าแอพ LINE ในโทรศัพท์มือถือจำลองด้านขวามือ</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-pink-600/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    ยืนยันการจองคิวออนไลน์
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Queue Status Tracker */}
        {activeTab === "status" && myQueue && (
          <div className="bg-white rounded-3xl border border-pink-100/70 overflow-hidden shadow-sm">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-pink-600 to-pink-800 text-white p-6 md:p-8 relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Ticket className="w-32 h-32 rotate-12" />
              </div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-pink-200/90 mb-1 font-sans">
                ตั๋วคิวเข้าใช้บริการออนไลน์
              </p>
              <h2 className="text-2xl font-bold tracking-tight font-sans">บัตรคิวหมายเลข {myQueue.queueNo}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {getStatusBadge(myQueue.status)}
                <span className="text-2xs bg-pink-500/40 text-pink-100 px-2.5 py-0.5 rounded-full border border-pink-400/30 font-sans">
                  {getServiceLabel(myQueue.serviceType)}
                </span>
                <span className="text-2xs bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/20 font-bold font-sans">
                  🏬 {getBranchName(myQueue.branchId)}
                </span>
              </div>
            </div>

            {/* Dynamic Status Dashboard */}
            <div className="p-6 md:p-8 space-y-6">
              {myQueue.status === "waiting" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-pink-50/20 border border-pink-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <Hourglass className="w-6 h-6 text-pink-500 mb-1.5" />
                    <span className="text-2xs text-slate-500 font-sans">จำนวนคิวที่รอก่อนหน้า</span>
                    <span className="text-2xl font-extrabold text-pink-700 mt-1 font-sans">
                      {getWaitingCountBeforeMe()} <span className="text-xs font-medium text-slate-500">คิว</span>
                    </span>
                  </div>
                  <div className="bg-pink-50/20 border border-pink-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <Users className="w-6 h-6 text-pink-600 mb-1.5" />
                    <span className="text-2xs text-slate-500 font-sans">เวลาการรอประเมิน</span>
                    <span className="text-2xl font-extrabold text-pink-700 mt-1 font-sans">
                      ~{getWaitingCountBeforeMe() * 5} <span className="text-xs font-medium text-slate-500">นาที</span>
                    </span>
                  </div>
                </div>
              )}

              {myQueue.status === "calling" && (
                <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center animate-pulse space-y-3">
                  <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                    <Bell className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-900">เชิญที่ช่องบริการหมายเลข {myQueue.counterNo}</h3>
                    <p className="text-2xs text-rose-600 mt-1">โปรดเดินมาติดต่อเจ้าหน้าที่ ณ ช่องบริการที่กำหนดทันทีค่ะ</p>
                  </div>
                  <button 
                    onClick={() => {
                      const text = generateQueueSpeakText(myQueue.queueNo, myQueue.counterNo);
                      speakThai(text);
                    }}
                    className="mx-auto py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    ฟังกดเรียกเสียงซ้ำ
                  </button>
                </div>
              )}

              {myQueue.status === "completed" && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <div className="mx-auto w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-800">ขอบคุณสำหรับการเข้ารับบริการ</h3>
                  <p className="text-2xs text-emerald-600 mt-1">กระบวนการให้บริการเสร็จสิ้นเรียบร้อยแล้วค่ะ</p>
                </div>
              )}

              {/* Detail list */}
              <div className="border-t border-slate-100 pt-5 space-y-3 text-2xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">ชื่อผู้จองคิว:</span>
                  <span className="font-semibold text-slate-800">{myQueue.customerName}</span>
                </div>
                {myQueue.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">เบอร์มือถือ:</span>
                    <span className="font-semibold text-slate-800">{myQueue.phoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">เวลาที่กดจองคิว:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(myQueue.createdAt).toLocaleTimeString("th-TH")} น.
                  </span>
                </div>
                {myQueue.calledAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">เวลาที่ถูกเรียก:</span>
                    <span className="font-semibold text-rose-600">
                      {new Date(myQueue.calledAt).toLocaleTimeString("th-TH")} น.
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex gap-3">
                {isMyQueueFinished ? (
                  <button
                    onClick={handleResetMyQueue}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-pink-600/15 transition-colors cursor-pointer"
                  >
                    กดจองคิวใหม่อีกครั้ง
                  </button>
                ) : (
                  <button
                    onClick={handleResetMyQueue}
                    className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-rose-600 rounded-2xl text-xs font-bold transition-colors text-center block cursor-pointer"
                  >
                    ยกเลิกคิวนี้ / ออกจากระบบคิว
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: LINE Chat Client Simulator (5 Cols) */}
      <div className="lg:col-span-5">
        <div className="relative">
          {/* Mobile Shell Frame */}
          <div className="bg-slate-900 p-3 rounded-[36px] shadow-2xl border border-slate-800 mx-auto max-w-[290px] aspect-[9/18.5] flex flex-col overflow-hidden">
            {/* Top Ear Piece & Camera Notch */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-full z-10 flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
            </div>

            {/* Simulated Mobile Screen Content */}
            <div className="bg-[#7494C4] rounded-[28px] overflow-hidden flex-1 flex flex-col font-sans relative">
              {/* LINE Status Bar */}
              <div className="bg-[#243042] text-white px-4 pt-4 pb-2 flex justify-between items-center text-[9px] font-medium">
                <span>00:01</span>
                <div className="flex items-center gap-1">
                  <span>Sim LTE</span>
                  <div className="w-4 h-2 bg-white rounded-xs"></div>
                </div>
              </div>

              {/* LINE App Header */}
              <div className="bg-[#243042] text-white px-3 py-2 flex items-center gap-2 border-b border-slate-800">
                <div className="w-7 h-7 rounded-full bg-pink-600 flex items-center justify-center text-[10px] font-bold text-white border border-pink-400">
                  QL
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[10px] truncate flex items-center gap-1">
                    ระบบคิวไลน์อัจฉริยะ
                    <span className="bg-emerald-500 text-white px-1 py-0.2 rounded-xs text-[7px] font-extrabold uppercase">บอท</span>
                  </div>
                  <p className="text-[7px] text-slate-400">แจ้งเตือนลำดับคิวเรียลไทม์</p>
                </div>
                <div className="flex gap-2 text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* LINE Messages Content */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col-reverse text-[9px]">
                {lineMessages.length === 0 ? (
                  <div className="my-auto text-center text-slate-400/80 px-4 space-y-1">
                    <Smartphone className="w-8 h-8 mx-auto text-slate-400/50 mb-2" />
                    <p className="font-semibold text-[10px]">บอทแจ้งเตือน LINE</p>
                    <p className="text-[8px] leading-relaxed">เมื่อท่านกดจองคิว หรือพนักงานกดเรียกคิว การแจ้งเตือนจะโชว์ขึ้นที่หน้าจอนี้ทันที</p>
                  </div>
                ) : (
                  lineMessages.map((msg, i) => (
                    <div key={i} className="flex flex-col space-y-1 animate-slide-up">
                      <div className="flex items-start gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-[7px] font-bold text-white shrink-0 mt-0.5">
                          QL
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] text-slate-600 font-semibold">QLine Notify</span>
                          <div className="bg-white text-slate-800 p-2 rounded-2xl rounded-tl-xs max-w-[170px] shadow-xs whitespace-pre-line text-[9px] leading-relaxed">
                            {msg.message}
                          </div>
                          <span className="text-[6px] text-slate-500 mt-0.5">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* LINE Input Area */}
              <div className="bg-[#1b2533] p-1.5 flex items-center gap-1.5">
                <input
                  type="text"
                  disabled
                  placeholder="ระบบส่งข้อความอัตโนมัติ..."
                  className="flex-1 bg-[#2b394d] border-none text-[8px] px-2 py-1.5 rounded-full text-slate-300 outline-hidden focus:ring-0 placeholder-slate-500"
                />
                <button className="p-1 bg-[#2b394d] text-slate-500 rounded-full shrink-0">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="mt-1 flex justify-center pb-1">
              <div className="w-24 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </div>
          <div className="text-center mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Smartphone className="w-3 h-3 text-slate-400" />
              โทรศัพท์จำลอง LINE Notify
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
