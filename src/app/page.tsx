import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl text-gray-800">테넌트 홈 선택</h1>
            <p className="text-gray-600">예: /(tenant)/[homepage] 형태로 접속하세요</p>
            <Link className="text-green-700 underline" href="/demo">
                데모 테넌트로 이동
            </Link>
        </div>
    );
}
