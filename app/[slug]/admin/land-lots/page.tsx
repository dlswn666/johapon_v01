'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
    Upload, 
    Download, 
    Search, 
    Trash2, 
    CheckCircle2, 
    Loader2, 
    ChevronLeft, 
    ChevronRight,
    Info
} from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generatePNU } from '@/app/_lib/shared/utils/pnu-utils';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface LandLot {
    id: string;
    union_id: string;
    pnu: string;
    address_text: string | null;
    land_area: number | null;
    created_at: string;
}

export default function LandLotManagementPage() {
    const { union } = useSlug();
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const unionId = union?.id;

    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // 업로드 상태
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState<{
        total: number;
        success: number;
        failed: number;
    } | null>(null);

    // 지번 목록 조회
    const { data: landLotsData, isLoading: isLotsLoading } = useQuery({
        queryKey: ['union-land-lots', unionId, searchQuery, page],
        queryFn: async () => {
            if (!unionId) return { lots: [], total: 0 };
            
            let query = supabase
                .from('union_land_lots')
                .select('*', { count: 'exact' })
                .eq('union_id', unionId)
                .order('created_at', { ascending: false });

            if (searchQuery) {
                query = query.or(`address_text.ilike.%${searchQuery}%,pnu.ilike.%${searchQuery}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            return { lots: data as LandLot[], total: count || 0 };
        },
        enabled: !!unionId,
    });

    const totalPages = Math.ceil((landLotsData?.total || 0) / pageSize);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = () => {
        const template = [
            ['주소(전체)', '법정동코드(10자리)', '본번', '부번', '산여부(Y/N)', '면적(㎡)'],
            ['서울특별시 강북구 미아동 791-2882', '1130510300', '791', '2882', 'N', '125.5'],
            ['서울특별시 강북구 미아동 산 1-1', '1130510300', '1', '1', 'Y', '500'],
        ];
        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '지번업로드양식');
        XLSX.writeFile(wb, 'land_lots_template.xlsx');
    };

    // 엑셀 파일 업로드 처리
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !unionId) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | boolean)[][];

            // 헤더 제외 데이터 (첫 번째 줄은 헤더)
            const rows = jsonData.slice(1);
            if (rows.length === 0) {
                toast.error('업로드할 데이터가 없습니다.');
                setIsUploading(false);
                return;
            }

            const BATCH_SIZE = 100;
            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const upsertData = batch.map(row => {
                    const [address, bcode, main, sub, mountain, area] = row;
                    
                    // PNU 생성
                    const pnu = generatePNU({
                        b_code: String(bcode || '').trim(),
                        main_address_no: String(main || '').trim(),
                        sub_address_no: String(sub || '0').trim(),
                        mountain_yn: mountain === 'Y' ? 'Y' : 'N'
                    });

                    if (!pnu) {
                        failedCount++;
                        return null;
                    }

                    return {
                        union_id: unionId,
                        pnu,
                        address_text: String(address || ''),
                        land_area: area ? parseFloat(String(area)) : null,
                    };
                }).filter(Boolean);

                if (upsertData.length > 0) {
                    const { error } = await supabase
                        .from('union_land_lots')
                        .upsert(upsertData, { onConflict: 'union_id,pnu' });

                    if (error) {
                        console.error('Batch upsert error:', error);
                        failedCount += upsertData.length;
                    } else {
                        successCount += upsertData.length;
                    }
                }

                setUploadProgress(Math.round(((i + batch.length) / rows.length) * 100));
            }

            setUploadResult({
                total: rows.length,
                success: successCount,
                failed: failedCount
            });
            queryClient.invalidateQueries({ queryKey: ['union-land-lots', unionId] });
            toast.success('업로드가 완료되었습니다.');

        } catch (error) {
            console.error('File upload error:', error);
            toast.error('파일 처리 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; // input 초기화
        }
    };

    // 단일 항목 삭제
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('union_land_lots').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['union-land-lots', unionId] });
            toast.success('삭제되었습니다.');
        }
    });

    // 전체 삭제 (현재 조합의 데이터만)
    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            if (!confirm('정말로 이 조합의 모든 지번 데이터를 삭제하시겠습니까?')) return;
            const { error } = await supabase.from('union_land_lots').delete().eq('union_id', unionId!);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['union-land-lots', unionId] });
            toast.success('모든 데이터가 삭제되었습니다.');
        }
    });

    // 권한 체크
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-500">접근 권한이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">지번 관리</h1>
                    <p className="text-gray-500">구역 내 지번 목록을 업로드하고 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        템플릿 다운로드
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] transition-colors text-sm font-medium cursor-pointer">
                        <Upload className="w-4 h-4" />
                        엑셀 업로드
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </div>

            {/* 업로드 상태 표시 */}
            {isUploading && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#4E8C6D]" />
                            <span className="font-semibold">데이터를 업로드 중입니다...</span>
                        </div>
                        <span className="text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-[#4E8C6D] h-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 업로드 결과 표시 */}
            {uploadResult && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-full">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">업로드 완료</h3>
                            <p className="text-sm text-gray-500">
                                총 {uploadResult.total}건 중 {uploadResult.success}건 성공, {uploadResult.failed}건 실패
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setUploadResult(null)}
                        className="text-sm text-gray-400 hover:text-gray-600 underline"
                    >
                        닫기
                    </button>
                </div>
            )}

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">업로드 시 주의사항</p>
                    <ul className="list-disc list-inside space-y-0.5 opacity-90">
                        <li>법정동코드는 10자리 숫자로 입력해야 합니다.</li>
                        <li>본번/부번은 숫자만 입력 가능하며, 부번이 없을 경우 0으로 처리됩니다.</li>
                        <li>산여부는 &apos;Y&apos; 또는 &apos;N&apos;으로 입력해주세요.</li>
                        <li>이미 존재하는 지번(PNU)은 새로 업로드된 정보로 갱신됩니다.</li>
                    </ul>
                </div>
            </div>

            {/* 필터 및 목록 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="주소 또는 PNU 검색"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => deleteAllMutation.mutate()}
                            disabled={!landLotsData || landLotsData.total === 0}
                            className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            전체 삭제
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">주소</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PNU (고유번호)</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">면적 (㎡)</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">등록일</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[14px]">
                            {isLotsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : landLotsData?.lots.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        등록된 지번 데이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                landLotsData?.lots.map((lot) => (
                                    <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{lot.address_text || '-'}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{lot.pnu}</td>
                                        <td className="px-6 py-4 text-gray-900 text-right">{lot.land_area?.toLocaleString() || '-'}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(lot.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => {
                                                    if(confirm('이 지번 데이터를 삭제하시겠습니까?')) {
                                                        deleteMutation.mutate(lot.id);
                                                    }
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-sm text-gray-500">
                            총 <strong>{landLotsData?.total}</strong>개 항목 중 {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, landLotsData?.total || 0)} 표시
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                    const pageNum = i + 1; // 간단히 1~5페이지만 표시
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                                page === pageNum ? "bg-[#4E8C6D] text-white" : "hover:bg-white text-gray-600 border border-transparent hover:border-gray-200"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
