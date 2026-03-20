'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/app/_lib/widgets/common/date-picker/DateTimePicker';
import type { EvoteCreateForm, PublishMode, NotificationChannel } from '@/app/_lib/features/evote/types/evote.types';

interface StepScheduleProps {
  formData: EvoteCreateForm;
  updateForm: (partial: Partial<EvoteCreateForm>) => void;
}

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: 'KAKAO_ALIMTALK', label: '카카오 알림톡' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: '이메일' },
];

export default function StepSchedule({ formData, updateForm }: StepScheduleProps) {
  const toggleChannel = (channel: NotificationChannel) => {
    const exists = formData.notificationChannels.includes(channel);
    if (exists) {
      updateForm({
        notificationChannels: formData.notificationChannels.filter((c) => c !== channel),
      });
    } else {
      updateForm({
        notificationChannels: [...formData.notificationChannels, channel],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">일정 및 알림</h2>
        <p className="text-sm text-gray-500 mt-1">게시 방식과 스케줄을 설정합니다</p>
      </div>

      {/* 게시 방식 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">게시 방식</label>
        <div className="flex gap-3">
          <label
            className={`flex-1 p-4 rounded-lg border cursor-pointer transition-colors ${
              formData.publishMode === 'IMMEDIATE'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="publishMode"
              value="IMMEDIATE"
              checked={formData.publishMode === 'IMMEDIATE'}
              onChange={() => updateForm({ publishMode: 'IMMEDIATE' as PublishMode })}
              className="sr-only"
            />
            <p className="text-sm font-medium text-gray-900">즉시 게시</p>
            <p className="text-xs text-gray-500 mt-1">생성 즉시 공고됩니다</p>
          </label>
          <label
            className={`flex-1 p-4 rounded-lg border cursor-pointer transition-colors ${
              formData.publishMode === 'SCHEDULED'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="publishMode"
              value="SCHEDULED"
              checked={formData.publishMode === 'SCHEDULED'}
              onChange={() => updateForm({ publishMode: 'SCHEDULED' as PublishMode })}
              className="sr-only"
            />
            <p className="text-sm font-medium text-gray-900">예약 게시</p>
            <p className="text-xs text-gray-500 mt-1">지정 일시에 자동 공고됩니다</p>
          </label>
        </div>
      </div>

      {/* 예약 게시 일시 */}
      {formData.publishMode === 'SCHEDULED' && (
        <DateTimePicker
          label="게시 예약 일시 *"
          value={formData.publishAt ? new Date(formData.publishAt) : undefined}
          onChange={(date) => updateForm({ publishAt: date?.toISOString() ?? '' })}
          placeholder="게시 일시 선택"
          min={new Date()}
        />
      )}

      {/* 스케줄 타임라인 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">스케줄 타임라인</h3>

        <DateTimePicker
          label="사전투표 시작일"
          value={formData.preVoteStartAt ? new Date(formData.preVoteStartAt) : undefined}
          onChange={(date) => updateForm({ preVoteStartAt: date?.toISOString() ?? '' })}
          placeholder="사전투표 시작일 선택"
          min={new Date()}
        />

        <DateTimePicker
          label="사전투표 마감일"
          value={formData.preVoteEndAt ? new Date(formData.preVoteEndAt) : undefined}
          onChange={(date) => updateForm({ preVoteEndAt: date?.toISOString() ?? '' })}
          placeholder="사전투표 마감일 선택"
          min={formData.preVoteStartAt ? new Date(formData.preVoteStartAt) : new Date()}
        />

        <DateTimePicker
          label="최종 마감 시각"
          value={formData.finalDeadline ? new Date(formData.finalDeadline) : undefined}
          onChange={(date) => updateForm({ finalDeadline: date?.toISOString() ?? '' })}
          placeholder="최종 마감 시각 선택"
          min={formData.preVoteEndAt ? new Date(formData.preVoteEndAt) : new Date()}
        />
      </div>

      {/* 자동 알림 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={formData.autoReminder}
            onCheckedChange={(checked) => updateForm({ autoReminder: !!checked })}
          />
          <label className="text-sm font-medium text-gray-700">자동 알림 발송</label>
        </div>
        <p className="text-xs text-gray-500 ml-6">투표 시작, 마감 전 자동으로 알림을 발송합니다</p>
      </div>

      {/* 알림 채널 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">알림 채널</label>
        <div className="space-y-2">
          {CHANNEL_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.notificationChannels.includes(opt.value)}
                onCheckedChange={() => toggleChannel(opt.value)}
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
