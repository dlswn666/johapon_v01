'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { 
    MapPin, 
    Users, 
    Building2, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Percent,
    User,
    Phone,
    Pencil,
    Trash2,
    Loader2,
    Layers,
    Home,
    Search,
    Plus,
} from 'lucide-react';
import { useParcelDetail, ParcelDetail, Owner, BUILDING_TYPE_LABELS } from '../api/useParcelDetail';
import {
    useBuildingSearch,
    usePnuBuildingMapping,
    useUpdateBuildingMatch,
    useBuildingUnitsUnion,
    useDeleteBuildingUnit,
    BuildingSearchResult,
    BuildingUnitWithSource,
} from '../api/useBuildingMatch';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { updateParcelInfo, deleteParcel, linkMemberToParcel, searchUnionMembers } from '../actions/parcelActions';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import toast from 'react-hot-toast';

interface ParcelDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pnu: string | null;
    stageId: string | null;
    unionId?: string;
    onDeleted?: () => void;
}

export default function ParcelDetailModal({ 
    open, 
    onOpenChange, 
    pnu, 
    stageId,
    unionId,
    onDeleted 
}: ParcelDetailModalProps) {
    const { data: parcel, isLoading, refetch } = useParcelDetail(pnu, stageId);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // 삭제 mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!pnu || !unionId) throw new Error('필수 정보가 없습니다.');
            return deleteParcel({ pnu, unionId });
        },
        onSuccess: () => {
            toast.success('필지가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['consent-map', unionId] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', pnu] });
            setIsDeleteDialogOpen(false);
            onOpenChange(false);
            onDeleted?.();
        },
        onError: (error: Error) => {
            toast.error(error.message || '삭제에 실패했습니다.');
        },
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            필지 상세 정보
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : parcel ? (
                            <>
                                {/* 필지 기본 정보 */}
                                <ParcelBasicInfo parcel={parcel} />

                                {/* 소유주 목록 (조합원 정보) - 조합원이 있을 때만 표시 */}
                                {parcel.building_units.length > 0 && (
                                    <OwnersSection parcel={parcel} />
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                필지 정보를 불러올 수 없습니다.
                            </div>
                        )}
                    </div>

                    {/* 수정/삭제 버튼 - 모달 하단 */}
                    {parcel && (
                        <DialogFooter className="border-t pt-4">
                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    수정
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    삭제
                                </Button>
                            </div>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* 수정 모달 */}
            {parcel && unionId && (
                <EditParcelModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    parcel={parcel}
                    unionId={unionId}
                    onSuccess={() => {
                        refetch();
                        setIsEditModalOpen(false);
                    }}
                />
            )}

            {/* 삭제 확인 대화상자 */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>필지를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 필지와 관련된 모든 데이터가 삭제되며, 
                            지도에서도 해당 필지가 제거됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                deleteMutation.mutate();
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                '삭제'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// 금액 포맷팅 함수
function formatPrice(price: number | null | undefined): string {
    if (!price) return '-';
    if (price >= 100000000) {
        return `${(price / 100000000).toFixed(1)}억원`;
    } else if (price >= 10000) {
        return `${(price / 10000).toFixed(0)}만원`;
    }
    return `${price.toLocaleString()}원`;
}

// 필지 기본 정보
function ParcelBasicInfo({ parcel }: { parcel: ParcelDetail }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* 지번 주소 + 도로명 주소 */}
            <div>
                <p className="text-sm text-gray-500 mb-1">주소</p>
                <p className="font-semibold text-gray-900">{parcel.address}</p>
                {parcel.road_address && (
                    <p className="text-sm text-gray-600 mt-0.5">({parcel.road_address})</p>
                )}
            </div>

            {/* 1행: 건물 유형, 건물 이름 */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">건물 유형</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {parcel.building_type 
                            ? BUILDING_TYPE_LABELS[parcel.building_type] || parcel.building_type 
                            : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">건물 이름</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate" title={parcel.building_name || '-'}>
                        {parcel.building_name || '-'}
                    </p>
                </div>
            </div>

            {/* 2행: 주 용도, 층수, 총 세대수 */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Home className="w-4 h-4" />
                        <span className="text-xs">주 용도</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate" title={parcel.main_purpose || '-'}>
                        {parcel.main_purpose || '-'}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Layers className="w-4 h-4" />
                        <span className="text-xs">층수</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {parcel.floor_count ? `${parcel.floor_count}층` : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">총 세대수</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {parcel.total_unit_count ? `${parcel.total_unit_count}세대` : '-'}
                    </p>
                </div>
            </div>

            {/* 3행: 소유주 수, 면적, 공시지가 */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">소유주 수</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                        {parcel.building_units_count > 0 ? parcel.building_units_count : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">면적</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {parcel.land_area ? `${parcel.land_area.toLocaleString()}㎡` : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Percent className="w-4 h-4" />
                        <span className="text-xs">공시지가</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {formatPrice(parcel.official_price)}
                    </p>
                </div>
            </div>
        </div>
    );
}

// 건물 유형 옵션
const BUILDING_TYPE_OPTIONS = [
    { value: 'DETACHED_HOUSE', label: '단독' },
    { value: 'VILLA', label: '다세대/빌라' },
    { value: 'APARTMENT', label: '아파트' },
    { value: 'COMMERCIAL', label: '상업' },
    { value: 'MIXED', label: '복합' },
    { value: 'NONE', label: '미분류' },
];

// 수정 모달
interface EditParcelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parcel: ParcelDetail;
    unionId: string;
    onSuccess: () => void;
}

function EditParcelModal({ open, onOpenChange, parcel, unionId, onSuccess }: EditParcelModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'member' | 'building-match'>('info');
    
    // 필지/건물 정보 폼
    const [formData, setFormData] = useState({
        // land_lots
        land_area: parcel.land_area || 0,
        official_price: parcel.official_price || 0,
        land_category: parcel.land_category || '',
        // buildings
        building_type: parcel.building_type || 'NONE',
        building_name: parcel.building_name || '',
        main_purpose: parcel.main_purpose || '',
        floor_count: parcel.floor_count || 0,
        total_unit_count: parcel.total_unit_count || 0,
    });

    // 소유주 연결 폼
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; phone_number: string | null; resident_address: string | null }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);

    // 건물 매칭 상태
    const [buildingSearchKeyword, setBuildingSearchKeyword] = useState('');
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingSearchResult | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<BuildingUnitWithSource | null>(null);

    // 건물 매칭 훅
    const { data: buildingSearchResults, isLoading: isBuildingSearching } = useBuildingSearch(
        buildingSearchKeyword,
        buildingSearchKeyword.length >= 2
    );
    const { data: currentMapping } = usePnuBuildingMapping(parcel.pnu);
    const { data: unitsUnion, isLoading: isLoadingUnits } = useBuildingUnitsUnion(parcel.pnu);
    const updateMatchMutation = useUpdateBuildingMatch();
    const deleteUnitMutation = useDeleteBuildingUnit();

    // 모달이 열릴 때 데이터 초기화
    useEffect(() => {
        if (open) {
            setFormData({
                land_area: parcel.land_area || 0,
                official_price: parcel.official_price || 0,
                land_category: parcel.land_category || '',
                building_type: parcel.building_type || 'NONE',
                building_name: parcel.building_name || '',
                main_purpose: parcel.main_purpose || '',
                floor_count: parcel.floor_count || 0,
                total_unit_count: parcel.total_unit_count || 0,
            });
            setActiveTab('info');
            setMemberSearchQuery('');
            setSearchResults([]);
            setSelectedMember(null);
            // 건물 매칭 상태 초기화
            setBuildingSearchKeyword('');
            setSelectedBuilding(null);
            setUnitToDelete(null);
        }
    }, [open, parcel]);

    // 필지/건물 정보 수정 mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            return updateParcelInfo({
                pnu: parcel.pnu,
                land_area: formData.land_area,
                official_price: formData.official_price,
                land_category: formData.land_category || undefined,
                building_id: parcel.building_id || undefined,
                building_type: formData.building_type,
                building_name: formData.building_name || undefined,
                main_purpose: formData.main_purpose || undefined,
                floor_count: formData.floor_count,
                total_unit_count: formData.total_unit_count,
            });
        },
        onSuccess: () => {
            toast.success('필지 정보가 수정되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['consent-map', unionId] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', parcel.pnu] });
            onSuccess();
        },
        onError: (error: Error) => {
            toast.error(error.message || '수정에 실패했습니다.');
        },
    });

    // 소유주 연결 mutation
    const linkMemberMutation = useMutation({
        mutationFn: async () => {
            if (!selectedMember) throw new Error('소유주를 선택해주세요.');
            return linkMemberToParcel({
                pnu: parcel.pnu,
                userId: selectedMember.id,
            });
        },
        onSuccess: () => {
            toast.success('소유주가 연결되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', parcel.pnu] });
            setSelectedMember(null);
            setMemberSearchQuery('');
            setSearchResults([]);
            onSuccess();
        },
        onError: (error: Error) => {
            toast.error(error.message || '소유주 연결에 실패했습니다.');
        },
    });

    // 소유주 검색 (이름으로 검색)
    const handleMemberSearch = async () => {
        if (!memberSearchQuery.trim() || memberSearchQuery.length < 2) {
            toast.error('이름을 2글자 이상 입력해주세요.');
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchUnionMembers(unionId, memberSearchQuery);
            setSearchResults(results);
            if (results.length === 0) {
                toast.error('검색 결과가 없습니다.');
            }
        } catch {
            toast.error('소유주 검색에 실패했습니다.');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>필지 정보 수정</DialogTitle>
                </DialogHeader>

                {/* 탭 */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                            activeTab === 'info'
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('info')}
                    >
                        필지/건물 정보
                    </button>
                    <button
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                            activeTab === 'member'
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('member')}
                    >
                        소유주 추가
                    </button>
                    <button
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                            activeTab === 'building-match'
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('building-match')}
                    >
                        건물 매칭
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {activeTab === 'info' ? (
                        <div className="space-y-4">
                            {/* 필지 정보 섹션 */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700">필지 정보</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="land_area" className="text-xs">면적 (㎡)</Label>
                                        <Input
                                            id="land_area"
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={formData.land_area}
                                            onChange={(e) => setFormData({ ...formData, land_area: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="official_price" className="text-xs">공시지가 (원/㎡)</Label>
                                        <Input
                                            id="official_price"
                                            type="number"
                                            min={0}
                                            value={formData.official_price}
                                            onChange={(e) => setFormData({ ...formData, official_price: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="land_category" className="text-xs">지목</Label>
                                    <Input
                                        id="land_category"
                                        placeholder="예: 대지, 도로, 전, 답 등"
                                        value={formData.land_category}
                                        onChange={(e) => setFormData({ ...formData, land_category: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* 건물 정보 섹션 */}
                            <div className="space-y-3 pt-3 border-t">
                                <h4 className="text-sm font-semibold text-gray-700">건물 정보</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="building_type" className="text-xs">건물 유형</Label>
                                        <Select
                                            value={formData.building_type}
                                            onValueChange={(value) => setFormData({ ...formData, building_type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BUILDING_TYPE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="building_name" className="text-xs">건물 이름</Label>
                                        <Input
                                            id="building_name"
                                            placeholder="예: OO빌라"
                                            value={formData.building_name}
                                            onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="main_purpose" className="text-xs">주용도</Label>
                                    <Input
                                        id="main_purpose"
                                        placeholder="예: 다가구주택, 근린생활시설"
                                        value={formData.main_purpose}
                                        onChange={(e) => setFormData({ ...formData, main_purpose: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="floor_count" className="text-xs">층수</Label>
                                        <Input
                                            id="floor_count"
                                            type="number"
                                            min={0}
                                            value={formData.floor_count}
                                            onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="total_unit_count" className="text-xs">총 세대수</Label>
                                        <Input
                                            id="total_unit_count"
                                            type="number"
                                            min={0}
                                            value={formData.total_unit_count}
                                            onChange={(e) => setFormData({ ...formData, total_unit_count: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'member' ? (
                        <div className="space-y-4">
                            {/* 소유주 검색 */}
                            <div className="space-y-2">
                                <Label className="text-xs">소유주 검색 (이름으로 검색)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="이름 입력"
                                        value={memberSearchQuery}
                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleMemberSearch}
                                        disabled={isSearching}
                                    >
                                        {isSearching ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* 검색 결과 */}
                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs">검색 결과</Label>
                                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                                        {searchResults.map((user) => (
                                            <button
                                                key={user.id}
                                                className={cn(
                                                    "w-full p-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer",
                                                    selectedMember?.id === user.id && "bg-primary/10"
                                                )}
                                                onClick={() => setSelectedMember({ id: user.id, name: user.name })}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium text-sm">{user.name}</span>
                                                    </div>
                                                    {user.resident_address && (
                                                        <span className="text-xs text-gray-500 ml-6">({user.resident_address})</span>
                                                    )}
                                                </div>
                                                {selectedMember?.id === user.id && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 선택된 소유주 */}
                            {selectedMember && (
                                <div className="p-3 bg-primary/5 rounded-lg flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">{selectedMember.name}</span>
                                        <span className="text-xs text-gray-500">을(를) 이 필지에 연결합니다.</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                        title="선택 취소"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'building-match' ? (
                        <div className="space-y-4">
                            {/* 현재 매칭 정보 */}
                            {currentMapping?.current_building && (
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">현재 매칭된 건물</span>
                                    </div>
                                    <p className="text-sm text-blue-700">
                                        {currentMapping.current_building.building_name || '(이름 없음)'} - {BUILDING_TYPE_LABELS[currentMapping.current_building.building_type] || currentMapping.current_building.building_type}
                                    </p>
                                </div>
                            )}

                            {/* 건물 검색 */}
                            <div className="space-y-2">
                                <Label className="text-xs">건물명으로 검색</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="건물명 입력 (2글자 이상)"
                                        value={buildingSearchKeyword}
                                        onChange={(e) => setBuildingSearchKeyword(e.target.value)}
                                    />
                                    {isBuildingSearching && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                                </div>
                            </div>

                            {/* 검색 결과 */}
                            {buildingSearchResults && buildingSearchResults.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs">검색 결과 (클릭하여 선택)</Label>
                                    <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                                        {buildingSearchResults.map((building) => (
                                            <button
                                                key={building.id}
                                                className={cn(
                                                    "w-full p-3 text-left hover:bg-gray-100 transition-colors cursor-pointer",
                                                    selectedBuilding?.id === building.id && "bg-primary/10"
                                                )}
                                                onClick={() => setSelectedBuilding(building)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium text-sm">
                                                            {building.building_name || '(이름 없음)'}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {BUILDING_TYPE_LABELS[building.building_type] || building.building_type}
                                                        </Badge>
                                                    </div>
                                                    {selectedBuilding?.id === building.id && (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 ml-6">
                                                    {building.dong_count > 0 ? `${building.dong_count}개동` : ''} {building.unit_count}개 호실
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 선택된 건물 */}
                            {selectedBuilding && (
                                <div className="p-3 bg-primary/5 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">{selectedBuilding.building_name || '(이름 없음)'}</span>
                                        <span className="text-xs text-gray-500">
                                            ({selectedBuilding.dong_count > 0 ? `${selectedBuilding.dong_count}개동, ` : ''}{selectedBuilding.unit_count}개 호실)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedBuilding(null)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                        title="선택 취소"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* 호실 목록 (Union: 이전+현재) */}
                            {(currentMapping?.previous_building_id || currentMapping?.building_id) && (
                                <div className="space-y-2 pt-3 border-t">
                                    <Label className="text-xs flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        호실 목록 {currentMapping?.previous_building_id && '(이전 건물 포함)'}
                                    </Label>
                                    {isLoadingUnits ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                        </div>
                                    ) : unitsUnion && unitsUnion.length > 0 ? (
                                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                                            {unitsUnion.map((unit) => (
                                                <div
                                                    key={unit.id}
                                                    className={cn(
                                                        "p-2 flex items-center justify-between text-sm",
                                                        unit.source === 'previous' && "bg-yellow-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Home className="w-4 h-4 text-gray-400" />
                                                        <span>
                                                            {unit.dong && `${unit.dong}동 `}
                                                            {unit.ho ? `${unit.ho}호` : '-'}
                                                        </span>
                                                        {unit.source === 'previous' && (
                                                            <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-500">
                                                                이전
                                                            </Badge>
                                                        )}
                                                        {unit.source === 'current' && (
                                                            <Badge variant="outline" className="text-xs text-blue-700 border-blue-500">
                                                                현재
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => setUnitToDelete(unit)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 py-2">호실 정보가 없습니다.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* 호실 삭제 확인 다이얼로그 */}
                <AlertDialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>호실을 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {unitToDelete && (
                                    <>
                                        {unitToDelete.dong && `${unitToDelete.dong}동 `}
                                        {unitToDelete.ho ? `${unitToDelete.ho}호` : '해당 호실'}을(를) 삭제합니다.
                                        <br />
                                        <span className="text-yellow-600">
                                            이 작업은 되돌릴 수 없으며, 해당 호실의 소유주 연결도 함께 해제됩니다.
                                        </span>
                                    </>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleteUnitMutation.isPending}>취소</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (unitToDelete) {
                                        deleteUnitMutation.mutate(
                                            { unitId: unitToDelete.id, pnu: parcel.pnu },
                                            {
                                                onSuccess: () => {
                                                    setUnitToDelete(null);
                                                    onSuccess();
                                                },
                                            }
                                        );
                                    }
                                }}
                                disabled={deleteUnitMutation.isPending}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                {deleteUnitMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        삭제 중...
                                    </>
                                ) : (
                                    '삭제'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <DialogFooter className="border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updateMutation.isPending || linkMemberMutation.isPending || updateMatchMutation.isPending}
                    >
                        취소
                    </Button>
                    {activeTab === 'info' ? (
                        <Button
                            onClick={() => updateMutation.mutate()}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                '저장'
                            )}
                        </Button>
                    ) : activeTab === 'member' ? (
                        <Button
                            onClick={() => linkMemberMutation.mutate()}
                            disabled={linkMemberMutation.isPending || !selectedMember}
                        >
                            {linkMemberMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    연결 중...
                                </>
                            ) : (
                                '소유주 연결'
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                if (selectedBuilding) {
                                    updateMatchMutation.mutate(
                                        { pnu: parcel.pnu, newBuildingId: selectedBuilding.id },
                                        {
                                            onSuccess: () => {
                                                setSelectedBuilding(null);
                                                onSuccess();
                                            },
                                        }
                                    );
                                }
                            }}
                            disabled={updateMatchMutation.isPending || !selectedBuilding}
                        >
                            {updateMatchMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                '건물 매칭 변경'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 소유 유형 한글 매핑
const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
    OWNER: '소유주',
    CO_OWNER: '공동소유',
    FAMILY: '소유주 가족',
};

// 소유주 목록 (소유주 정보)
function OwnersSection({ parcel }: { parcel: ParcelDetail }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                소유주 정보
            </h3>
            <div className="space-y-3">
                {parcel.building_units.map((unit) => (
                    <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* 호수 정보 헤더 */}
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                    {parcel.building_name && `${parcel.building_name} `}
                                    {/* 단독주택이 아닌 경우에만 동 표기 */}
                                    {unit.dong && parcel.building_type !== 'DETACHED_HOUSE' && `${unit.dong}동 `}
                                    {/* 호수가 있으면 호수 표기, 단독주택이면 '단독', 그 외엔 빈 값 */}
                                    {unit.ho ? `${unit.ho}호` : parcel.building_type === 'DETACHED_HOUSE' ? '단독' : '-'}
                                </span>
                            </div>
                            {unit.exclusive_area && (
                                <span className="text-xs text-gray-500">
                                    전용 {unit.exclusive_area}㎡
                                </span>
                            )}
                        </div>

                        {/* 소유주 목록 */}
                        <div className="divide-y divide-gray-100">
                            {unit.owners.map((owner) => (
                                <OwnerRow key={owner.id} owner={owner} parcel={parcel} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 소유주 행 - 이름(거주지), 동/호수, 소유유형, 지분율 표시
function OwnerRow({ owner, parcel }: { owner: Owner; parcel: ParcelDetail }) {
    const statusConfig = {
        AGREED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: '동의' },
        DISAGREED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '미동의' },
        PENDING: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', label: '미제출' }
    };

    const status = statusConfig[owner.consent_status || 'PENDING'];
    const StatusIcon = status.icon;

    // 동 표시 여부 (단독주택이 아닐 때만)
    const showDong = owner.property_unit_dong && parcel.building_type !== 'DETACHED_HOUSE';

    return (
        <div className="px-3 py-3 flex items-center gap-3 hover:bg-gray-50/50">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", status.bg)}>
                <StatusIcon className={cn("w-4 h-4", status.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-sm">
                        {owner.name}
                        {owner.resident_address && (
                            <span className="text-gray-500 font-normal"> ({owner.resident_address})</span>
                        )}
                    </span>
                    {/* 동 표기 (단독주택 아닐 경우) */}
                    {showDong && (
                        <Badge variant="outline" className="text-xs py-0">
                            {owner.property_unit_dong}동
                        </Badge>
                    )}
                    {owner.is_representative && (
                        <Badge variant="secondary" className="text-xs py-0">대표</Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    {/* 소유유형 */}
                    <span className="flex items-center gap-1">
                        <span className="text-gray-400">소유유형:</span>
                        <span className="font-medium">
                            {OWNERSHIP_TYPE_LABELS[owner.ownership_type || 'OWNER'] || '소유주'}
                        </span>
                    </span>
                    {/* 지분율 */}
                    {owner.share && (
                        <span className="flex items-center gap-1">
                            <span className="text-gray-400">지분율:</span>
                            <span className="font-medium">{owner.share}</span>
                        </span>
                    )}
                    {/* 연락처 */}
                    {owner.phone && (
                        <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {owner.phone}
                        </span>
                    )}
                </div>
            </div>
            <Badge 
                variant="outline" 
                className={cn("text-xs shrink-0", status.color)}
            >
                {status.label}
            </Badge>
        </div>
    );
}

// 로딩 스켈레톤
function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full rounded-lg" />
            </div>
        </div>
    );
}
