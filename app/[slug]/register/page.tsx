'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { User, NewUser, AuthProvider } from '@/app/_lib/shared/type/database.types';
import { MapPin, Phone, Calendar, UserIcon, Building2, AlertCircle } from 'lucide-react';

/**
 * 회원가입 프로필 입력 페이지
 * OAuth 인증 후 추가 정보 입력을 위한 폼
 */
export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { slug } = useSlug();
    const { authUser, refreshUser } = useAuth();

    // URL 파라미터에서 정보 추출
    const authUserId = searchParams.get('auth_user_id') || authUser?.id;
    const provider = (searchParams.get('provider') as AuthProvider) || 'kakao';
    const prefillName = searchParams.get('name') || '';
    const prefillPhone = searchParams.get('phone') || '';

    // 폼 상태
    const [formData, setFormData] = useState({
        name: prefillName,
        phone_number: prefillPhone,
        birth_date: '',
        property_address: '',
        property_address_detail: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [existingUser, setExistingUser] = useState<User | null>(null);
    const [existingProvider, setExistingProvider] = useState<string>('');

    // 기존 사용자 정보 로드 (재신청 시)
    useEffect(() => {
        const loadExistingUserData = async () => {
            if (!authUserId) return;

            // user_auth_links에서 연결된 사용자 조회
            const { data: authLink } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', authUserId)
                .single();

            if (authLink) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authLink.user_id)
                    .single();

                if (userData) {
                    // 기존 데이터로 폼 프리필
                    setFormData({
                        name: userData.name || '',
                        phone_number: userData.phone_number || '',
                        birth_date: userData.birth_date || '',
                        property_address: userData.property_address || '',
                        property_address_detail: userData.property_address_detail || '',
                    });
                }
            }
        };

        loadExistingUserData();
    }, [authUserId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    /**
     * 중복 사용자 확인
     * phone_number + name + property_address 조합으로 체크
     */
    const checkDuplicateUser = async (): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', formData.phone_number)
            .eq('name', formData.name)
            .eq('property_address', formData.property_address)
            .single();

        if (error || !data) return null;
        return data as User;
    };

    /**
     * 기존 사용자에 새 소셜 계정 연결
     */
    const linkExistingUser = async () => {
        if (!existingUser || !authUserId) return;

        setIsLoading(true);
        setError('');

        try {
            // user_auth_links에 새 연결 추가
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                user_id: existingUser.id,
                auth_user_id: authUserId,
                provider,
            });

            if (linkError) {
                throw linkError;
            }

            // 사용자 정보 새로고침 및 리다이렉트
            await refreshUser();
            setShowDuplicateModal(false);

            // 사용자 상태에 따라 리다이렉트
            if (existingUser.user_status === 'APPROVED') {
                router.push(`/${slug}`);
            } else if (existingUser.user_status === 'PENDING_APPROVAL') {
                router.push(`/${slug}?status=pending`);
            } else if (existingUser.user_status === 'REJECTED') {
                router.push(`/${slug}?status=rejected`);
            }
        } catch (err) {
            console.error('Link user error:', err);
            setError('계정 연결 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 폼 제출 핸들러
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 필수 필드 검증
            if (!formData.name || !formData.phone_number || !formData.property_address) {
                setError('이름, 휴대폰 번호, 물건지 주소는 필수 입력 항목입니다.');
                setIsLoading(false);
                return;
            }

            if (!authUserId) {
                setError('인증 정보가 없습니다. 다시 로그인해주세요.');
                setIsLoading(false);
                return;
            }

            // 중복 사용자 확인
            const duplicate = await checkDuplicateUser();
            if (duplicate) {
                // 기존 연결 확인
                const { data: existingLink } = await supabase
                    .from('user_auth_links')
                    .select('provider')
                    .eq('user_id', duplicate.id)
                    .single();

                if (existingLink) {
                    setExistingUser(duplicate);
                    setExistingProvider(existingLink.provider);
                    setShowDuplicateModal(true);
                    setIsLoading(false);
                    return;
                }
            }

            // Union ID 조회
            let unionId = null;
            if (slug) {
                const { data: unionData } = await supabase
                    .from('unions')
                    .select('id')
                    .eq('slug', slug)
                    .single();
                unionId = unionData?.id || null;
            }

            // 새 사용자 생성
            const newUserId = `user_${Date.now()}`;
            const newUser: NewUser = {
                id: newUserId,
                name: formData.name,
                email: `${newUserId}@placeholder.com`, // OAuth에서 이메일을 받지 않으므로 placeholder
                phone_number: formData.phone_number,
                role: 'APPLICANT',
                union_id: unionId,
                user_status: 'PENDING_APPROVAL',
                birth_date: formData.birth_date || null,
                property_address: formData.property_address,
                property_address_detail: formData.property_address_detail || null,
            };

            const { error: userError } = await supabase.from('users').insert(newUser);

            if (userError) {
                throw userError;
            }

            // user_auth_links에 연결 추가
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                user_id: newUserId,
                auth_user_id: authUserId,
                provider,
            });

            if (linkError) {
                // 사용자 생성 롤백
                await supabase.from('users').delete().eq('id', newUserId);
                throw linkError;
            }

            // 성공 - 승인 대기 페이지로 이동
            await refreshUser();
            router.push(`/${slug}?status=pending`);
        } catch (err) {
            console.error('Registration error:', err);
            setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    // 인증 정보가 없으면 로그인 페이지로
    if (!authUserId && !authUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        인증 정보가 필요합니다
                    </h2>
                    <p className="text-gray-600 mb-6">
                        먼저 카카오 또는 네이버로 로그인해주세요.
                    </p>
                    <button
                        onClick={() => router.push(`/${slug}`)}
                        className="px-6 py-2 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] transition-colors"
                    >
                        로그인 페이지로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-[#4E8C6D] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">조합원 등록</h1>
                    <p className="text-gray-600">
                        조합원 인증을 위한 정보를 입력해주세요
                    </p>
                </div>

                {/* 폼 */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* 이름 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                이름 (소유자명) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="실명을 입력해주세요"
                                    required
                                    className={cn(
                                        'w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300',
                                        'text-base placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                    )}
                                />
                            </div>
                        </div>

                        {/* 휴대폰 번호 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                휴대폰 번호 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="010-0000-0000"
                                    required
                                    className={cn(
                                        'w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300',
                                        'text-base placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                    )}
                                />
                            </div>
                        </div>

                        {/* 생년월일 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                생년월일
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    name="birth_date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    className={cn(
                                        'w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300',
                                        'text-base placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                    )}
                                />
                            </div>
                        </div>

                        {/* 물건지 주소 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                물건지 주소 (권리소재지) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="property_address"
                                    value={formData.property_address}
                                    onChange={handleChange}
                                    placeholder="예: 서울특별시 강남구 테헤란로 123"
                                    required
                                    className={cn(
                                        'w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300',
                                        'text-base placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                    )}
                                />
                            </div>
                        </div>

                        {/* 상세 주소 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                상세 주소
                            </label>
                            <input
                                type="text"
                                name="property_address_detail"
                                value={formData.property_address_detail}
                                onChange={handleChange}
                                placeholder="동/호수를 입력해주세요"
                                className={cn(
                                    'w-full h-12 px-4 rounded-lg border border-gray-300',
                                    'text-base placeholder:text-gray-400',
                                    'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                )}
                            />
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* 안내 문구 */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                                <strong>안내:</strong> 입력하신 정보는 관리자의 조합원 명부 확인 후
                                승인됩니다. 승인이 완료되면 알림을 보내드립니다.
                            </p>
                        </div>

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                'w-full h-12 rounded-lg font-medium text-white',
                                'bg-[#4E8C6D] hover:bg-[#3d7058]',
                                'transition-colors',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            {isLoading ? '처리 중...' : '조합원 등록 신청'}
                        </button>
                    </form>
                </div>
            </div>

            {/* 중복 사용자 모달 */}
            {showDuplicateModal && existingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            기존 계정이 있습니다
                        </h3>
                        <p className="text-gray-600 mb-4">
                            입력하신 정보와 일치하는 계정이 이미 있습니다.
                            <br />
                            <strong className="text-gray-900">
                                {existingProvider === 'kakao' ? '카카오' : '네이버'}
                            </strong>
                            로 가입하셨네요!
                        </p>
                        <p className="text-gray-600 mb-6">
                            현재 {provider === 'kakao' ? '카카오' : '네이버'} 계정도 연결하시겠습니까?
                            <br />
                            연결하시면 두 계정 모두로 로그인할 수 있습니다.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="flex-1 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={linkExistingUser}
                                disabled={isLoading}
                                className="flex-1 h-10 rounded-lg bg-[#4E8C6D] text-white hover:bg-[#3d7058] transition-colors disabled:opacity-50"
                            >
                                {isLoading ? '연결 중...' : '계정 연결하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

