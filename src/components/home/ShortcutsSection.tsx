import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, MessageCircle, Globe } from 'lucide-react';
import { Shortcut } from '@/lib/types';

interface ShortcutsSectionProps {
    shortcutData: Shortcut[];
}

export default function ShortcutsSection({ shortcutData }: ShortcutsSectionProps) {
    return (
        <Card className="border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200 py-4">
                <CardTitle className="text-gray-800 text-xl">바로가기</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                    {shortcutData.map((shortcut) => (
                        <a
                            key={shortcut.id}
                            href={shortcut.href}
                            className="flex flex-col items-center p-3 rounded-lg hover:bg-green-50 transition-colors group"
                        >
                            <div
                                className={`w-12 h-12 bg-${shortcut.color}-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-${shortcut.color}-200 transition-colors`}
                            >
                                {shortcut.icon === 'N' ? (
                                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">N</span>
                                    </div>
                                ) : shortcut.icon === 'play' ? (
                                    <Play className="h-6 w-6 text-red-600" />
                                ) : shortcut.icon === 'message-circle' ? (
                                    <MessageCircle className="h-6 w-6 text-yellow-600" />
                                ) : (
                                    <Globe className="h-6 w-6 text-blue-600" />
                                )}
                            </div>
                            <span className="text-sm text-gray-700 text-center">{shortcut.title}</span>
                        </a>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
