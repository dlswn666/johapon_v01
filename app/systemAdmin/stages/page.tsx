'use client';

import React, { useState } from 'react';
import { 
    Plus, 
    Pencil, 
    Trash2, 
    GripVertical, 
    Layout, 
    ChevronRight
} from 'lucide-react';
import { 
    useDevelopmentStages, 
    useCreateDevelopmentStage, 
    useUpdateDevelopmentStage, 
    useDeleteDevelopmentStage,
    DevelopmentStage
} from '@/app/_lib/features/development-stages/api/useDevelopmentStages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const BUSINESS_TYPES = ['재개발', '재건축', '지역주택조합', '가로주택정비'];

export default function StagesManagementPage() {
    const [selectedType, setSelectedType] = useState<string>('재개발');
    const { data: stages, isLoading } = useDevelopmentStages(selectedType);
    
    const createMutation = useCreateDevelopmentStage();
    const updateMutation = useUpdateDevelopmentStage();
    const deleteMutation = useDeleteDevelopmentStage();

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<DevelopmentStage | null>(null);
    const [formData, setFormData] = useState({
        stage_name: '',
        sort_order: 1,
        business_type: ''
    });

    const handleOpenModal = (stage?: DevelopmentStage) => {
        if (stage) {
            setEditingStage(stage);
            setFormData({
                stage_name: stage.stage_name,
                sort_order: stage.sort_order,
                business_type: stage.business_type
            });
        } else {
            setEditingStage(null);
            setFormData({
                stage_name: '',
                sort_order: (stages?.length || 0) + 1,
                business_type: selectedType
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.stage_name.trim()) {
            toast.error('단계명을 입력해주세요.');
            return;
        }

        try {
            if (editingStage) {
                await updateMutation.mutateAsync({
                    id: editingStage.id,
                    updates: formData
                });
                toast.success('수정되었습니다.');
            } else {
                await createMutation.mutateAsync(formData);
                toast.success('등록되었습니다.');
            }
            setIsModalOpen(false);
        } catch (_error) {
            toast.error('저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말로 이 단계를 삭제하시겠습니까? 관련 조합 데이터가 있을 경우 오류가 발생할 수 있습니다.')) return;
        
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('삭제되었습니다.');
        } catch (_error) {
            toast.error('삭제에 실패했습니다. (관련 데이터가 존재할 수 있습니다)');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Layout className="w-6 h-6 text-blue-400" />
                        단계 마스터 관리
                    </h1>
                    <p className="text-slate-400 text-sm">사업 유형별 개발 단계를 표준화하여 관리합니다.</p>
                </div>
                <Button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    새 단계 추가
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 왼쪽: 유형 선택 */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 h-fit">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 px-2 uppercase tracking-wider">사업 유형</h3>
                    <div className="space-y-1">
                        {BUSINESS_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer group",
                                    selectedType === type 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span className="font-medium text-sm">{type}</span>
                                <ChevronRight className={cn(
                                    "w-4 h-4 opacity-0 transition-opacity",
                                    selectedType === type ? "opacity-100" : "group-hover:opacity-100"
                                )} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 오른쪽: 단계 목록 */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-200">
                                <strong className="text-blue-400">{selectedType}</strong> 단계 목록 ({stages?.length || 0})
                            </span>
                        </div>

                        <div className="divide-y divide-slate-700">
                            {isLoading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                </div>
                            ) : !stages || stages.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    등록된 단계가 없습니다.
                                </div>
                            ) : (
                                stages.map((stage) => (
                                    <div key={stage.id} className="flex items-center gap-4 p-4 hover:bg-slate-700/30 transition-colors group">
                                        <div className="p-2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-blue-400 font-bold border border-slate-700">
                                            {stage.sort_order}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-white font-medium">{stage.stage_name}</h4>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleOpenModal(stage)}
                                                className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleDelete(stage.id)}
                                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 등록/수정 모달 */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingStage ? '단계 수정' : '새 단계 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">사업 유형</label>
                            <Select 
                                value={formData.business_type} 
                                onValueChange={(val) => setFormData(p => ({ ...p, business_type: val }))}
                                disabled={!!editingStage}
                            >
                                <SelectTrigger className="bg-slate-900 border-slate-700 focus:ring-blue-500">
                                    <SelectValue placeholder="유형 선택" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                    {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">단계명</label>
                            <Input 
                                placeholder="예: 조합설립인가"
                                value={formData.stage_name}
                                onChange={(e) => setFormData(p => ({ ...p, stage_name: e.target.value }))}
                                className="bg-slate-900 border-slate-700 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">출력 순서</label>
                            <Input 
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) }))}
                                className="bg-slate-900 border-slate-700 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">취소</Button>
                        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
