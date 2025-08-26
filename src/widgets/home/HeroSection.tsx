import { useTenantInfo } from '@/shared/providers/TenantProvider';

export default function HeroSection() {
    const tenantInfo = useTenantInfo();

    console.log(tenantInfo);

    return (
        <div className="relative h-64 md:h-80 lg:h-96">
            <div className="w-full h-full bg-gradient-to-r from-green-900 to-blue-900" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 to-blue-900/80" />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4">{tenantInfo?.name || '조합'}</h1>
                <p className="text-xl md:text-2xl text-green-100">조합원들의 밝은 곳을 함께합니다</p>
            </div>
        </div>
    );
}
