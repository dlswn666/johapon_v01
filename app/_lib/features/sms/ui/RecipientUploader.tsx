'use client';

import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { SmsRecipient } from '@/app/_lib/shared/type/sms.types';
import useSmsStore from '../model/useSmsStore';

// 전화번호 정규화 함수
function normalizePhoneNumber(phone: string): string {
  // 숫자만 추출
  const digits = phone.replace(/[^0-9]/g, '');

  // 010-1234-5678 형식을 01012345678로 변환
  return digits;
}

// 전화번호 유효성 검사
function validatePhoneNumber(phone: string): { isValid: boolean; errorMessage?: string } {
  const normalized = normalizePhoneNumber(phone);

  if (!normalized) {
    return { isValid: false, errorMessage: '전화번호가 비어있습니다' };
  }

  if (normalized.length < 10 || normalized.length > 11) {
    return { isValid: false, errorMessage: '전화번호 자릿수가 올바르지 않습니다' };
  }

  if (!normalized.startsWith('01')) {
    return { isValid: false, errorMessage: '휴대폰 번호 형식이 아닙니다' };
  }

  return { isValid: true };
}

export default function RecipientUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    recipients,
    validRecipients,
    invalidRecipients,
    setRecipients,
    clearRecipients,
    setCurrentStep,
    isUploading,
    setIsUploading,
  } = useSmsStore();

  // 엑셀 파일 파싱
  const parseExcelFile = useCallback(async (file: File) => {
    setIsUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // 첫 번째 시트 가져오기
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // JSON으로 변환
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      // 데이터 파싱 및 유효성 검사
      const parsedRecipients: SmsRecipient[] = rawData.map((row) => {
        const name = String(row['이름'] || row['name'] || '').trim();
        const phone = String(row['전화번호'] || row['phone'] || row['휴대폰'] || '').trim();

        if (!name) {
          return {
            name: '',
            phone: normalizePhoneNumber(phone),
            isValid: false,
            errorMessage: '이름이 비어있습니다',
          };
        }

        const validation = validatePhoneNumber(phone);

        return {
          name,
          phone: normalizePhoneNumber(phone),
          isValid: validation.isValid,
          errorMessage: validation.errorMessage,
        };
      });

      // 중복 제거 (전화번호 기준)
      const uniqueRecipients = parsedRecipients.filter(
        (recipient, index, self) =>
          index === self.findIndex((r) => r.phone === recipient.phone)
      );

      // 중복 개수 계산
      const duplicateCount = parsedRecipients.length - uniqueRecipients.length;
      if (duplicateCount > 0) {
        console.log(`중복 제거: ${duplicateCount}건`);
      }

      setRecipients(uniqueRecipients);
    } catch (error) {
      console.error('엑셀 파싱 오류:', error);
      alert('엑셀 파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [setRecipients, setIsUploading]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
    // 같은 파일 다시 선택할 수 있도록 초기화
    event.target.value = '';
  }, [parseExcelFile]);

  // 드래그 앤 드롭 핸들러
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file);
    } else {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    }
  }, [parseExcelFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // 템플릿 다운로드
  const handleDownloadTemplate = useCallback(() => {
    window.location.href = '/api/sms/template';
  }, []);

  // 다음 단계로 이동
  const handleNext = useCallback(() => {
    if (validRecipients.length > 0) {
      setCurrentStep('compose');
    }
  }, [validRecipients.length, setCurrentStep]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">수신자 명단 업로드</h2>
          <p className="text-sm text-gray-500 mt-1">
            엑셀 파일을 업로드하여 문자 수신자를 등록하세요
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          템플릿 다운로드
        </button>
      </div>

      {/* 업로드 영역 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">파일을 분석하는 중...</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-4 text-gray-600">
              클릭하여 파일을 선택하거나 드래그하여 업로드하세요
            </p>
            <p className="mt-2 text-sm text-gray-400">
              지원 형식: .xlsx, .xls
            </p>
          </>
        )}
      </div>

      {/* 업로드 결과 */}
      {recipients.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">
                  총 {recipients.length}명 업로드됨
                </p>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    유효: {validRecipients.length}명
                  </span>
                  {invalidRecipients.length > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      오류: {invalidRecipients.length}명
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={clearRecipients}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="초기화"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 오류 목록 */}
          {invalidRecipients.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-800 mb-2">
                오류 항목 ({invalidRecipients.length}건)
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {invalidRecipients.slice(0, 10).map((recipient, index) => (
                  <div key={index} className="text-sm text-red-700 flex justify-between">
                    <span>{recipient.name || '(이름없음)'} - {recipient.phone || '(번호없음)'}</span>
                    <span className="text-red-500">{recipient.errorMessage}</span>
                  </div>
                ))}
                {invalidRecipients.length > 10 && (
                  <p className="text-sm text-red-500 mt-2">
                    ...외 {invalidRecipients.length - 10}건
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 유효 수신자 미리보기 */}
          {validRecipients.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">이름</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">전화번호</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validRecipients.slice(0, 5).map((recipient, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{recipient.name}</td>
                      <td className="px-4 py-3 text-gray-600">{recipient.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRecipients.length > 5 && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                  ...외 {validRecipients.length - 5}명
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 다음 단계 버튼 */}
      {validRecipients.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            다음 단계
          </button>
        </div>
      )}
    </div>
  );
}
