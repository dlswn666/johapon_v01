'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
// Alert 컴포넌트는 일단 주석 처리

interface UserExcelUploadProps {
    slug?: string;
    onUploadSuccess?: (result: { inserted: number }) => void;
    onUploadError?: (error: string) => void;
    loading?: boolean;
}

const UserExcelUpload: React.FC<UserExcelUploadProps> = ({ slug, onUploadSuccess, onUploadError, loading = false }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // 파일 형식 검증
            const allowedExtensions = ['.xlsx', '.xls', '.csv'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

            if (!allowedExtensions.includes(fileExtension)) {
                setUploadResult('❌ 지원하지 않는 파일 형식입니다. (.xlsx, .xls, .csv 파일만 가능)');
                onUploadError?.('지원하지 않는 파일 형식입니다.');
                return;
            }

            setSelectedFile(file);
            setUploadResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadResult('❌ 파일을 선택해주세요.');
            return;
        }

        setIsUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const apiUrl = slug ? `/api/tenant/${slug}/users/bulk-upload` : '/api/admin/users/bulk-upload';
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const message = `✅ 성공적으로 ${result.data.inserted}명의 사용자를 등록했습니다.`;
                setUploadResult(message);
                onUploadSuccess?.(result.data);

                // 파일 입력 초기화
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                throw new Error(result.message || '업로드에 실패했습니다.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
            setUploadResult(`❌ ${errorMessage}`);
            onUploadError?.(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = () => {
        // 엑셀 템플릿 다운로드 (예시 데이터)
        const templateData = [
            ['user_id', 'name', 'address', 'phone', 'role'],
            ['user001', '김철수', '서울시 강남구 테헤란로 123', '010-1234-5678', 'member'],
            ['user002', '이영희', '서울시 서초구 강남대로 456', '010-2345-6789', 'admin'],
            ['user003', '박민수', '부산시 해운대구 해운대로 789', '010-3456-7890', 'member'],
        ];

        const csv = templateData.map((row) => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM 추가로 한글 깨짐 방지
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'user_upload_template.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">사용자 일괄 등록</h3>
                <Button variant="outline" onClick={downloadTemplate}>
                    템플릿 다운로드
                </Button>
            </div>

            <div className="space-y-2">
                <Label htmlFor="excel-file">엑셀/CSV 파일 업로드</Label>
                <Input
                    id="excel-file"
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={isUploading || loading}
                />
                <p className="text-sm text-muted-foreground">
                    지원 형식: .xlsx, .xls, .csv
                    <br />
                    필수 컬럼: user_id, name
                    <br />
                    선택 컬럼: address, phone, role (기본값: member)
                </p>
            </div>

            {selectedFile && (
                <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">
                        <strong>선택된 파일:</strong> {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">크기: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
            )}

            <Button onClick={handleUpload} disabled={!selectedFile || isUploading || loading} className="w-full">
                {isUploading ? '업로드 중...' : '업로드'}
            </Button>

            {uploadResult && (
                <div className="p-3 rounded-md bg-muted">
                    <p className="text-sm">{uploadResult}</p>
                </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
                <p>
                    <strong>업로드 주의사항:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                    <li>첫 번째 행은 헤더로 사용됩니다.</li>
                    <li>user_id는 중복될 수 없습니다.</li>
                    <li>role은 member, admin, systemadmin 중 하나여야 합니다.</li>
                    <li>빈 값이 있는 행은 무시됩니다.</li>
                </ul>
            </div>
        </div>
    );
};

export default UserExcelUpload;
