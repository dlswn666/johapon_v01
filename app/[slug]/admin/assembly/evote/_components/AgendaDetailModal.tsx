'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import type { EvoteDashboardAgenda } from '@/app/_lib/features/evote/api/useEvoteDashboard';

interface AgendaDetailModalProps {
  agenda: EvoteDashboardAgenda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgendaDetailModal({ agenda, open, onOpenChange }: AgendaDetailModalProps) {
  if (!agenda) return null;

  const docs = agenda.agenda_documents || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            제{agenda.seq_order}호 {agenda.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 안건 내용 */}
          {agenda.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">안건 내용</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{agenda.description}</p>
            </div>
          )}

          {/* 설명 HTML */}
          {agenda.explanation_html && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">상세 설명</p>
              <div
                className="text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: agenda.explanation_html }}
              />
            </div>
          )}

          {/* 첨부파일 목록 */}
          {docs.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">첨부파일</p>
              <ul className="space-y-1.5">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{doc.title}</span>
                      {doc.file_size != null && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ({(doc.file_size / 1024).toFixed(0)}KB)
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
