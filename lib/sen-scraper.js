const BASE = 'https://open.sen.go.kr';

const BOARDS = {
  chief: {
    label: '교육감 업무추진비',
    agency: '서울특별시교육청',
    listUrl: `${BASE}/fus/MI000000000000000511/board/BO00000225/ctgynone/list0010v.do`,
  },
  vice: {
    label: '부교육감 업무추진비',
    agency: '서울특별시교육청',
    listUrl: `${BASE}/fus/MI000000000000000512/board/BO00000226/ctgynone/list0010v.do`,
  },
  org: {
    label: '본청·교육지원청·직속기관 업무추진비',
    agency: '',
    listUrl: `${BASE}/fus/MI000000000000000513/board/BO00000227/ctgynone/list0010v.do`,
  },
};

// 열린서울교육은 기관별 목록 URL이 /ctgynone/ 대신 /039/처럼 카테고리 코드로 노출되는 경우가 있어요.
// 확인된 코드는 우선 힌트로 사용하고, 틀려도 일반 목록 검색으로 다시 넘어갑니다.
const AGENCY_CATEGORY_HINTS = {
  '동작도서관': '039',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 edu-card-map/2.0';

function assertOpenSenUrl(url) {
  const parsed = new URL(url, BASE);
  if (parsed.hostname !== 'open.sen.go.kr') {
    throw new Error('open.sen.go.kr 주소만 불러올 수 있어요.');
  }
  return parsed.toString();
}

async function fetchText(url) {
  const safeUrl = assertOpenSenUrl(url);
  const response = await fetch(safeUrl, {
    headers: {
      'user-agent': UA,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'referer': BASE,
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`게시판을 불러오지 못했어요. HTTP ${response.status}`);
  return await response.text();
}

async function fetchBinary(url, referer = BASE) {
  const safeUrl = assertOpenSenUrl(url);
  const response = await fetch(safeUrl, {
    headers: {
      'user-agent': UA,
      'accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,*/*',
      'referer': referer,
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`첨부파일을 내려받지 못했어요. HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  if (/text\/html/i.test(contentType) && buffer.slice(0, 300).toString('utf8').includes('<html')) {
    throw new Error('첨부파일 대신 HTML 페이지가 내려왔어요. 사이트 다운로드 권한이나 URL 구조를 확인해야 해요.');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const fileName = guessFileNameFromHeaders(disposition) || guessFileNameFromUrl(response.url) || '업무추진비_공개자료.xlsx';
  return { buffer, contentType, fileName, finalUrl: response.url };
}

function guessFileNameFromHeaders(disposition) {
  if (!disposition) return '';
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1].replace(/\+/g, '%20'));
  const normal = disposition.match(/filename="?([^";]+)"?/i);
  if (normal) {
    try { return decodeURIComponent(normal[1]); } catch (_) { return normal[1]; }
  }
  return '';
}

function guessFileNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop() || '';
    if (/\.(xlsx|xls|csv)$/i.test(last)) return decodeURIComponent(last);
    const params = parsed.searchParams;
    for (const key of ['fileName', 'filename', 'orignlFileNm', 'orgFileNm', 'atchFileNm']) {
      const value = params.get(key);
      if (value) return decodeURIComponent(value);
    }
  } catch (_) {}
  return '';
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(url, baseUrl) {
  if (!url) return '';
  let cleaned = url.trim().replace(/^['"]|['"]$/g, '');
  cleaned = cleaned.replace(/&amp;/g, '&');
  try { return new URL(cleaned, baseUrl).toString(); } catch (_) { return ''; }
}

function htmlDecode(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function setQuery(url, updates) {
  const parsed = new URL(url, BASE);
  for (const [key, value] of Object.entries(updates || {})) {
    if (value === undefined || value === null || value === '') continue;
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

function pageUrls(listUrl, pageLimit = 1, { agency = '', year = '', month = '' } = {}) {
  const bases = [listUrl];
  const agencyNorm = String(agency || '').replace(/\s+/g, '');

  if (agencyNorm && AGENCY_CATEGORY_HINTS[agencyNorm]) {
    bases.unshift(listUrl.replace('/ctgynone/', `/${AGENCY_CATEGORY_HINTS[agencyNorm]}/`));
  }

  if (agency) {
    for (const key of ['searchWrd', 'searchKeyword', 'searchWord', 'q']) {
      bases.push(setQuery(listUrl, { [key]: agency }));
      bases.push(setQuery(listUrl, { [key]: `${year}년 ${month}월 ${agency} 업무추진비` }));
    }
    bases.push(setQuery(listUrl, { searchCnd: '0', searchWrd: agency }));
    bases.push(setQuery(listUrl, { searchCnd: '1', searchWrd: agency }));
  }

  const urls = [];
  for (const base of bases) {
    urls.push(base);
    for (let page = 2; page <= pageLimit; page += 1) {
      for (const key of ['pageIndex', 'pageNo', 'page']) {
        urls.push(setQuery(base, { [key]: page }));
      }
    }
  }
  return [...new Set(urls)];
}

function extractTitle(text) {
  const patterns = [
    /(\d{4}\s*년\s*\d{1,2}\s*월[^\n]{0,120}?업무추진비[^\n]{0,80}?(?:사용내역|공개)?)/,
    /(\d{1,2}\s*월[^\n]{0,120}?업무추진비[^\n]{0,80}?(?:사용내역|공개)?)/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  return '';
}

function extractDetailUrl(rowHtml, pageUrl) {
  const candidates = [];
  const hrefs = [...rowHtml.matchAll(/href\s*=\s*['"]([^'"]+)['"]/gi)].map(m => htmlDecode(m[1]));
  const onclicks = [...rowHtml.matchAll(/onclick\s*=\s*['"]([^'"]+)['"]/gi)].map(m => htmlDecode(m[1]));
  for (const href of hrefs) {
    if (/view\d*v\.do|view0010v\.do|board.*view|select.*Board/i.test(href)) candidates.push(href);
  }
  for (const js of onclicks) {
    const direct = js.match(/(\/fus\/[^'"\s)]+view[^'"\s)]*|https?:\/\/open\.sen\.go\.kr\/[^'"\s)]+view[^'"\s)]*)/i);
    if (direct) candidates.push(direct[1]);
    const quoted = [...js.matchAll(/['"]([^'"]*(?:view0010v\.do|view\d*v\.do|boardSeq|ntt|seq|pst)[^'"]*)['"]/gi)].map(m => m[1]);
    candidates.push(...quoted);
  }
  for (const c of candidates) {
    const url = absoluteUrl(c, pageUrl);
    if (url && url.includes('open.sen.go.kr')) return url;
  }
  return '';
}

function extractRowsFromHtml(html, pageUrl, { year, month, agency = '', latest = false }) {
  const rows = [];
  const trMatches = [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(m => m[0]);
  const chunks = trMatches.length ? trMatches : html.split(/\n(?=\s*\d+\s+)/g);
  const y = String(year || '').trim();
  const m = String(month || '').replace(/^0+/, '').trim();
  const agencyNorm = agency.replace(/\s+/g, '').trim();

  for (const chunk of chunks) {
    const text = stripTags(chunk);
    const compact = text.replace(/\s+/g, '');
    if (!text.includes('업무추진비')) continue;
    if (!latest && y && !compact.includes(`${y}년`)) continue;
    if (!latest && m && !compact.includes(`${m}월`)) continue;
    if (agencyNorm && !compact.includes(agencyNorm)) continue;
    if (compact.includes('신용카드') && !compact.includes('업무추진비')) continue;

    const title = extractTitle(text) || text.slice(0, 120);
    const date = (text.match(/20\d{2}-\d{2}-\d{2}/) || [''])[0];
    const detailUrl = extractDetailUrl(chunk, pageUrl);
    rows.push({ title, date, detailUrl, text });
  }

  // tr 안에서 링크가 누락되는 CMS를 대비해서 제목 주변 HTML 조각도 한 번 더 확인한다.
  if (!rows.some(row => row.detailUrl)) {
    for (const row of rows) {
      const key = row.title.slice(0, Math.min(24, row.title.length));
      const idx = html.indexOf(key);
      if (idx >= 0) {
        const nearby = html.slice(Math.max(0, idx - 2500), Math.min(html.length, idx + 2500));
        row.detailUrl = extractDetailUrl(nearby, pageUrl);
      }
    }
  }

  return rows;
}

function extractAttachmentUrls(html, detailUrl) {
  const urls = [];
  const anchors = [...html.matchAll(/<a\b[\s\S]*?<\/a>/gi)].map(m => m[0]);
  for (const a of anchors) {
    const text = stripTags(a);
    const href = (a.match(/href\s*=\s*['"]([^'"]+)['"]/i) || [])[1] || '';
    const onclick = (a.match(/onclick\s*=\s*['"]([^'"]+)['"]/i) || [])[1] || '';
    const chunk = htmlDecode(`${href} ${onclick} ${text}`);
    if (!/\.xlsx|\.xls|\.csv|엑셀|첨부|download|file|atch/i.test(chunk)) continue;
    if (href && !/^javascript:/i.test(href)) urls.push(absoluteUrl(href, detailUrl));
    const direct = chunk.match(/(\/[^'"\s)]+(?:download|file|File|atch|attach|Down)[^'"\s)]*)/i);
    if (direct) urls.push(absoluteUrl(direct[1], detailUrl));
    const urlDirect = chunk.match(/(https?:\/\/open\.sen\.go\.kr\/[^'"\s)]+)/i);
    if (urlDirect) urls.push(absoluteUrl(urlDirect[1], detailUrl));
  }

  // 흔한 파일 다운로드 함수 패턴을 보조로 처리한다.
  const functionCalls = [...html.matchAll(/(?:file|File|atch|attach|download|Down)[A-Za-z0-9_]*\(([^)]*)\)/gi)];
  for (const call of functionCalls) {
    const args = [...call[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
    if (args.length >= 2) {
      const [id, sn] = args;
      const guesses = [
        `/common/file/FileDown.do?atchFileId=${encodeURIComponent(id)}&fileSn=${encodeURIComponent(sn)}`,
        `/common/file/fileDown.do?atchFileId=${encodeURIComponent(id)}&fileSn=${encodeURIComponent(sn)}`,
        `/fus/file/fileDown.do?atchFileId=${encodeURIComponent(id)}&fileSn=${encodeURIComponent(sn)}`,
      ];
      urls.push(...guesses.map(u => absoluteUrl(u, detailUrl)));
    }
  }

  const hrefs = [...html.matchAll(/href\s*=\s*['"]([^'"]+)['"]/gi)].map(m => htmlDecode(m[1]));
  for (const href of hrefs) {
    if (/\.(xlsx|xls|csv)(?:\?|$)|download|filedown|atch|attach/i.test(href)) {
      urls.push(absoluteUrl(href, detailUrl));
    }
  }

  return [...new Set(urls.filter(Boolean).filter(url => url.includes('open.sen.go.kr')))].slice(0, 12);
}

async function findPost({ source = 'chief', year, month, agency = '', latest = false }) {
  const board = BOARDS[source] || BOARDS.chief;
  const limit = latest ? 1 : 2;
  const candidates = [];
  const notices = [];
  for (const url of pageUrls(board.listUrl, limit, { agency, year, month })) {
    try {
      const html = await fetchText(url);
      const rows = extractRowsFromHtml(html, url, { year, month, agency, latest });
      candidates.push(...rows.map(row => ({ ...row, board: board.label, agency: agency || board.agency || '', pageUrl: url })));
      if (candidates.length) break;
    } catch (error) {
      notices.push(`${url}: ${error.message}`);
    }
  }
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = `${item.title}|${item.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return { board, candidates: unique, notices };
}

async function downloadFromPostUrl(detailUrl) {
  const safeDetail = assertOpenSenUrl(detailUrl);
  const detailHtml = await fetchText(safeDetail);
  const title = extractTitle(stripTags(detailHtml));
  const attachments = extractAttachmentUrls(detailHtml, safeDetail);
  if (!attachments.length) {
    // 입력 URL이 실제 첨부파일 주소일 수 있으므로 바로 다운로드도 시도한다.
    if (/\.(xlsx|xls|csv)(?:\?|$)|download|filedown|atch|attach/i.test(safeDetail)) {
      const file = await fetchBinary(safeDetail, BASE);
      return { ...file, title, detailUrl: safeDetail, attachmentUrl: safeDetail, notices: ['입력한 URL을 첨부파일 주소로 보고 직접 다운로드했어요.'] };
    }
    throw new Error('게시글에서 엑셀 첨부파일 링크를 찾지 못했어요. 첨부파일을 직접 내려받아 업로드해주세요.');
  }
  const errors = [];
  for (const attachmentUrl of attachments) {
    try {
      const file = await fetchBinary(attachmentUrl, safeDetail);
      return { ...file, title, detailUrl: safeDetail, attachmentUrl, notices: [] };
    } catch (error) {
      errors.push(`${attachmentUrl}: ${error.message}`);
    }
  }
  throw new Error(`첨부파일 후보는 찾았지만 다운로드하지 못했어요. ${errors[0] || ''}`);
}


function isExcelLike(buffer, fileName = '', contentType = '') {
  if (!buffer || buffer.length < 20) return false;
  const name = String(fileName || '').toLowerCase();
  const ctype = String(contentType || '').toLowerCase();
  const head = buffer.slice(0, 2048);
  const lower = head.toString('utf8').toLowerCase();
  if (lower.includes('<html') || lower.includes('<!doctype html')) return false;
  if (/\.(xlsx|xls|csv)$/i.test(name)) return true;
  if (/spreadsheet|excel|csv|octet-stream/.test(ctype)) return true;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return true; // xlsx zip
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) return true; // old xls
  if (/사용일자|사용일시|사용장소|집행내역|업무추진비|금액/.test(lower)) return true;
  return false;
}

async function launchPlaywrightBrowser(logs = []) {
  const { chromium: playwrightChromium } = require('playwright-core');
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);

  try {
    const chromiumModule = require('@sparticuz/chromium');
    const chromium = chromiumModule.default || chromiumModule;
    if (typeof chromium.setGraphicsMode === 'function') {
      chromium.setGraphicsMode(false);
    }
    const executablePath = await chromium.executablePath();
    if (!executablePath || !String(executablePath).includes('/tmp')) {
      throw new Error(`@sparticuz/chromium 실행 파일 경로가 비어 있거나 서버리스 경로가 아니에요: ${executablePath || 'empty'}`);
    }
    try {
      const path = require('path');
      process.env.LD_LIBRARY_PATH = [
        process.env.LD_LIBRARY_PATH,
        path.dirname(executablePath),
        '/tmp',
      ].filter(Boolean).join(':');
    } catch (_) {}

    logs.push(`Vercel Chromium 준비: ${executablePath}`);
    return await playwrightChromium.launch({
      args: [
        ...(chromium.args || []),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      executablePath,
      headless: true,
    });
  } catch (chromiumError) {
    logs.push(`@sparticuz/chromium 준비 실패: ${chromiumError.message}`);
    if (isVercel) {
      throw new Error(`Vercel용 Chromium 실행 파일을 준비하지 못했어요. package.json의 @sparticuz/chromium 설치와 Vercel Install Command(npm install)를 확인해야 해요. 원인: ${chromiumError.message}`);
    }
  }

  // 로컬 개발 환경에서만 Playwright 기본 브라우저를 사용한다.
  logs.push('로컬 Playwright Chromium으로 실행 시도');
  return await playwrightChromium.launch({ headless: true });
}


function compactForMatch(text) {
  return String(text || '').replace(/\s+/g, '').trim();
}

function isOpenSenRelevant(url) {
  return /open\.sen\.go\.kr/i.test(String(url || ''));
}

function isMaybeDetailUrl(url) {
  return /view|select|detail|board|bbs|BO\d+|MI\d+/i.test(String(url || ''));
}

function isBadDetailText(text) {
  return /요청하신 페이지가 존재하지 않거나 링크가 잘못되었습니다|요청하신 페이지가 존재하지|일시적 장애|이용에 불편|잘못된 접근/i.test(String(text || ''));
}

function looksLikeBoardList(text) {
  const t = String(text || '');
  return /전체\s*\d+\s*건/.test(t) && /번호\s*제목\s*첨부/.test(t);
}

function detailScore(html, targetTitle) {
  const text = stripTags(html || '');
  const compact = compactForMatch(text);
  const key = compactForMatch(targetTitle).slice(0, 24);
  let score = 0;
  if (key && compact.includes(key)) score += 100;
  if (/업무추진비/.test(text)) score += 20;
  if (/첨부|파일|다운로드|xlsx|xls|csv|file|atch|download/i.test(html || text)) score += 20;
  if (looksLikeBoardList(text)) score -= 35;
  if (isBadDetailText(text)) score -= 120;
  return { score, text, hasTitle: Boolean(key && compact.includes(key)), isBad: isBadDetailText(text), isList: looksLikeBoardList(text) };
}

async function captureTargetRowDiagnostics(page, targetTitle, logs) {
  try {
    const info = await page.evaluate((title) => {
      const compact = (s) => String(s || '').replace(/\s+/g, '');
      const key = compact(title).slice(0, 24);
      const nodes = Array.from(document.querySelectorAll('a,button,[onclick],td,span,li,tr,div'));
      const hit = nodes.find(node => compact(node.innerText || node.textContent || '').includes(key));
      if (!hit) return null;
      const row = hit.closest('tr,li,.board_list,.bbs_list,.listBody,.board-list,.list') || hit.parentElement || hit;
      const actions = Array.from(row.querySelectorAll('a,button,[onclick],input[type="submit"],input[type="button"]')).slice(0, 12).map((node) => ({
        tag: node.tagName ? node.tagName.toLowerCase() : '',
        text: (node.innerText || node.textContent || node.value || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        href: node.getAttribute && (node.getAttribute('href') || ''),
        onclick: node.getAttribute && (node.getAttribute('onclick') || ''),
        title: node.getAttribute && (node.getAttribute('title') || ''),
      }));
      const form = hit.closest('form') || row.closest('form');
      const hidden = form ? Array.from(form.querySelectorAll('input[type="hidden"],input[name]')).slice(0, 25).map(input => ({ name: input.name || input.getAttribute('name') || '', value: input.value || input.getAttribute('value') || '' })) : [];
      return {
        rowText: (row.innerText || row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 220),
        actions,
        hidden,
        rowHtml: (row.outerHTML || '').replace(/\s+/g, ' ').slice(0, 500),
      };
    }, targetTitle);
    if (info) {
      logs.push(`목록 행 확인: ${info.rowText}`);
      if (info.actions && info.actions.length) {
        const summary = info.actions.slice(0, 5).map(a => `${a.tag}:${(a.text || a.title || a.href || a.onclick || '').slice(0, 60)}`).join(' / ');
        logs.push(`목록 행 클릭 후보: ${summary}`);
      }
      if (info.hidden && info.hidden.length) {
        const hiddenSummary = info.hidden.filter(x => x.name).slice(0, 8).map(x => `${x.name}=${String(x.value || '').slice(0, 18)}`).join('&');
        if (hiddenSummary) logs.push(`목록 form hidden: ${hiddenSummary}`);
      }
    } else {
      logs.push('목록에서 선택 제목이 들어간 행을 DOM으로 찾지 못했어요.');
    }
    return info;
  } catch (error) {
    logs.push(`목록 행 진단 실패: ${error.message}`);
    return null;
  }
}

async function markBestPostElement(page, targetTitle, logs) {
  const result = await page.evaluate((title) => {
    const compact = (s) => String(s || '').replace(/\s+/g, '');
    const key = compact(title).slice(0, 24);
    const nodes = Array.from(document.querySelectorAll('a,button,[onclick],td,span,li,tr,div'));
    const titleNode = nodes.find(node => compact(node.innerText || node.textContent || '').includes(key));
    if (!titleNode) return { ok: false, reason: 'title-node-not-found' };

    const row = titleNode.closest('tr,li,.board_list,.bbs_list,.listBody,.board-list,.list') || titleNode.parentElement || titleNode;
    const actionableInRow = Array.from(row.querySelectorAll('a,button,[onclick],input[type="submit"],input[type="button"]'));
    const titleAction = titleNode.closest('a,button,[onclick],input[type="submit"],input[type="button"]');
    let target = null;
    target = actionableInRow.find(node => compact(node.innerText || node.textContent || node.value || '').includes(key));
    if (!target && titleAction) target = titleAction;
    if (!target) target = actionableInRow.find(node => /view|detail|select|go|fn_|board|bbs|ntt|seq|pst|글|제목/i.test(`${node.getAttribute('href') || ''} ${node.getAttribute('onclick') || ''} ${node.getAttribute('title') || ''}`));
    if (!target) target = actionableInRow[0] || titleNode;
    target.setAttribute('data-edu-post-target', '1');
    return {
      ok: true,
      tag: target.tagName ? target.tagName.toLowerCase() : '',
      text: (target.innerText || target.textContent || target.value || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      href: target.getAttribute && (target.getAttribute('href') || ''),
      onclick: target.getAttribute && (target.getAttribute('onclick') || ''),
      rowText: (row.innerText || row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 180),
    };
  }, targetTitle).catch(error => ({ ok: false, reason: error.message }));

  if (result && result.ok) {
    logs.push(`클릭 대상 확정: ${result.tag} / ${(result.text || result.href || result.onclick || '').slice(0, 90)}`);
    if (result.href || result.onclick) logs.push(`클릭 대상 속성: href=${String(result.href || '').slice(0, 90)} onclick=${String(result.onclick || '').slice(0, 140)}`);
    return result;
  }
  logs.push(`클릭 대상 확정 실패: ${result ? result.reason : 'unknown'}`);
  return null;
}

async function clickPostTitle(page, targetTitle, logs) {
  await captureTargetRowDiagnostics(page, targetTitle, logs);
  const marked = await markBestPostElement(page, targetTitle, logs);
  if (marked) {
    const locator = page.locator('[data-edu-post-target="1"]').first();
    try {
      await locator.click({ timeout: 8000, force: true });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
      await page.waitForTimeout(1200);
      logs.push(`게시글 클릭: ${targetTitle}`);
      return true;
    } catch (error) {
      logs.push(`확정 클릭 대상 클릭 실패: ${error.message}`);
    }
  }

  const variants = [...new Set([
    targetTitle,
    String(targetTitle || '').replace(/\s+/g, ' ').trim(),
    String(targetTitle || '').slice(0, 48),
    String(targetTitle || '').slice(0, 32),
  ].filter(Boolean))];

  for (const text of variants) {
    try {
      const locator = page.getByText(text, { exact: false }).first();
      if (await locator.count()) {
        await locator.click({ timeout: 7000, force: true });
        await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => null);
        await page.waitForTimeout(1200);
        logs.push(`게시글 클릭: ${text}`);
        return true;
      }
    } catch (error) {
      logs.push(`제목 클릭 후보 실패: ${text} / ${error.message}`);
    }
  }

  try {
    const clicked = await page.evaluate((title) => {
      const compact = (s) => String(s || '').replace(/\s+/g, '');
      const key = compact(title).slice(0, 24);
      const nodes = [...document.querySelectorAll('a,button,[onclick],td,span')];
      const el = nodes.find(node => compact(node.innerText || node.textContent || '').includes(key));
      if (!el) return false;
      const target = el.closest('a,button,[onclick]') || el;
      target.click();
      return true;
    }, targetTitle);
    if (clicked) {
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(1200);
      logs.push('JS 클릭으로 게시글 열기 시도');
      return true;
    }
  } catch (error) {
    logs.push(`JS 클릭 실패: ${error.message}`);
  }
  return false;
}

async function captureNetworkDuringClick(page, clickFn, targetTitle, logs) {
  const records = [];
  const bodyPromises = [];
  const targetKey = compactForMatch(targetTitle).slice(0, 24);

  const onRequest = (request) => {
    const url = request.url();
    if (!isOpenSenRelevant(url)) return;
    const rec = {
      kind: 'request',
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      postData: request.postData() || '',
    };
    records.push(rec);
  };

  const onResponse = (response) => {
    const url = response.url();
    if (!isOpenSenRelevant(url)) return;
    const headers = response.headers() || {};
    const contentType = headers['content-type'] || '';
    const disposition = headers['content-disposition'] || '';
    const rec = {
      kind: 'response',
      url,
      status: response.status(),
      contentType,
      disposition,
      text: '',
      hasTitle: false,
      score: 0,
    };
    records.push(rec);

    if (/text|html|json|xml|javascript/i.test(contentType) || isMaybeDetailUrl(url)) {
      const p = response.text().then((text) => {
        rec.text = text || '';
        const scored = detailScore(rec.text, targetTitle);
        rec.hasTitle = scored.hasTitle;
        rec.score = scored.score;
        rec.textSnippet = scored.text.slice(0, 180).replace(/\s+/g, ' ');
        rec.isBad = scored.isBad;
        rec.isList = scored.isList;
      }).catch((error) => {
        rec.textError = error.message;
      });
      bodyPromises.push(p);
    }
  };

  page.on('request', onRequest);
  page.on('response', onResponse);
  try {
    const clicked = await clickFn();
    await page.waitForTimeout(1800);
    await Promise.allSettled(bodyPromises);
    const requestCount = records.filter(r => r.kind === 'request').length;
    const responseCount = records.filter(r => r.kind === 'response').length;
    logs.push(`클릭 중 네트워크 기록: 요청 ${requestCount}개 / 응답 ${responseCount}개`);
    const important = records
      .filter(r => isMaybeDetailUrl(r.url) || r.hasTitle || r.postData || /file|down|atch|attach/i.test(`${r.url} ${r.contentType || ''} ${r.disposition || ''}`))
      .slice(-10)
      .map(r => `${r.kind}:${r.method || r.status || ''}:${r.url.split('?')[0].replace(BASE, '')}${r.postData ? ` post=${r.postData.slice(0, 90)}` : ''}${r.hasTitle ? ' title=Y' : ''}${r.score ? ` score=${r.score}` : ''}`);
    if (important.length) logs.push(`네트워크 중요 기록: ${important.join(' / ')}`);
    return { clicked, records };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
}

async function replayCapturedDetailRequests(context, records, referer, targetTitle, logs) {
  const requests = records
    .filter(r => r.kind === 'request' && isOpenSenRelevant(r.url) && (isMaybeDetailUrl(r.url) || r.postData))
    .filter(r => !/\.(png|jpg|jpeg|gif|css|js|ico|svg|woff|woff2)(\?|$)/i.test(r.url))
    .slice(-10);

  for (const req of requests) {
    try {
      const headers = {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': referer || BASE,
      };
      if (req.postData) headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      const response = await context.request.fetch(req.url, {
        method: req.method || 'GET',
        headers,
        data: req.postData || undefined,
        timeout: 20000,
      });
      const text = await response.text();
      const scored = detailScore(text, targetTitle);
      logs.push(`상세 요청 재현: ${req.method || 'GET'} ${req.url.split('?')[0].replace(BASE, '')} / status ${response.status()} / title=${scored.hasTitle ? 'Y' : 'N'} / score=${scored.score}`);
      if (scored.hasTitle && !scored.isBad && scored.score > 40) {
        return { html: text, url: response.url(), source: 'captured-request-replay', score: scored.score };
      }
    } catch (error) {
      logs.push(`상세 요청 재현 실패: ${String(req.url || '').slice(0, 100)} / ${error.message}`);
    }
  }
  return null;
}

async function resolveDetailContent(page, context, networkRecords, referer, targetTitle, logs) {
  const entries = [];

  try {
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const html = await frame.content();
        const scored = detailScore(html, targetTitle);
        entries.push({ html, url: frame.url(), source: frame === page.mainFrame() ? 'current-page' : 'frame', ...scored });
      } catch (_) {}
    }
    logs.push(`프레임 검사: ${frames.length}개`);
  } catch (error) {
    logs.push(`프레임 검사 실패: ${error.message}`);
  }

  for (const rec of networkRecords.filter(r => r.kind === 'response' && r.text)) {
    const scored = detailScore(rec.text, targetTitle);
    entries.push({ html: rec.text, url: rec.url, source: 'network-response', ...scored });
  }

  entries.sort((a, b) => b.score - a.score);
  const top = entries.slice(0, 4).map(e => `${e.source}:${e.url.split('?')[0].replace(BASE, '')}:title=${e.hasTitle ? 'Y' : 'N'}:score=${e.score}:bad=${e.isBad ? 'Y' : 'N'}:list=${e.isList ? 'Y' : 'N'}`);
  if (top.length) logs.push(`상세 HTML 후보: ${top.join(' / ')}`);

  const best = entries.find(e => e.hasTitle && !e.isBad && e.score > 40);
  if (best) {
    logs.push(`상세 HTML 확정: ${best.source} / ${best.url}`);
    return best;
  }

  const replayed = await replayCapturedDetailRequests(context, networkRecords, referer, targetTitle, logs);
  if (replayed) return replayed;

  const pageText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  const key = compactForMatch(targetTitle).slice(0, 24);
  logs.push(`현재 화면 제목 포함: ${key && compactForMatch(pageText).includes(key) ? 'Y' : 'N'}`);
  if (isBadDetailText(pageText)) {
    logs.push('현재 화면은 열린교육 오류/빈 상세 화면으로 보입니다. 게시글 번호 파라미터가 빠졌을 가능성이 높아요.');
  }
  return null;
}


async function collectAttachmentClickCandidates(page, logs) {
  const pageText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  if (/요청하신 페이지가 존재하지 않거나 링크가 잘못되었습니다|일시적 장애|이용에 불편/i.test(pageText)) {
    logs.push('상세 화면이 오류 페이지로 보입니다. 제목 클릭이 실제 게시글 파라미터까지 전달되지 않았을 수 있어요.');
  }

  const html = await page.content().catch(() => '');
  const htmlUrls = extractAttachmentUrls(html, page.url());
  logs.push(`HTML 첨부 URL 후보 ${htmlUrls.length}개`);

  const domCandidates = await page.evaluate(() => {
    const re = /xlsx|xls|csv|엑셀|첨부|다운|다운로드|download|filedown|file|atch|attach|파일/i;
    const nodes = Array.from(document.querySelectorAll('a,button,[onclick],[href],input,img,span,li,td'));
    let idx = 0;
    const result = [];
    for (const node of nodes) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      const text = (node.innerText || node.textContent || node.value || '').trim().replace(/\s+/g, ' ');
      const href = node.getAttribute && (node.getAttribute('href') || '');
      const onclick = node.getAttribute && (node.getAttribute('onclick') || '');
      const alt = node.getAttribute && (node.getAttribute('alt') || '');
      const title = node.getAttribute && (node.getAttribute('title') || '');
      const src = node.getAttribute && (node.getAttribute('src') || '');
      const blob = `${tag} ${text} ${href} ${onclick} ${alt} ${title} ${src}`;
      if (!re.test(blob)) continue;
      node.setAttribute('data-edu-file-candidate', String(idx));
      result.push({ idx, tag, text, href, onclick, alt, title, src });
      idx += 1;
    }
    return result.slice(0, 80);
  }).catch((error) => {
    logs.push(`DOM 첨부 후보 수집 실패: ${error.message}`);
    return [];
  });

  logs.push(`DOM 첨부 클릭 후보 ${domCandidates.length}개`);
  if (!domCandidates.length && html) {
    const compact = stripTags(html).slice(0, 220).replace(/\s+/g, ' ');
    logs.push(`상세 화면 텍스트 일부: ${compact}`);
  }
  return { htmlUrls, domCandidates };
}

async function tryDownloadUrlList(context, urls, referer, meta, logs) {
  const errors = [];
  for (const url of urls.slice(0, 20)) {
    try {
      const response = await context.request.get(url, { headers: { Referer: referer }, timeout: 20000 });
      const body = Buffer.from(await response.body());
      const ctype = response.headers()['content-type'] || '';
      const dispo = response.headers()['content-disposition'] || '';
      const name = guessFileNameFromHeaders(dispo) || guessFileNameFromUrl(url) || '업무추진비_공개자료.xlsx';
      if (response.ok() && isExcelLike(body, name, ctype)) {
        logs.push(`URL 직접 다운로드 성공: ${name}`);
        return {
          buffer: body,
          contentType: ctype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: name,
          finalUrl: url,
          title: meta.title,
          agency: meta.agency,
          detailUrl: referer,
          attachmentUrl: url,
          candidates: meta.candidates,
          notices: meta.notices,
          logs,
        };
      }
      errors.push(`${url}: 엑셀 응답 아님 (${response.status()} ${ctype})`);
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  if (errors.length) logs.push(...errors.slice(-5));
  return null;
}

async function browserAutoDownload(params = {}) {
  const source = params.source || 'chief';
  const board = BOARDS[source] || BOARDS.chief;
  const logs = [];
  const { candidates, notices } = await findPost(params);
  logs.push(...(notices || []).slice(0, 4));

  if (!candidates.length) {
    throw Object.assign(new Error('게시글 후보를 찾지 못해서 브라우저 자동 다운로드를 시작할 수 없어요.'), { candidates, notices, logs });
  }

  const target = candidates[0];
  const targetTitle = target.title || '';
  const pageUrl = target.pageUrl || board.listUrl;
  logs.push(`후보 선택: ${targetTitle || '제목 없음'}`);
  logs.push(`목록 접속: ${pageUrl}`);

  let browser;
  try {
    browser = await launchPlaywrightBrowser(logs);
    const context = await browser.newContext({
      acceptDownloads: true,
      locale: 'ko-KR',
      userAgent: UA,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    });
    logs.push('목록 페이지 열림');

    const network = await captureNetworkDuringClick(page, () => clickPostTitle(page, targetTitle, logs), targetTitle, logs);
    if (!network.clicked) {
      throw Object.assign(new Error('게시글 후보는 찾았지만 실제 브라우저 클릭에 실패했어요.'), { candidates, notices, logs });
    }
    logs.push(`현재 페이지: ${page.url()}`);

    const meta = {
      title: targetTitle,
      agency: params.agency || target.agency || board.agency || '',
      candidates,
      notices,
    };

    const detailInfo = await resolveDetailContent(page, context, network.records, pageUrl, targetTitle, logs);
    if (detailInfo) {
      const detailHtmlUrls = extractAttachmentUrls(detailInfo.html, detailInfo.url || page.url());
      logs.push(`상세 HTML 첨부 URL 후보 ${detailHtmlUrls.length}개 (${detailInfo.source})`);
      const detailDownload = await tryDownloadUrlList(context, detailHtmlUrls, detailInfo.url || page.url(), meta, logs);
      if (detailDownload) {
        await browser.close();
        return detailDownload;
      }
    }

    const { htmlUrls, domCandidates } = await collectAttachmentClickCandidates(page, logs);

    const htmlDownload = await tryDownloadUrlList(context, htmlUrls, page.url(), meta, logs);
    if (htmlDownload) {
      await browser.close();
      return htmlDownload;
    }

    const errors = [];
    for (const item of domCandidates.slice(0, 35)) {
      const el = page.locator(`[data-edu-file-candidate="${item.idx}"]`).first();
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
        const responsePromise = page.waitForResponse((response) => {
          const url = response.url() || '';
          const headers = response.headers() || {};
          const ctype = headers['content-type'] || '';
          const dispo = headers['content-disposition'] || '';
          return /xlsx|xls|csv|excel|spreadsheet|octet-stream/i.test(`${url} ${ctype} ${dispo}`)
            || /download|filedown|atch|attach|file/i.test(url);
        }, { timeout: 12000 }).catch(() => null);

        await el.click({ timeout: 7000, force: true });
        const download = await downloadPromise;
        if (download) {
          const suggested = download.suggestedFilename() || guessFileNameFromUrl(item.href) || '업무추진비_공개자료.xlsx';
          const path = await download.path();
          const fs = require('fs');
          const buffer = fs.readFileSync(path);
          if (!isExcelLike(buffer, suggested, '')) throw new Error(`엑셀 파일로 보이지 않음: ${suggested}`);
          logs.push(`클릭 다운로드 성공: ${suggested}`);
          await browser.close();
          return {
            buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileName: suggested,
            finalUrl: page.url(),
            title: targetTitle,
            agency: params.agency || target.agency || board.agency || '',
            detailUrl: page.url(),
            attachmentUrl: item.href || item.onclick || item.src || '',
            candidates,
            notices,
            logs,
          };
        }

        const response = await responsePromise;
        if (response) {
          const body = Buffer.from(await response.body());
          const headers = response.headers() || {};
          const ctype = headers['content-type'] || '';
          const dispo = headers['content-disposition'] || '';
          const name = guessFileNameFromHeaders(dispo) || guessFileNameFromUrl(response.url()) || '업무추진비_공개자료.xlsx';
          if (isExcelLike(body, name, ctype)) {
            logs.push(`클릭 응답 다운로드 성공: ${name}`);
            await browser.close();
            return {
              buffer: body,
              contentType: ctype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              fileName: name,
              finalUrl: response.url(),
              title: targetTitle,
              agency: params.agency || target.agency || board.agency || '',
              detailUrl: page.url(),
              attachmentUrl: response.url(),
              candidates,
              notices,
              logs,
            };
          }
        }
      } catch (error) {
        const label = item.text || item.alt || item.title || item.href || item.onclick || item.src || String(item.idx);
        errors.push(`${label.slice(0, 80)}: ${error.message}`);
      }
    }

    const hrefUrls = domCandidates
      .map(item => item.href)
      .filter(Boolean)
      .filter(href => !/^javascript:/i.test(href))
      .map(href => absoluteUrl(href, page.url()))
      .filter(Boolean);
    const hrefDownload = await tryDownloadUrlList(context, hrefUrls, page.url(), meta, logs);
    if (hrefDownload) {
      await browser.close();
      return hrefDownload;
    }

    throw Object.assign(new Error('게시글은 열었지만 첨부파일 요소를 확정하지 못했어요. 열린교육 상세화면 구조가 파일 링크를 별도 스크립트/폼으로 숨기는 형태일 수 있어요.'), {
      candidates,
      notices,
      logs: logs.concat(errors.slice(-10)),
    });
  } catch (error) {
    if (browser) await browser.close().catch(() => null);
    if (!error.logs) error.logs = logs;
    if (!error.candidates) error.candidates = candidates;
    if (!error.notices) error.notices = notices;
    throw error;
  }
}

async function autoDownload(params) {
  if (params.directUrl) return await downloadFromPostUrl(params.directUrl);

  const { board, candidates, notices } = await findPost(params);
  if (!candidates.length) {
    throw Object.assign(new Error('조건에 맞는 업무추진비 게시글을 찾지 못했어요.'), { candidates, notices });
  }

  const firstWithUrl = candidates.find(item => item.detailUrl) || candidates[0];

  // 열린서울교육 목록은 제목은 보이지만 상세 href가 HTML에 직접 노출되지 않는 경우가 많다.
  // 이 경우 기존처럼 바로 실패시키지 말고, Vercel 브라우저 함수로 실제 클릭/다운로드를 시도한다.
  if (!firstWithUrl.detailUrl) {
    try {
      return await browserAutoDownload(params);
    } catch (browserError) {
      browserError.message = browserError.message || '브라우저 방식으로도 공개자료를 가져오지 못했어요.';
      browserError.candidates = browserError.candidates || candidates;
      browserError.notices = browserError.notices || notices;
      browserError.logs = [
        ...(browserError.logs || []),
        '상세 URL이 HTML에 직접 노출되지 않아 브라우저 클릭 방식까지 시도했어요.',
      ];
      throw browserError;
    }
  }

  try {
    const file = await downloadFromPostUrl(firstWithUrl.detailUrl);
    return {
      ...file,
      title: file.title || firstWithUrl.title,
      agency: params.agency || firstWithUrl.agency || board.agency || '',
      candidates,
      notices,
    };
  } catch (directError) {
    // 상세 URL은 잡혔지만 첨부 다운로드 패턴이 바뀐 경우도 브라우저 방식으로 재시도한다.
    try {
      const browserResult = await browserAutoDownload(params);
      browserResult.logs = [
        `상세 URL 직접 다운로드 실패: ${directError.message}`,
        ...(browserResult.logs || []),
      ];
      return browserResult;
    } catch (browserError) {
      browserError.message = browserError.message || directError.message || '공개자료를 불러오지 못했어요.';
      browserError.candidates = browserError.candidates || candidates;
      browserError.notices = browserError.notices || notices;
      browserError.logs = [
        `상세 URL 직접 다운로드 실패: ${directError.message}`,
        ...(browserError.logs || []),
      ];
      throw browserError;
    }
  }
}

module.exports = {
  BOARDS,
  autoDownload,
  browserAutoDownload,
  findPost,
};
