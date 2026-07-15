export interface Queue {
  id: string;
  queueNo: string;
  customerName: string;
  phoneNumber: string;
  serviceType: string; // Dynamic service ID
  status: 'waiting' | 'calling' | 'completed' | 'cancelled';
  counterNo?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  branchId: string; // Added branchId
  lineUserId?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  prefix: string;
  description: string;
}

export interface LineMessage {
  phoneNumber: string;
  message: string;
  timestamp: string;
}

export interface LineConfig {
  token: string;
  channelSecret: string;
  lineOaId: string;
  enabled: boolean;
  simulateOnly: boolean;
}

export interface PrintTemplateConfig {
  headerText: string;
  headerLogoUrl: string;
  showHeader: boolean;
  showDateTime: boolean;
  showQueueNumber: boolean;
  showServiceName: boolean;
  showCounter: boolean;
  footerText: string;
  showFooter: boolean;
  showQrCode: boolean;
  fontSizeMultiplier: number; // e.g. 1.0 = normal, 1.2 = large
  margins: number; // e.g. padding in px or rem (could just be px scale)
}
