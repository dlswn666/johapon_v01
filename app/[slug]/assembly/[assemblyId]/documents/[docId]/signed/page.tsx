'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { usePersonalizedDocument } from '@/app/_lib/features/assembly/api/useDocumentHook';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import HashDisplay from '@/app/_lib/widgets/common/HashDisplay';
import { DOCUMENT_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

export default function SignedConfirmationPage({
  params,
}: {
  params: Promise<{ assemblyId: string; docId: string }>;
}) {
  const { assemblyId, docId } = use(params);
  const router = useRouter();
  const { slug } = useSlug();
  const { data: instance } = usePersonalizedDocument(assemblyId, docId);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mt-4">
          서명이 완료되었습니다
        </h1>

        {instance && (
          <>
            <p className="text-sm text-gray-500 mt-2">
              {DOCUMENT_TYPE_LABELS[instance.documentType] || instance.documentTitle} v{instance.version}
            </p>

            <div className="mt-4">
              <HashDisplay hash={instance.contentHash} label="문서 해시" />
            </div>

            {instance.signedAt && (
              <p className="text-xs text-gray-400 mt-3">
                서명 일시: {new Date(instance.signedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </>
        )}

        <div className="mt-6 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(getUnionPath(slug, `/assembly/${assemblyId}/documents`))}
          >
            문서 목록으로
          </Button>
        </div>
      </div>
    </div>
  );
}
