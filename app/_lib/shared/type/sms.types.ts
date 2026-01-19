// SMS 메시지 타입
export type SmsMessageType = 'SMS' | 'LMS' | 'MMS';

// SMS 전송 상태
export type SmsSendStatus = 'pending' | 'sending' | 'completed' | 'failed';

// 수신자 상태
export type SmsRecipientStatus = 'pending' | 'success' | 'failed';

// 수신자 정보 (엑셀에서 파싱)
export interface SmsRecipient {
  name: string;
  phone: string;
  isValid: boolean;
  errorMessage?: string;
}

// 배치 전송 결과
export interface SmsBatchResult {
  batchIndex: number;
  startIndex: number;
  endIndex: number;
  status: 'pending' | 'sending' | 'success' | 'partial' | 'failed';
  successCount: number;
  failCount: number;
  msgId?: string;
  errorMessage?: string;
  processedAt?: Date;
}

// SMS 전송 요청
export interface SmsSendRequest {
  unionId: string;
  title?: string;
  message: string;
  msgType: SmsMessageType;
  recipients: SmsRecipient[];
}

// SMS 전송 로그 (DB)
export interface SmsSendLog {
  id: string;
  union_id: string;
  sender_id: string | null;
  title: string | null;
  message: string;
  msg_type: SmsMessageType;
  total_count: number;
  success_count: number;
  fail_count: number;
  status: SmsSendStatus;
  aligo_msg_ids: string[] | null;
  estimated_cost: number;
  created_at: string;
  completed_at: string | null;
}

// SMS 전송 상세 (DB)
export interface SmsSendDetail {
  id: string;
  log_id: string;
  recipient_name: string;
  recipient_phone: string;
  message_sent: string;
  status: SmsRecipientStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// SMS 전송 진행 상태 (UI용)
export interface SmsSendProgress {
  totalRecipients: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  currentBatch: number;
  totalBatches: number;
  status: SmsSendStatus;
  batchResults: SmsBatchResult[];
  estimatedCost: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

// SMS 단가 정보
export interface SmsPricing {
  sms: number;
  lms: number;
  mms: number;
}

// 알리고 API 응답 (send_mass)
export interface AligoSendMassResponse {
  result_code: number;
  message: string;
  msg_id?: number;
  success_cnt?: number;
  error_cnt?: number;
  msg_type?: string;
}

// 변수 치환 함수 타입
export type VariableReplacer = (template: string, recipient: SmsRecipient) => string;

// 바이트 계산 결과
export interface ByteCount {
  bytes: number;
  recommendedType: SmsMessageType;
  isOverLimit: boolean;
}
