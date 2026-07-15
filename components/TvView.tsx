import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  History, 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  Video, 
  Bell, 
  RotateCw,
  Music,
  Sliders,
  Check,
  Sparkles
} from "lucide-react";
import { Queue, Branch, Service } from "../types";
import { speakThai, generateQueueSpeakText } from "../lib/voice";

import { ThemeConfig } from "../lib/theme";

interface TvViewProps {
  queues: Queue[];
  branches: Branch[];
  services: Service[];
  enableAudioAnnouncement: boolean;
  onToggleAudioAnnouncement: () => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speechPitch: number;
  setSpeechPitch: (pitch: number) => void;
  selectedVoiceName: string;
  setSelectedVoiceName: (voiceName: string) => void;
  isAnnouncing?: boolean;
  activeTheme?: ThemeConfig;
}

export default function TvView({
  queues,
  branches,
  services,
  enableAudioAnnouncement,
  onToggleAudioAnnouncement,
  speechRate,
  setSpeechRate,
  speechPitch,
  setSpeechPitch,
  selectedVoiceName,
  setSelectedVoiceName,
  isAnnouncing = false,
  activeTheme,
}: TvViewProps) {
  // Branch filter state for the TV screen (persisted in localStorage)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem("tv_branch_id") || "all";
  });

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem("tv_branch_id", branchId);
  };

  // Configurable video link: supports YouTube URLs, YouTube IDs, and general video file URLs (MP4/WebM)
  // Default is a gorgeous, soothing, high-quality, royalty-free forest stream MP4 video
  const [videoUrl, setVideoUrl] = useState("https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4");
  const [tempVideoUrl, setTempVideoUrl] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Available voices detected in browser
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showAllVoices, setShowAllVoices] = useState(false);

  // Video sound and playback states
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Auto unlock on first user click anywhere on document
  useEffect(() => {
    const handleDocumentClick = () => {
      setAudioUnlocked(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("click", handleDocumentClick);
      window.addEventListener("touchstart", handleDocumentClick);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("click", handleDocumentClick);
        window.removeEventListener("touchstart", handleDocumentClick);
      }
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeSpeaking = isAnnouncing || localSpeaking;
  const isVideoMuted = videoMuted || activeSpeaking;

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

  // React to speaking activity to pause/resume or mute/unmute
  useEffect(() => {
    if (activeSpeaking) {
      // 1. If standard video, pause it
      if (videoRef.current) {
        videoRef.current.pause();
      }
      // 2. If YouTube iframe, send mute and pause commands via postMessage
      if (isYouTubeUrl(videoUrl) && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "mute" }),
          "*"
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo" }),
          "*"
        );
      }
    } else {
      // 1. If standard video, resume play and sync mute status
      if (videoRef.current) {
        videoRef.current.muted = videoMuted;
        videoRef.current.play().catch((err) => {
          console.log("Autoplay / playback resumption prevented by browser policy:", err);
        });
      }
      // 2. If YouTube iframe, send play and conditionally unmute
      if (isYouTubeUrl(videoUrl) && iframeRef.current?.contentWindow) {
        if (!videoMuted) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "unmute" }),
            "*"
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
            "*"
          );
        }
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo" }),
          "*"
        );
      }
    }
  }, [activeSpeaking, videoMuted, videoUrl]);

  const handleTestSpeech = () => {
    const text = generateQueueSpeakText("A001", "1");
    
    speakThai(
      text,
      speechRate,
      () => setLocalSpeaking(true),
      () => setLocalSpeaking(false)
    );
  };

  // Split-screen sizes or options
  const [isFullscreenTv, setIsFullscreenTv] = useState(false);

  // Filter queues by selected branch if not "all"
  const filteredQueues = selectedBranchId === "all" 
    ? queues 
    : queues.filter((q) => q.branchId === selectedBranchId);

  // Extract called queues (calling status)
  const activeCallingQueues = filteredQueues.filter((q) => q.status === "calling");
  
  // The most recently called queue (the primary item called)
  const mainCallingQueue = activeCallingQueues.length > 0 
    ? activeCallingQueues.reduce((latest, current) => {
        const latestTime = new Date(latest.calledAt || 0).getTime();
        const currentTime = new Date(current.calledAt || 0).getTime();
        return currentTime > latestTime ? current : latest;
      })
    : null;

  // History list: recently called queues (calling or completed) excluding the main one if it's active
  const calledHistory = filteredQueues
    .filter((q) => q.status === "calling" || q.status === "completed")
    .filter((q) => q.id !== mainCallingQueue?.id)
    .sort((a, b) => {
      const timeA = new Date(a.calledAt || a.createdAt).getTime();
      const timeB = new Date(b.calledAt || b.createdAt).getTime();
      return timeB - timeA; // newest first
    })
    .slice(0, 4);

  // Helper to determine if a URL represents a YouTube video
  const isYouTubeUrl = (url: string): boolean => {
    return url.includes("youtube.com") || url.includes("youtu.be") || /^[A-Za-z0-9_-]{11}$/.test(url);
  };

  // Helper to parse YouTube Video ID
  const getYouTubeId = (url: string): string => {
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return url;
    }
    try {
      if (url.includes("youtu.be")) {
        return new URL(url).pathname.substring(1);
      }
      return new URL(url).searchParams.get("v") || "";
    } catch {
      return "";
    }
  };

  const handleUpdateVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempVideoUrl.trim()) return;
    setVideoUrl(tempVideoUrl.trim());
    setTempVideoUrl("");
    setShowVideoInput(false);
  };

  const getServiceLabel = (type: string) => {
    const srv = services.find((s) => s.id === type);
    return srv ? srv.name : "บริการทั่วไป";
  };

  const getBranchName = (branchId: string) => {
    const br = branches.find((b) => b.id === branchId);
    return br ? br.name : "สาขาหลัก";
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${isFullscreenTv ? "fixed inset-0 z-50 bg-[radial-gradient(ellipse_at_top,rgba(253,242,248,0.7),rgba(255,255,255,1))] p-4 md:p-6 flex flex-col justify-between max-w-full overflow-y-auto" : ""}`}>
      
      {/* Autoplay / Speech Audio Unblock Warning */}
      {!audioUnlocked && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 text-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <VolumeX className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-amber-900 font-sans">⚠️ เบราว์เซอร์ยังไม่ได้เปิดระบบเสียงเรียกคิว (Browser Sound Blocked)</p>
              <p className="text-[10px] text-amber-700 font-medium font-sans mt-0.5">เนื่องจากระบบความปลอดภัยของเบราว์เซอร์ เพื่อให้ออกเสียงพูดเรียกคิวได้ถูกต้อง กรุณาคลิกปุ่มสีชมพูด้านข้างค่ะ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                speakThai("ระบบพร้อมส่งเสียงเรียกคิวแล้วค่ะ");
              } catch (e) {
                console.error("Audio unlock speech trigger error:", e);
              }
              setAudioUnlocked(true);
            }}
            className="w-full sm:w-auto py-2.5 px-6 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md shadow-pink-600/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none"
          >
            <Volume2 className="w-4 h-4 text-white" />
            เปิดเสียงเรียกคิว (Enable Sound)
          </button>
        </div>
      )}

      {/* Floating Minimize Button when in fullscreen */}
      {isFullscreenTv && (
        <button
          onClick={() => setIsFullscreenTv(false)}
          className="fixed top-4 right-4 z-50 bg-white/90 hover:bg-white text-pink-600 px-4 py-2.5 rounded-full border border-pink-100 transition-all font-black flex items-center gap-1.5 shadow-lg text-2xs cursor-pointer select-none active:scale-95"
        >
          <Minimize2 className="w-3.5 h-3.5 text-pink-500" />
          <span>ออกจากเต็มจอ (ย่อหน้าจอ)</span>
        </button>
      )}

      {/* TV View Control Bar - Hidden in Fullscreen */}
      {!isFullscreenTv && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white text-slate-800 px-5 py-3 rounded-2xl border border-pink-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            {activeTheme?.logoUrl ? (
              <img src={activeTheme.logoUrl} alt="Logo" className="h-10 w-auto rounded-lg object-contain" />
            ) : (
              <div className="p-2 bg-pink-600 rounded-xl">
                <Tv className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">TV Display Panel</span>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                หน้าจอทีวีแสดงหมายเลขคิวติดผนัง (Smart Queue Monitor)
              </h2>
            </div>
          </div>

          <div className="flex flex-1 mx-4 max-w-sm">
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-pink-200 bg-pink-50/50 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/50 cursor-pointer"
            >
              <option value="all">🌐 แสดงคิวรวมทุกสาขา</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>🏢 สาขา: {b.name}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            {/* Audio announcement toggler */}
            <button
              onClick={onToggleAudioAnnouncement}
              className={`py-1.5 px-3 rounded-xl text-2xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                enableAudioAnnouncement
                  ? "bg-pink-600 text-white hover:bg-pink-700"
                  : "bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-100"
              }`}
            >
              {enableAudioAnnouncement ? (
                <>
                  <Volume2 className="w-4 h-4 text-white" />
                  เปิดเสียงเรียกคิวภาษาไทย
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-pink-400" />
                  ปิดเสียงเรียกคิวอยู่
                </>
              )}
            </button>

            {/* TV Video sound toggler */}
            <button
              type="button"
              onClick={() => setVideoMuted(!videoMuted)}
              className={`py-1.5 px-3 rounded-xl text-2xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                !videoMuted
                  ? "bg-pink-600 hover:bg-pink-700 text-white"
                  : "bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-100"
              }`}
            >
              {!videoMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-white" />
                  <span>เปิดเสียงวีดิโอทีวี (Mute: Off)</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-pink-400" />
                  <span>ปิดเสียงวีดิโอทีวี (Mute: On)</span>
                </>
              )}
            </button>

            {/* Voice configuration panel toggler */}
            <button
              onClick={() => {
                setShowVoiceSettings(!showVoiceSettings);
                setShowVideoInput(false);
              }}
              className={`py-1.5 px-3 text-2xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                showVoiceSettings 
                  ? "bg-pink-600 text-white" 
                  : "bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-100"
              }`}
            >
              <Sliders className="w-4 h-4" />
              ตั้งค่าเสียงเรียกคิว
            </button>

            {/* Change video toggler */}
            <button
              onClick={() => {
                setShowVideoInput(!showVideoInput);
                setShowVoiceSettings(false);
              }}
              className="py-1.5 px-3 bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-100 text-2xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
              เปลี่ยนวีดิโอทีวี
            </button>

            {/* Fullscreen TV Toggler */}
            <button
              onClick={() => setIsFullscreenTv(!isFullscreenTv)}
              className="py-1.5 px-3 bg-pink-600 hover:bg-pink-700 text-white text-2xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isFullscreenTv ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  ออกจากเต็มจอ
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  ขยายเต็มหน้าจอ
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Voice settings customizer panel */}
      {!isFullscreenTv && showVoiceSettings && (
        <div className="p-6 bg-pink-50/50 border border-pink-200/60 rounded-3xl space-y-5 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div className="flex items-center gap-2 text-pink-700 font-bold text-xs">
              <Sliders className="w-4 h-4" />
              <span>ปรับแต่งเสียงเรียกคิวภาษาไทย (Thai Voice Synthesizer Settings)</span>
            </div>
            
            {/* Toggle Show All Voices */}
            <label className="flex items-center gap-1.5 text-2xs font-bold text-pink-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllVoices}
                onChange={(e) => setShowAllVoices(e.target.checked)}
                className="rounded-sm border-pink-300 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
              />
              <span>แสดงเสียงทุกภาษาทั้งหมด ({allVoices.length} เสียง)</span>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Voice select dropdown */}
            <div className="space-y-1.5">
              <label className="block text-2xs font-bold text-slate-700">เลือกตัวละครเสียง (Voice Character)</label>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 font-bold text-slate-700"
              >
                <option value="">-- ใช้เสียงผู้หญิงตามการค้นหาระบบ (ค่าเริ่มต้น) --</option>
                {displayedVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} [{v.lang}] ({v.localService ? "Local/ออฟไลน์" : "Cloud/ออนไลน์"})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                {thaiVoicesOnly.length === 0 
                  ? "⚠️ ไม่พบเสียงภาษาไทยโดยเฉพาะในเครื่องนี้ ระบบจะใช้น้ำเสียงจำลองในการอ่าน" 
                  : `ค้นพบเสียงภาษาไทยทั้งหมด ${thaiVoicesOnly.length} เสียงในอุปกรณ์ของคุณ`}
              </p>
            </div>

            {/* 2. Rate (Speed) slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs font-bold text-slate-700">
                <span>ความเร็วเสียงเรียก (Rate):</span>
                <span className="text-pink-600 font-mono font-extrabold">{speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.3"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-pink-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                <span>ช้ามาก (สุภาพที่สุด)</span>
                <span>ปานกลาง (0.65x)</span>
                <span>เร็วปกติ (1.0x)</span>
              </div>
            </div>

            {/* 3. Pitch slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs font-bold text-slate-700">
                <span>โทนเสียงแหลม-ทุ้ม (Pitch):</span>
                <span className="text-pink-600 font-mono font-extrabold">{speechPitch}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-pink-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                <span>เสียงทุ้ม/ชาย (0.5)</span>
                <span>เสียงใสสุภาพ (1.25)</span>
                <span>เสียงเล็ก/แหลมสูง (2.0)</span>
              </div>
            </div>
          </div>

          {/* Advice/Tips callout for changing male to female voices */}
          <div className="p-3 bg-white/90 border border-pink-100 rounded-2xl text-2xs text-slate-600 space-y-1.5">
            <p className="font-extrabold text-pink-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              💡 ทำอย่างไรเมื่อเสียงยังเป็นเสียงผู้ชาย แม้จะปรับระดับแล้ว?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 leading-relaxed text-[11px] font-medium">
              <li>
                <strong>บราวเซอร์บางตัวถูกล็อกเสียงเริ่มต้น:</strong> เบราว์เซอร์หรืออุปกรณ์บางเครื่องอาจไม่มีเสียงผู้หญิงภาษาไทยติดตั้งไว้ ทำให้ระบบเลือกเสียงสังเคราะห์ผู้ชายเริ่มต้นของระบบปฏิบัติการแทน
              </li>
              <li>
                <strong>วิธีแก้ไขด่วน (เปิดแสดงทุกภาษา):</strong> ลองกดเลือกช่อง <strong>"แสดงเสียงทุกภาษาทั้งหมด"</strong> ด้านบนขวา แล้วเลือกตัวเลือกเสียงผู้หญิงภาษาอื่นที่มีคำว่า <code className="bg-pink-100 text-pink-700 px-1 py-0.5 rounded font-mono font-bold">Female</code> หรือ <code className="bg-pink-100 text-pink-700 px-1 py-0.5 rounded font-mono font-bold">Natural</code> ที่เป็นแบบ <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-bold">Local/ออฟไลน์</code> บางเสียงจะสามารถอ่านภาษาไทยเป็นเสียงผู้หญิงตามค่า Pitch และความเร็วที่ท่านกำหนดได้สมบูรณ์แบบ!
              </li>
              <li>
                <strong>แนะนำใช้ Google Chrome:</strong> บราวเซอร์ Google Chrome จะมาพร้อมกับ <strong>"Google ภาษาไทย"</strong> ซึ่งเป็นเสียงผู้หญิงที่นุ่มนวลและเป็นธรรมชาติที่สุดฟรีทันทีโดยไม่ต้องตั้งค่าเพิ่มเติม
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pink-100 pt-3.5 mt-2">
            <span className="text-[10px] text-pink-800 leading-tight font-medium">
              * ข้อมูล: ตัวเครื่องหรือเบราว์เซอร์ของท่านควบคุมสิทธิ์ในการติดตั้งและสังเคราะห์เสียงแต่ละเสียงภายนอก
            </span>
            <button
              type="button"
              onClick={handleTestSpeech}
              className="py-1.5 px-4 bg-pink-600 hover:bg-pink-700 text-white text-2xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-white animate-pulse" />
              🔊 ทดลองฟังเสียงสังเคราะห์ตัวอย่าง
            </button>
          </div>
        </div>
      )}

      {/* Video URL Input box */}
      {!isFullscreenTv && showVideoInput && (
        <form onSubmit={handleUpdateVideo} className="p-4 bg-white border border-pink-100 rounded-2xl flex flex-wrap gap-3 items-center animate-slide-up shadow-xs">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-2xs font-bold text-slate-700 mb-1">วางลิงก์วิดีโอ (รองรับทั้งไฟล์วิดีโอทั่วไป MP4/WebM หรือลิงก์ YouTube)</label>
            <input
              type="text"
              value={tempVideoUrl}
              onChange={(e) => setTempVideoUrl(e.target.value)}
              placeholder="ตัวอย่างเช่น: https://.../vids.mp4 หรือ https://www.youtube.com/watch?v=5_m6tqT9_kU"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-pink-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 font-bold text-slate-700"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white text-2xs font-bold rounded-lg mt-5 transition-colors cursor-pointer"
          >
            ตกลงเปลี่ยนวีดิโอ
          </button>
          <div className="text-[10px] text-slate-400 mt-5 leading-tight flex-1 font-medium">
            * ระบบสนับสนุนไฟล์วิดีโอทั่วไปโดยตรง (.mp4, .webm, .ogg) รวมถึงวิดีโอจาก YouTube ทั่วไปเพื่อความสะดวกและความเป็นธรรมชาติที่สุดในการใช้งาน
          </div>
        </form>
      )}

      {/* Main TV Board Container */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${isFullscreenTv ? "flex-1 mt-4" : ""}`}>
        
        {/* LEFT COMPONENT: Flexible Video Player / Media Engine (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-[28px] overflow-hidden border border-pink-100 shadow-xl flex flex-col justify-between aspect-video lg:aspect-auto">
          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {isYouTubeUrl(videoUrl) ? (
              /* Youtube Player embed */
              <iframe
                ref={iframeRef}
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}?autoplay=1&mute=${videoMuted ? 1 : 0}&loop=1&playlist=${getYouTubeId(videoUrl)}&controls=1&showinfo=0&enablejsapi=1`}
                title="TV Video Screen"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              /* Standard HTML5 loopable Video Player for general files */
              <video
                ref={videoRef}
                src={videoUrl}
                autoPlay
                muted={isVideoMuted}
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Ambient Watermark overlay on TV */}
            <div className="absolute top-4 left-4 bg-white/85 text-pink-700 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wider flex items-center gap-1.5 pointer-events-none border border-pink-100 shadow-sm">
              <span className="w-1.5 h-1.5 bg-pink-600 rounded-full animate-ping"></span>
              LIVE ADVERTISING CHANNEL
            </div>
            
            {/* Simulating a music wave over the video overlay */}
            <div className="absolute bottom-4 left-4 bg-white/85 text-pink-600 backdrop-blur-xs px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold flex items-center gap-1.5 pointer-events-none border border-pink-100 shadow-sm">
              <Music className="w-3.5 h-3.5 animate-spin-slow text-pink-500" />
              <span>ช่องผ่อนคลายความเครียดระหว่างรอคิว</span>
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: Queue Display (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          {/* Main Calling Queue Card (Big Callout) */}
          <div className="bg-white border-4 border-pink-300 rounded-[28px] p-6 text-center shadow-xl relative overflow-hidden flex flex-col justify-center items-center flex-1 min-h-[220px]">
            
            {/* Grid background on calling card */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(219,39,119,0.06)_0%,transparent_70%)] pointer-events-none"></div>

            {mainCallingQueue ? (
              <div className="space-y-4 w-full z-10 animate-scale-up">
                <div className="inline-flex items-center gap-1 bg-pink-50 text-pink-600 px-4 py-1.5 rounded-full border border-pink-100 text-2xs font-extrabold tracking-widest animate-pulse">
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                  กำลังเรียกบริการ (NOW CALLING)
                </div>
                
                {/* Big Queue Number */}
                <div className="text-7xl font-black text-pink-600 tracking-widest font-sans">
                  {mainCallingQueue.queueNo}
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto text-pink-600 font-bold">
                  ↓
                </div>

                {/* Station Counter */}
                <div className="text-3xl font-black text-pink-500 tracking-wide font-sans">
                  {mainCallingQueue.counterNo}
                </div>

                {/* Sub name & branch details */}
                <div className="text-[11px] text-slate-600 font-bold space-y-1">
                  <div>คุณ {mainCallingQueue.customerName} - {getServiceLabel(mainCallingQueue.serviceType)}</div>
                  <div className="text-pink-700 font-bold bg-pink-50 border border-pink-100 py-0.5 px-2 rounded-full inline-block text-[10px]">🏬 {getBranchName(mainCallingQueue.branchId)}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-pink-400 my-auto z-10">
                <Tv className="w-12 h-12 text-pink-300 mx-auto animate-pulse" />
                <p className="text-xs font-black text-pink-600">ยินดีต้อนรับทุกท่านค่ะ</p>
                <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto leading-relaxed">รอพนักงานกดปุ่มเรียกหมายเลขคิว บอร์ดจะแสดงผลเรียลไทม์ทันที</p>
              </div>
            )}
          </div>

          {/* Recently Called Queue History list */}
          <div className="bg-white border border-pink-100 rounded-[28px] p-5 shadow-xl">
            <h3 className="text-slate-700 font-extrabold text-xs uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <History className="w-4 h-4 text-pink-500" />
              ลำดับคิวที่ถูกเรียกก่อนหน้านี้ (CALL HISTORY)
            </h3>

            <div className="space-y-2">
              {calledHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-2xs italic font-medium">
                  ไม่มีประวัติการเรียกคิวก่อนหน้า
                </div>
              ) : (
                calledHistory.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex justify-between items-center bg-pink-50/30 hover:bg-pink-50/70 p-3 rounded-2xl border border-pink-100/40 hover:border-pink-200/60 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {/* Circle Sequence number mapping */}
                      <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold flex items-center justify-center font-sans">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 tracking-wider leading-none">
                          {q.queueNo}
                        </span>
                        <span className="text-[8px] text-pink-500/90 font-bold mt-0.5">
                          🏬 {getBranchName(q.branchId)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <span className="text-[11px] text-slate-500 font-bold truncate max-w-[120px]">
                        {getServiceLabel(q.serviceType)}
                      </span>
                      <span className="text-xs font-black text-pink-600 font-sans min-w-[70px]">
                        {q.counterNo}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Floating Clock / Banner on TV Fullscreen */}
      {isFullscreenTv && (
        <div className="mt-4 flex flex-wrap justify-between items-center bg-white text-slate-800 px-5 py-3 rounded-2xl border border-pink-200 shadow-md">
          <div className="flex items-center gap-3">
            {activeTheme?.logoUrl && (
              <img src={activeTheme.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
            )}
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-pink-500 inline-block animate-pulse"></span>
              เชื่อมต่อเครื่องรับสัญญาณทีวีอัจฉริยะเรียลไทม์ (SSE)
            </div>
          </div>
          <div className="text-xs font-black tracking-widest text-pink-600">
            {new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      )}

    </div>
  );
}
