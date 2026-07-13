const DEFAULT_KAKAO_JS_KEY = '9a75b8f0e12044be3f4588a0f3c728b5';

const state = {
  workbook: null,
  sheetName: null,
  fileName: '',
  rows: [],
  places: [],
  filter: 'mapped',
  kakaoLoadedKey: null,
  map: null,
  markers: [],
  activeOverlay: null,
  mapClickListenerAdded: false,
  currentFetchController: null,
  fetchTimer: null,
  loadingTimer: null,
  loadingMessage: '',
  mapReady: false,
  viewMode: 'table',
  sortMode: 'dateDesc',
  activeRowId: null,
  autoMapAfterParse: false,
  isMakingMap: false,
};

const els = {
  fileInput: document.getElementById('fileInput'),
  selectFileButton: document.getElementById('selectFileButton'),
  dropZone: document.getElementById('dropZone'),
  sheetRow: document.getElementById('sheetRow'),
  sheetSelect: document.getElementById('sheetSelect'),
  parseButton: document.getElementById('parseButton'),
  kakaoKeyInput: document.getElementById('kakaoKeyInput'),
  regionHintInput: document.getElementById('regionHintInput'),
  agencyInput: document.getElementById('agencyInput'),
  makeMapButton: document.getElementById('makeMapButton'),
  saveKeyButton: document.getElementById('saveKeyButton'),
  clearButton: document.getElementById('clearButton'),
  countStat: document.getElementById('countStat'),
  amountStat: document.getElementById('amountStat'),
  placeStat: document.getElementById('placeStat'),
  reviewStat: document.getElementById('reviewStat'),
  excludedStat: document.getElementById('excludedStat'),
  map: document.getElementById('map'),
  resultList: document.getElementById('resultList'),
  downloadCsvButton: document.getElementById('downloadCsvButton'),
  toast: document.getElementById('toast'),
  siteSourceSelect: document.getElementById('siteSourceSelect'),
  siteYearMonthInput: document.getElementById('siteYearMonthInput'),
  siteYearInput: document.getElementById('siteYearInput'),
  siteMonthInput: document.getElementById('siteMonthInput'),
  siteAgencyInput: document.getElementById('siteAgencyInput'),
  autoExcelButton: document.getElementById('autoExcelButton'),
  fetchSiteButton: document.getElementById('fetchSiteButton'),
  loadLatestButton: document.getElementById('loadLatestButton'),
  directUrlInput: document.getElementById('directUrlInput'),
  directFetchButton: document.getElementById('directFetchButton'),
  siteStatus: document.getElementById('siteStatus'),
  siteCandidateList: document.getElementById('siteCandidateList'),
  siteCard: document.getElementById('site-card'),
  querySummary: document.getElementById('querySummary'),
  querySummaryText: document.getElementById('querySummaryText'),
  expandSiteButton: document.getElementById('expandSiteButton'),
  collapseSiteButton: document.getElementById('collapseSiteButton'),
  closeSiteButton: document.getElementById('closeSiteButton'),
  reopenSiteButton: document.getElementById('reopenSiteButton'),
  agencyComboButton: document.getElementById('agencyComboButton'),
  agencySuggestionList: document.getElementById('agencySuggestionList'),
  keyDetails: document.getElementById('keyDetails'),
  keyStatusText: document.getElementById('keyStatusText'),
  uploadDetails: document.getElementById('uploadDetails'),
  stopFetchButton: document.getElementById('stopFetchButton'),
  resetFlowButton: document.getElementById('resetFlowButton'),
  siteActionRow: document.getElementById('siteActionRow'),
  makeMapInlineButton: document.getElementById('makeMapInlineButton'),
  retryFetchButton: document.getElementById('retryFetchButton'),
  publicSiteLink: document.getElementById('publicSiteLink'),
  heroPublicSiteLink: document.getElementById('heroPublicSiteLink'),
  configPanel: document.getElementById('configPanel'),
  statsGrid: document.getElementById('statsGrid'),
  mapLayout: document.getElementById('mapLayout'),
  resultSummaryGrid: document.getElementById('resultSummaryGrid'),
  summaryTotal: document.getElementById('summaryTotal'),
  summaryMapped: document.getElementById('summaryMapped'),
  summaryReview: document.getElementById('summaryReview'),
  summaryExcluded: document.getElementById('summaryExcluded'),
  summaryAmount: document.getElementById('summaryAmount'),
  resultSortSelect: document.getElementById('resultSortSelect'),
  cardViewButton: document.getElementById('cardViewButton'),
  tableViewButton: document.getElementById('tableViewButton'),
  agencyComboWrap: document.getElementById('agencyComboWrap'),
  flowPanel: document.getElementById('flowPanel'),
  flowMessage: document.getElementById('flowMessage'),
  siteStatusDetails: document.getElementById('siteStatusDetails'),
  selectedPlacePanel: document.getElementById('selectedPlacePanel'),
};

const BOARD_LIST_URLS = {
  chief: 'https://open.sen.go.kr/fus/MI000000000000000511/board/BO00000225/ctgynone/list0010v.do',
  vice: 'https://open.sen.go.kr/fus/MI000000000000000512/board/BO00000226/ctgynone/list0010v.do',
  org: 'https://open.sen.go.kr/fus/MI000000000000000513/board/BO00000227/ctgynone/list0010v.do',
};

const SOURCE_LABELS = {
  chief: '교육감 업무추진비',
  vice: '부교육감 업무추진비',
  org: '본청·교육지원청·직속기관',
};

const AGENCY_GROUP_ORDER = ['본청', '교육지원청', '직속기관', '도서관·평생학습관', '본청 부서'];

const AGENCY_OPTIONS = [
  { name: '서울시교육청본청', group: '본청' },
  { name: '본청', group: '본청' },
  { name: '서울특별시교육청', group: '본청' },

  // 교육지원청
  { name: '동부교육지원청', group: '교육지원청' },
  { name: '서부교육지원청', group: '교육지원청' },
  { name: '남부교육지원청', group: '교육지원청' },
  { name: '북부교육지원청', group: '교육지원청' },
  { name: '중부교육지원청', group: '교육지원청' },
  { name: '강동송파교육지원청', group: '교육지원청' },
  { name: '강서양천교육지원청', group: '교육지원청' },
  { name: '강남서초교육지원청', group: '교육지원청' },
  { name: '동작관악교육지원청', group: '교육지원청' },
  { name: '성동광진교육지원청', group: '교육지원청' },
  { name: '성북강북교육지원청', group: '교육지원청' },

  // 직속기관
  { name: '교육연구정보원', group: '직속기관' },
  { name: '융합과학교육원', group: '직속기관' },
  { name: '교육연수원', group: '직속기관' },
  { name: '학생교육원', group: '직속기관' },
  { name: '유아교육진흥원', group: '직속기관' },
  { name: '보건안전진흥원', group: '직속기관' },
  { name: '학생체육관', group: '직속기관' },
  { name: '교육시설관리본부', group: '직속기관' },

  // 도서관·평생학습관
  { name: '고덕평생학습관', group: '도서관·평생학습관' },
  { name: '노원평생학습관', group: '도서관·평생학습관' },
  { name: '마포평생학습관', group: '도서관·평생학습관' },
  { name: '영등포평생학습관', group: '도서관·평생학습관' },
  { name: '강남도서관', group: '도서관·평생학습관' },
  { name: '강동도서관', group: '도서관·평생학습관' },
  { name: '강서도서관', group: '도서관·평생학습관' },
  { name: '개포도서관', group: '도서관·평생학습관' },
  { name: '고척도서관', group: '도서관·평생학습관' },
  { name: '구로도서관', group: '도서관·평생학습관' },
  { name: '남산도서관', group: '도서관·평생학습관' },
  { name: '도봉도서관', group: '도서관·평생학습관' },
  { name: '동대문도서관', group: '도서관·평생학습관' },
  { name: '동작도서관', group: '도서관·평생학습관' },
  { name: '서대문도서관', group: '도서관·평생학습관' },
  { name: '송파도서관', group: '도서관·평생학습관' },
  { name: '양천도서관', group: '도서관·평생학습관' },
  { name: '어린이도서관', group: '도서관·평생학습관' },
  { name: '용산도서관', group: '도서관·평생학습관' },
  { name: '정독도서관', group: '도서관·평생학습관' },
  { name: '종로도서관', group: '도서관·평생학습관' },

  // 본청 산하 부서
  { name: '대변인', group: '본청 부서' },
  { name: '감사관', group: '본청 부서' },
  { name: '총무과', group: '본청 부서' },
  { name: '안전총괄담당관', group: '본청 부서' },
  { name: '유보통합추진단', group: '본청 부서' },
  { name: '정책기획관', group: '본청 부서' },
  { name: '예산담당관', group: '본청 부서' },
  { name: '행정관리담당관', group: '본청 부서' },
  { name: '학생맞춤지원담당관', group: '본청 부서' },
  { name: '노사협력담당관', group: '본청 부서' },
  { name: '교육협력담당관', group: '본청 부서' },
  { name: '창의미래교육과', group: '본청 부서' },
  { name: '유아교육과', group: '본청 부서' },
  { name: '초등교육과', group: '본청 부서' },
  { name: '중등교육과', group: '본청 부서' },
  { name: '학생역량·혁신교육과', group: '본청 부서' },
  { name: '평생교육과', group: '본청 부서' },
  { name: '민주시민교육과', group: '본청 부서' },
  { name: '진로직업교육과', group: '본청 부서' },
  { name: '체육건강예술교육과', group: '본청 부서' },
  { name: '특수교육과', group: '본청 부서' },
  { name: '학교지원과', group: '본청 부서' },
  { name: '교육재정과', group: '본청 부서' },
  { name: '교육시설안전과', group: '본청 부서' },
  { name: '미래학교추진단', group: '본청 부서' },
];

const headerRules = {
  date: ['사용일자', '사용일시', '집행일자', '집행일시', '일자', '일시', '일'],
  time: ['사용시간', '집행시간', '시간'],
  place: ['사용장소', '사용처', '집행장소', '집행처', '장소', '업소명', '상호', '상호명', '가맹점명', '거래처', '사용내역'],
  amount: ['집행금액', '사용금액', '금액', '결제금액', '지출액', '집행액'],
  purpose: ['집행목적', '사용목적', '목적', '내용', '집행내용', '내역'],
  method: ['결제방법', '지급방법', '집행방법', '방법', '구분'],
  target: ['집행대상', '집행대상(참석자)', '대상', '인원', '참석자'],
  department: ['부서명', '기관명', '소속', '부서', '담당부서'],
};

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function displayValue(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function compactText(...values) {
  return values.map(value => normalize(value).toLowerCase()).join(' ');
}

const shoppingMallKeywords = [
  '쿠팡', 'g마켓', '지마켓', '옥션', '11번가', '십일번가', '네이버페이', '네이버쇼핑',
  '스마트스토어', '스토어팜', 'ssg', '쓱닷컴', '롯데on', '롯데온', '위메프', '티몬',
  '인터파크', '알라딘', '예스24', 'yes24', '교보문고온라인', '카카오톡선물하기',
  '카카오선물하기', '온라인몰', '인터넷쇼핑', '쇼핑몰', '이커머스', 'e커머스'
];

const familyEventKeywords = [
  '경조사', '경조사비', '경조금', '축의금', '조의금', '부의금', '부조금', '부조',
  '근조', '화환', '조화', '혼의', '조위금', '조문', '결혼축하', '장례', '부고',
  '상가', '문상', '위로금'
];

const personalPaymentKeywords = [
  '현금전달', '현금지급', '개인지급', '개인에게지급', '직원격려금', '격려금지급',
  '포상금', '상품권지급', '전별금', '위문금', '격려물품전달'
];

function includesKeyword(text, keywords) {
  return keywords.some(keyword => text.includes(normalize(keyword).toLowerCase()));
}


function extractParentheticalSegments(text) {
  const source = displayValue(text).replace(/[（]/g, '(').replace(/[）]/g, ')');
  const segments = [];
  let depth = 0;
  let buffer = '';
  for (const char of source) {
    if (char === '(') {
      if (depth > 0) buffer += char;
      depth += 1;
      continue;
    }
    if (char === ')') {
      if (depth > 1) buffer += char;
      depth -= 1;
      if (depth === 0 && buffer.trim()) {
        segments.push(buffer.trim());
        buffer = '';
      }
      if (depth < 0) depth = 0;
      continue;
    }
    if (depth > 0) buffer += char;
  }
  return segments;
}

function looksLikeAddressOnly(text) {
  const value = displayValue(text);
  if (!value) return false;
  const compact = normalize(value);
  return /^(서울|경기|경기도|인천|강원|충북|충청|전북|전라|경북|경상|부산|대구|광주|대전|울산|세종|제주)/.test(compact)
    || /(시|군|구).*(로|길|동|읍|면|리)\d*/.test(compact);
}

function cleanBusinessCandidate(value) {
  let text = displayValue(value)
    .replace(/[［\[【].*?[］\]】]/g, ' ')
    .replace(/^(구입처|구매처|사용처|사용장소|집행처|집행장소|업소명|상호명?)\s*[:：-]?\s*/i, '')
    .replace(/^(인근\s*)?(식당|음식점|카페)\s*[:：-]?\s*/i, '')
    .replace(/^구입처\s*/i, '')
    .replace(/^구매처\s*/i, '')
    .replace(/\b및\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // 엑셀에 자주 섞이는 '구입처 카페명' 같은 앞말을 한 번 더 정리합니다.
  text = text.replace(/^(구입처|구매처)\s+/i, '').trim();
  // 법인 표기는 지도 검색에서 방해될 때가 많아 약하게 정리합니다.
  text = text.replace(/\(주\)|㈜|주식회사/g, '').replace(/\s+/g, ' ').trim();
  return text;
}

function splitBusinessCandidates(text) {
  return displayValue(text)
    .split(/[,，\/·]|\s+및\s+/)
    .map(cleanBusinessCandidate)
    .filter(Boolean);
}

function derivePlaceSearchInfo(place) {
  const original = displayValue(place);
  if (!original) return { searchPlace: '', multiple: false, reason: '' };

  const segments = extractParentheticalSegments(original)
    .filter(segment => segment && !looksLikeAddressOnly(segment));

  if (segments.length) {
    const candidates = segments.flatMap(splitBusinessCandidates)
      .filter(candidate => candidate && !looksLikeAddressOnly(candidate));
    const unique = [...new Set(candidates.map(cleanBusinessCandidate).filter(Boolean))];
    if (unique.length > 1) {
      return {
        searchPlace: unique[0],
        multiple: true,
        reason: `괄호 안에 여러 사용처가 있어 확인이 필요해요: ${unique.slice(0, 3).join(', ')}`,
      };
    }
    if (unique.length === 1) {
      return {
        searchPlace: unique[0],
        multiple: false,
        reason: original.includes(unique[0]) && original !== unique[0]
          ? `괄호 안 실제 사용처(${unique[0]})를 우선 검색해요.`
          : '',
      };
    }
  }

  const cleaned = cleanBusinessCandidate(original);
  return { searchPlace: cleaned, multiple: false, reason: cleaned !== original ? `정리한 사용처명(${cleaned})으로 검색해요.` : '' };
}

function looksLikeInternalRoomLabel(place) {
  const text = normalize(place).toLowerCase();
  return /(교육장실|회의실|소회의실|중회의실|상황실|사무실|부속실|관내식당|인근식당|인근음식점)/.test(text);
}

function getExclusionReason(place, method, purpose, target) {
  const text = compactText(place, method, purpose, target);
  const placeText = normalize(place).toLowerCase();
  const methodText = normalize(method).toLowerCase();

  if (includesKeyword(text, familyEventKeywords)) {
    return '경조사비·조의금·축의금 성격으로 보여 지도화 대상에서 제외했어요.';
  }

  if (methodText.includes('현금') && !placeText) {
    return '현금 지급 항목이고 사용장소가 없어 지도화 대상에서 제외했어요.';
  }

  if (methodText.includes('현금') && includesKeyword(text, personalPaymentKeywords)) {
    return '개인에게 지급된 현금성 항목으로 보여 지도화 대상에서 제외했어요.';
  }

  if (includesKeyword(text, personalPaymentKeywords)) {
    return '개인 지급·격려금·상품권 지급 성격으로 보여 지도화 대상에서 제외했어요.';
  }

  if (includesKeyword(placeText, shoppingMallKeywords)) {
    return '온라인 쇼핑몰·플랫폼 결제 항목으로 보여 지도화 대상에서 제외했어요.';
  }

  return '';
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatWon(value) {
  return `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
}

function showToast(message) {
  const text = String(message || '');
  els.toast.textContent = text.length > 70 ? `${text.slice(0, 70)}…` : text;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 3000);
}

function getHeaderHits(row) {
  const hits = {};
  row.forEach(cell => {
    const cellText = normalize(cell);
    if (!cellText) return;
    Object.entries(headerRules).forEach(([key, keywords]) => {
      if (hits[key]) return;
      if (keywords.some(keyword => cellText === normalize(keyword) || cellText.includes(normalize(keyword)))) {
        hits[key] = true;
      }
    });
  });
  return hits;
}

function findHeaderRow(matrix) {
  let best = { index: -1, score: 0, hits: {} };
  const scanLimit = Math.min(matrix.length, 80);

  for (let index = 0; index < scanLimit; index += 1) {
    const row = matrix[index] || [];
    const hits = getHeaderHits(row);
    let score = 0;

    if (hits.date) score += 2;
    if (hits.place) score += 4;
    if (hits.amount) score += 3;
    if (hits.purpose) score += 2;
    if (hits.method) score += 1;
    if (hits.target) score += 1;
    if (hits.time) score += 1;

    const compact = row.map(normalize).join('|');
    if (/^(구분|건수|금액|비율)/.test(compact)) score -= 3;
    if (compact.includes('세부집행내역')) score -= 2;
    if (score > best.score) best = { index, score, hits };
  }

  return best.score >= 7 ? best.index : -1;
}

function mapColumns(headers) {
  const result = {};
  headers.forEach((header, index) => {
    const headerText = normalize(header);
    if (!headerText) return;
    Object.entries(headerRules).forEach(([key, keywords]) => {
      if (result[key] !== undefined) return;
      if (keywords.some(keyword => headerText === normalize(keyword) || headerText.includes(normalize(keyword)))) {
        result[key] = index;
      }
    });
  });
  return result;
}

function getCell(row, index) {
  if (index === undefined || index < 0) return '';
  return displayValue(row[index]);
}

function getRawCell(row, index) {
  if (index === undefined || index < 0) return '';
  return row[index];
}

function excelDateToDate(serial) {
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateCell(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const date = excelDateToDate(value);
    if (date) return date.toISOString().slice(0, 10);
  }
  const text = displayValue(value);
  const numeric = Number(text);
  if (/^\d{5}(\.\d+)?$/.test(text) && numeric > 30000 && numeric < 60000) {
    const date = excelDateToDate(numeric);
    if (date) return date.toISOString().slice(0, 10);
  }
  return text;
}

function formatTimeCell(value) {
  if (typeof value === 'number' && value > 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const hour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const minute = String(totalMinutes % 60).padStart(2, '0');
    return `${hour}:${minute}`;
  }
  const text = displayValue(value);
  const numeric = Number(text);
  if (/^0?\.\d+$/.test(text) && numeric > 0 && numeric < 1) {
    return formatTimeCell(numeric);
  }
  return text;
}

function inferAgencyFromMatrix(matrix) {
  for (const row of matrix.slice(0, 15)) {
    const cells = row.map(displayValue);
    const joined = cells.join(' ');
    if (joined.includes('부서명')) {
      const idx = cells.findIndex(cell => cell.includes('부서명'));
      const next = cells.slice(idx + 1).find(Boolean);
      if (next) return next.replace(/^[:：]\s*/, '').trim();
    }
    const title = cells.find(cell => /업무추진비\s*사용내역/.test(cell));
    if (title) {
      return title
        .replace(/^\d{4}년\s*\d{1,2}월\s*/, '')
        .replace(/업무추진비\s*사용내역.*$/, '')
        .trim();
    }
  }

  return state.fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+\.?\+?/, '')
    .replace(/\+/g, ' ')
    .replace(/^\d{4}년\s*\d{1,2}월\s*/, '')
    .replace(/업무추진비\s*사용내역.*$/, '')
    .trim();
}

function isSummaryOrBlankRow(row) {
  const cells = row.map(displayValue).filter(Boolean);
  const combined = cells.join(' ');
  if (!combined.trim()) return true;

  const normalizedCells = cells.map(cell => normalize(cell).replace(/[.:：]/g, ''));
  const compact = normalize(combined).replace(/[.:：]/g, '');

  // 공개 엑셀은 '합계', '합 계', '소계', '총계', '일시 합계' 같은 행이 섞여 들어올 수 있어 지도화 대상에서 제외합니다.
  if (normalizedCells.some(cell => ['합계', '소계', '총계', '계'].includes(cell))) return true;
  if (/(일시)?합계|소계|총계/.test(compact)) return true;
  if (/^(건수|금액|비율)$/.test(compact)) return true;
  return false;
}

function classifyInitialRow(place, method, purpose, target) {
  const placeText = displayValue(place);
  const exclusionReason = getExclusionReason(place, method, purpose, target);
  if (exclusionReason) return { status: 'excluded', reason: exclusionReason, skipGeocode: true };

  const searchInfo = derivePlaceSearchInfo(placeText);
  if (!placeText) return { status: 'review', reason: '사용장소가 비어 있어요.', skipGeocode: true, searchPlace: '' };
  if (searchInfo.multiple) return { status: 'review', reason: searchInfo.reason, skipGeocode: true, searchPlace: searchInfo.searchPlace };
  if (/외\s*\d+\s*곳/.test(placeText)) {
    return { status: 'review', reason: '여러 사용처가 한 칸에 묶여 있어 확인이 필요해요.', skipGeocode: true, searchPlace: searchInfo.searchPlace };
  }
  if (/[，,\/]/.test(placeText) && !searchInfo.reason) {
    return { status: 'review', reason: '여러 사용장소가 한 칸에 있어 확인이 필요해요.', skipGeocode: true, searchPlace: searchInfo.searchPlace };
  }
  if (looksLikeInternalRoomLabel(placeText) && !searchInfo.reason && !/(식당|카페|커피|정육|횟집|한우|분식|베이커리|제과|치킨|피자|포차|호프|가든|회관|뷔페)/.test(normalize(placeText))) {
    return { status: 'review', reason: '교육장실·회의실만 적혀 있어 실제 사용처 확인이 필요해요.', skipGeocode: true, searchPlace: searchInfo.searchPlace };
  }
  if (/\d+\s*명/.test(placeText) && !/(점|식당|카페|커피|호텔|회관|관|집|당|정|소|센터)$/.test(placeText)) {
    return { status: 'review', reason: '장소가 아니라 대상/인원처럼 보여 확인이 필요해요.', skipGeocode: true, searchPlace: searchInfo.searchPlace };
  }

  return { status: 'pending', reason: searchInfo.reason || '지도 검색 전', skipGeocode: false, searchPlace: searchInfo.searchPlace };
}

function getAgencyDistrictHints(agency) {
  const text = normalize(agency);
  const hints = [];
  const add = values => values.forEach(value => { if (!hints.includes(value)) hints.push(value); });
  if (text.includes('남부')) add(['구로', '금천', '영등포']);
  if (text.includes('동작관악')) add(['동작', '관악']);
  if (text.includes('강남서초')) add(['강남', '서초']);
  if (text.includes('강동송파')) add(['강동', '송파']);
  if (text.includes('성동광진')) add(['성동', '광진']);
  if (text.includes('성북강북')) add(['성북', '강북']);
  if (text.includes('강서양천')) add(['강서', '양천']);
  if (text.includes('동부')) add(['동대문', '중랑']);
  if (text.includes('서부')) add(['은평', '서대문', '마포']);
  if (text.includes('북부')) add(['노원', '도봉']);
  if (text.includes('중부')) add(['종로', '중구', '용산']);
  ['종로', '용산', '강남', '서초', '동작', '관악', '강동', '송파', '성북', '강북', '구로', '금천', '영등포'].forEach(gu => {
    if (text.includes(gu)) add([gu]);
  });
  return hints;
}

function buildSearchKeywords(row, region) {
  const primaryPlace = displayValue(row.searchPlace || row.place);
  const originalPlace = displayValue(row.place);
  const agency = displayValue(row.department || els.agencyInput.value);
  const districts = getAgencyDistrictHints(agency);
  const keywords = [];
  const push = value => {
    const keyword = displayValue(value);
    if (keyword && !keywords.includes(keyword)) keywords.push(keyword);
  };

  districts.slice(0, 3).forEach(gu => push(`${primaryPlace} ${gu}`));
  push(`${primaryPlace} ${region}`);
  push(primaryPlace);
  if (originalPlace && originalPlace !== primaryPlace) push(`${originalPlace} ${region}`);

  return keywords.filter(Boolean);
}


function parseRowsFromSheet(sheetName, idPrefix = '') {
  const sheet = state.workbook?.Sheets?.[sheetName];
  if (!sheet) {
    return { rows: [], errors: [`${sheetName}: 시트를 찾지 못했어요.`], info: [] };
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  if (!matrix.length) {
    return { rows: [], errors: [`${sheetName}: 읽을 내용이 없습니다.`], info: [] };
  }

  const headerIndex = findHeaderRow(matrix);
  if (headerIndex < 0) {
    return { rows: [], errors: [`${sheetName}: 표 머리글을 찾지 못했어요.`], info: [] };
  }

  const headers = matrix[headerIndex].map(displayValue);
  const columns = mapColumns(headers);
  if (columns.place === undefined || columns.amount === undefined) {
    return { rows: [], errors: [`${sheetName}: 집행장소 또는 금액 열을 찾지 못했어요.`], info: [] };
  }

  const userAgency = els.agencyInput.value.trim();
  const inferredAgency = inferAgencyFromMatrix(matrix) || inferAgencyFromFilename();
  const sheetLabel = displayValue(sheetName);
  let defaultDepartment = userAgency || inferredAgency || '';

  if (sheetLabel && state.sheetName === '__ALL__') {
    if (userAgency && !normalize(userAgency).includes(normalize(sheetLabel))) {
      defaultDepartment = `${userAgency} · ${sheetLabel}`;
    } else if (inferredAgency && !normalize(inferredAgency).includes(normalize(sheetLabel))) {
      defaultDepartment = `${inferredAgency} · ${sheetLabel}`;
    } else if (!defaultDepartment) {
      defaultDepartment = sheetLabel;
    }
  }

  const rows = matrix.slice(headerIndex + 1)
    .filter(row => !isSummaryOrBlankRow(row))
    .map((row, i) => {
      const date = formatDateCell(getRawCell(row, columns.date));
      const time = formatTimeCell(getRawCell(row, columns.time));
      const place = getCell(row, columns.place);
      const amount = toNumber(getRawCell(row, columns.amount));
      const purpose = getCell(row, columns.purpose);
      const method = getCell(row, columns.method);
      const target = getCell(row, columns.target);
      const initial = classifyInitialRow(place, method, purpose, target);
      const rowDepartment = getCell(row, columns.department) || defaultDepartment;

      return {
        id: `row-${idPrefix}${i}`,
        sourceSheet: sheetName,
        date: [date, time].filter(Boolean).join(' '),
        place,
        amount,
        purpose,
        method,
        target,
        department: rowDepartment,
        raw: row,
        status: initial.status,
        reason: initial.reason,
        skipGeocode: initial.skipGeocode,
        searchPlace: initial.searchPlace || derivePlaceSearchInfo(place).searchPlace || place,
        lat: null,
        lng: null,
        address: '',
        matchedName: '',
      };
    })
    .filter(row => row.place || row.amount || row.purpose || row.date);

  return {
    rows,
    errors: [],
    info: [`${sheetName}: ${rows.length.toLocaleString('ko-KR')}건 · 장소 열 ${headers[columns.place]}`],
  };
}


function updateStageVisibility() {
  const hasRows = state.rows.length > 0;
  const showResults = hasRows && state.mapReady;
  // 자료 조건 영역은 항상 보이게 두고, 지도/요약은 지도 생성 전까지 안내 상태로 유지합니다.
  els.statsGrid?.classList.toggle('stage-hidden', !showResults);
  els.mapLayout?.classList.toggle('stage-hidden', !showResults);
}

const FLOW_ORDER = ['ready', 'fetch', 'parse', 'geocode', 'done'];

function setFlowStep(step = 'ready', message = '') {
  const safeStep = FLOW_ORDER.includes(step) ? step : 'ready';
  const currentIndex = FLOW_ORDER.indexOf(safeStep);
  document.querySelectorAll('[data-flow-step]').forEach(item => {
    const itemIndex = FLOW_ORDER.indexOf(item.dataset.flowStep);
    item.classList.toggle('done', itemIndex >= 0 && itemIndex < currentIndex);
    item.classList.toggle('active', item.dataset.flowStep === safeStep);
  });
  if (els.flowMessage) {
    els.flowMessage.textContent = message || {
      ready: '대기 중입니다. 조건을 선택하면 자료 수집부터 지도 표시까지 자동으로 진행합니다.',
      fetch: '서울 열린교육에서 공개자료를 찾고 있습니다.',
      parse: '엑셀 내용을 읽어 지도 대상과 확인필요 항목을 정리하고 있습니다.',
      geocode: '사용처 위치를 검색하고 지도에 표시할 준비를 하고 있습니다.',
      done: '지도 표시가 완료되었습니다. 마커를 눌러 장소를 확인하세요.',
    }[safeStep];
  }
}

function renderSelectedPlace(row = null) {
  if (!els.selectedPlacePanel) return;
  if (!row) {
    els.selectedPlacePanel.innerHTML = `
      <span class="panel-kicker">선택 장소</span>
      <strong>지도 마커를 누르면 이곳에 상세가 표시됩니다.</strong>
      <p>아래 목록으로 이동하지 않고 지도 안에서 바로 확인할 수 있어요.</p>
    `;
    return;
  }
  const title = row.matchedName || row.place || '사용장소';
  const address = row.address || row.reason || '';
  const dateText = row.date || '';
  const amountText = formatWon(row.amount || 0);
  els.selectedPlacePanel.innerHTML = `
    <span class="panel-kicker">선택 장소</span>
    <strong>${escapeHtml(title)}</strong>
    ${address ? `<p>${escapeHtml(address)}</p>` : ''}
    <div class="selected-meta">
      ${dateText ? `<span>${escapeHtml(dateText)}</span>` : ''}
      <span>${escapeHtml(amountText)}</span>
    </div>
    ${row.purpose ? `<p class="selected-purpose">${escapeHtml(compactText(row.purpose, 90))}</p>` : ''}
    <div class="selected-actions">
      ${address && row.lat && row.lng ? `<a class="mini-button" href="https://map.kakao.com/link/map/${encodeURIComponent(title)},${row.lat},${row.lng}" target="_blank" rel="noopener">카카오맵 열기</a>` : ''}
      ${address ? `<button class="mini-button" type="button" data-selected-copy>주소 복사</button>` : ''}
    </div>
  `;
  els.selectedPlacePanel.querySelector('[data-selected-copy]')?.addEventListener('click', () => copyText(address));
}

function parseCurrentSheet() {
  if (!state.workbook || !state.sheetName) return;

  const sheetNames = state.sheetName === '__ALL__'
    ? state.workbook.SheetNames
    : [state.sheetName];

  const parsed = sheetNames.map((name, index) => parseRowsFromSheet(name, `${index}-`));
  const rows = parsed.flatMap(item => item.rows);
  const errors = parsed.flatMap(item => item.errors);
  const info = parsed.flatMap(item => item.info);

  if (!rows.length) {
    showToast(errors[0] || '읽을 수 있는 업무추진비 세부 집행내역을 찾지 못했어요.');
    if (errors.length) console.warn('[교육청 법카맵] 시트 인식 실패', errors);
    return;
  }

  if (!els.agencyInput.value.trim()) {
    const firstSheet = state.workbook.SheetNames[0];
    const firstMatrix = XLSX.utils.sheet_to_json(state.workbook.Sheets[firstSheet], { header: 1, raw: true, defval: '' });
    const inferredAgency = inferAgencyFromMatrix(firstMatrix) || inferAgencyFromFilename();
    if (inferredAgency) els.agencyInput.value = inferredAgency;
  }

  state.rows = rows;
  state.places = rows;
  state.filter = 'mapped';
  setFlowStep('parse', `${rows.length.toLocaleString('ko-KR')}건을 읽었어요. 곧바로 위치 검색을 시작합니다.`);
  state.mapReady = false;
  els.makeMapButton.disabled = !rows.length;
  els.downloadCsvButton.disabled = !rows.length;
  setActiveFilter('mapped');
  renderAll();
  setSiteActionsVisible(Boolean(rows.length));
  updateStageVisibility();

  const excluded = rows.filter(row => row.status === 'excluded').length;
  const sheetMessage = state.sheetName === '__ALL__'
    ? `${sheetNames.length}개 시트를 합쳐 ${rows.length.toLocaleString('ko-KR')}건을 읽었어요.`
    : `${rows.length.toLocaleString('ko-KR')}건을 읽었어요.`;
  const warning = errors.length ? ` 일부 시트 제외: ${errors.length}개` : '';
  showToast(`${sheetMessage} 지도화 제외 ${excluded.toLocaleString('ko-KR')}건.${warning}`);
  console.info('[교육청 법카맵] 시트 읽기 결과', { info, errors });

  if (state.autoMapAfterParse) {
    state.autoMapAfterParse = false;
    setFlowStep('geocode', '자료를 읽었어요. 이제 사용처 위치를 자동으로 검색합니다.');
    setTimeout(() => makeMap({ automatic: true }), 120);
  }
}

function renderAll() {
  renderStats();
  renderList();
  renderMapMarkers();
}

function getResultCounts() {
  const counts = {
    all: state.rows.length,
    mapped: state.rows.filter(row => row.status === 'mapped').length,
    review: state.rows.filter(row => row.status === 'review').length,
    excluded: state.rows.filter(row => row.status === 'excluded').length,
  };
  counts.active = counts[state.filter] ?? counts.all;
  return counts;
}

function getMappedAmount() {
  return state.rows
    .filter(row => row.status === 'mapped')
    .reduce((sum, row) => sum + (row.amount || 0), 0);
}

function renderStats() {
  const mapTargetRows = state.rows.filter(row => row.status !== 'excluded');
  const totalAmount = mapTargetRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const uniquePlaces = new Set(mapTargetRows.map(row => row.place).filter(Boolean));
  const counts = getResultCounts();
  els.countStat.textContent = state.rows.length.toLocaleString('ko-KR');
  els.amountStat.textContent = formatWon(totalAmount);
  els.placeStat.textContent = uniquePlaces.size.toLocaleString('ko-KR');
  els.reviewStat.textContent = counts.review.toLocaleString('ko-KR');
  if (els.excludedStat) els.excludedStat.textContent = counts.excluded.toLocaleString('ko-KR');

  if (els.summaryTotal) els.summaryTotal.textContent = counts.all.toLocaleString('ko-KR');
  if (els.summaryMapped) els.summaryMapped.textContent = counts.mapped.toLocaleString('ko-KR');
  if (els.summaryReview) els.summaryReview.textContent = counts.review.toLocaleString('ko-KR');
  if (els.summaryExcluded) els.summaryExcluded.textContent = counts.excluded.toLocaleString('ko-KR');
  if (els.summaryAmount) els.summaryAmount.textContent = formatWon(getMappedAmount());

  document.querySelectorAll('[data-count-for]').forEach(item => {
    const key = item.getAttribute('data-count-for');
    item.textContent = (counts[key] ?? 0).toLocaleString('ko-KR');
  });
}

function filteredRows() {
  if (state.filter === 'mapped') return state.rows.filter(row => row.status === 'mapped');
  if (state.filter === 'review') return state.rows.filter(row => row.status === 'review');
  if (state.filter === 'excluded') return state.rows.filter(row => row.status === 'excluded');
  return state.rows;
}

function sortedRows(rows) {
  const list = [...rows];
  if (state.sortMode === 'amountDesc') {
    list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  } else if (state.sortMode === 'placeAsc') {
    list.sort((a, b) => String(a.place || '').localeCompare(String(b.place || ''), 'ko'));
  } else {
    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''), 'ko'));
  }
  return list;
}

function statusInfo(row) {
  if (row.status === 'mapped') return { label: '지도표시', className: 'mapped', helper: '지도에 표시할 수 있어요.' };
  if (row.status === 'review') return { label: '확인필요', className: 'review', helper: row.reason || '주소나 상호명을 확인해 주세요.' };
  if (row.status === 'excluded') return { label: '제외', className: 'excluded', helper: row.reason || '지도 표시 대상에서 제외했어요.' };
  return { label: '대기', className: 'pending', helper: row.reason || '지도 검색 전이에요.' };
}

function compactText(value, max = 74) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function renderList() {
  const rows = sortedRows(filteredRows());
  renderStats();

  if (!state.rows.length) {
    els.resultList.className = 'result-list empty-list';
    els.resultList.innerHTML = '<p>자료를 불러오면 결과가 여기에 정리됩니다.</p>';
    return;
  }

  if (!rows.length) {
    els.resultList.className = 'result-list empty-list';
    els.resultList.innerHTML = '<p>이 상태에 해당하는 결과가 없습니다.</p>';
    return;
  }

  els.resultList.className = state.viewMode === 'table' ? 'result-list table-mode' : 'result-list card-mode';
  els.resultList.innerHTML = state.viewMode === 'table' ? renderResultTable(rows) : renderResultCards(rows);

  els.resultList.querySelectorAll('[data-row-id]').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('[data-action]')) return;
      focusRowOnMap(card.dataset.rowId, { scrollToMap: true });
    });
  });

  els.resultList.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      handleResultAction(button.dataset.action, button.dataset.rowId);
    });
  });
}

function renderResultCards(rows) {
  return rows.map(row => {
    const status = statusInfo(row);
    const addressText = row.address ? `${row.matchedName || row.place || ''} · ${row.address}` : '';
    const hasMap = row.lat && row.lng;
    return `
      <article class="result-item ${status.className}" data-row-id="${escapeHtml(row.id)}">
        <div class="result-main-line">
          <div class="result-place-wrap">
            <strong class="result-place">${escapeHtml(row.place || '사용장소 없음')}</strong>
            <span class="status-badge ${status.className}">${status.label}</span>
          </div>
          <strong class="result-amount">${escapeHtml(formatWon(row.amount || 0))}</strong>
        </div>

        <div class="quick-meta">
          ${row.date ? `<span>일시 ${escapeHtml(row.date)}</span>` : ''}
          ${row.department ? `<span>기관 ${escapeHtml(row.department)}</span>` : ''}
          ${row.method ? `<span>결제 ${escapeHtml(row.method)}</span>` : ''}
        </div>

        ${row.purpose ? `<p class="result-purpose" title="${escapeHtml(row.purpose)}">${escapeHtml(compactText(row.purpose, 92))}</p>` : ''}

        <div class="result-detail-row ${status.className}">
          <span class="detail-label">${row.address ? '지도검색' : '상태사유'}</span>
          <span class="detail-value" title="${escapeHtml(addressText || status.helper)}">${escapeHtml(compactText(addressText || status.helper, 96))}</span>
        </div>

        <div class="result-actions">
          ${hasMap ? `<button class="mini-button" type="button" data-action="map" data-row-id="${escapeHtml(row.id)}">지도에서 보기</button>` : ''}
          ${row.address ? `<button class="mini-button" type="button" data-action="copy" data-row-id="${escapeHtml(row.id)}">주소 복사</button>` : ''}
          ${row.status !== 'review' ? `<button class="mini-button soft-review" type="button" data-action="review" data-row-id="${escapeHtml(row.id)}">확인필요</button>` : ''}
          ${row.status !== 'excluded' ? `<button class="mini-button soft-exclude" type="button" data-action="exclude" data-row-id="${escapeHtml(row.id)}">제외</button>` : `<button class="mini-button" type="button" data-action="restore" data-row-id="${escapeHtml(row.id)}">되돌리기</button>`}
        </div>
      </article>
    `;
  }).join('');
}

function renderResultTable(rows) {
  const body = rows.map(row => {
    const status = statusInfo(row);
    const address = row.address || row.reason || '';
    return `
      <tr class="${status.className}" data-row-id="${escapeHtml(row.id)}">
        <td><span class="status-badge ${status.className}">${status.label}</span></td>
        <td><strong>${escapeHtml(row.place || '사용장소 없음')}</strong><small>${escapeHtml(compactText(row.purpose, 54))}</small></td>
        <td>${escapeHtml(row.date || '')}</td>
        <td class="number-cell">${escapeHtml(formatWon(row.amount || 0))}</td>
        <td title="${escapeHtml(address)}">${escapeHtml(compactText(address, 54))}</td>
        <td>
          <div class="table-actions">
            ${row.lat && row.lng ? `<button class="mini-button" type="button" data-action="map" data-row-id="${escapeHtml(row.id)}">지도</button>` : ''}
            ${row.status !== 'excluded' ? `<button class="mini-button soft-exclude" type="button" data-action="exclude" data-row-id="${escapeHtml(row.id)}">제외</button>` : `<button class="mini-button" type="button" data-action="restore" data-row-id="${escapeHtml(row.id)}">복구</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  return `
    <div class="result-table-wrap">
      <table class="result-table">
        <thead>
          <tr><th>상태</th><th>상호/내용</th><th>일시</th><th>금액</th><th>주소·사유</th><th>작업</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function handleResultAction(action, rowId) {
  const row = state.rows.find(item => item.id === rowId);
  if (!row) return;

  if (action === 'map') {
    focusRowOnMap(rowId, { scrollToMap: true });
    return;
  }

  if (action === 'copy') {
    const text = [row.matchedName || row.place, row.address].filter(Boolean).join(' · ');
    copyText(text || row.place || '');
    return;
  }

  if (action === 'review') {
    row.status = 'review';
    row.reason = '사용자가 확인필요로 표시했어요.';
  } else if (action === 'exclude') {
    row.status = 'excluded';
    row.reason = '사용자가 제외했어요.';
  } else if (action === 'restore') {
    row.status = row.lat && row.lng ? 'mapped' : 'review';
    row.reason = row.lat && row.lng ? '자동 표시됨' : '복구 후 확인이 필요해요.';
  }
  renderAll();
}

function copyText(text) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('주소를 복사했어요.')).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  showToast('주소를 복사했어요.');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadWorkbookFromArrayBuffer(buffer, fileName, autoParse = false) {
  if (typeof XLSX === 'undefined') {
    showToast('엑셀 파서가 아직 로드되지 않았어요. 인터넷 연결 또는 CDN 접근을 확인해주세요.');
    return;
  }
  state.fileName = fileName || '';
  state.workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  state.sheetName = state.workbook.SheetNames.length > 1 ? '__ALL__' : state.workbook.SheetNames[0];
  if (els.sheetSelect) {
    els.sheetSelect.innerHTML = `<option value="${escapeHtml(state.sheetName)}">${escapeHtml(state.sheetName === '__ALL__' ? '전체 시트 자동 합치기' : state.sheetName)}</option>`;
    els.sheetSelect.value = state.sheetName;
  }
  els.sheetRow?.classList.add('hidden');
  if (els.uploadDetails) els.uploadDetails.open = false;
  setFlowStep('parse', '공개자료를 불러왔어요. 사용처·금액·제외 항목을 정리합니다.');
  showToast(`${fileName || '공개자료'} 파일을 불러왔어요.${state.workbook.SheetNames.length > 1 ? ' 여러 시트를 자동으로 합쳐 읽습니다.' : ''}`);
  if (autoParse) {
    state.autoMapAfterParse = true;
    setTimeout(parseCurrentSheet, 0);
  }
}

async function readFile(file) {
  if (!file) return;
  const buffer = await file.arrayBuffer();
  loadWorkbookFromArrayBuffer(buffer, file.name || '', true);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function setSiteStatus(message, type = '') {
  if (!els.siteStatus) return;
  els.siteStatus.textContent = message;
  els.siteStatus.className = `status-box site-status ${type}`.trim();
  if (els.siteStatusDetails && type === 'error') els.siteStatusDetails.open = true;
}

function setSiteActionsVisible(visible) {
  els.siteActionRow?.classList.toggle('hidden', !visible);
  if (els.makeMapInlineButton) els.makeMapInlineButton.disabled = !visible || !state.rows.length;
}

function startLoadingStatus(message) {
  stopLoadingStatus();
  state.loadingMessage = message;
  let dots = 0;
  const render = () => {
    dots = (dots % 3) + 1;
    const suffix = '.'.repeat(dots);
    setSiteStatus(`${message}${suffix}`, 'working');
  };
  render();
  state.loadingTimer = setInterval(render, 520);
}

function stopLoadingStatus() {
  if (state.loadingTimer) {
    clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }
}

function setFetchBusy(isBusy, activeButton = null, text = '') {
  const buttons = [els.autoExcelButton, els.fetchSiteButton, els.directFetchButton].filter(Boolean);
  buttons.forEach(button => {
    button.disabled = isBusy;
  });
  if (activeButton && isBusy) {
    activeButton.dataset.oldText = activeButton.textContent;
    activeButton.textContent = text || '처리 중...';
  }
  if (!isBusy) {
    buttons.forEach(button => {
      if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
        delete button.dataset.oldText;
      }
      button.disabled = false;
    });
  }
  els.stopFetchButton?.classList.toggle('hidden', !isBusy);
  if (els.stopFetchButton) els.stopFetchButton.disabled = !isBusy;
}

function fetchJsonWithTimeout(url, timeoutMs = 65000) {
  if (state.currentFetchController) {
    state.currentFetchController.abort();
  }
  const controller = new AbortController();
  state.currentFetchController = controller;
  state.fetchTimer = setTimeout(() => {
    controller.abort(new DOMException('요청 시간이 초과됐어요.', 'TimeoutError'));
  }, timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      return { response, data };
    })
    .finally(() => {
      clearTimeout(state.fetchTimer);
      state.fetchTimer = null;
      if (state.currentFetchController === controller) state.currentFetchController = null;
    });
}

function stopCurrentFetch() {
  if (state.currentFetchController) {
    state.currentFetchController.abort(new DOMException('사용자가 수집을 중지했어요.', 'AbortError'));
  }
  stopLoadingStatus();
  setFetchBusy(false);
  setSiteStatus('자료 수집을 중지했어요. 조건을 바꾸거나 다시 시도할 수 있습니다.', 'error');
  showToast('자료 수집을 중지했어요.');
}

function fetchErrorMessage(error, fallback) {
  if (error?.name === 'AbortError') return '자료 수집을 중지했어요. 다른 기관이나 월로 다시 시도할 수 있습니다.';
  if (error?.name === 'TimeoutError') return '자동 수집이 1분 이상 걸려 중단했어요. 기관명이나 월을 바꾸거나, 엑셀 직접 업로드를 사용해주세요.';
  const msg = error?.message || fallback || '처리 중 오류가 발생했어요.';
  if (/abort|signal is aborted|timed out|timeout/i.test(msg)) {
    return '자동 수집이 오래 걸려 중단했어요. 기관명이나 월을 바꾸거나, 엑셀 직접 업로드를 사용해주세요.';
  }
  return msg;
}

function clearSiteCandidates() {
  if (!els.siteCandidateList) return;
  els.siteCandidateList.classList.add('hidden');
  els.siteCandidateList.innerHTML = '';
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(baseDate = new Date()) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
  return monthKeyFromDate(date);
}

function maxSelectableMonthKey(baseDate = new Date()) {
  // 업무추진비 사용내역은 통상 다음 달에 공개되므로, 기준월은 지난달까지만 선택합니다.
  return previousMonthKey(baseDate);
}

function isStaticGithubPages() {
  return /(^|\.)github\.io$/i.test(window.location.hostname);
}

function backendUnavailableMessage() {
  return [
    '현재 주소는 GitHub Pages 정적 주소라 자동 수집 백엔드(/api)가 없어요.',
    '공개자료 가져오기·게시글 후보 찾기·URL 불러오기는 Vercel 배포 주소에서 실행해주세요.',
    '이 주소에서는 아래의 엑셀 직접 업로드 기능만 정상 사용 가능합니다.',
  ].join('\n');
}

function ensureBackendAvailable() {
  if (!isStaticGithubPages()) return true;
  const message = backendUnavailableMessage();
  clearSiteCandidates();
  setSiteActionsVisible(false);
  setSiteStatus(message, 'error');
  showToast('자동 수집은 Vercel 주소에서 사용할 수 있어요.');
  return false;
}

function splitMonthKey(monthKey) {
  const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: '', month: '' };
  return { year: match[1], month: String(Number(match[2])) };
}

function syncPeriodToHidden() {
  const maxKey = maxSelectableMonthKey();
  if (els.siteYearMonthInput) {
    els.siteYearMonthInput.max = maxKey;
    if (!els.siteYearMonthInput.value) els.siteYearMonthInput.value = maxKey;
    if (els.siteYearMonthInput.value > maxKey) {
      els.siteYearMonthInput.value = maxKey;
      showToast('이번 달부터는 아직 공개 전일 수 있어 지난달까지만 선택하게 했어요.');
    }
    const { year, month } = splitMonthKey(els.siteYearMonthInput.value);
    if (els.siteYearInput) els.siteYearInput.value = year;
    if (els.siteMonthInput) els.siteMonthInput.value = month;
  }
  return {
    year: els.siteYearInput?.value || '',
    month: els.siteMonthInput?.value || '',
  };
}

function setDefaultPeriod() {
  if (!els.siteYearMonthInput) return;
  const maxKey = maxSelectableMonthKey();
  els.siteYearMonthInput.max = maxKey;
  els.siteYearMonthInput.value = maxKey;
  syncPeriodToHidden();
}

function periodText() {
  const { year, month } = syncPeriodToHidden();
  return {
    year,
    month,
    label: [year ? `${year}년` : '', month ? `${Number(month)}월` : ''].filter(Boolean).join(' '),
  };
}

function isAgencyInputVisible() {
  return (els.siteSourceSelect?.value || 'org') === 'org';
}

function syncAgencyControl() {
  const visible = isAgencyInputVisible();
  els.siteCard?.classList.toggle('no-agency', !visible);
  els.agencyComboWrap?.classList.toggle('hidden', !visible);
  if (els.siteAgencyInput) {
    els.siteAgencyInput.disabled = !visible;
    els.siteAgencyInput.placeholder = visible ? '예: 동작관악교육지원청, 총무과' : '하위항목이 필요 없는 게시판입니다';
  }
  if (!visible) closeAgencySuggestions();
}

function getQuerySummaryText() {
  const source = SOURCE_LABELS[els.siteSourceSelect?.value || 'org'] || '업무추진비';
  const period = periodText();
  const agency = isAgencyInputVisible() ? (els.siteAgencyInput?.value?.trim() || '기관 전체') : '';
  return [source, period.label, agency].filter(Boolean).join(' · ');
}

function updatePublicSiteLinks() {
  const source = els.siteSourceSelect?.value || 'org';
  const url = BOARD_LIST_URLS[source] || BOARD_LIST_URLS.org;
  [els.publicSiteLink, els.heroPublicSiteLink].filter(Boolean).forEach(link => {
    link.href = url;
  });
}

function updateQuerySummary() {
  syncAgencyControl();
  if (!els.querySummaryText) return;
  els.querySummaryText.textContent = getQuerySummaryText();
  updatePublicSiteLinks();
}

function setSearchPanelCollapsed(collapsed) {
  if (!els.siteCard) return;
  updateQuerySummary();
  els.siteCard.classList.remove('is-hidden');
  els.reopenSiteButton?.classList.add('hidden');
  els.siteCard.classList.toggle('is-collapsed', Boolean(collapsed));
  els.querySummary?.classList.toggle('hidden', !collapsed);
  if (els.collapseSiteButton) {
    els.collapseSiteButton.textContent = collapsed ? '⌄' : '⌃';
    els.collapseSiteButton.title = collapsed ? '검색 패널 펼치기' : '검색 패널 접기';
    els.collapseSiteButton.setAttribute('aria-label', els.collapseSiteButton.title);
  }
}

function hideSearchPanel() {
  if (!els.siteCard) return;
  els.siteCard.classList.add('is-hidden');
  els.reopenSiteButton?.classList.remove('hidden');
}

function orderedAgencyOptions(options) {
  return options
    .map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => {
      const ag = AGENCY_GROUP_ORDER.indexOf(a.group);
      const bg = AGENCY_GROUP_ORDER.indexOf(b.group);
      const groupA = ag === -1 ? 99 : ag;
      const groupB = bg === -1 ? 99 : bg;
      return groupA - groupB || a.originalIndex - b.originalIndex;
    })
    .map(({ originalIndex, ...item }) => item);
}

function visibleAgencyOptions(query = '', limit = 12) {
  const q = normalize(query).toLowerCase();
  const source = els.siteSourceSelect?.value || 'org';
  const options = source === 'org' ? orderedAgencyOptions(AGENCY_OPTIONS) : [];
  if (!q) return limit === Infinity ? options : options.slice(0, limit);
  const matches = options
    .map(item => {
      const text = normalize(item.name).toLowerCase();
      const group = normalize(item.group).toLowerCase();
      let score = 0;
      if (text === q) score += 10;
      if (text.startsWith(q)) score += 6;
      if (text.includes(q)) score += 4;
      if (group.includes(q)) score += 1;
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'));
  return limit === Infinity ? matches : matches.slice(0, limit);
}

function renderAgencySuggestions(openAll = false) {
  if (!els.agencySuggestionList || !els.siteAgencyInput) return;
  if ((els.siteSourceSelect?.value || 'org') !== 'org') {
    els.agencySuggestionList.classList.add('hidden');
    els.siteAgencyInput.setAttribute('aria-expanded', 'false');
    return;
  }
  const query = openAll ? '' : els.siteAgencyInput.value;
  const options = visibleAgencyOptions(query, openAll || !query.trim() ? Infinity : 16);
  els.agencySuggestionList.classList.toggle('is-open-all', Boolean(openAll));
  if (!options.length) {
    els.agencySuggestionList.innerHTML = '<div class="combo-option combo-empty"><strong>직접 입력 가능</strong></div>';
  } else {
    let lastGroup = '';
    els.agencySuggestionList.innerHTML = options.map((item, index) => {
      const groupHead = item.group !== lastGroup ? `<div class="combo-group-label">${escapeHtml(item.group)}</div>` : '';
      lastGroup = item.group;
      return `${groupHead}
        <button class="combo-option" type="button" role="option" data-agency="${escapeHtml(item.name)}" data-index="${index}">
          <strong>${escapeHtml(item.name)}</strong>
        </button>`;
    }).join('');
  }
  els.agencySuggestionList.classList.remove('hidden');
  els.siteAgencyInput.setAttribute('aria-expanded', 'true');
}

function closeAgencySuggestions() {
  els.agencySuggestionList?.classList.add('hidden');
  els.siteAgencyInput?.setAttribute('aria-expanded', 'false');
}

function selectAgency(name) {
  if (!name || !els.siteAgencyInput) return;
  els.siteAgencyInput.value = name;
  if (els.agencyInput && !els.agencyInput.value.trim()) els.agencyInput.value = name;
  updateQuerySummary();
  closeAgencySuggestions();
}

function renderSiteCandidates(candidates = [], options = {}) {
  if (!els.siteCandidateList) return;
  const source = els.siteSourceSelect?.value || 'org';
  const listUrl = options.listUrl || BOARD_LIST_URLS[source] || BOARD_LIST_URLS.org;
  const { year, month } = syncPeriodToHidden();
  const agency = els.siteAgencyInput?.value?.trim() || '';
  const searchText = [year ? `${year}년` : '', month ? `${Number(month)}월` : '', agency, '업무추진비'].filter(Boolean).join(' ');

  els.siteCandidateList.classList.remove('hidden');

  if (!candidates.length) {
    els.siteCandidateList.innerHTML = `
      <div class="candidate-head">
        <strong>게시글 후보를 아직 못 찾았어요.</strong>
        <p>사용내역이 없는 달이거나 아직 공개 전일 수 있어요. 공개사이트에서 직접 확인하거나, 엑셀을 내려받아 아래에 업로드해주세요.</p>
      </div>
      <div class="candidate-actions">
        <a class="secondary-button small" target="_blank" rel="noopener" href="${escapeHtml(listUrl)}">공개사이트 열기</a>
        <button class="secondary-button small" type="button" data-scroll-upload>엑셀 업로드로 이동</button>
      </div>
    `;
  } else {
    els.siteCandidateList.innerHTML = `
      <div class="candidate-head">
        <strong>게시글 후보를 찾았어요.</strong>
        <p>아래 후보가 맞는지 공개사이트에서 확인할 수 있어요. 자동 수집이 막히면 엑셀을 내려받아 아래 업로드 영역에 넣어주세요.</p>
      </div>
      <div class="candidate-actions">
        <a class="secondary-button small" target="_blank" rel="noopener" href="${escapeHtml(listUrl)}">공개사이트 열기</a>
        ${searchText ? `<button class="secondary-button small" type="button" data-copy-search="${escapeHtml(searchText)}">검색어 복사</button>` : ''}
        <button class="primary-button small" type="button" data-scroll-upload>엑셀 업로드로 이동</button>
      </div>
      <div class="candidate-list">
        ${candidates.map((item, index) => {
          const title = item.title || '제목 없음';
          const date = item.date || '';
          const agencyLabel = item.agency || item.board || '';
          const detailUrl = item.detailUrl || '';
          return `
            <article class="candidate-item">
              <span class="candidate-no">${index + 1}</span>
              <div>
                <strong>${escapeHtml(title)}</strong>
                <p>${[agencyLabel, date].filter(Boolean).map(escapeHtml).join(' · ') || '후보 정보'}</p>
                ${detailUrl ? `<a target="_blank" rel="noopener" href="${escapeHtml(detailUrl)}">후보 링크 열기</a>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  els.siteCandidateList.querySelectorAll('[data-scroll-upload]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      els.dropZone?.classList.add('dragover');
      setTimeout(() => els.dropZone?.classList.remove('dragover'), 1400);
    });
  });

  els.siteCandidateList.querySelectorAll('[data-copy-search]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy-search') || '';
      try {
        await navigator.clipboard.writeText(text);
        showToast(`검색어를 복사했어요: ${text}`);
      } catch {
        showToast(`검색어: ${text}`);
      }
    });
  });
}

function siteParams(latest = false) {
  const source = els.siteSourceSelect?.value || 'chief';
  const { year, month } = syncPeriodToHidden();
  const agency = isAgencyInputVisible() ? (els.siteAgencyInput?.value?.trim() || '') : '';
  const fallback = splitMonthKey(maxSelectableMonthKey());
  const params = new URLSearchParams({
    source,
    year: year || fallback.year,
    month: month || fallback.month,
    agency,
  });
  if (latest) params.set('latest', '1');
  return params;
}


async function fetchSiteExcelAuto(latest = false) {
  const button = els.autoExcelButton;
  if (!ensureBackendAvailable()) return;
  try {
    clearSiteCandidates();
    setSiteActionsVisible(false);
    setFetchBusy(true, button, '자료 수집 중...');
    setFlowStep('fetch', '서울 열린교육에서 게시글과 공개자료를 찾고 있습니다.');
    startLoadingStatus('자료 수집 중');
    const params = siteParams(latest);
    const { response, data } = await fetchJsonWithTimeout(`/api/sen-browser?${params.toString()}`, 65000);
    stopLoadingStatus();
    if (!response.ok || !data.ok) {
      renderSiteCandidates(data.candidates || [], { listUrl: data.listUrl });
      const logs = Array.isArray(data.logs) && data.logs.length ? `\n\n진단 로그:\n${data.logs.slice(-12).map(line => `- ${line}`).join('\n')}` : '';
      throw new Error((data.message || '공개자료 수집에 실패했어요.') + logs);
    }
    loadWorkbookFromArrayBuffer(base64ToArrayBuffer(data.base64), data.fileName || '업무추진비_공개자료.xlsx', true);
    renderSiteCandidates(data.candidates || [], { listUrl: data.listUrl });
    const logs = Array.isArray(data.logs) && data.logs.length ? `\n진단: ${data.logs.slice(-3).join(' / ')}` : '';
    setSiteStatus(`공개자료 수집 성공: ${data.fileName || '공개자료.xlsx'}${data.title ? `\n게시글: ${data.title}` : ''}${logs}\n\n자료를 읽은 뒤 자동으로 지도까지 만듭니다.`, 'success');
    setFlowStep('parse', '자료 수집이 끝났어요. 엑셀 내용을 지도 대상으로 정리한 뒤 바로 지도 표시를 시작합니다.');
    setSiteActionsVisible(true);
    setSearchPanelCollapsed(true);
    showToast('공개자료를 가져왔어요. 지도를 자동으로 만드는 중이에요.');
  } catch (error) {
    stopLoadingStatus();
    setSiteActionsVisible(false);
    const message = fetchErrorMessage(error, '자동 수집이 막혔어요.');
    setSiteStatus(`${message}\n\n사용내역이 없는 달이거나 아직 공개 전일 수 있어요. 공개사이트에서 확인하거나 조건을 바꿔 다시 시도할 수 있습니다.`, 'error');
    setFlowStep('ready', '자동 수집이 막혔어요. 조건을 바꾸거나 직접 업로드를 사용할 수 있습니다.');
    showToast(message);
  } finally {
    setFetchBusy(false);
  }
}

async function fetchSiteExcel(latest = false) {
  if (!els.fetchSiteButton) return;
  if (!ensureBackendAvailable()) return;
  const button = latest ? els.loadLatestButton : els.fetchSiteButton;
  try {
    clearSiteCandidates();
    setSiteActionsVisible(false);
    setFetchBusy(true, button, '후보 확인 중...');
    setFlowStep('fetch', '서울 열린교육 게시글 후보를 확인하고 있습니다.');
    startLoadingStatus('게시글 후보 확인 중');
    const { response, data } = await fetchJsonWithTimeout(`/api/sen-find?${siteParams(latest).toString()}`, 35000);
    stopLoadingStatus();
    if (!response.ok || !data.ok) {
      renderSiteCandidates(data.candidates || []);
      throw new Error(data.message || '게시글 후보를 찾지 못했어요.');
    }

    const candidates = data.candidates || [];
    renderSiteCandidates(candidates, { listUrl: data.listUrl });
    const first = candidates[0];
    setSiteStatus([
      candidates.length ? `게시글 후보 ${candidates.length}건을 찾았어요.` : '조건에 맞는 후보가 없어요.',
      first?.title ? `가장 가까운 후보: ${first.title}${first.date ? ` (${first.date})` : ''}` : '',
      '자동 첨부 가져오기가 막히면 열린교육 게시판에서 해당 엑셀을 직접 내려받아 업로드해주세요.',
    ].filter(Boolean).join('\n'), candidates.length ? 'success' : 'error');

    setFlowStep(candidates.length ? 'fetch' : 'ready', candidates.length ? '게시글 후보를 찾았어요. 자동 가져오기 또는 직접 다운로드로 이어갈 수 있습니다.' : '조건에 맞는 후보가 없어요. 조건을 바꿔 다시 시도해보세요.');
    if (candidates.length) showToast('게시글 후보를 찾았어요.');
    else showToast('조건에 맞는 게시글 후보가 없어요. 기관명을 비우고 다시 시도해보세요.');
  } catch (error) {
    stopLoadingStatus();
    const message = fetchErrorMessage(error, '게시글 후보를 찾지 못했어요.');
    setSiteStatus(`${message}\n\n사용내역이 없는 달이거나 아직 공개 전일 수 있어요. 공개사이트에서 확인하거나 엑셀을 직접 내려받아 아래 업로드 영역에 넣어주세요.`, 'error');
    setFlowStep('ready', '게시글 후보 찾기가 막혔어요. 조건을 바꿔 다시 시도할 수 있습니다.');
  } finally {
    setFetchBusy(false);
  }
}

async function fetchDirectUrl() {
  if (!ensureBackendAvailable()) return;
  const url = els.directUrlInput?.value?.trim();
  if (!url) {
    showToast('게시글 또는 첨부파일 URL을 입력해주세요.');
    return;
  }
  try {
    setSiteActionsVisible(false);
    setFetchBusy(true, els.directFetchButton, '불러오는 중...');
    setFlowStep('fetch', '직접 입력한 URL에서 공개자료를 불러오고 있습니다.');
    startLoadingStatus('URL에서 엑셀 불러오는 중');
    const params = siteParams(false);
    params.set('directUrl', url);
    const { response, data } = await fetchJsonWithTimeout(`/api/sen-auto?${params.toString()}`, 45000);
    stopLoadingStatus();
    if (!response.ok || !data.ok) {
      const detail = data.candidates?.length
        ? `\n\n찾은 게시글 후보:\n${data.candidates.map(item => `- ${item.title || '제목 없음'} ${item.date || ''}${item.detailUrl ? `\n  ${item.detailUrl}` : ''}`).join('\n')}`
        : '';
      throw new Error((data.message || 'URL에서 엑셀을 불러오지 못했어요.') + detail);
    }
    loadWorkbookFromArrayBuffer(base64ToArrayBuffer(data.base64), data.fileName || '업무추진비_공개자료.xlsx', true);
    setSiteStatus(`URL 불러오기 성공: ${data.fileName || '첨부파일'}${data.title ? `\n게시글: ${data.title}` : ''}\n\n자료를 읽은 뒤 자동으로 지도까지 만듭니다.`, 'success');
    setFlowStep('parse', 'URL에서 엑셀을 불러왔어요. 지도 대상을 정리한 뒤 바로 지도 표시를 시작합니다.');
    setSiteActionsVisible(true);
  } catch (error) {
    stopLoadingStatus();
    const message = fetchErrorMessage(error, 'URL에서 엑셀을 불러오지 못했어요.');
    setSiteStatus(`${message}\n\n일반 게시글 주소가 아니라 실제 첨부파일 다운로드 주소가 필요할 수 있어요. 안 되면 파일을 직접 내려받아 업로드해주세요.`, 'error');
    setFlowStep('ready', 'URL 불러오기가 막혔어요. 직접 업로드를 사용할 수 있습니다.');
  } finally {
    setFetchBusy(false);
  }
}

function loadKakaoMap(key) {
  return new Promise((resolve, reject) => {
    if (!key) return reject(new Error('Kakao JavaScript 키를 입력해주세요.'));
    if (window.kakao?.maps && state.kakaoLoadedKey === key) return resolve();

    document.querySelectorAll('script[data-kakao-map="true"]').forEach(script => script.remove());
    window.kakao = undefined;
    const script = document.createElement('script');
    script.dataset.kakaoMap = 'true';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    script.onload = () => {
      kakao.maps.load(() => {
        state.kakaoLoadedKey = key;
        resolve();
      });
    };
    script.onerror = () => reject(new Error('Kakao 지도 스크립트를 불러오지 못했어요. 키와 도메인 등록을 확인해주세요.'));
    document.head.appendChild(script);
  });
}

function initMap() {
  els.map.classList.remove('map-empty');
  if (!state.map) {
    state.map = new kakao.maps.Map(els.map, {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 8,
    });
  }
  if (!state.mapClickListenerAdded && window.kakao?.maps) {
    kakao.maps.event.addListener(state.map, 'click', closeActiveOverlay);
    state.mapClickListenerAdded = true;
  }
  return state.map;
}

function searchPlace(service, keyword) {
  return new Promise(resolve => {
    service.keywordSearch(keyword, (data, status) => {
      resolve({ data, status });
    });
  });
}

async function makeMap(options = {}) {
  if (state.isMakingMap) return;
  if (!state.rows.length) {
    showToast('먼저 엑셀 자료를 읽어주세요.');
    return;
  }
  const key = els.kakaoKeyInput.value.trim();
  const region = els.regionHintInput.value.trim() || '서울';

  try {
    state.isMakingMap = true;
    document.querySelector('.map-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.makeMapButton.disabled = true;
    if (els.makeMapInlineButton) els.makeMapInlineButton.disabled = true;
    els.makeMapButton.textContent = options.automatic ? '자동 지도 생성 중...' : '장소 검색 준비 중...';
    if (els.makeMapInlineButton) els.makeMapInlineButton.textContent = options.automatic ? '자동 지도 생성 중...' : '장소 검색 준비 중...';
    setFlowStep('geocode', 'Kakao 지도에서 사용처 위치를 검색할 준비를 하고 있습니다.');
    await loadKakaoMap(key);
    state.mapReady = true;
    updateStageVisibility();
    await sleep(0);
    const map = initMap();
    if (window.kakao?.maps?.event) kakao.maps.event.trigger(map, 'resize');
    const service = new kakao.maps.services.Places();

    const targets = state.rows.filter(row => !row.skipGeocode);
    const bounds = new kakao.maps.LatLngBounds();
    for (let i = 0; i < state.rows.length; i += 1) {
      const row = state.rows[i];
      const done = targets.indexOf(row) + 1;
      if (row.skipGeocode) continue;
      const progressText = `장소 검색 중 ${Math.max(done, 1)}/${targets.length}...`;
      setFlowStep('geocode', `사용처 위치 검색 중 ${Math.max(done, 1)}/${targets.length}`);
      els.makeMapButton.textContent = progressText;
      if (els.makeMapInlineButton) els.makeMapInlineButton.textContent = progressText;
      if (!row.place) {
        row.status = 'review';
        row.reason = '사용장소가 비어 있어요.';
        continue;
      }

      const keywords = buildSearchKeywords(row, region);
      let searchResult = { data: [], status: null, keyword: '' };
      for (const keyword of keywords) {
        const result = await searchPlace(service, keyword);
        if (result.status === kakao.maps.services.Status.OK && result.data.length > 0) {
          searchResult = { ...result, keyword };
          break;
        }
      }
      const { data, status } = searchResult;
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        const best = data[0];
        row.lat = Number(best.y);
        row.lng = Number(best.x);
        row.address = best.road_address_name || best.address_name || '';
        row.matchedName = best.place_name || row.searchPlace || row.place;
        row.status = data.length === 1 ? 'mapped' : 'review';
        row.reason = data.length === 1
          ? `자동 표시됨 · 검색어: ${searchResult.keyword}`
          : `후보 ${data.length}개가 있어 확인이 필요해요. 검색어: ${searchResult.keyword}`;
        bounds.extend(new kakao.maps.LatLng(row.lat, row.lng));
      } else {
        row.status = 'review';
        row.reason = row.searchPlace && row.searchPlace !== row.place
          ? `정리한 사용처명(${row.searchPlace})으로도 지도 검색 결과를 찾지 못했어요.`
          : '지도 검색 결과를 찾지 못했어요.';
      }
      renderStats();
      renderList();
      await sleep(140);
    }

    const mapped = state.rows.filter(row => row.status === 'mapped' && row.lat && row.lng);
    setActiveFilter('mapped');
    if (mapped.length) map.setBounds(bounds);
    setFlowStep('done', `지도 표시 완료: ${mapped.length}곳 표시 · 확인필요 ${state.rows.filter(r => r.status === 'review').length}건`);
    showToast(`지도 검색 완료: ${mapped.length}건 표시, ${state.rows.filter(r => r.status === 'review').length}건 확인필요, ${state.rows.filter(r => r.status === 'excluded').length}건 제외`);
  } catch (error) {
    showToast(error.message || '지도 만들기 중 오류가 발생했어요.');
  } finally {
    state.isMakingMap = false;
    els.makeMapButton.disabled = !state.rows.length;
    els.makeMapButton.textContent = state.mapReady ? '지도 다시 만들기' : '지도 만들기';
    if (els.makeMapInlineButton) {
      els.makeMapInlineButton.disabled = !state.rows.length;
      els.makeMapInlineButton.textContent = state.mapReady ? '지도 다시 만들기' : '지도 만들기';
    }
  }
}

function closeActiveOverlay() {
  if (state.activeOverlay) {
    state.activeOverlay.setMap(null);
    state.activeOverlay = null;
  }
}

function focusResultCard(rowId) {
  const card = els.resultList?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
  if (card) {
    els.resultList.querySelectorAll('.result-item.is-focused').forEach(item => item.classList.remove('is-focused'));
    card.classList.add('is-focused');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openOverlayForRow(row, marker) {
  closeActiveOverlay();
  const content = document.createElement('div');
  content.className = 'map-popover';
  const dateText = row.date ? escapeHtml(row.date.split(' ')[0] || row.date) : '';
  const addressText = row.address ? escapeHtml(row.address) : '';
  content.innerHTML = `
    <button class="map-popover-close" type="button" aria-label="팝업 닫기">×</button>
    <strong>${escapeHtml(row.matchedName || row.place || '사용장소')}</strong>
    ${addressText ? `<p class="popover-address">${addressText}</p>` : ''}
    <em>${[dateText, escapeHtml(formatWon(row.amount))].filter(Boolean).join(' · ')}</em>
  `;
  const overlay = new kakao.maps.CustomOverlay({
    position: marker.getPosition(),
    content,
    xAnchor: 0.5,
    yAnchor: 1.18,
    zIndex: 4,
  });
  content.querySelector('.map-popover-close')?.addEventListener('click', event => {
    event.stopPropagation();
    closeActiveOverlay();
  });
  overlay.setMap(state.map);
  state.activeOverlay = overlay;
  state.activeRowId = row.id;
  renderSelectedPlace(row);
}

function scrollMapIntoView() {
  document.querySelector('.map-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (state.map && window.kakao?.maps?.event) {
    setTimeout(() => kakao.maps.event.trigger(state.map, 'resize'), 260);
  }
}

function focusRowOnMap(rowId, options = {}) {
  const row = state.rows.find(entry => entry.id === rowId);
  const item = state.markers.find(entry => entry.row?.id === rowId);
  if (options.scrollToMap) scrollMapIntoView();
  if (!item || !state.map) {
    if (row) renderSelectedPlace(row);
    return;
  }
  state.map.panTo(item.marker.getPosition());
  openOverlayForRow(item.row, item.marker);
}

function renderMapMarkers() {
  if (!state.map || !window.kakao?.maps) return;
  closeActiveOverlay();
  state.markers.forEach(item => (item.marker || item).setMap(null));
  state.markers = [];

  filteredRows()
    .filter(row => row.lat && row.lng)
    .forEach(row => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(row.lat, row.lng),
        map: state.map,
      });
      kakao.maps.event.addListener(marker, 'click', () => openOverlayForRow(row, marker));
      state.markers.push({ marker, row });
    });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setActiveFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
  document.querySelectorAll('[data-summary-filter]').forEach(card => {
    card.classList.toggle('active', card.dataset.summaryFilter === filter);
  });
  renderList();
  renderMapMarkers();
}

function setViewMode(viewMode) {
  state.viewMode = viewMode === 'table' ? 'table' : 'card';
  [els.cardViewButton, els.tableViewButton].filter(Boolean).forEach(button => {
    button.classList.toggle('active', button.dataset.view === state.viewMode);
  });
  renderList();
}

function downloadCsv() {
  if (!state.rows.length) return;
  const headers = ['일자', '기관/부서', '사용장소', '금액', '목적', '집행대상', '분류', '분류사유', '검색장소명', '주소', '위도', '경도'];
  const lines = [headers, ...state.rows.map(row => [
    row.date,
    row.department,
    row.place,
    row.amount,
    row.purpose,
    row.target,
    row.status,
    row.reason,
    row.matchedName,
    row.address,
    row.lat ?? '',
    row.lng ?? '',
  ])].map(row => row.map(csvCell).join(','));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `교육청_법카맵_결과_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function resetApp() {
  state.workbook = null;
  state.sheetName = null;
  state.fileName = '';
  state.rows = [];
  state.places = [];
  state.filter = 'mapped';
  state.markers.forEach(item => (item.marker || item).setMap(null));
  state.markers = [];
  state.mapReady = false;
  els.fileInput.value = '';
  if (els.sheetSelect) els.sheetSelect.innerHTML = '';
  els.sheetRow?.classList.add('hidden');
  els.makeMapButton.disabled = true;
  els.downloadCsvButton.disabled = true;
  els.map.className = 'map-empty';
  els.map.innerHTML = '<p>자료를 불러오면 자동으로 위치를 검색해 지도를 표시합니다.</p>';
  state.map = null;
  renderAll();
  renderSelectedPlace(null);
  setFlowStep('ready');
  updateStageVisibility();
  setSiteActionsVisible(false);
  setSiteStatus(isStaticGithubPages() ? backendUnavailableMessage() : '새 자료를 불러올 준비가 되었어요. 조건을 선택하면 수집 후 자동으로 지도까지 만듭니다.', isStaticGithubPages() ? 'error' : '');
  clearSiteCandidates();
  showToast('초기화했어요.');
}

els.selectFileButton.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', event => readFile(event.target.files[0]));
els.sheetSelect?.addEventListener('change', event => { state.sheetName = event.target.value; });
els.parseButton?.addEventListener('click', parseCurrentSheet);
els.makeMapButton?.addEventListener('click', makeMap);
els.downloadCsvButton.addEventListener('click', downloadCsv);
els.clearButton.addEventListener('click', resetApp);
els.makeMapInlineButton?.addEventListener('click', makeMap);
els.stopFetchButton?.addEventListener('click', stopCurrentFetch);
els.resetFlowButton?.addEventListener('click', resetApp);
els.retryFetchButton?.addEventListener('click', () => fetchSiteExcelAuto(false));
els.saveKeyButton.addEventListener('click', () => {
  const key = els.kakaoKeyInput.value.trim() || DEFAULT_KAKAO_JS_KEY;
  els.kakaoKeyInput.value = key;
  localStorage.setItem('eduCardMapKakaoKey', key);
  updateKeyCompactState();
  showToast('Kakao 키를 이 브라우저에 저장했어요.');
});


els.kakaoKeyInput?.addEventListener('input', updateKeyCompactState);

if (els.siteYearMonthInput) {
  els.siteYearMonthInput.addEventListener('change', () => {
    syncPeriodToHidden();
    updateQuerySummary();
  });
}

els.siteSourceSelect?.addEventListener('change', () => {
  syncAgencyControl();
  updateQuerySummary();
});

if (els.autoExcelButton) {
  els.autoExcelButton.addEventListener('click', () => fetchSiteExcelAuto(false));
}

if (els.fetchSiteButton) {
  els.fetchSiteButton.addEventListener('click', () => fetchSiteExcel(false));
}
if (els.directFetchButton) {
  els.directFetchButton.addEventListener('click', fetchDirectUrl);
}

if (els.collapseSiteButton) {
  els.collapseSiteButton.addEventListener('click', () => {
    const collapsed = !els.siteCard?.classList.contains('is-collapsed');
    setSearchPanelCollapsed(collapsed);
  });
}
if (els.expandSiteButton) {
  els.expandSiteButton.addEventListener('click', () => setSearchPanelCollapsed(false));
}
if (els.closeSiteButton) {
  els.closeSiteButton.addEventListener('click', hideSearchPanel);
}
if (els.reopenSiteButton) {
  els.reopenSiteButton.addEventListener('click', () => setSearchPanelCollapsed(false));
}

[els.siteSourceSelect, els.siteYearMonthInput, els.siteAgencyInput].forEach(input => {
  input?.addEventListener('input', updateQuerySummary);
  input?.addEventListener('change', updateQuerySummary);
});

if (els.siteAgencyInput) {
  els.siteAgencyInput.addEventListener('focus', () => renderAgencySuggestions(!els.siteAgencyInput.value.trim()));
  els.siteAgencyInput.addEventListener('input', () => {
    renderAgencySuggestions(!els.siteAgencyInput.value.trim());
    if (els.agencyInput) els.agencyInput.value = els.siteAgencyInput.value.trim();
  });
  els.siteAgencyInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAgencySuggestions();
    if (event.key === 'ArrowDown' && els.agencySuggestionList && !els.agencySuggestionList.classList.contains('hidden')) {
      event.preventDefault();
      els.agencySuggestionList.querySelector('.combo-option')?.focus();
    }
  });
}

if (els.agencyComboButton) {
  els.agencyComboButton.addEventListener('click', () => renderAgencySuggestions(true));
}

if (els.agencySuggestionList) {
  els.agencySuggestionList.addEventListener('click', event => {
    const button = event.target.closest('[data-agency]');
    if (button) selectAgency(button.dataset.agency);
  });
  els.agencySuggestionList.addEventListener('keydown', event => {
    const current = event.target.closest('.combo-option');
    if (!current) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      const name = current.getAttribute('data-agency');
      if (name) selectAgency(name);
    }
    if (event.key === 'Escape') closeAgencySuggestions();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const buttons = [...els.agencySuggestionList.querySelectorAll('.combo-option[data-agency]')];
      const index = buttons.indexOf(current);
      const next = event.key === 'ArrowDown' ? buttons[index + 1] || buttons[0] : buttons[index - 1] || buttons.at(-1);
      next?.focus();
    }
  });
}

document.addEventListener('click', event => {
  if (!event.target.closest('#agencyComboWrap')) closeAgencySuggestions();
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => setActiveFilter(button.dataset.filter));
});

document.querySelectorAll('[data-summary-filter]').forEach(card => {
  card.addEventListener('click', () => setActiveFilter(card.dataset.summaryFilter));
});

[els.cardViewButton, els.tableViewButton].filter(Boolean).forEach(button => {
  button.addEventListener('click', () => setViewMode(button.dataset.view));
});

els.resultSortSelect?.addEventListener('change', event => {
  state.sortMode = event.target.value || 'dateDesc';
  renderList();
});

['dragenter', 'dragover'].forEach(eventName => {
  els.dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(eventName => {
  els.dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  });
});
els.dropZone.addEventListener('drop', event => readFile(event.dataTransfer.files[0]));

function updateKeyCompactState() {
  const hasKey = Boolean(els.kakaoKeyInput?.value?.trim());
  if (els.keyStatusText) {
    els.keyStatusText.textContent = hasKey ? 'Kakao 지도 키 사용 중' : 'Kakao 키 설정';
  }
  if (els.keyDetails) els.keyDetails.open = !hasKey;
}

window.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('eduCardMapKakaoKey');
  const initialKey = savedKey || DEFAULT_KAKAO_JS_KEY;
  if (initialKey) {
    els.kakaoKeyInput.value = initialKey;
    if (!savedKey) localStorage.setItem('eduCardMapKakaoKey', initialKey);
  }
  setDefaultPeriod();
  updateKeyCompactState();
  updateQuerySummary();
  updatePublicSiteLinks();
  renderSelectedPlace(null);
  setFlowStep('ready');
  updateStageVisibility();
  if (isStaticGithubPages()) {
    setSiteStatus(backendUnavailableMessage(), 'error');
  }
});
