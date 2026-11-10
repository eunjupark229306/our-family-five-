우리집 다섯식구 - 구글 로그인 시작 프로젝트

중요: 이 파일은 앱의 시작 버전입니다.
현재 포함된 기능:
- 모바일 화면 기본 디자인
- Google 로그인 연결 코드 (Supabase OAuth)
- 가족 데이터 테이블에 메모 저장/불러오기
- 6개 메뉴의 기본 화면
- PWA manifest

아직 구현되지 않은 기능:
- 식단표 사진 업로드 및 자동 메뉴 인식(OCR/AI)
- 실제 장보기/냉장고 재료 관리
- 아이들 성장 그래프
- 가족 일정 달력
- 수입/지출 통계 가계부
- 집안일 체크리스트
이 기능들은 배포 후 단계별로 추가합니다.

초보자 안내:
1. 이 ZIP 전체를 PC 또는 온라인 코드 저장소/배포 서비스에 올려야 합니다.
2. 프로젝트 루트에 .env 파일을 만들고 .env.example의 항목을 채웁니다.
   VITE_SUPABASE_URL = Supabase Project URL
   VITE_SUPABASE_PUBLISHABLE_KEY = Supabase Publishable key
3. Supabase Authentication > URL Configuration에서 실제 배포 주소를 Site URL과 Redirect URLs에 추가합니다.
4. Google Cloud OAuth 웹 클라이언트에도 실제 앱 주소(origin)를 Authorized JavaScript origins에 추가합니다.
5. Client Secret은 앱 코드나 .env 파일에 넣지 않습니다. Supabase Google Provider 설정에만 둡니다.

현재는 휴대폰에서 ZIP을 다운로드한 단계입니다. 다음 단계는 ZIP 압축을 풀고 웹에 배포하는 것입니다.
Supabase의 localhost URL은 개발용 임시 설정이며, 실제 배포 후 반드시 실제 도메인으로 변경해야 합니다.
