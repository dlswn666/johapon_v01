export default function NotFoundPage() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
            <p className="text-gray-600">요청하신 주소에 해당하는 홈페이지가 존재하지 않습니다.</p>
        </div>
    );
}
