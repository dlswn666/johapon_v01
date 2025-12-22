'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Users,
    UserPlus,
    Copy,
    Check,
    Trash2,
    Clock,
    Mail,
    Phone,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import {
    useAdminInvites,
    useCreateAdminInvite,
    useDeleteAdminInvite,
    useUnionAdmins,
    useRevokeAdmin,
    useGenerateInviteLink,
} from '@/app/_lib/features/admin-invite/api/useAdminInviteHook';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';

export default function UnionAdminsPage() {
    const router = useRouter();
    const params = useParams();
    const unionId = params.id as string;
    const { user } = useAuth();

    const { data: union, isLoading: unionLoading } = useUnion(unionId);
    const { data: invites, isLoading: invitesLoading } = useAdminInvites(unionId);
    const { data: admins, isLoading: adminsLoading } = useUnionAdmins(unionId);
    const createInviteMutation = useCreateAdminInvite();
    const deleteInviteMutation = useDeleteAdminInvite();
    const revokeAdminMutation = useRevokeAdmin();
    const generateLink = useGenerateInviteLink();

    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        email: '',
    });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        try {
            const result = await createInviteMutation.mutateAsync({
                unionId,
                name: formData.name,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                createdBy: user.id,
            });

            const link = generateLink(result.invite_token);
            await navigator.clipboard.writeText(link);

            // 알림톡 발송 (통합 함수 사용)
            const expiresDate = new Date(result.expires_at);
            const alimtalkResult = await sendAlimTalk({
                unionId,
                templateCode: 'UE_1877', // 관리자 초대 템플릿
                recipients: [
                    {
                        phoneNumber: formData.phoneNumber,
                        name: formData.name,
                        variables: {
                            조합명: union?.name || '',
                            관리자명: formData.name,
                            만료시간: expiresDate.toLocaleString('ko-KR'),
                            도메인: window.location.host,
                            초대토큰: result.invite_token,
                        },
                    },
                ],
            });

            if (alimtalkResult.success) {
                toast.success('초대 링크가 생성되고 알림톡이 발송되었습니다.');
            } else {
                toast.success('초대 링크가 생성되었습니다. (알림톡 발송 실패)');
                console.error('알림톡 발송 실패:', alimtalkResult.error);
            }

            setFormData({ name: '', phoneNumber: '', email: '' });
        } catch (error) {
            console.error('Create invite error:', error);
            toast.error('초대 생성에 실패했습니다.');
        }
    };

    const handleCopyLink = async (token: string) => {
        const link = generateLink(token);
        await navigator.clipboard.writeText(link);
        setCopiedToken(token);
        toast.success('초대 링크가 복사되었습니다.');
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleDeleteInvite = async () => {
        if (!deleteTarget) return;

        try {
            await deleteInviteMutation.mutateAsync({
                inviteId: deleteTarget.id,
                unionId,
            });
            toast.success('초대가 취소되었습니다.');
            setDeleteTarget(null);
        } catch {
            toast.error('초대 취소에 실패했습니다.');
        }
    };

    const handleRevokeAdmin = async () => {
        if (!revokeTarget) return;

        try {
            await revokeAdminMutation.mutateAsync({
                userId: revokeTarget.id,
                unionId,
            });
            toast.success('관리자 권한이 해제되었습니다.');
            setRevokeTarget(null);
        } catch {
            toast.error('권한 해제에 실패했습니다.');
        }
    };

    const getStatusBadge = (status: string, expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);

        if (status === 'USED') {
            return (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    사용됨
                </span>
            );
        }
        if (status === 'EXPIRED' || now > expires) {
            return (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">만료됨</span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">대기중</span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isLoading = unionLoading || invitesLoading || adminsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!union) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-lg text-slate-400 mb-4">조합을 찾을 수 없습니다</p>
                <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
                    뒤로 가기
                </Button>
            </div>
        );
    }

    const pendingInvites =
        invites?.filter((inv) => {
            const now = new Date();
            const expires = new Date(inv.expires_at);
            return inv.status === 'PENDING' && now <= expires;
        }) || [];

    return (
        <div className="space-y-8">
            {/* 페이지 헤더 */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white">관리자 관리</h1>
                    <p className="mt-1 text-slate-400">{union.name} 조합의 관리자를 초대하고 관리합니다</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 초대 폼 */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">관리자 초대</CardTitle>
                                <CardDescription className="text-slate-400">
                                    초대 링크를 생성하여 전달하세요
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateInvite} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">
                                    이름 <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="관리자 이름"
                                    required
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber" className="text-slate-300">
                                    전화번호 <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="010-1234-5678"
                                    required
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">
                                    이메일 <span className="text-slate-500 text-xs">(선택)</span>
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@example.com"
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                            <ActionButton
                                type="submit"
                                isLoading={createInviteMutation.isPending}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                초대 링크 생성
                            </ActionButton>
                            <p className="text-xs text-slate-500 text-center">초대 링크는 24시간 동안 유효합니다</p>
                        </form>
                    </CardContent>
                </Card>

                {/* 현재 관리자 목록 */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">현재 관리자</CardTitle>
                                <CardDescription className="text-slate-400">
                                    {admins?.length || 0}명의 관리자
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {admins?.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">등록된 관리자가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {admins?.map((admin) => (
                                    <div
                                        key={admin.id}
                                        className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                <Users className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{admin.name}</p>
                                                <p className="text-sm text-slate-400">{admin.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setRevokeTarget({ id: admin.id, name: admin.name })}
                                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 대기 중인 초대 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">대기 중인 초대</CardTitle>
                            <CardDescription className="text-slate-400">
                                {pendingInvites.length}개의 초대가 대기 중입니다
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {invites?.length === 0 ? (
                        <div className="text-center py-8">
                            <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">발송된 초대가 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invites?.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-white">{invite.name}</p>
                                                {getStatusBadge(invite.status, invite.expires_at)}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                                {invite.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {invite.email}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {invite.phone_number}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                생성: {formatDate(invite.created_at)} / 만료:{' '}
                                                {formatDate(invite.expires_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {invite.status === 'PENDING' && new Date() <= new Date(invite.expires_at) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopyLink(invite.invite_token)}
                                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                                            >
                                                {copiedToken === invite.invite_token ? (
                                                    <Check className="w-4 h-4 mr-1 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4 mr-1" />
                                                )}
                                                복사
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteTarget({ id: invite.id, name: invite.name })}
                                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 초대 삭제 확인 다이얼로그 */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">초대 취소</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            <span className="text-red-400 font-semibold">&quot;{deleteTarget?.name}&quot;</span> 님의
                            초대를 취소하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteInvite}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            확인
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 관리자 권한 해제 확인 다이얼로그 */}
            <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">관리자 권한 해제</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            <span className="text-red-400 font-semibold">&quot;{revokeTarget?.name}&quot;</span> 님의
                            관리자 권한을 해제하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRevokeAdmin}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            확인
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
