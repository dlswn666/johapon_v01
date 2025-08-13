import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Bus } from 'lucide-react';

export interface TransportItem {
    type: 'subway' | 'bus' | 'car';
    icon: any;
    title: string;
    color: string;
    bgColor: string;
    routes: string[];
}

export default function TransportInfo({ items }: { items: TransportItem[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Bus className="h-5 w-5 text-green-600" />
                    <span>대중교통 정보</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.map((t, i) => (
                        <div key={i} className={`p-6 ${t.bgColor} rounded-lg`}>
                            <div className="text-center mb-4">
                                <t.icon className={`h-12 w-12 ${t.color} mx-auto mb-3`} />
                                <h4 className={`text-lg ${t.color.replace('text-', 'text-').replace('-600', '-700')}`}>
                                    {t.title}
                                </h4>
                            </div>
                            <div className="space-y-3">
                                {t.routes.map((r, ri) => (
                                    <div
                                        key={ri}
                                        className="p-3 bg-white rounded-md text-sm text-gray-700 border border-gray-200"
                                    >
                                        {r}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
