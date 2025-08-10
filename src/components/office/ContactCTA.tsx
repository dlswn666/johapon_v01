import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react';

export default function ContactCTA({ phone, email }: { phone: string; email: string }) {
    return (
        <Card className="bg-gradient-to-r from-blue-600 to-green-600">
            <CardContent className="text-center py-8">
                <div className="text-white">
                    <h3 className="text-2xl mb-4">궁금한 점이 있으시나요?</h3>
                    <p className="text-blue-100 mb-6">언제든지 연락주시면 친절하게 안내해 드리겠습니다.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button
                            variant="secondary"
                            size="lg"
                            className="flex items-center"
                            onClick={() => window.open(`tel:${phone}`)}
                        >
                            <Phone className="h-5 w-5 mr-2" /> 전화 문의
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="flex items-center bg-white text-blue-600 border-white hover:bg-blue-50"
                            onClick={() => window.open(`mailto:${email}`)}
                        >
                            <Mail className="h-5 w-5 mr-2" /> 이메일 문의
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
