import { PrintTemplateConfig } from "../types";

export const defaultPrintConfig: PrintTemplateConfig = {
  headerText: "คิวไลน์อัจฉริยะ\nระบบจัดการคิวอัตโนมัติ 2026",
  headerLogoUrl: "",
  showHeader: true,
  showDateTime: true,
  showQueueNumber: true,
  showServiceName: true,
  showCounter: true,
  footerText: "กรุณารอเรียกคิวบริเวณหน้าห้องบริการ\nขอบคุณที่ใช้บริการ",
  showFooter: true,
  showQrCode: true,
  fontSizeMultiplier: 1.0,
  margins: 16,
};
