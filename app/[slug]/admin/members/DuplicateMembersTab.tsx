'use client';

import React, { useState } from 'react';
import { AlertTriangle, Users, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import {
    useMergeCandidates,
    useMergeUsers,
    useConfirmSeparateUsers,
    MergeCandidate,
    MergeCandidateMember,
} from '@/app/_lib/features/member-management/api/useMergeCandidatesHook';
import { ENTITY_TYPE_LABELS, EntityType } from '@/app/_lib/shared/type/database.types';

const MATCH_REASON_LABELS: Record<string, string> = {
    NAME_PHONE: '이름+전화번호',
    BIZ_NUMBER: '사업자번호',
};

export default function DuplicateMembersTab() {
    const { union } = useSlug();
    const unionId = union?.id;
    const { user } = useAuth();

    const { candidates, pendingCount, isLoading } = useMergeCandidates(unionId);
    const { mutate: mergeUsers, isPending: isMerging } = useMergeUsers();
    const { mutate: confirmSeparate, isPending: isConfirming } = useConfirmSeparateUsers();

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedCanonicalId, setSelectedCanonicalId] = useState<string | null>(null);
    const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT'>('INDIVIDUAL');
    const [actionType, setActionType] = useState<'merge' | 'separate'>('merge');

    const selectedGroup = candidates.find((c) => c.group_id === selectedGroupId) ?? null;

    const handleRowClick = (group: MergeCandidate) => {
        if (selectedGroupId === group.group_id) {
            setSelectedGroupId(null);
            setSelectedCanonicalId(null);
        } else {
            setSelectedGroupId(group.group_id);
            setSelectedCanonicalId(group.members[0]?.id ?? null);
            setEntityType('INDIVIDUAL');
            setActionType('merge');
        }
    };

    const handleProcess = async () => {
        if (!unionId || !selectedGroup || !user?.id) return;

        if (actionType === 'merge') {
            if (!selectedCanonicalId) {
                toast.error('유지할 대표 레코드를 선택해주세요.');
                return;
            }
            const mergedMember = selectedGroup.members.find((m) => m.id !== selectedCanonicalId);
            if (!mergedMember) {
                toast.error('병합 대상 레코드를 확인할 수 없습니다.');
                return;
            }
            try {
                await mergeUsers({
                    unionId,
                    canonicalUserId: selectedCanonicalId,
                    mergedUserId: mergedMember.id,
                    entityType,
                    adminUserId: user.id,
                });
                toast.success('병합 처리가 완료되었습니다.');
                setSelectedGroupId(null);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : '병합 처리에 실패했습니다.');
            }
        } else {
            const [memberA, memberB] = selectedGroup.members;
            if (!memberA || !memberB) return;
            try {
                await confirmSeparate({
                    unionId,
                    userIdA: memberA.id,
                    userIdB: memberB.id,
                });
                toast.success('별도 인물로 확정되었습니다.');
                setSelectedGroupId(null);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : '처리에 실패했습니다.');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                중복 후보 조회 중...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        중복 조합원 관리
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        병합 전 반드시 물건지 정보를 확인하세요.
                    </p>
                </div>
                {pendingCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        미처리 {pendingCount}건
                    </span>
                )}
            </div>

            {candidates.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    중복 의심 조합원이 없습니다.
                </div>
            ) : (
                <div className="space-y-2">
                    {/* 후보 목록 */}
                    <div className="overflow-hidden border border-gray-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">#</th>
                                    <th className="px-4 py-3 text-left font-medium">대표자</th>
                                    <th className="px-4 py-3 text-center font-medium">중복 수</th>
                                    <th className="px-4 py-3 text-center font-medium">판별 기준</th>
                                    <th className="px-4 py-3 text-center font-medium">상태</th>
                                    <th className="px-4 py-3 text-center font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {candidates.map((group, idx) => (
                                    <React.Fragment key={group.group_id}>
                                        <tr
                                            className={cn(
                                                'cursor-pointer hover:bg-gray-50 transition-colors',
                                                selectedGroupId === group.group_id && 'bg-orange-50'
                                            )}
                                            onClick={() => handleRowClick(group)}
                                        >
                                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {group.members[0]?.name ?? '-'}
                                                {group.members[0]?.phone_number && (
                                                    <span className="ml-1 text-xs text-gray-400">
                                                        ({group.members[0].phone_number})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600">{group.duplicate_count}명</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                                    {MATCH_REASON_LABELS[group.match_reason] ?? group.match_reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                                    group.status === 'PENDING' ? 'bg-orange-100 text-orange-700'
                                                    : group.status === 'MERGED' ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {group.status === 'PENDING' ? '미처리'
                                                     : group.status === 'MERGED' ? '병합됨'
                                                     : '별도 확정'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-400">
                                                {selectedGroupId === group.group_id
                                                    ? <ChevronUp className="w-4 h-4 mx-auto" />
                                                    : <ChevronDown className="w-4 h-4 mx-auto" />
                                                }
                                            </td>
                                        </tr>

                                        {/* 상세 비교 패널 */}
                                        {selectedGroupId === group.group_id && (
                                            <tr>
                                                <td colSpan={6} className="p-0">
                                                    <MergeCandidateDetail
                                                        group={group}
                                                        selectedCanonicalId={selectedCanonicalId}
                                                        onSelectCanonical={setSelectedCanonicalId}
                                                        entityType={entityType}
                                                        onEntityTypeChange={setEntityType}
                                                        actionType={actionType}
                                                        onActionTypeChange={setActionType}
                                                        onProcess={handleProcess}
                                                        onCancel={() => setSelectedGroupId(null)}
                                                        isProcessing={isMerging || isConfirming}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

interface MergeCandidateDetailProps {
    group: MergeCandidate;
    selectedCanonicalId: string | null;
    onSelectCanonical: (id: string) => void;
    entityType: 'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT';
    onEntityTypeChange: (t: 'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT') => void;
    actionType: 'merge' | 'separate';
    onActionTypeChange: (t: 'merge' | 'separate') => void;
    onProcess: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}

function MergeCandidateDetail({
    group,
    selectedCanonicalId,
    onSelectCanonical,
    entityType,
    onEntityTypeChange,
    actionType,
    onActionTypeChange,
    onProcess,
    onCancel,
    isProcessing,
}: MergeCandidateDetailProps) {
    const [memberA, memberB] = group.members;

    return (
        <div className="bg-orange-50 border-t border-orange-100 p-6 space-y-5">
            <p className="text-sm font-semibold text-gray-700">
                병합 후보 상세: {memberA?.name}
            </p>

            {/* 멤버 비교 */}
            <div className="grid grid-cols-2 gap-4">
                {[memberA, memberB].filter(Boolean).map((member: MergeCandidateMember) => (
                    <MemberCompareCard
                        key={member.id}
                        member={member}
                        isCanonical={selectedCanonicalId === member.id}
                        onSelectCanonical={() => onSelectCanonical(member.id)}
                        showSelectButton={actionType === 'merge'}
                    />
                ))}
            </div>

            {/* entity_type 선택 */}
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">구성원 유형:</p>
                <div className="flex gap-3">
                    {(['INDIVIDUAL', 'CORPORATION', 'GOVERNMENT'] as const).map((t) => (
                        <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                                type="radio"
                                name="entityType"
                                value={t}
                                checked={entityType === t}
                                onChange={() => onEntityTypeChange(t)}
                                className="accent-[#4E8C6D]"
                            />
                            {ENTITY_TYPE_LABELS[t as EntityType]}
                        </label>
                    ))}
                </div>
            </div>

            {/* 처리 방식 */}
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">처리 방식:</p>
                <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                        <input
                            type="radio"
                            name="actionType"
                            value="merge"
                            checked={actionType === 'merge'}
                            onChange={() => onActionTypeChange('merge')}
                            className="mt-0.5 accent-[#4E8C6D]"
                        />
                        <span>
                            동일인 병합 (선택한 레코드 유지, 나머지 → MERGED 처리)
                        </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                        <input
                            type="radio"
                            name="actionType"
                            value="separate"
                            checked={actionType === 'separate'}
                            onChange={() => onActionTypeChange('separate')}
                            className="mt-0.5 accent-[#4E8C6D]"
                        />
                        <span>
                            별도 인물로 확정 (둘 다 유지, 후보 목록에서 제외)
                        </span>
                    </label>
                </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
                    취소
                </Button>
                <Button
                    onClick={onProcess}
                    disabled={isProcessing || (actionType === 'merge' && !selectedCanonicalId)}
                    className="bg-brand hover:bg-brand-hover text-white"
                >
                    {isProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />처리 중...</>
                    ) : (
                        <><CheckCircle className="w-4 h-4 mr-2" />처리 완료</>
                    )}
                </Button>
            </div>
        </div>
    );
}

interface MemberCompareCardProps {
    member: MergeCandidateMember;
    isCanonical: boolean;
    onSelectCanonical: () => void;
    showSelectButton: boolean;
}

function MemberCompareCard({ member, isCanonical, onSelectCanonical, showSelectButton }: MemberCompareCardProps) {
    return (
        <div className={cn(
            'bg-white rounded-xl border-2 p-4 space-y-3 transition-colors',
            isCanonical ? 'border-brand' : 'border-gray-200'
        )}>
            <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{member.name}</span>
                {showSelectButton && (
                    <button
                        onClick={onSelectCanonical}
                        className={cn(
                            'text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                            isCanonical
                                ? 'bg-brand text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                    >
                        {isCanonical ? '✓ 유지 선택됨' : '유지할 레코드 선택'}
                    </button>
                )}
            </div>
            <div className="space-y-1 text-sm text-gray-600">
                <p><span className="text-gray-400">전화:</span> {member.phone_number ?? '-'}</p>
                <p>
                    <span className="text-gray-400">상태:</span>{' '}
                    <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                        member.user_status === 'APPROVED' ? 'bg-green-100 text-green-700'
                        : member.user_status === 'PRE_REGISTERED' ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                        {member.user_status}
                    </span>
                </p>
                <p><span className="text-gray-400">등록일:</span> {member.created_at?.slice(0, 10) ?? '-'}</p>
                <p>
                    <span className="text-gray-400">유형:</span>{' '}
                    {ENTITY_TYPE_LABELS[member.entity_type as EntityType] ?? member.entity_type}
                </p>
            </div>
        </div>
    );
}
