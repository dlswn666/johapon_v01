-- Migration 012: 문서 템플릿 시드 데이터 (6종)
-- 총회 생성 위자드에서 사용하는 법적 문서 양식

-- 1. 소집공고 (CONVOCATION_NOTICE)
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'CONVOCATION_NOTICE',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">총 회 소 집 공 고</h1>

<p style="margin-bottom: 20px;">{{union_name}} 조합원 여러분께</p>

<p style="margin-bottom: 20px;">도시 및 주거환경정비법 제45조 및 본 조합 정관 제00조의 규정에 의하여 아래와 같이 총회를 소집하오니 참석하여 주시기 바랍니다.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">총회명</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_title}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">일시</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_date | date}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">장소</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_venue}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">안건</td><td style="border: 1px solid #333; padding: 10px;">{{agenda_summary}}</td></tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">안건 목록</h2>
<p>{{agenda_list}}</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">참석 안내</h2>
<ul style="margin-bottom: 20px; padding-left: 20px;">
<li>본인 참석이 어려운 경우, 위임장을 작성하여 대리인을 통해 참석할 수 있습니다.</li>
<li>전자투표가 가능한 안건의 경우, 별도 안내에 따라 온라인으로 투표하실 수 있습니다.</li>
<li>정족수 미달 시 총회 개최가 불가하오니 반드시 참석하여 주시기 바랍니다.</li>
</ul>

<p style="text-align: center; margin-top: 40px;">{{current_date | date}}</p>
<p style="text-align: center; font-weight: bold; margin-top: 20px;">{{union_name}}</p>
<p style="text-align: center;">조합장 (인)</p>
</div>',
  '[
    {"name": "union_name", "label": "조합명", "type": "text", "required": true, "source": "union_info"},
    {"name": "assembly_title", "label": "총회명", "type": "text", "required": true, "source": "assembly"},
    {"name": "assembly_date", "label": "총회 일시", "type": "date", "required": true, "source": "assembly"},
    {"name": "assembly_venue", "label": "장소", "type": "text", "required": true, "source": "assembly"},
    {"name": "agenda_summary", "label": "안건 요약", "type": "text", "required": false, "source": "static"},
    {"name": "agenda_list", "label": "안건 목록 HTML", "type": "text", "required": false, "source": "static"},
    {"name": "current_date", "label": "공고일", "type": "date", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '총회 소집 공고문 — 전체 조합원 대상 공시용',
  '도시정비법 제45조',
  false,
  '{}',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- 2. 소집통지서 (INDIVIDUAL_NOTICE) — 개인화 필드 포함
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'INDIVIDUAL_NOTICE',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">총 회 소 집 통 지 서</h1>

<p style="margin-bottom: 10px;">수신: {{member_name}} 귀하</p>
<p style="margin-bottom: 20px; color: #666;">주소: {{member_address}}</p>

<p style="margin-bottom: 20px;">{{union_name}} 조합원이신 귀하에게 아래와 같이 총회 소집을 통지합니다.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">총회명</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_title}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">일시</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_date | date}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">장소</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_venue}}</td></tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">안건</h2>
<p>{{agenda_list}}</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">서면결의권 행사 안내</h2>
<p style="margin-bottom: 10px;">총회에 직접 참석하지 못하시는 경우, 아래의 방법으로 의결권을 행사하실 수 있습니다:</p>
<ol style="margin-bottom: 20px; padding-left: 20px;">
<li><strong>전자투표:</strong> 별도 안내되는 링크를 통해 온라인으로 투표</li>
<li><strong>서면결의서:</strong> 동봉된 서면결의서를 작성하여 총회 전일까지 제출</li>
<li><strong>위임장:</strong> 대리인에게 위임하여 참석</li>
</ol>

<p style="text-align: center; margin-top: 40px;">{{current_date | date}}</p>
<p style="text-align: center; font-weight: bold; margin-top: 20px;">{{union_name}}</p>
<p style="text-align: center;">조합장 (인)</p>
</div>',
  '[
    {"name": "member_name", "label": "조합원 성명", "type": "text", "required": true, "source": "snapshot"},
    {"name": "member_address", "label": "조합원 주소", "type": "text", "required": false, "source": "snapshot"},
    {"name": "union_name", "label": "조합명", "type": "text", "required": true, "source": "union_info"},
    {"name": "assembly_title", "label": "총회명", "type": "text", "required": true, "source": "assembly"},
    {"name": "assembly_date", "label": "총회 일시", "type": "date", "required": true, "source": "assembly"},
    {"name": "assembly_venue", "label": "장소", "type": "text", "required": true, "source": "assembly"},
    {"name": "agenda_list", "label": "안건 목록 HTML", "type": "text", "required": false, "source": "static"},
    {"name": "current_date", "label": "통지일", "type": "date", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '개인 소집통지서 — 조합원별 개인화 발송용',
  '도시정비법 제45조',
  false,
  '{}',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- 3. 의안서 (AGENDA_EXPLANATION)
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'AGENDA_EXPLANATION',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 30px;">의 안 서</h1>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">안건명</td><td style="border: 1px solid #333; padding: 10px;">{{agenda_title}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">안건 유형</td><td style="border: 1px solid #333; padding: 10px;">{{agenda_type}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">의결 정족수</td><td style="border: 1px solid #333; padding: 10px;">조합원 과반수 출석, 출석 조합원 과반수 찬성</td></tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">1. 제안 사유</h2>
<p style="margin-bottom: 20px;">(제안 사유를 입력하세요)</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">2. 주요 내용</h2>
<p style="margin-bottom: 20px;">(주요 내용을 입력하세요)</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">3. 기대 효과</h2>
<p style="margin-bottom: 20px;">(기대 효과를 입력하세요)</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">4. 첨부 자료</h2>
<p style="margin-bottom: 20px;">(관련 자료가 있는 경우 첨부하세요)</p>
</div>',
  '[
    {"name": "agenda_title", "label": "안건명", "type": "text", "required": true, "source": "static"},
    {"name": "agenda_type", "label": "안건 유형", "type": "text", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '안건별 의안서 — TipTap 에디터 기본 템플릿',
  NULL,
  false,
  '{}',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- 4. 서면결의서 (WRITTEN_RESOLUTION)
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'WRITTEN_RESOLUTION',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 30px;">서 면 결 의 서</h1>

<p style="margin-bottom: 20px;">본인은 {{union_name}}의 조합원으로서, {{assembly_title}}에 직접 참석하지 못하여 아래와 같이 서면으로 의결권을 행사합니다.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">조합원 성명</td><td style="border: 1px solid #333; padding: 10px;">{{member_name}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">총회명</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_title}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">총회 일시</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_date | date}}</td></tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px;">의결 내용</h2>
<p style="margin-bottom: 20px;">{{agenda_list}}</p>

<p style="margin-top: 30px;">위와 같이 서면결의합니다.</p>
<p style="text-align: center; margin-top: 30px;">{{current_date | date}}</p>
<p style="text-align: center; margin-top: 20px;">성명: {{member_name}} (서명 또는 인)</p>
</div>',
  '[
    {"name": "union_name", "label": "조합명", "type": "text", "required": true, "source": "union_info"},
    {"name": "assembly_title", "label": "총회명", "type": "text", "required": true, "source": "assembly"},
    {"name": "assembly_date", "label": "총회 일시", "type": "date", "required": true, "source": "assembly"},
    {"name": "member_name", "label": "조합원 성명", "type": "text", "required": true, "source": "snapshot"},
    {"name": "agenda_list", "label": "안건 목록", "type": "text", "required": false, "source": "static"},
    {"name": "current_date", "label": "작성일", "type": "date", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '서면결의서 — 조합원 서면 의결권 행사용',
  '도시정비법 제45조',
  true,
  '["MEMBER"]',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- 5. 위임장 (PROXY_FORM)
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'PROXY_FORM',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 30px;">위 임 장</h1>

<p style="margin-bottom: 20px;">본인은 {{union_name}}의 조합원으로서, {{assembly_title}}에 직접 참석하지 못하여 아래의 대리인에게 의결권 행사를 위임합니다.</p>

<h2 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px;">위임자 (조합원)</h2>
<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">성명</td><td style="border: 1px solid #333; padding: 10px;">{{member_name}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">주소</td><td style="border: 1px solid #333; padding: 10px;">{{member_address}}</td></tr>
</table>

<h2 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px;">수임자 (대리인)</h2>
<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">성명</td><td style="border: 1px solid #333; padding: 10px;">(대리인 성명)</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">관계</td><td style="border: 1px solid #333; padding: 10px;">(관계)</td></tr>
</table>

<h2 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px;">위임 범위</h2>
<p style="margin-bottom: 10px;">{{assembly_title}}의 전체 안건에 대한 의결권 행사</p>

<p style="margin-top: 30px;">위와 같이 위임합니다.</p>
<p style="text-align: center; margin-top: 30px;">{{current_date | date}}</p>
<p style="text-align: center; margin-top: 20px;">위임자: {{member_name}} (서명 또는 인)</p>
</div>',
  '[
    {"name": "union_name", "label": "조합명", "type": "text", "required": true, "source": "union_info"},
    {"name": "assembly_title", "label": "총회명", "type": "text", "required": true, "source": "assembly"},
    {"name": "member_name", "label": "조합원 성명", "type": "text", "required": true, "source": "snapshot"},
    {"name": "member_address", "label": "조합원 주소", "type": "text", "required": false, "source": "snapshot"},
    {"name": "current_date", "label": "작성일", "type": "date", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '위임장 — 대리 참석 위임 문서',
  '도시정비법 제45조',
  true,
  '["MEMBER"]',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- 6. 의사록 (MINUTES)
INSERT INTO document_templates (template_type, html_template, merge_field_schema, version, description, legal_basis, requires_signatures, required_signer_roles, signature_threshold, is_active)
VALUES (
  'MINUTES',
  '<div style="font-family: ''Noto Sans KR'', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">총 회 의 사 록</h1>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="border: 1px solid #333; padding: 10px; width: 150px; background: #f5f5f5; font-weight: bold;">조합명</td><td style="border: 1px solid #333; padding: 10px;">{{union_name}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">총회명</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_title}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">일시</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_date | date}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">장소</td><td style="border: 1px solid #333; padding: 10px;">{{assembly_venue}}</td></tr>
<tr><td style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: bold;">총 조합원수</td><td style="border: 1px solid #333; padding: 10px;">{{total_members}}명</td></tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">1. 개회 선언</h2>
<p style="margin-bottom: 20px;">(개회 선언 내용)</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">2. 안건 심의 및 의결</h2>
<p style="margin-bottom: 20px;">{{agenda_list}}</p>

<h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px;">3. 폐회 선언</h2>
<p style="margin-bottom: 20px;">(폐회 선언 내용)</p>

<p style="margin-top: 40px;">위 의사록은 사실과 틀림없음을 확인합니다.</p>
<p style="text-align: center; margin-top: 30px;">{{current_date | date}}</p>

<div style="margin-top: 40px;">
<p>의장: __________________ (서명)</p>
<p style="margin-top: 15px;">이사: __________________ (서명)</p>
<p style="margin-top: 15px;">감사: __________________ (서명)</p>
</div>
</div>',
  '[
    {"name": "union_name", "label": "조합명", "type": "text", "required": true, "source": "union_info"},
    {"name": "assembly_title", "label": "총회명", "type": "text", "required": true, "source": "assembly"},
    {"name": "assembly_date", "label": "총회 일시", "type": "date", "required": true, "source": "assembly"},
    {"name": "assembly_venue", "label": "장소", "type": "text", "required": true, "source": "assembly"},
    {"name": "total_members", "label": "총 조합원수", "type": "number", "required": false, "source": "assembly"},
    {"name": "agenda_list", "label": "안건 심의 결과", "type": "text", "required": false, "source": "static"},
    {"name": "current_date", "label": "작성일", "type": "date", "required": true, "source": "static"}
  ]'::jsonb,
  1,
  '총회 의사록 — 법정 필수 문서',
  '도시정비법 제45조 제6항',
  true,
  '["CHAIRPERSON", "DIRECTOR", "AUDITOR"]',
  3,
  true
)
ON CONFLICT DO NOTHING;
