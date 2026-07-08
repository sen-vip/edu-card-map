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

function pageUrls(listUrl, pageLimit = 1) {
  // 1차 구현은 최신 공개자료 중심이다. 사이트의 페이지 파라미터가 바뀔 수 있어
  // 첫 페이지를 우선 사용하고, 흔한 페이지 파라미터를 보조로 시도한다.
  const urls = [listUrl];
  for (let page = 2; page <= pageLimit; page += 1) {
    for (const key of ['pageIndex', 'pageNo', 'page']) {
      const u = new URL(listUrl);
      u.searchParams.set(key, String(page));
      urls.push(u.toString());
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
  for (const url of pageUrls(board.listUrl, limit)) {
    try {
      const html = await fetchText(url);
      const rows = extractRowsFromHtml(html, url, { year, month, agency, latest });
      candidates.push(...rows.map(row => ({ ...row, board: board.label, agency: agency || board.agency || '' })));
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

async function autoDownload(params) {
  if (params.directUrl) return await downloadFromPostUrl(params.directUrl);
  const { board, candidates, notices } = await findPost(params);
  if (!candidates.length) {
    throw Object.assign(new Error('조건에 맞는 업무추진비 게시글을 찾지 못했어요.'), { candidates, notices });
  }
  const firstWithUrl = candidates.find(item => item.detailUrl) || candidates[0];
  if (!firstWithUrl.detailUrl) {
    throw Object.assign(new Error('게시글 후보는 찾았지만 상세 URL을 추출하지 못했어요. 게시글을 직접 열어 URL을 붙여넣어 주세요.'), { candidates, notices });
  }
  const file = await downloadFromPostUrl(firstWithUrl.detailUrl);
  return {
    ...file,
    title: file.title || firstWithUrl.title,
    agency: params.agency || firstWithUrl.agency || board.agency || '',
    candidates,
    notices,
  };
}

module.exports = {
  BOARDS,
  autoDownload,
  findPost,
};
