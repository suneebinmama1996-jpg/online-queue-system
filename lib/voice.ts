export function generateQueueSpeakText(queueNo: string, counterNo: string): string {
  const prefix = queueNo.charAt(0);
  const numbers = queueNo.substring(1).split("").map((n) => {
    if (n === "0") return "ศูนย์";
    if (n === "1") return "หนึ่ง";
    if (n === "2") return "สอง";
    if (n === "3") return "สาม";
    if (n === "4") return "สี่";
    if (n === "5") return "ห้า";
    if (n === "6") return "หก";
    if (n === "7") return "เจ็ด";
    if (n === "8") return "แปด";
    if (n === "9") return "เก้า";
    return n;
  }).join(" ");

  const prefixSpelled: Record<string, string> = {
    A: "เอ", B: "บี", C: "ซี", D: "ดี", E: "อี",
    F: "เอฟ", G: "จี", H: "เอช", I: "ไอ", J: "เจ",
    K: "เค", L: "แอล", M: "เอ็ม", N: "เอ็น", O: "โอ",
    P: "พี", Q: "คิว", R: "อาร์", S: "เอส", T: "ที",
    U: "ยู", V: "วี", W: "ดับเบิ้ลยู", X: "เอ็กซ์", Y: "วาย", Z: "ซี"
  };
  const letter = prefixSpelled[prefix.toUpperCase()] || prefix;

  // Prevent duplicating "ช่องบริการ" if the counter already includes it
  let counterText = counterNo.trim();
  if (counterText.includes("ช่อง") || counterText.includes("บริการ")) {
    counterText = "ที่ " + counterText;
  } else {
    counterText = "ที่ช่องบริการ " + counterText;
  }

  // Retrieve speech suffix dynamically from localStorage to let user choose "ค่ะ" / "ครับ" / "none"
  const suffix = (typeof localStorage !== "undefined" && localStorage.getItem("speech_suffix")) || "ค่ะ";
  const suffixText = suffix === "none" ? "" : suffix;

  // Add generous spacing/pauses between "คิว", "letter", and each digit of the "numbers" using spaces
  // Text will be like "ขอเชิญหมายเลข เอ 0 0 1 ที่ช่องบริการ 1 ค่ะ"
  return `ขอเชิญหมายเลข ${letter} ${numbers} ${counterText} ${suffixText}`.trim();
}

export function speakThai(
  text: string, 
  rate: number = 0.65,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === "undefined") {
    if (onEnd) onEnd();
    return;
  }

  // Check if we should use Google Cloud TTS or local speechSynthesis
  const savedEngine = localStorage.getItem("speech_engine") || "google";

  if (savedEngine === "google") {
    const savedRate = localStorage.getItem("speech_rate");
    const fallbackRate = savedRate ? parseFloat(savedRate) : rate;
    playGoogleTTS(text, fallbackRate, onStart, onEnd);
    return;
  }

  // Check if Web Speech API is supported (Recommended & supports custom voice/pitch/rate)
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "th-TH";

      // Load saved speech parameters from localStorage (just like settings)
      const savedRate = localStorage.getItem("speech_rate");
      const savedPitch = localStorage.getItem("speech_pitch");
      const savedVoiceName = localStorage.getItem("speech_voice_name");

      utterance.rate = savedRate ? parseFloat(savedRate) : rate;
      utterance.pitch = savedPitch ? parseFloat(savedPitch) : 1.25;

      // Find selected voice or appropriate Thai female voice
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;

      if (savedVoiceName) {
        selectedVoice = voices.find((v) => v.name === savedVoiceName) || null;
      }

      if (!selectedVoice) {
        // Find all Thai voices
        const thaiVoices = voices.filter((v) => 
          v.lang.toLowerCase().includes("th") || 
          v.lang.replace("_", "-").toLowerCase().startsWith("th")
        );

        // Filter out known male voices to get only female voices
        const femaleThaiVoices = thaiVoices.filter((v) => {
          const nameLower = v.name.toLowerCase();
          return (
            !nameLower.includes("male") &&
            !nameLower.includes("pattara") &&
            !nameLower.includes("niwat") &&
            !nameLower.includes("naris") &&
            !nameLower.includes("hemant")
          );
        });

        // 1. Try to find specific female voice names (Premwadee, Kanya, Narisa, Bow)
        selectedVoice = femaleThaiVoices.find((v) => {
          const nameLower = v.name.toLowerCase();
          return (
            nameLower.includes("premwadee") ||
            nameLower.includes("kanya") ||
            nameLower.includes("narisa") ||
            nameLower.includes("bow") ||
            v.name.includes("โบว์") ||
            nameLower.includes("achara") ||
            nameLower.includes("female")
          );
        }) || null;

        // 2. If not found, try to find high-quality female voices (online, premium, natural, google)
        if (!selectedVoice) {
          selectedVoice = femaleThaiVoices.find((v) => {
            const nameLower = v.name.toLowerCase();
            return (
              nameLower.includes("online") ||
              nameLower.includes("premium") ||
              nameLower.includes("natural") ||
              nameLower.includes("google")
            );
          }) || null;
        }

        // 3. Fall back to any female Thai voice
        if (!selectedVoice && femaleThaiVoices.length > 0) {
          selectedVoice = femaleThaiVoices[0];
        }

        // 4. Absolute fallback to any Thai voice
        if (!selectedVoice && thaiVoices.length > 0) {
          selectedVoice = thaiVoices[0];
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn("[Voice Engine] SpeechSynthesis error, falling back to Google Cloud TTS:", e);
        const fallbackRate = savedRate ? parseFloat(savedRate) : rate;
        playGoogleTTS(text, fallbackRate, onStart, onEnd);
      };

      window.speechSynthesis.speak(utterance);
      return;
    } catch (err) {
      console.warn("[Voice Engine] SpeechSynthesis failed, falling back to Google Cloud TTS:", err);
    }
  }

  // Primary Google TTS fallback if speechSynthesis isn't supported or fails
  const savedRate = localStorage.getItem("speech_rate");
  const fallbackRate = savedRate ? parseFloat(savedRate) : rate;
  playGoogleTTS(text, fallbackRate, onStart, onEnd);
}

function playGoogleTTS(
  text: string,
  rate: number,
  onStart?: () => void,
  onEnd?: () => void
) {
  try {
    const url = `/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    audio.playbackRate = Math.min(Math.max(rate, 0.5), 2.0);
    
    if (onStart) {
      audio.onplay = () => onStart();
    }
    
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    
    audio.onerror = (e) => {
      console.warn("[Voice Engine] Google Cloud TTS play failed", e);
      if (onEnd) onEnd();
    };
    
    audio.play().catch((err) => {
      console.warn("[Voice Engine] Google Cloud TTS autoplay blocked", err);
      if (onEnd) onEnd();
    });
  } catch (err) {
    console.warn("[Voice Engine] Google Cloud TTS setup error", err);
    if (onEnd) onEnd();
  }
}
