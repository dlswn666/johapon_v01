'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
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

import {
    Plus,
    Edit2,
    Trash2,
    Menu,
    Settings,
    ChevronDown,
    ChevronRight,
    Save,
    X,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MenuItem {
    id: string;
    key: string;
    label_default: string;
    path: string | null;
    depth: number;
    parent_id: string | null;
    display_order: number;
    is_admin_area: boolean;
    children?: MenuItem[];
}

interface MenuItemForm {
    key: string;
    label_default: string;
    path: string;
    depth: number;
    parent_id: string | null;
    display_order: number;
    is_admin_area: boolean;
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

// 폼 유효성 검사
const validateForm = (form: MenuItemForm, existingItems: MenuItem[], editingId?: string): string[] => {
    const errors: string[] = [];

    if (!form.key.trim()) {
        errors.push('메뉴 키는 필수입니다.');
    } else if (!/^[A-Z_]+$/.test(form.key)) {
        errors.push('메뉴 키는 영문 대문자와 언더스코어만 사용 가능합니다.');
    }

    if (!form.label_default.trim()) {
        errors.push('메뉴명은 필수입니다.');
    }

    if (form.depth === 2 && !form.parent_id) {
        errors.push('2차 메뉴는 상위 메뉴를 선택해야 합니다.');
    }

    if (form.depth === 1 && form.parent_id) {
        errors.push('1차 메뉴는 상위 메뉴를 선택할 수 없습니다.');
    }

    // 키 중복 체크
    const duplicateKey = existingItems.find((item) => item.key === form.key && item.id !== editingId);
    if (duplicateKey) {
        errors.push('이미 존재하는 메뉴 키입니다.');
    }

    // 순서 중복 체크
    if (form.depth === 1) {
        const duplicateOrder = existingItems.find(
            (item) => item.depth === 1 && item.display_order === form.display_order && item.id !== editingId
        );
        if (duplicateOrder) {
            errors.push('동일한 순서의 1차 메뉴가 이미 존재합니다.');
        }
    } else if (form.depth === 2 && form.parent_id) {
        const duplicateOrder = existingItems.find(
            (item) =>
                item.depth === 2 &&
                item.parent_id === form.parent_id &&
                item.display_order === form.display_order &&
                item.id !== editingId
        );
        if (duplicateOrder) {
            errors.push('동일한 순서의 2차 메뉴가 해당 상위 메뉴에 이미 존재합니다.');
        }
    }

    return errors;
};

export default function BaseMenuManagementPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [hierarchicalMenus, setHierarchicalMenus] = useState<MenuItem[]>([]);
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

    // 모달 상태
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

    // 폼 상태
    const [form, setForm] = useState<MenuItemForm>({
        key: '',
        label_default: '',
        path: '',
        depth: 1,
        parent_id: null,
        display_order: 1,
        is_admin_area: false,
    });
    const [formErrors, setFormErrors] = useState<string[]>([]);

    // 데이터 로드
    useEffect(() => {
        loadMenuItems();
    }, []);

    const loadMenuItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/base-menu-management');
            if (!response.ok) {
                throw new Error('메뉴 아이템 로드 실패');
            }

            const result = await response.json();
            const items = result.data;
            setMenuItems(items);

            // 계층구조 생성
            const hierarchical = buildMenuHierarchy(items);
            setHierarchicalMenus(hierarchical);

            // 기본적으로 모든 1차 메뉴 펼치기
            const expanded: { [key: string]: boolean } = {};
            hierarchical.forEach((menu) => {
                expanded[menu.id] = true;
            });
            setExpandedMenus(expanded);
        } catch (error) {
            console.error('메뉴 아이템 로드 오류:', error);
            alert('메뉴 아이템을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 메뉴 펼치기/접기
    const toggleMenuExpansion = (menuId: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [menuId]: !prev[menuId],
        }));
    };

    // 폼 초기화
    const resetForm = () => {
        setForm({
            key: '',
            label_default: '',
            path: '',
            depth: 1,
            parent_id: null,
            display_order: 1,
            is_admin_area: false,
        });
        setFormErrors([]);
    };

    // 추가 모달 열기
    const handleAdd = () => {
        resetForm();
        // 다음 순서 자동 설정
        const maxOrder = Math.max(0, ...menuItems.filter((item) => item.depth === 1).map((item) => item.display_order));
        setForm((prev) => ({ ...prev, display_order: maxOrder + 1 }));
        setShowAddDialog(true);
    };

    // 수정 모달 열기
    const handleEdit = (item: MenuItem) => {
        setSelectedMenuItem(item);
        setForm({
            key: item.key,
            label_default: item.label_default,
            path: item.path || '',
            depth: item.depth,
            parent_id: item.parent_id,
            display_order: item.display_order,
            is_admin_area: item.is_admin_area,
        });
        setFormErrors([]);
        setShowEditDialog(true);
    };

    // 삭제 모달 열기
    const handleDelete = (item: MenuItem) => {
        setSelectedMenuItem(item);
        setShowDeleteDialog(true);
    };

    // 저장 처리
    const handleSave = async () => {
        const errors = validateForm(form, menuItems, selectedMenuItem?.id);
        if (errors.length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            setSaving(true);
            setFormErrors([]);

            const url = selectedMenuItem
                ? `/api/admin/base-menu-management/${selectedMenuItem.id}`
                : '/api/admin/base-menu-management';

            const method = selectedMenuItem ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || '저장 실패');
            }

            await loadMenuItems();
            setShowAddDialog(false);
            setShowEditDialog(false);
            setSelectedMenuItem(null);
            resetForm();
        } catch (error) {
            console.error('저장 오류:', error);
            alert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 삭제 처리
    const handleConfirmDelete = async () => {
        if (!selectedMenuItem) return;

        try {
            setSaving(true);

            const response = await fetch(`/api/admin/base-menu-management/${selectedMenuItem.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || '삭제 실패');
            }

            await loadMenuItems();
            setShowDeleteDialog(false);
            setSelectedMenuItem(null);
        } catch (error) {
            console.error('삭제 오류:', error);
            alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 폼 필드 업데이트
    const updateForm = (field: keyof MenuItemForm, value: any) => {
        setForm((prev) => {
            const updated = { ...prev, [field]: value };

            // depth가 변경되면 parent_id와 display_order 초기화
            if (field === 'depth') {
                if (value === 1) {
                    updated.parent_id = null;
                    // 1차 메뉴의 다음 순서
                    const maxOrder = Math.max(
                        0,
                        ...menuItems.filter((item) => item.depth === 1).map((item) => item.display_order)
                    );
                    updated.display_order = maxOrder + 1;
                } else {
                    // 2차 메뉴의 다음 순서
                    updated.display_order = 1;
                }
            }

            // parent_id가 변경되면 display_order 초기화
            if (field === 'parent_id' && value) {
                const maxOrder = Math.max(
                    0,
                    ...menuItems
                        .filter((item) => item.depth === 2 && item.parent_id === value)
                        .map((item) => item.display_order)
                );
                updated.display_order = maxOrder + 1;
            }

            return updated;
        });
        setFormErrors([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">기준 메뉴를 불러오는 중...</p>
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
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/nav-management')}
                                className="flex items-center space-x-2"
                            >
                                <X className="h-4 w-4" />
                                <span>돌아가기</span>
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">기준 메뉴 관리</h1>
                                <p className="text-gray-600 mt-1">전역 메뉴 아이템 구성 및 설정</p>
                            </div>
                        </div>
                        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            메뉴 추가
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Menu className="h-5 w-5" />
                            <span>기준 메뉴 목록</span>
                            <Badge variant="outline" className="ml-2">
                                총 {menuItems.length}개
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {hierarchicalMenus.map((parentMenu) => {
                                const isExpanded = expandedMenus[parentMenu.id];

                                return (
                                    <div key={parentMenu.id} className="border rounded-lg overflow-hidden">
                                        {/* 1차 메뉴 */}
                                        <div className="bg-gray-50 border-b p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            1차
                                                        </Badge>
                                                        <h4 className="font-medium text-lg">
                                                            {parentMenu.label_default}
                                                        </h4>
                                                        <code className="bg-gray-200 px-2 py-1 rounded text-sm">
                                                            {parentMenu.key}
                                                        </code>
                                                        {parentMenu.children && parentMenu.children.length > 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleMenuExpansion(parentMenu.id)}
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
                                                    <Badge variant="secondary" className="text-xs">
                                                        순서: {parentMenu.display_order}
                                                    </Badge>
                                                    {parentMenu.is_admin_area && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            관리자 전용
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(parentMenu)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(parentMenu)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {parentMenu.path && (
                                                <p className="text-sm text-gray-500 mt-2">경로: {parentMenu.path}</p>
                                            )}
                                        </div>

                                        {/* 2차 메뉴 */}
                                        {isExpanded && parentMenu.children && parentMenu.children.length > 0 && (
                                            <div className="bg-white">
                                                {parentMenu.children.map((childMenu) => (
                                                    <div
                                                        key={childMenu.id}
                                                        className="border-b last:border-b-0 p-4 pl-8"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <Badge variant="outline" className="text-xs bg-blue-50">
                                                                    2차
                                                                </Badge>
                                                                <h5 className="font-medium">
                                                                    {childMenu.label_default}
                                                                </h5>
                                                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                                                    {childMenu.key}
                                                                </code>
                                                                {childMenu.path && (
                                                                    <span className="text-sm text-gray-500">
                                                                        {childMenu.path}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Badge variant="secondary" className="text-xs">
                                                                    순서: {childMenu.display_order}
                                                                </Badge>
                                                                {childMenu.is_admin_area && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        관리자 전용
                                                                    </Badge>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(childMenu)}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(childMenu)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 추가/수정 다이얼로그 */}
            <AlertDialog
                open={showAddDialog || showEditDialog}
                onOpenChange={() => {
                    setShowAddDialog(false);
                    setShowEditDialog(false);
                    setSelectedMenuItem(null);
                    resetForm();
                }}
            >
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{selectedMenuItem ? '메뉴 수정' : '메뉴 추가'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            기준 메뉴 아이템을 {selectedMenuItem ? '수정' : '추가'}합니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-4 py-4">
                        {formErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <h4 className="text-red-800 font-medium">입력 오류</h4>
                                </div>
                                <ul className="text-sm text-red-700 space-y-1">
                                    {formErrors.map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="depth">메뉴 레벨</Label>
                                <Select
                                    value={form.depth.toString()}
                                    onValueChange={(value) => updateForm('depth', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1차 메뉴</SelectItem>
                                        <SelectItem value="2">2차 메뉴</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.depth === 2 && (
                                <div>
                                    <Label htmlFor="parent_id">상위 메뉴</Label>
                                    <Select
                                        value={form.parent_id || ''}
                                        onValueChange={(value) => updateForm('parent_id', value || null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="상위 메뉴 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {menuItems
                                                .filter((item) => item.depth === 1)
                                                .map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.label_default}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="key">메뉴 키 *</Label>
                                <Input
                                    id="key"
                                    placeholder="MENU_KEY"
                                    value={form.key}
                                    onChange={(e) => updateForm('key', e.target.value.toUpperCase())}
                                />
                            </div>
                            <div>
                                <Label htmlFor="label_default">메뉴명 *</Label>
                                <Input
                                    id="label_default"
                                    placeholder="메뉴명"
                                    value={form.label_default}
                                    onChange={(e) => updateForm('label_default', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="path">경로</Label>
                                <Input
                                    id="path"
                                    placeholder="/path/to/page"
                                    value={form.path}
                                    onChange={(e) => updateForm('path', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="display_order">표시 순서</Label>
                                <Input
                                    id="display_order"
                                    type="number"
                                    min="1"
                                    value={form.display_order}
                                    onChange={(e) => updateForm('display_order', parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_admin_area"
                                checked={form.is_admin_area}
                                onCheckedChange={(checked) => updateForm('is_admin_area', checked)}
                            />
                            <Label htmlFor="is_admin_area">관리자 전용 메뉴</Label>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowAddDialog(false);
                                setShowEditDialog(false);
                                setSelectedMenuItem(null);
                                resetForm();
                            }}
                        >
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    저장
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span>메뉴 삭제 확인</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            &apos;{selectedMenuItem?.label_default}&apos; 메뉴를 삭제하시겠습니까?
                            {selectedMenuItem?.children && selectedMenuItem.children.length > 0 && (
                                <div className="mt-2 p-2 bg-orange-50 rounded">
                                    <p className="text-orange-800 text-sm">
                                        ⚠️ 이 메뉴에는 {selectedMenuItem.children.length}개의 하위 메뉴가 있습니다. 삭제
                                        시 하위 메뉴들도 함께 삭제됩니다.
                                    </p>
                                </div>
                            )}
                            <p className="mt-2 text-sm text-gray-600">이 작업은 되돌릴 수 없습니다.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    삭제
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
