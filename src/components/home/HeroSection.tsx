export default function HeroSection() {
    return (
        <div className="relative h-64 md:h-80 lg:h-80">
            <div className="w-full h-full" style={{ backgroundImage: 'var(--hero-image, none)' }} />
            <div className="absolute inset-0" style={{ backgroundColor: 'var(--hero-overlay)' }} />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
                <h1 className="mb-2" style={{ fontSize: 'var(--fs-hero)', lineHeight: 'var(--lh)' }}>
                    작전현대아파트구역
                    <br />
                    주택재개발정비사업조합
                </h1>
                <p className="" style={{ fontSize: '32px', lineHeight: 'var(--lh)' }}>
                    조합원들의 방문을 환영합니다
                </p>
            </div>
        </div>
    );
}
