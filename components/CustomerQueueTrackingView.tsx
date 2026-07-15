import React, { useState, useEffect } from "react";
import { Queue, LineConfig } from "../types";
import { CheckCircle2, Clock, MapPin, User, ChevronLeft, MessageCircle } from "lucide-react";

interface CustomerQueueTrackingViewProps {
  trackQueueId: string;
  queues: Queue[];
  lineConfig: LineConfig;
  onExit: () => void;
}

export default function CustomerQueueTrackingView({ trackQueueId, queues, lineConfig, onExit }: CustomerQueueTrackingViewProps) {
  const [trackedQueue, setTrackedQueue] = useState<Queue | null>(null);
  const [currentCalling, setCurrentCalling] = useState<Queue | null>(null);
  const [queuesAhead, setQueuesAhead] = useState<number>(0);

  useEffect(() => {
    // Find the specific queue we are tracking
    const targetQueue = queues.find((q) => q.id === trackQueueId);
    setTrackedQueue(targetQueue || null);

    if (targetQueue) {
      // Current calling queue in the same branch/service
      const calling = queues.find(
        (q) => 
          q.status === "calling" && 
          q.branchId === targetQueue.branchId &&
          q.serviceType === targetQueue.serviceType
      );
      setCurrentCalling(calling || null);

      // Calculate how many people are ahead in the waiting line
      // People who are waiting, in the same branch/service, and booked before this person
      const ahead = queues.filter(
        (q) => 
          q.status === "waiting" &&
          q.branchId === targetQueue.branchId &&
          q.serviceType === targetQueue.serviceType &&
          new Date(q.createdAt) < new Date(targetQueue.createdAt)
      ).length;
      setQueuesAhead(ahead);
    }
  }, [queues, trackQueueId]);

  if (!trackedQueue) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-black">?</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลคิว</h2>
          <p className="text-sm text-slate-500 mb-6">อาจมีการยกเลิก หรือทำรายการเสร็จสิ้นไปแล้ว</p>
          <button 
            onClick={onExit}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const isCalling = trackedQueue.status === "calling";
  const isCompleted = trackedQueue.status === "completed";
  const isCancelled = trackedQueue.status === "cancelled";
  const isWaiting = trackedQueue.status === "waiting";

  return (
    <div className="flex-1 flex flex-col bg-slate-50 animate-fade-in relative min-h-[100dvh] pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white pt-8 pb-16 px-6 relative overflow-hidden rounded-b-[40px]">
        {/* Subtle decorative circles */}
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"></div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <button onClick={onExit} className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-xs font-bold tracking-widest text-white/80 uppercase">สถานะคิวของคุณ</span>
          <div className="w-9 h-9"></div> {/* Spacer for center alignment */}
        </div>

        <div className="text-center relative z-10">
          <p className="text-sm text-slate-400 mb-2 font-medium">หมายเลขคิว</p>
          <div className="text-6xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
            {trackedQueue.queueNo}
          </div>
        </div>
      </div>

      {/* Main Status Card */}
      <div className="max-w-md w-full mx-auto px-4 -mt-10 relative z-20 space-y-4">
        
        {/* Status Indicator */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-900/5 border border-white flex flex-col items-center text-center">
          {isCalling && (
            <>
              <div className="w-20 h-20 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <MapPin className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-pink-600 mb-2">ถึงคิวของคุณแล้ว!</h2>
              <p className="text-slate-600 text-sm font-medium mb-4">กรุณาติดต่อที่ช่องบริการ</p>
              <div className="text-4xl font-black text-slate-900 bg-slate-100 px-8 py-4 rounded-2xl">
                {trackedQueue.counterNo || "—"}
              </div>
            </>
          )}

          {isWaiting && (
            <>
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 relative">
                <Clock className="w-10 h-10 relative z-10" />
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin"></div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">กำลังรอเรียกคิว</h2>
              
              <div className="flex flex-col gap-2 mt-4 w-full">
                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">เหลืออีก</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800">{queuesAhead}</span>
                    <span className="text-sm text-slate-500 font-medium">คิว</span>
                  </div>
                </div>
                
                {currentCalling && (
                  <div className="bg-pink-50 p-4 rounded-2xl flex justify-between items-center border border-pink-100">
                    <span className="text-sm text-pink-600 font-medium">คิวปัจจุบัน</span>
                    <span className="text-xl font-black text-pink-700">{currentCalling.queueNo}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {isCompleted && (
            <>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">ทำรายการเสร็จสิ้น</h2>
              <p className="text-slate-500 text-sm">ขอบคุณที่ใช้บริการ</p>
            </>
          )}

          {isCancelled && (
            <>
              <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">คิวนี้ถูกยกเลิกแล้ว</h2>
              <p className="text-slate-500 text-sm">หากต้องการรับบริการ กรุณากดรับคิวใหม่</p>
            </>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">ชื่อผู้รับบริการ</p>
              <p className="font-bold text-slate-800">{trackedQueue.customerName || "—"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">เวลาที่รับคิว</p>
              <p className="text-sm font-bold text-slate-700">
                {new Date(trackedQueue.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">สถานะปัจจุบัน</p>
              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                isWaiting ? "bg-amber-100 text-amber-700" :
                isCalling ? "bg-pink-100 text-pink-700" :
                isCompleted ? "bg-emerald-100 text-emerald-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                {isWaiting ? "รอเรียก" : isCalling ? "กำลังเรียก" : isCompleted ? "เสร็จสิ้น" : "ยกเลิก"}
              </span>
            </div>
          </div>
        </div>

        {/* LINE Notification Bind Button */}
        {lineConfig?.enabled && lineConfig?.lineOaId && (isWaiting || isCalling) && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#00B900]/20 text-center">
            <h3 className="font-bold text-[#00B900] mb-2 flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              รับการแจ้งเตือนคิวผ่าน LINE
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              กดปุ่มด้านล่างเพื่อผูกหมายเลขคิวของคุณเข้ากับบัญชีผู้ใช้ LINE เมื่อถึงคิวของคุณระบบจะแจ้งเตือนอัตโนมัติ
            </p>
            <a 
              href={`https://line.me/R/oaMessage/${lineConfig.lineOaId}/?${encodeURIComponent('#Q-' + trackedQueue.queueNo)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 bg-[#00B900] hover:bg-[#009900] text-white py-3 rounded-xl font-bold transition-colors"
            >
              เปิด LINE แจ้งเตือน
            </a>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            สถานะอัปเดตอัตโนมัติ (Live)
          </p>
        </div>

      </div>
    </div>
  );
}
