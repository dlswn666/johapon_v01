export default function HeroSection() {
    return (
        <div className="relative h-64 md:h-80 lg:h-96">
            <div className="w-full h-full bg-gradient-to-r from-green-900 to-blue-900" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 to-blue-900/80" />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4">
                    작전현대아파트구역
                    <br />
                    주택재개발정비사업조합
                </h1>
                <p className="text-xl md:text-2xl text-green-100">조합원들의 밝은 곳을 함께합니다</p>
            </div>
        </div>
    );
}
