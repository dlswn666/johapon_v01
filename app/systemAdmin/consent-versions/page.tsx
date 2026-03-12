'use client';

import React, { useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    FileText,
    ChevronRight,
    Check,
    X,
} from 'lucide-react';
import {
    useConsentVersions,
    useCreateConsentVersion,
    useUpdateConsentVersion,
    useDeleteConsentVersion,
    ConsentVersion,
    ConsentType,
    CONSENT_TYPE_LABELS,
    CONSENT_TYPES,
} from '@/app/_lib/features/consent-versions/api/useConsentVersions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function ConsentVersionsPage() {
    const [selectedType, setSelectedType] = useState<ConsentType | undefined>(undefined);
    const { data: versions, isLoading } = useConsentVersions(selectedType);

    const createMutation = useCreateConsentVersion();
    const updateMutation = useUpdateConsentVersion();
    const deleteMutation = useDeleteConsentVersion();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVersion, setEditingVersion] = useState<ConsentVersion | null>(null);
    const [formData, setFormData] = useState({
        consent_type: 'TERMS_OF_SERVICE' as ConsentType,
        version_code: '',
        title: '',
        content: '',
        effective_from: '',
    });

    const handleOpenModal = (version?: ConsentVersion) => {
        if (version) {
            setEditingVersion(version);
            setFormData({
                consent_type: version.consent_type,
                version_code: version.version_code,
                title: version.title,
                content: version.content,
                effective_from: version.effective_from ? version.effective_from.split('T')[0] : '',
            });
        } else {
            setEditingVersion(null);
            setFormData({
                consent_type: selectedType || 'TERMS_OF_SERVICE',
                version_code: '',
                title: '',
                content: '',
                effective_from: new Date().toISOString().split('T')[0],
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.version_code.trim()) {
            toast.error('버전 코드를 입력해주세요.');
            return;
        }
        if (!formData.title.trim()) {
            toast.error('제목을 입력해주세요.');
            return;
        }
        if (!formData.content.trim()) {
            toast.error('내용을 입력해주세요.');
            return;
        }
        if (!formData.effective_from) {
            toast.error('시행일을 입력해주세요.');
            return;
        }

        try {
            if (editingVersion) {
                await updateMutation.mutateAsync({
                    id: editingVersion.id,
                    updates: {
                        consent_type: formData.consent_type,
                        version_code: formData.version_code,
                        title: formData.title,
                        content: formData.content,
                        effective_from: formData.effective_from,
                    },
                });
                toast.success('수정되었습니다.');
            } else {
                await createMutation.mutateAsync({
                    consent_type: formData.consent_type,
                    version_code: formData.version_code,
                    title: formData.title,
                    content: formData.content,
                    effective_from: formData.effective_from,
                });
                toast.success('등록되었습니다.');
            }
            setIsModalOpen(false);
        } catch (_error) {
            toast.error('저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 약관 버전을 비활성화하시겠습니까?')) return;

        try {
            await deleteMutation.mutateAsync(id);
            toast.success('비활성화되었습니다.');
        } catch (_error) {
            toast.error('비활성화에 실패했습니다.');
        }
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-400" />
                        약관 버전 관리
                    </h1>
                    <p className="text-slate-400 text-sm">서비스 약관 및 동의 문서의 버전을 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 동의 유형 사이드바 */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 h-fit">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 px-2 uppercase tracking-wider">동의 유형</h3>
                    <div className="space-y-1">
                        {/* 전체 보기 */}
                        <button
                            onClick={() => setSelectedType(undefined)}
                            className={cn(
                                'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer group',
                                !selectedType
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            )}
                        >
                            <span className="font-medium text-sm">전체</span>
                            <ChevronRight className={cn(
                                'w-4 h-4 opacity-0 transition-opacity',
                                !selectedType ? 'opacity-100' : 'group-hover:opacity-100'
                            )} />
                        </button>
                        {CONSENT_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer group',
                                    selectedType === type
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                )}
                            >
                                <span className="font-medium text-sm">{CONSENT_TYPE_LABELS[type]}</span>
                                <ChevronRight className={cn(
                                    'w-4 h-4 opacity-0 transition-opacity',
                                    selectedType === type ? 'opacity-100' : 'group-hover:opacity-100'
                                )} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 메인 콘텐츠 */}
                <div className="lg:col-span-3 space-y-4">
                    {/* 추가 버튼 */}
                    <div className="flex justify-end">
                        <Button
                            onClick={() => handleOpenModal()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            새 약관 버전 추가
                        </Button>
                    </div>

                    {/* 테이블 */}
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-200">
                                <strong className="text-purple-400">
                                    {selectedType ? CONSENT_TYPE_LABELS[selectedType] : '전체'}
                                </strong>{' '}
                                약관 목록 ({versions?.length || 0})
                            </span>
                        </div>

                        {/* 테이블 헤더 */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-700 bg-slate-900/50 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            <div className="col-span-2">동의 유형</div>
                            <div className="col-span-2">버전 코드</div>
                            <div className="col-span-3">제목</div>
                            <div className="col-span-2">시행일</div>
                            <div className="col-span-1 text-center">활성</div>
                            <div className="col-span-2 text-right">관리</div>
                        </div>

                        <div className="divide-y divide-slate-700">
                            {isLoading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                </div>
                            ) : !versions || versions.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    등록된 약관 버전이 없습니다.
                                </div>
                            ) : (
                                versions.map((version) => (
                                    <div key={version.id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-slate-700/30 transition-colors group">
                                        <div className="col-span-2">
                                            <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded font-medium">
                                                {CONSENT_TYPE_LABELS[version.consent_type]}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-sm font-mono text-slate-300">{version.version_code}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="text-sm text-white font-medium">{version.title}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-sm text-slate-400">{formatDate(version.effective_from)}</span>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            {version.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                                                    <Check className="w-3 h-3" /> 활성
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                                                    <X className="w-3 h-3" /> 비활성
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenModal(version)}
                                                className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            {version.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(version.id)}
                                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 안내 박스 */}
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-4">
                        <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            약관 버전 관리란?
                        </h4>
                        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                            <li>서비스 이용약관, 개인정보 처리방침 등 동의 문서의 버전을 관리합니다.</li>
                            <li><strong className="text-slate-300">시행일</strong>: 해당 버전이 효력을 발생하는 날짜입니다.</li>
                            <li>비활성화된 약관은 더 이상 사용자에게 표시되지 않습니다.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 생성/수정 모달 */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingVersion ? '약관 버전 수정' : '새 약관 버전 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">동의 유형</label>
                                <Select
                                    value={formData.consent_type}
                                    onValueChange={(val) => setFormData(p => ({ ...p, consent_type: val as ConsentType }))}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-700 focus:ring-purple-500">
                                        <SelectValue placeholder="유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {CONSENT_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{CONSENT_TYPE_LABELS[t]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">버전 코드</label>
                                <Input
                                    placeholder="예: v1.0, 2024-01"
                                    value={formData.version_code}
                                    onChange={(e) => setFormData(p => ({ ...p, version_code: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 focus:ring-purple-500 font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">제목</label>
                                <Input
                                    placeholder="예: 개인정보 처리방침 제2판"
                                    value={formData.title}
                                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 focus:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">시행일</label>
                                <Input
                                    type="date"
                                    value={formData.effective_from}
                                    onChange={(e) => setFormData(p => ({ ...p, effective_from: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">내용</label>
                            <textarea
                                placeholder="약관 내용을 입력하세요..."
                                value={formData.content}
                                onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                rows={10}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">취소</Button>
                        <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white">저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
