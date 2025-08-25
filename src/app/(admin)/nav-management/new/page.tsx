'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Input } from '@/shared/ui/input';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import {
    Save,
    ArrowLeft,
    Building2,
    Menu,
    Shield,
    Settings,
    ChevronRight,
    ChevronDown,
    Eye,
    Edit2,
    AlertTriangle,
    GripVertical,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Union {
    id: string;
    name: string;
    homepage: string;
}

interface Role {
    id: string;
    key: string;
    name: string;
}

interface MenuItem {
    id: string;
    key: string;
    label_default: string;
    path: string;
    depth: number;
    parent_id: string | null;
    display_order: number;
    is_admin_area: boolean;
    children?: MenuItem[];
}

interface MenuPermission {
    menuItemId: string;
    roleId: string;
    canView: boolean;
}

interface UnionMenuConfig {
    menuItemId: string;
    enabled: boolean;
    customLabel: string;
    displayOrder: number;
}

interface ExpandedMenus {
    [key: string]: boolean;
}

// 메뉴 계층구조 빌드 함수
const buildMenuHierarchy = (menuItems: MenuItem[]): MenuItem[] => {
    const menuMap = new Map<string, MenuItem>();
    const rootMenus: MenuItem[] = [];

    // 모든 메뉴 아이템을 맵에 저장하고 children 배열 초기화
    menuItems.forEach((item) => {
        menuMap.set(item.id, { ...item, children: [] });
    });

    // 계층구조 생성
    menuItems.forEach((item) => {
        const menuItem = menuMap.get(item.id)!;
        if (item.parent_id && menuMap.has(item.parent_id)) {
            const parent = menuMap.get(item.parent_id)!;
            parent.children!.push(menuItem);
        } else {
            rootMenus.push(menuItem);
        }
    });

    // 각 레벨에서 display_order로 정렬
    const sortMenus = (menus: MenuItem[]) => {
        menus.sort((a, b) => a.display_order - b.display_order);
        menus.forEach((menu) => {
            if (menu.children && menu.children.length > 0) {
                sortMenus(menu.children);
            }
        });
    };

    sortMenus(rootMenus);
    return rootMenus;
};

// 순서 중복 체크 함수
const validateDisplayOrders = (
    menuConfigs: Record<string, UnionMenuConfig>,
    hierarchicalMenus: MenuItem[]
): string[] => {
    const errors: string[] = [];

    // 1차 메뉴 순서 중복 체크
    const firstLevelOrders = new Map<number, string[]>();
    hierarchicalMenus.forEach((menu) => {
        const config = menuConfigs[menu.id];
        if (config?.enabled) {
            const order = config.displayOrder;
            if (!firstLevelOrders.has(order)) {
                firstLevelOrders.set(order, []);
            }
            firstLevelOrders.get(order)!.push(menu.label_default);
        }
    });

    firstLevelOrders.forEach((menus, order) => {
        if (menus.length > 1) {
            errors.push(`1차 메뉴 순서 ${order}번이 중복됩니다: ${menus.join(', ')}`);
        }
    });

    // 2차 메뉴 순서 중복 체크 (각 1차 메뉴별로)
    hierarchicalMenus.forEach((parentMenu) => {
        if (parentMenu.children && parentMenu.children.length > 0) {
            const secondLevelOrders = new Map<number, string[]>();
            parentMenu.children.forEach((childMenu) => {
                const config = menuConfigs[childMenu.id];
                if (config?.enabled) {
                    const order = config.displayOrder;
                    if (!secondLevelOrders.has(order)) {
                        secondLevelOrders.set(order, []);
                    }
                    secondLevelOrders.get(order)!.push(childMenu.label_default);
                }
            });

            secondLevelOrders.forEach((menus, order) => {
                if (menus.length > 1) {
                    errors.push(
                        `"${parentMenu.label_default}" 하위 메뉴 순서 ${order}번이 중복됩니다: ${menus.join(', ')}`
                    );
                }
            });
        }
    });

    return errors;
};

export default function NewNavConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [selectedUnionId, setSelectedUnionId] = useState<string>('');
    const [unions, setUnions] = useState<Union[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [hierarchicalMenus, setHierarchicalMenus] = useState<MenuItem[]>([]);
    const [menuConfigs, setMenuConfigs] = useState<Record<string, UnionMenuConfig>>({});
    const [permissions, setPermissions] = useState<Record<string, MenuPermission[]>>({});
    const [expandedMenus, setExpandedMenus] = useState<ExpandedMenus>({});

    // Dialog state
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // 데이터 로드
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // API에서 기본 데이터 가져오기
            const response = await fetch('/api/admin/nav-management/data');
            if (!response.ok) {
                throw new Error('데이터 로드 실패');
            }

            const result = await response.json();
            const { unions: unionsData, roles: rolesData, menuItems: menuItemsData } = result.data;

            setUnions(unionsData);
            setRoles(rolesData);
            setMenuItems(menuItemsData);

            // 메뉴 아이템들을 계층구조로 변환
            const hierarchical = buildMenuHierarchy(menuItemsData);
            setHierarchicalMenus(hierarchical);

            // 1차 메뉴들을 기본적으로 펼친 상태로 설정
            const initialExpanded: ExpandedMenus = {};
            hierarchical.forEach((menu) => {
                initialExpanded[menu.id] = true;
            });
            setExpandedMenus(initialExpanded);

            // 기본 메뉴 설정 초기화 (display_order는 기본값 사용)
            const defaultConfigs: Record<string, UnionMenuConfig> = {};
            menuItemsData.forEach((item: MenuItem) => {
                defaultConfigs[item.id] = {
                    menuItemId: item.id,
                    enabled: true,
                    customLabel: '',
                    displayOrder: item.display_order,
                };
            });
            setMenuConfigs(defaultConfigs);

            // 기본 권한 설정 초기화
            const defaultPermissions: Record<string, MenuPermission[]> = {};
            menuItemsData.forEach((item: MenuItem) => {
                defaultPermissions[item.id] = rolesData.map((role: Role) => ({
                    menuItemId: item.id,
                    roleId: role.id,
                    canView: true,
                }));
            });
            setPermissions(defaultPermissions);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            // 에러 발생 시 사용자에게 알림
            alert('데이터 로드 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 메뉴 설정 변경
    const updateMenuConfig = (menuItemId: string, updates: Partial<UnionMenuConfig>) => {
        setMenuConfigs((prev) => ({
            ...prev,
            [menuItemId]: { ...prev[menuItemId], ...updates },
        }));
        setHasUnsavedChanges(true);
    };

    // 권한 설정 변경
    const updatePermission = (menuItemId: string, roleId: string, canView: boolean) => {
        setPermissions((prev) => ({
            ...prev,
            [menuItemId]: prev[menuItemId].map((p) => (p.roleId === roleId ? { ...p, canView } : p)),
        }));
        setHasUnsavedChanges(true);
    };

    // 메뉴 펼치기/접기 토글
    const toggleMenuExpansion = (menuId: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [menuId]: !prev[menuId],
        }));
    };

    // 저장 처리
    const handleSave = async () => {
        if (!selectedUnionId) {
            alert('조합을 선택해주세요.');
            return;
        }

        try {
            setSaving(true);

            // 순서 중복 체크
            const validationErrors = validateDisplayOrders(menuConfigs, hierarchicalMenus);
            if (validationErrors.length > 0) {
                alert('순서 설정에 오류가 있습니다:\n' + validationErrors.join('\n'));
                setSaving(false);
                return;
            }

            const saveData = {
                unionId: selectedUnionId,
                menuConfigs: Object.values(menuConfigs),
                permissions: Object.values(permissions).flat(),
            };

            console.log('저장할 데이터:', saveData);

            // API 호출
            const response = await fetch('/api/admin/nav-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '저장 실패');
            }

            setHasUnsavedChanges(false);
            alert('설정이 성공적으로 저장되었습니다.');
            router.push('/nav-management');
        } catch (error) {
            console.error('저장 오류:', error);
            alert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 뒤로가기 처리
    const handleBack = () => {
        if (hasUnsavedChanges) {
            setShowExitDialog(true);
        } else {
            router.push('/nav-management');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" onClick={handleBack} className="flex items-center space-x-2">
                                <ArrowLeft className="h-4 w-4" />
                                <span>돌아가기</span>
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">메뉴 설정</h1>
                                <p className="text-gray-600 mt-1">조합별 메뉴 구성 및 권한 설정</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button variant="outline" onClick={handleBack} disabled={saving}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!selectedUnionId || saving}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? '저장 중...' : '저장'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Union Selection */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Building2 className="h-5 w-5" />
                                    <span>조합 선택</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="union-select">대상 조합</Label>
                                    <Select value={selectedUnionId} onValueChange={setSelectedUnionId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="조합을 선택해주세요" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unions.map((union) => (
                                                <SelectItem key={union.id} value={union.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{union.name}</span>
                                                        <span className="text-sm text-gray-500">{union.homepage}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedUnionId && (
                                    <div className="p-4 bg-blue-50 rounded-lg border">
                                        <h4 className="font-medium text-blue-900 mb-2">설정 안내</h4>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li>• 메뉴 활성화/비활성화 설정</li>
                                            <li>• 커스텀 메뉴명 설정</li>
                                            <li>• 역할별 메뉴 접근 권한 설정</li>
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Menu Configuration */}
                    <div className="lg:col-span-2">
                        {!selectedUnionId ? (
                            <Card>
                                <CardContent className="pt-8 pb-8">
                                    <div className="text-center">
                                        <Menu className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">조합을 선택하면 메뉴 설정이 가능합니다.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {/* Menu Items Configuration */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <Menu className="h-5 w-5" />
                                            <span>메뉴 구성</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {hierarchicalMenus.map((parentMenu) => {
                                                const parentConfig = menuConfigs[parentMenu.id];
                                                if (!parentConfig) return null;

                                                const isExpanded = expandedMenus[parentMenu.id];

                                                return (
                                                    <div
                                                        key={parentMenu.id}
                                                        className="border rounded-lg overflow-hidden"
                                                    >
                                                        {/* 1차 메뉴 */}
                                                        <div className="bg-gray-50 border-b p-4">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <Switch
                                                                        checked={parentConfig.enabled}
                                                                        onCheckedChange={(enabled) =>
                                                                            updateMenuConfig(parentMenu.id, { enabled })
                                                                        }
                                                                    />
                                                                    <div className="flex items-center space-x-2">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            1차
                                                                        </Badge>
                                                                        <h4 className="font-medium text-lg">
                                                                            {parentMenu.label_default}
                                                                        </h4>
                                                                        {parentMenu.children &&
                                                                            parentMenu.children.length > 0 && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() =>
                                                                                        toggleMenuExpansion(
                                                                                            parentMenu.id
                                                                                        )
                                                                                    }
                                                                                    className="p-1 h-6 w-6"
                                                                                >
                                                                                    {isExpanded ? (
                                                                                        <ChevronDown className="h-4 w-4" />
                                                                                    ) : (
                                                                                        <ChevronRight className="h-4 w-4" />
                                                                                    )}
                                                                                </Button>
                                                                            )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Badge
                                                                        variant={
                                                                            parentConfig.enabled
                                                                                ? 'default'
                                                                                : 'secondary'
                                                                        }
                                                                    >
                                                                        {parentConfig.enabled ? '활성' : '비활성'}
                                                                    </Badge>
                                                                    {parentMenu.is_admin_area && (
                                                                        <Badge
                                                                            variant="destructive"
                                                                            className="text-xs"
                                                                        >
                                                                            관리자 전용
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {parentConfig.enabled && (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label
                                                                            htmlFor={`custom-label-${parentMenu.id}`}
                                                                        >
                                                                            커스텀 메뉴명 (선택사항)
                                                                        </Label>
                                                                        <Input
                                                                            id={`custom-label-${parentMenu.id}`}
                                                                            placeholder={parentMenu.label_default}
                                                                            value={parentConfig.customLabel}
                                                                            onChange={(e) =>
                                                                                updateMenuConfig(parentMenu.id, {
                                                                                    customLabel: e.target.value,
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label
                                                                            htmlFor={`display-order-${parentMenu.id}`}
                                                                        >
                                                                            메뉴 순서
                                                                        </Label>
                                                                        <Input
                                                                            id={`display-order-${parentMenu.id}`}
                                                                            type="number"
                                                                            min="1"
                                                                            value={parentConfig.displayOrder}
                                                                            onChange={(e) =>
                                                                                updateMenuConfig(parentMenu.id, {
                                                                                    displayOrder:
                                                                                        parseInt(e.target.value) || 1,
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {parentConfig.enabled && (
                                                                <div className="mt-4">
                                                                    <Label className="flex items-center space-x-2 mb-2">
                                                                        <Shield className="h-4 w-4" />
                                                                        <span>접근 권한</span>
                                                                    </Label>
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {roles.map((role) => {
                                                                            const permission = permissions[
                                                                                parentMenu.id
                                                                            ]?.find((p) => p.roleId === role.id);
                                                                            return (
                                                                                <div
                                                                                    key={role.id}
                                                                                    className="flex items-center space-x-2"
                                                                                >
                                                                                    <Switch
                                                                                        checked={
                                                                                            permission?.canView || false
                                                                                        }
                                                                                        onCheckedChange={(canView) =>
                                                                                            updatePermission(
                                                                                                parentMenu.id,
                                                                                                role.id,
                                                                                                canView
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <span className="text-sm">
                                                                                        {role.name}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 2차 메뉴 */}
                                                        {isExpanded &&
                                                            parentMenu.children &&
                                                            parentMenu.children.length > 0 && (
                                                                <div className="bg-white">
                                                                    {parentMenu.children.map((childMenu) => {
                                                                        const childConfig = menuConfigs[childMenu.id];
                                                                        if (!childConfig) return null;

                                                                        return (
                                                                            <div
                                                                                key={childMenu.id}
                                                                                className="border-b last:border-b-0 p-4 pl-8"
                                                                            >
                                                                                <div className="flex items-center justify-between mb-4">
                                                                                    <div className="flex items-center space-x-3">
                                                                                        <Switch
                                                                                            checked={
                                                                                                childConfig.enabled
                                                                                            }
                                                                                            onCheckedChange={(
                                                                                                enabled
                                                                                            ) =>
                                                                                                updateMenuConfig(
                                                                                                    childMenu.id,
                                                                                                    { enabled }
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <Badge
                                                                                                variant="outline"
                                                                                                className="text-xs bg-blue-50"
                                                                                            >
                                                                                                2차
                                                                                            </Badge>
                                                                                            <h5 className="font-medium">
                                                                                                {
                                                                                                    childMenu.label_default
                                                                                                }
                                                                                            </h5>
                                                                                            <span className="text-sm text-gray-500">
                                                                                                {childMenu.path}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <Badge
                                                                                            variant={
                                                                                                childConfig.enabled
                                                                                                    ? 'default'
                                                                                                    : 'secondary'
                                                                                            }
                                                                                        >
                                                                                            {childConfig.enabled
                                                                                                ? '활성'
                                                                                                : '비활성'}
                                                                                        </Badge>
                                                                                        {childMenu.is_admin_area && (
                                                                                            <Badge
                                                                                                variant="destructive"
                                                                                                className="text-xs"
                                                                                            >
                                                                                                관리자 전용
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {childConfig.enabled && (
                                                                                    <div className="space-y-4">
                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                            <div>
                                                                                                <Label
                                                                                                    htmlFor={`custom-label-${childMenu.id}`}
                                                                                                >
                                                                                                    커스텀 메뉴명
                                                                                                    (선택사항)
                                                                                                </Label>
                                                                                                <Input
                                                                                                    id={`custom-label-${childMenu.id}`}
                                                                                                    placeholder={
                                                                                                        childMenu.label_default
                                                                                                    }
                                                                                                    value={
                                                                                                        childConfig.customLabel
                                                                                                    }
                                                                                                    onChange={(e) =>
                                                                                                        updateMenuConfig(
                                                                                                            childMenu.id,
                                                                                                            {
                                                                                                                customLabel:
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value,
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <Label
                                                                                                    htmlFor={`display-order-${childMenu.id}`}
                                                                                                >
                                                                                                    메뉴 순서
                                                                                                </Label>
                                                                                                <Input
                                                                                                    id={`display-order-${childMenu.id}`}
                                                                                                    type="number"
                                                                                                    min="1"
                                                                                                    value={
                                                                                                        childConfig.displayOrder
                                                                                                    }
                                                                                                    onChange={(e) =>
                                                                                                        updateMenuConfig(
                                                                                                            childMenu.id,
                                                                                                            {
                                                                                                                displayOrder:
                                                                                                                    parseInt(
                                                                                                                        e
                                                                                                                            .target
                                                                                                                            .value
                                                                                                                    ) ||
                                                                                                                    1,
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                />
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* 권한 설정 */}
                                                                                        <div>
                                                                                            <Label className="flex items-center space-x-2 mb-2">
                                                                                                <Shield className="h-4 w-4" />
                                                                                                <span>접근 권한</span>
                                                                                            </Label>
                                                                                            <div className="grid grid-cols-4 gap-2">
                                                                                                {roles.map((role) => {
                                                                                                    const permission =
                                                                                                        permissions[
                                                                                                            childMenu.id
                                                                                                        ]?.find(
                                                                                                            (p) =>
                                                                                                                p.roleId ===
                                                                                                                role.id
                                                                                                        );
                                                                                                    return (
                                                                                                        <div
                                                                                                            key={
                                                                                                                role.id
                                                                                                            }
                                                                                                            className="flex items-center space-x-2"
                                                                                                        >
                                                                                                            <Switch
                                                                                                                checked={
                                                                                                                    permission?.canView ||
                                                                                                                    false
                                                                                                                }
                                                                                                                onCheckedChange={(
                                                                                                                    canView
                                                                                                                ) =>
                                                                                                                    updatePermission(
                                                                                                                        childMenu.id,
                                                                                                                        role.id,
                                                                                                                        canView
                                                                                                                    )
                                                                                                                }
                                                                                                            />
                                                                                                            <span className="text-sm">
                                                                                                                {
                                                                                                                    role.name
                                                                                                                }
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Exit Confirmation Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span>저장하지 않은 변경사항</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => router.push('/nav-management')}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            나가기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
