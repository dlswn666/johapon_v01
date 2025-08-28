'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Upload, Save, X, Building2, Phone, Mail, Globe, MapPin, Search, ArrowLeft, User, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AddressSearchModal from '@/components/AddressSearchModal';

interface UploadedLogo {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
}

export default function NewHomepageFormPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        associationName: '',
        address: '',
        phoneNumber: '',
        email: '',
        url: '', // 영문자만 받는 URL
        unionChairman: '', // 조합장 이름
        area: '', // 조합 총 면적
        unionMembers: '', // 조합원 총 수
    });

    const [uploadedLogo, setUploadedLogo] = useState<UploadedLogo | null>(null);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);

    // 컴포넌트 언마운트 시 메모리 정리
    useEffect(() => {
        return () => {
            if (uploadedLogo?.url) {
                URL.revokeObjectURL(uploadedLogo.url);
            }
        };
    }, [uploadedLogo?.url]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleUrlChange = (value: string) => {
        // 영문자, 숫자, 하이픈만 허용
        const filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
        handleInputChange('url', filteredValue);
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        // 파일 크기 확인 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            return;
        }

        const logoData: UploadedLogo = {
            id: `logo-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
        };

        setUploadedLogo(logoData);

        // Reset input
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const removeLogo = () => {
        if (uploadedLogo?.url) {
            URL.revokeObjectURL(uploadedLogo.url);
        }
        setUploadedLogo(null);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleAddressSearch = () => {
        setShowAddressModal(true);
    };

    const handleAddressSelect = (address: string) => {
        handleInputChange('address', address);
    };

    const validateForm = () => {
        if (!formData.associationName.trim()) {
            alert('조합 이름을 입력해 주세요.');
            return false;
        }
        if (!formData.address.trim()) {
            alert('조합 주소를 입력해 주세요.');
            return false;
        }
        if (!formData.phoneNumber.trim()) {
            alert('조합 전화번호를 입력해 주세요.');
            return false;
        }
        if (!formData.email.trim()) {
            alert('조합 이메일을 입력해 주세요.');
            return false;
        }
        if (!formData.url.trim()) {
            alert('테넌트 URL을 입력해 주세요.');
            return false;
        }
        if (!formData.unionChairman.trim()) {
            alert('조합장 이름을 입력해 주세요.');
            return false;
        }
        if (!formData.area.trim()) {
            alert('조합 총 면적을 입력해 주세요.');
            return false;
        }
        if (!formData.unionMembers.trim()) {
            alert('조합원 총 수를 입력해 주세요.');
            return false;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('올바른 이메일 형식을 입력해 주세요.');
            return false;
        }

        // 전화번호 형식 검증 (간단한 검증)
        const phoneRegex = /^[0-9-+\s()]+$/;
        if (!phoneRegex.test(formData.phoneNumber)) {
            alert('올바른 전화번호 형식을 입력해 주세요.');
            return false;
        }

        // 면적 숫자 검증
        const areaNumber = parseInt(formData.area);
        if (isNaN(areaNumber) || areaNumber <= 0) {
            alert('조합 총 면적은 0보다 큰 숫자를 입력해 주세요.');
            return false;
        }

        // 조합원 수 숫자 검증
        const membersNumber = parseInt(formData.unionMembers);
        if (isNaN(membersNumber) || membersNumber <= 0) {
            alert('조합원 총 수는 0보다 큰 숫자를 입력해 주세요.');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const homepageData = {
                associationName: formData.associationName,
                address: formData.address,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                url: `https://johapon.co.kr/${formData.url}`,
                logoFile: uploadedLogo?.url, // 실제로는 파일 업로드 서비스를 통해 처리
                unionChairman: formData.unionChairman,
                area: parseInt(formData.area),
                unionMembers: parseInt(formData.unionMembers),
            };

            const response = await fetch('/api/admin/homepage-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(homepageData),
            });

            if (response.ok) {
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    console.error('JSON 파싱 오류:', jsonError);
                    alert('서버 응답 처리 중 오류가 발생했습니다.');
                    return;
                }
                alert('새 홈페이지가 성공적으로 등록되었습니다.');
                // 성공 시 업로드된 로고 URL 정리
                if (uploadedLogo?.url) {
                    URL.revokeObjectURL(uploadedLogo.url);
                }
                router.push('../');
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.error('에러 응답 JSON 파싱 오류:', jsonError);
                    alert(`홈페이지 등록에 실패했습니다. (HTTP ${response.status})`);
                    return;
                }
                alert(errorData.error || '홈페이지 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Save error:', error);
            // 안전한 오류 메시지 처리
            let errorMessage = '서버 오류가 발생했습니다.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleExit = () => {
        const hasContent =
            formData.associationName.trim() ||
            formData.address.trim() ||
            formData.phoneNumber.trim() ||
            formData.email.trim() ||
            formData.url.trim() ||
            formData.unionChairman.trim() ||
            formData.area.trim() ||
            formData.unionMembers.trim() ||
            uploadedLogo;

        if (hasContent) {
            setShowExitDialog(true);
        } else {
            router.push('/homepage-management');
        }
    };

    const confirmExit = () => {
        setShowExitDialog(false);
        // 업로드된 로고 URL 정리
        if (uploadedLogo?.url) {
            URL.revokeObjectURL(uploadedLogo.url);
        }
        router.push('/homepage-management');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center space-x-4">
                        <Link href="../">
                            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                                <ArrowLeft className="h-4 w-4" />
                                <span>목록으로</span>
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">새 홈페이지 등록</h1>
                            <p className="text-gray-600 mt-1">
                                새로운 재개발조합 홈페이지를 등록해 주세요. 모든 정보를 정확히 입력해 주세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Building2 className="h-5 w-5" />
                                <span>조합 정보 등록</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Association Name */}
                                <div className="md:col-span-2">
                                    <Label htmlFor="associationName">조합 이름 *</Label>
                                    <Input
                                        id="associationName"
                                        value={formData.associationName}
                                        onChange={(e) => handleInputChange('associationName', e.target.value)}
                                        placeholder="재개발조합 이름을 입력하세요"
                                        className="mt-2"
                                    />
                                </div>

                                {/* Logo Upload */}
                                <div className="md:col-span-2">
                                    <Label>조합 로고 업로드</Label>
                                    <div className="mt-2 space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => logoInputRef.current?.click()}
                                                className="flex items-center space-x-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                <span>로고 선택</span>
                                            </Button>
                                            <span className="text-sm text-gray-500">JPG, PNG 형식, 최대 5MB</span>
                                        </div>

                                        {/* Uploaded Logo Preview */}
                                        {uploadedLogo && (
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                <div className="flex items-center space-x-3">
                                                    <Image
                                                        src={uploadedLogo.url}
                                                        alt="로고 미리보기"
                                                        width={64}
                                                        height={64}
                                                        className="object-contain rounded-lg border border-gray-200"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {uploadedLogo.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatFileSize(uploadedLogo.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={removeLogo}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address with Search */}
                                <div className="md:col-span-2">
                                    <Label htmlFor="address">조합 주소 *</Label>
                                    <div className="mt-2 space-y-2">
                                        <div className="flex space-x-2">
                                            <Input
                                                id="address"
                                                value={formData.address}
                                                onChange={(e) => handleInputChange('address', e.target.value)}
                                                placeholder="조합 주소를 입력하세요"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddressSearch}
                                                className="flex items-center space-x-2"
                                            >
                                                <Search className="h-4 w-4" />
                                                <span>주소 찾기</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <Label htmlFor="phoneNumber">조합 전화번호 *</Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <Input
                                            id="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                            placeholder="02-1234-5678"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <Label htmlFor="email">조합 이메일 *</Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="association@example.com"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>

                                {/* URL */}
                                <div className="md:col-span-2">
                                    <Label htmlFor="url">테넌트 URL *</Label>
                                    <div className="mt-2">
                                        <div className="flex items-center">
                                            <div className="flex items-center space-x-1 bg-gray-100 border border-r-0 rounded-l-md px-3 py-2">
                                                <Globe className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">https://johapon.co.kr/</span>
                                            </div>
                                            <Input
                                                id="url"
                                                value={formData.url}
                                                onChange={(e) => handleUrlChange(e.target.value)}
                                                placeholder="tenant-name"
                                                className="rounded-r-md border-l-0 flex-1"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            영문자, 숫자, 하이픈(-)만 사용 가능합니다. (예: gangnam-tower)
                                        </p>
                                        {formData.url && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                                <p className="text-sm text-blue-700">
                                                    <strong>완성된 URL:</strong> https://johapon.co.kr/{formData.url}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Union Chairman */}
                                <div>
                                    <Label htmlFor="unionChairman">조합장 이름 *</Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <Input
                                            id="unionChairman"
                                            value={formData.unionChairman}
                                            onChange={(e) => handleInputChange('unionChairman', e.target.value)}
                                            placeholder="조합장 성함을 입력하세요"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>

                                {/* Area */}
                                <div>
                                    <Label htmlFor="area">조합 총 면적 *</Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <Home className="h-4 w-4 text-gray-400" />
                                        <Input
                                            id="area"
                                            type="number"
                                            value={formData.area}
                                            onChange={(e) => handleInputChange('area', e.target.value)}
                                            placeholder="면적 (㎡)"
                                            className="flex-1"
                                        />
                                        <span className="text-sm text-gray-500">㎡</span>
                                    </div>
                                </div>

                                {/* Union Members */}
                                <div className="md:col-span-2">
                                    <Label htmlFor="unionMembers">조합원 총 수 *</Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <Input
                                            id="unionMembers"
                                            type="number"
                                            value={formData.unionMembers}
                                            onChange={(e) => handleInputChange('unionMembers', e.target.value)}
                                            placeholder="조합원 수를 입력하세요"
                                            className="flex-1"
                                        />
                                        <span className="text-sm text-gray-500">명</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4">
                        <Button variant="outline" onClick={handleExit}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {loading ? '등록 중...' : '홈페이지 등록'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Exit Confirmation Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>페이지를 나가시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            작성 중인 내용이 모두 사라집니다. 정말로 나가시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowExitDialog(false)}>계속 작성하기</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExit} className="bg-red-600 hover:bg-red-700">
                            나가기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Address Search Modal */}
            <AddressSearchModal
                isOpen={showAddressModal}
                onClose={() => setShowAddressModal(false)}
                onSelect={handleAddressSelect}
            />
        </div>
    );
}
