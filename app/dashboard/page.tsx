'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

// Mock Data Types
interface UsageHistory {
    id: number;
    date: string;
    sender: string;
    title: string;
    recipientCount: number;
    costPerMsg: number;
    totalCost: number;
}

// Mock Data
const MOCK_HISTORY: UsageHistory[] = Array.from({ length: 20 }).map((_, i) => ({
    id: i + 1,
    date: format(subDays(new Date(), i), 'yyyy-MM-dd HH:mm'),
    sender: i % 3 === 0 ? '관리자' : '매니저',
    title: `공지사항 알림 ${i + 1}`,
    recipientCount: Math.floor(Math.random() * 1000) + 100,
    costPerMsg: 15, // 알림톡 단가 15원 가정
    totalCost: (Math.floor(Math.random() * 1000) + 100) * 15,
}));

const Dashboard = () => {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });
    const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Summary Calculations (Mock based on date range)
    // In real app, filter MOCK_HISTORY based on date range
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const todayUsage = MOCK_HISTORY.filter(h => h.date.startsWith(todayStr));
    const todayTotalSent = todayUsage.reduce((acc, cur) => acc + cur.recipientCount, 0);
    const todayTotalCost = todayUsage.reduce((acc, cur) => acc + cur.totalCost, 0);

    // Period calculations would filter based on `date` state
    // For now, just showing total of mock data as "Period" for demo if date is not selected, 
    // or random subset if selected to simulate change.
    const periodTotalSent = MOCK_HISTORY.reduce((acc, cur) => acc + cur.recipientCount, 0);
    const periodTotalCost = MOCK_HISTORY.reduce((acc, cur) => acc + cur.totalCost, 0);

    const handleOpenChange = (open: boolean) => {
        setIsPopoverOpen(open);
        if (open) {
            setTempDate(date);
        }
    };

    const handleApply = () => {
        setDate(tempDate);
        setIsPopoverOpen(false);
    };

    const handleCancel = () => {
        setTempDate(date);
        setIsPopoverOpen(false);
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">알림톡 관리 대시보드</h1>
                
                {/* Date Range Picker */}
                <div className={cn("grid gap-2")}>
                    <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[300px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y", { locale: ko })} -{" "}
                                            {format(date.to, "LLL dd, y", { locale: ko })}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y", { locale: ko })
                                    )
                                ) : (
                                    <span>날짜 선택</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={tempDate?.from}
                                selected={tempDate}
                                onSelect={setTempDate}
                                numberOfMonths={2}
                            />
                            <div className="p-3 border-t flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    취소
                                </Button>
                                <Button size="sm" onClick={handleApply}>
                                    적용
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            오늘 발송 건수
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayTotalSent.toLocaleString()} 건</div>
                        <p className="text-xs text-muted-foreground">
                            전일 대비 +20.1%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            오늘 사용 금액
                        </CardTitle>
                        <span className="text-muted-foreground font-bold">₩</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayTotalCost.toLocaleString()} 원</div>
                        <p className="text-xs text-muted-foreground">
                            전일 대비 +15%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            기간 내 총 발송
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periodTotalSent.toLocaleString()} 건</div>
                        <p className="text-xs text-muted-foreground">
                            선택 기간 합계
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            기간 내 총 비용
                        </CardTitle>
                        <span className="text-muted-foreground font-bold">₩</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periodTotalCost.toLocaleString()} 원</div>
                        <p className="text-xs text-muted-foreground">
                            선택 기간 합계
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Usage History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>알림톡 발송 이력</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">발송 일시</TableHead>
                                <TableHead>발송자</TableHead>
                                <TableHead>제목/내용</TableHead>
                                <TableHead className="text-right">발송 건수</TableHead>
                                <TableHead className="text-right">단가</TableHead>
                                <TableHead className="text-right">총 비용</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_HISTORY.map((history) => (
                                <TableRow key={history.id}>
                                    <TableCell className="font-medium">{history.date}</TableCell>
                                    <TableCell>{history.sender}</TableCell>
                                    <TableCell>{history.title}</TableCell>
                                    <TableCell className="text-right">{history.recipientCount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{history.costPerMsg}원</TableCell>
                                    <TableCell className="text-right">{history.totalCost.toLocaleString()}원</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
