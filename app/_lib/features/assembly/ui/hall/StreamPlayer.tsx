'use client';

import { Monitor, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface StreamPlayerProps {
  streamType: string | null;
  zoomMeetingId: string | null;
  youtubeVideoId: string | null;
  className?: string;
}

/**
 * 영상 송출 컴포넌트
 * YouTube iframe + Zoom 외부 링크 지원
 */
export default function StreamPlayer({
  streamType,
  zoomMeetingId,
  youtubeVideoId,
  className,
}: StreamPlayerProps) {
  const hasStream = streamType && streamType !== 'NONE';
  // YouTube 영상 ID 형식 검증 (11자 영숫자+하이픈+언더스코어)
  const isValidYoutubeId = youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId);
  // Zoom 회의 ID 형식 검증 (9~11자리 숫자)
  const isValidZoomId = zoomMeetingId && /^\d{9,11}$/.test(zoomMeetingId);
  const showYoutube = (streamType === 'YOUTUBE' || streamType === 'BOTH') && isValidYoutubeId;
  const showZoom = (streamType === 'ZOOM' || streamType === 'BOTH') && isValidZoomId;

  if (!hasStream) return null;

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {showYoutube && (
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&playsinline=1`}
            title="총회 영상 송출"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {showZoom && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Zoom 화상회의</p>
              <p className="text-sm text-gray-500">회의 ID: {zoomMeetingId}</p>
            </div>
            <Button
              size="sm"
              onClick={() => window.open(`https://zoom.us/j/${zoomMeetingId}`, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              참여
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
