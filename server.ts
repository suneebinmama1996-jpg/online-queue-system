import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

interface Queue {
  id: string;
  queueNo: string;
  customerName: string;
  phoneNumber: string;
  serviceType: string;
  status: 'waiting' | 'calling' | 'completed' | 'cancelled';
  counterNo?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  branchId: string; // Added branchId
  lineUserId?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  prefix: string;
  description: string;
}

// In-memory branch store
let branches: Branch[] = [
  { id: "main", name: "สาขาหลัก (สำนักงานใหญ่)" },
  { id: "bkk-sukhumvit", name: "สาขาสุขุมวิท (กรุงเทพฯ)" },
  { id: "cm-nimman", name: "สาขานิมมาน (เชียงใหม่)" },
];

// In-memory dynamic service store
let services: Service[] = [
  { id: "general", name: "บริการทั่วไป", prefix: "A", description: "รับฝาก-ถอน ฝากเช็ค หรือฝากส่งเอกสารทั่วไป" },
  { id: "financial", name: "การเงิน/ชำระเงิน", prefix: "B", description: "ชำระเงินค่าสินค้า ธุรกรรมการเงินขนาดใหญ่" },
  { id: "document", name: "งานเอกสาร/ติดต่อสอบถาม", prefix: "C", description: "ขอหนังสือรับรอง ออกใบกำกับภาษี ตรวจสอบสิทธิ์" },
  { id: "consulting", name: "ปรึกษา/วิเคราะห์ข้อมูล", prefix: "D", description: "ให้คำปรึกษาทางธุรกิจ วินิจฉัยเคส หรือสมัครสมาชิก" }
];

// In-memory queue store with initial mock data tagged with branchId
let queues: Queue[] = [
  {
    id: "1",
    queueNo: "A001",
    customerName: "คุณ สมชาย ใจดี",
    phoneNumber: "081-234-5678",
    serviceType: "general",
    status: "completed",
    counterNo: "ช่องบริการ 1",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 25 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    branchId: "main",
  },
  {
    id: "2",
    queueNo: "B001",
    customerName: "คุณ สมศรี รักเรียน",
    phoneNumber: "089-876-5432",
    serviceType: "financial",
    status: "calling",
    counterNo: "ช่องบริการ 2",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 2 * 60000).toISOString(),
    branchId: "main",
  },
  {
    id: "3",
    queueNo: "C001",
    customerName: "คุณ เอกชัย มั่นคง",
    phoneNumber: "086-111-2222",
    serviceType: "document",
    status: "waiting",
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    branchId: "main",
  },
  {
    id: "4",
    queueNo: "A002",
    customerName: "คุณ นารี มีสุข",
    phoneNumber: "085-555-6666",
    serviceType: "general",
    status: "waiting",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    branchId: "main",
  }
];

// Configuration for LINE Notify
let lineConfig: any = {
  token: process.env.LINE_NOTIFY_TOKEN || "BZNCoO5y6kwSiLOKU+qrGR+PUqByGX+RSDt4MShcjfgsexXVQ8wJG8szLN3Mk4ug+iLPQLvSq+Qy0b7H25rZ4B0nacLCoRXs5rmK/3NsM+33j9xOHgK40GOMeB+2bhOC4HBe0SzTglWqxfGMloyA6wdB04t89/1O/w1cDnyilFU=",
  channelSecret: "2010559400",
  lineOaId: "",
  enabled: true,
  simulateOnly: false, // Turn off simulation by default since we have real keys now!
};

// Store active Server-Sent Events (SSE) connections
let clients: any[] = [];

// Helper to broadcast updates to all connected SSE clients safely
function broadcast(type: string, data: any) {
  clients.forEach((client) => {
    try {
      if (client.res && !client.res.writableEnded) {
        client.res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      }
    } catch (err) {
      console.error("Error writing to SSE client:", err);
    }
  });
}

// Keep SSE connections alive with a heartbeat ping every 15 seconds
// This prevents Cloud Run, load balancers, and browsers from dropping the connection
setInterval(() => {
  clients.forEach((client) => {
    try {
      if (client.res && !client.res.writableEnded) {
        client.res.write(": heartbeat\n\n");
      }
    } catch (err) {
      // Ignore write errors, they will be cleaned up on close
    }
  });
}, 15000);

// Next sequence numbers per service type, per branch
function getNextQueueNo(branchId: string, serviceType: string): string {
  const service = services.find((s) => s.id === serviceType);
  const prefix = service ? service.prefix : "A";
  
  // Find all queues in this branch with this service prefix
  const serviceQueues = queues.filter((q) => q.branchId === branchId && q.queueNo.startsWith(prefix));
  let maxSeq = 0;
  serviceQueues.forEach((q) => {
    const seqPart = parseInt(q.queueNo.substring(1));
    if (!isNaN(seqPart) && seqPart > maxSeq) {
      maxSeq = seqPart;
    }
  });
  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

// ---------------------- API Endpoints ----------------------

// TTS audio streaming proxy to bypass iframe sandbox and CORS limitations
app.get("/api/tts", async (req, res) => {
  try {
    const text = req.query.text as string;
    if (!text) {
      return res.status(400).json({ error: "Text query parameter is required" });
    }

    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!response.ok) {
      throw new Error(`Google TTS returned status code: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache audio for 24 hours to optimize traffic
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("[TTS Server Route Error]:", error);
    res.status(500).json({ error: "Failed to fetch TTS voice stream", details: error?.message });
  }
});

// Get all queues
app.get("/api/queues", (req, res) => {
  res.json({ queues });
});

// Create a queue
app.post("/api/queues", async (req, res) => {
  const { customerName, phoneNumber, serviceType, branchId } = req.body;
  if (!serviceType) {
    return res.status(400).json({ error: "Service type is required" });
  }

  const activeBranchId = branchId || "main";
  const name = customerName || "ลูกค้าทั่วไป";
  const phone = phoneNumber || "";
  const queueNo = getNextQueueNo(activeBranchId, serviceType);

  const newQueue: Queue = {
    id: Math.random().toString(36).substring(2, 9),
    queueNo,
    customerName: name,
    phoneNumber: phone,
    serviceType,
    status: "waiting",
    createdAt: new Date().toISOString(),
    branchId: activeBranchId,
  };

  queues.push(newQueue);
  
  // Broadcast update
  broadcast("QUEUE_UPDATE", { queues });

  // Send initial line notification simulation
  const msgText = `🔔 จองคิวสำเร็จ!\nหมายเลขคิวของคุณคือ: ${queueNo}\nบริการ: ${getServiceLabel(serviceType)}\nสถานะ: รอเรียกคิว\nกรุณารอสักครู่...`;
  await sendLineNotification(newQueue, msgText);

  res.status(201).json(newQueue);
});

// Call/Recall a queue
app.post("/api/queues/:id/call", async (req, res) => {
  const { id } = req.params;
  const { counterNo } = req.body;

  if (!counterNo) {
    return res.status(400).json({ error: "Counter number is required" });
  }

  const index = queues.findIndex((q) => q.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Queue not found" });
  }

  const oldQueue = queues[index];
  const updatedQueue: Queue = {
    ...oldQueue,
    status: "calling",
    counterNo,
    calledAt: new Date().toISOString(),
  };

  queues[index] = updatedQueue;

  // Broadcast the update and specifically trigger a CALL_ANNOUNCEMENT for TV/audio speaker
  broadcast("QUEUE_UPDATE", { queues });
  broadcast("CALL_ANNOUNCEMENT", { queue: updatedQueue });

  // Send Line Notify calling notification
  const msgText = `📢 เรียกคิวของคุณแล้ว!\nหมายเลขคิว: ${updatedQueue.queueNo}\nเชิญที่: ${counterNo}\nกรุณาติดต่อเจ้าหน้าที่ค่ะ`;
  await sendLineNotification(updatedQueue, msgText);

  res.json(updatedQueue);
});

// Complete or Cancel queue
app.post("/api/queues/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["waiting", "calling", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const index = queues.findIndex((q) => q.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Queue not found" });
  }

  const oldQueue = queues[index];
  const updatedQueue: Queue = {
    ...oldQueue,
    status,
    completedAt: status === "completed" || status === "cancelled" ? new Date().toISOString() : oldQueue.completedAt,
  };

  queues[index] = updatedQueue;
  broadcast("QUEUE_UPDATE", { queues });

  // Line notification for final updates
  if (status === "completed") {
    const msgText = `✅ บริการเสร็จสิ้น!\nหมายเลขคิว: ${updatedQueue.queueNo}\nขอบคุณที่ใช้บริการค่ะ`;
    await sendLineNotification(updatedQueue, msgText);
  } else if (status === "cancelled") {
    const msgText = `❌ คิวของคุณถูกยกเลิก\nหมายเลขคิว: ${updatedQueue.queueNo}\nหากต้องการรับบริการใหม่ กรุณากดจองคิวอีกครั้งค่ะ`;
    await sendLineNotification(updatedQueue, msgText);
  }

  res.json(updatedQueue);
});

// Reset queues
app.delete("/api/queues/reset", (req, res) => {
  queues = [];
  broadcast("QUEUE_UPDATE", { queues });
  res.json({ message: "Queues reset successfully" });
});

// Branch Settings APIs
app.get("/api/branches", (req, res) => {
  res.json({ branches });
});

app.post("/api/branches", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Branch name is required" });
  }
  const newBranch: Branch = {
    id: "br-" + Math.random().toString(36).substring(2, 9),
    name,
  };
  branches.push(newBranch);
  broadcast("CONFIG_UPDATE", { branches, services });
  res.status(201).json(newBranch);
});

app.delete("/api/branches/:id", (req, res) => {
  const { id } = req.params;
  branches = branches.filter((b) => b.id !== id);
  broadcast("CONFIG_UPDATE", { branches, services });
  res.json({ success: true });
});

// Service Settings APIs
app.get("/api/services", (req, res) => {
  res.json({ services });
});

app.post("/api/services", (req, res) => {
  const { id, name, prefix, description } = req.body;
  if (!name || !prefix) {
    return res.status(400).json({ error: "Service name and prefix are required" });
  }

  const existingIndex = services.findIndex((s) => s.id === id);
  if (existingIndex > -1) {
    services[existingIndex] = {
      id,
      name,
      prefix: prefix.toUpperCase().substring(0, 1),
      description: description || "",
    };
    broadcast("CONFIG_UPDATE", { branches, services });
    res.json(services[existingIndex]);
  } else {
    const newId = id || "srv-" + Math.random().toString(36).substring(2, 9);
    const newService: Service = {
      id: newId,
      name,
      prefix: prefix.toUpperCase().substring(0, 1),
      description: description || "",
    };
    services.push(newService);
    broadcast("CONFIG_UPDATE", { branches, services });
    res.status(201).json(newService);
  }
});

app.delete("/api/services/:id", (req, res) => {
  const { id } = req.params;
  services = services.filter((s) => s.id !== id);
  broadcast("CONFIG_UPDATE", { branches, services });
  res.json({ success: true });
});

// LINE Configuration endpoints
app.get("/api/line-config", (req, res) => {
  res.json(lineConfig);
});

app.post("/api/line-config", (req, res) => {
  const { token, channelSecret, lineOaId, simulateOnly, enabled } = req.body;
  lineConfig = {
    token: token !== undefined ? token : lineConfig.token,
    channelSecret: channelSecret !== undefined ? channelSecret : lineConfig.channelSecret,
    lineOaId: lineOaId !== undefined ? lineOaId : lineConfig.lineOaId,
    simulateOnly: simulateOnly !== undefined ? simulateOnly : lineConfig.simulateOnly,
    enabled: enabled !== undefined ? enabled : lineConfig.enabled,
  };
  res.json(lineConfig);
});

// LINE Webhook Endpoint
app.get("/api/webhook/line", (req, res) => {
  res.status(200).json({ 
    status: "active", 
    message: "LINE Webhook endpoint is ready to receive POST requests from LINE Messaging API",
    endpoint: "/api/webhook/line"
  });
});

app.post("/api/webhook/line", async (req, res) => {
  const body = req.body;
  console.log("LINE Webhook received event:", JSON.stringify(body));
  
  if (body.events) {
    for (const event of body.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        const userId = event.source.userId;
        
        console.log(`Processing message from ${userId}: ${text}`);
        
        // Handle queue binding e.g. #Q-A001
        if (text.startsWith('#Q-')) {
          const queueNo = text.substring(3).trim();
          
          // Find the active queue
          const index = queues.findIndex(q => q.queueNo === queueNo && (q.status === 'waiting' || q.status === 'calling'));
          if (index !== -1) {
            queues[index].lineUserId = userId;
            
            await replyLineMessage(event.replyToken, `✅ ผูกคิว ${queueNo} กับ LINE ของคุณเรียบร้อยแล้วค่ะ\nระบบจะแจ้งเตือนเมื่อถึงคิวของคุณ`);
            broadcast("QUEUE_UPDATE", { queues });
            console.log(`Bound queue ${queueNo} to user ${userId}`);
          } else {
            await replyLineMessage(event.replyToken, `❌ ไม่พบคิว ${queueNo} หรือคิวนี้เสร็จสิ้น/ยกเลิกไปแล้วค่ะ`);
            console.log(`Queue ${queueNo} not found or inactive`);
          }
        }
      }
    }
  }
  
  res.status(200).send("OK");
});

async function replyLineMessage(replyToken: string, text: string) {
  if (!lineConfig.token) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineConfig.token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }]
      }),
    });
  } catch (err) {
    console.error("Error replying to LINE:", err);
  }
}

// SSE Endpoint
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Prevent Nginx proxy from buffering stream
  res.flushHeaders();

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial state including services and branches
  try {
    res.write(`data: ${JSON.stringify({ type: "INITIAL_STATE", queues, services, branches, lineConfig })}\n\n`);
  } catch (err) {
    console.error("Error sending initial SSE state:", err);
  }

  req.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
  });
});

// Helper function to convert service type key to Thai label
function getServiceLabel(type: string): string {
  const service = services.find((s) => s.id === type);
  return service ? service.name : "บริการทั่วไป";
}

// Function to handle LINE Notification (Simulated + Real API)
async function sendLineNotification(queue: Queue, message: string) {
  if (!lineConfig.enabled) return;

  // Always broadcast a simulated event for our beautiful mock LINE client in the browser
  broadcast("LINE_SIMULATION", {
    phoneNumber: queue.phoneNumber,
    message,
    timestamp: new Date().toISOString(),
  });

  // If simulateOnly is false AND a real token is provided, send to real LINE Messaging API
  if (!lineConfig.simulateOnly && lineConfig.token && queue.lineUserId) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lineConfig.token}`,
        },
        body: JSON.stringify({
          to: queue.lineUserId,
          messages: [{ type: "text", text: message }]
        }),
      });

      if (!response.ok) {
        console.error("Failed to send real LINE message:", await response.text());
      } else {
        console.log(`Successfully sent real LINE message to ${queue.lineUserId}`);
      }
    } catch (err) {
      console.error("Error sending real LINE message:", err);
    }
  }
}

// ---------------------- Vite Integration ----------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Queue System] Server running on http://localhost:${PORT}`);
  });
}

startServer();
