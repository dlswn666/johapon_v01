import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // 템플릿 데이터 생성
    const templateData = [
      { 이름: '홍길동', 전화번호: '01012345678' },
      { 이름: '김철수', 전화번호: '01087654321' },
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 열 너비 설정
    worksheet['!cols'] = [
      { wch: 15 }, // 이름
      { wch: 15 }, // 전화번호
    ];

    // 워크시트 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '수신자 목록');

    // 버퍼로 변환
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 응답 반환
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="sms_recipients_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('템플릿 생성 오류:', error);
    return NextResponse.json(
      { error: '템플릿 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
