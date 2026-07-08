# 교육청 법카맵 v3.0.1-site Python 로컬 서버
# 실행: py server.py
# 접속: http://localhost:3000

from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urlencode, urljoin, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import base64
import json
import mimetypes
import os
import re
import sys
import tempfile

BASE = "https://open.sen.go.kr"
PORT = int(os.environ.get("PORT", "3000"))
ROOT = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 edu-card-map/3.0.1"

BOARDS = {
    "chief": {
        "label": "교육감 업무추진비",
        "agency": "서울특별시교육청",
        "listUrl": f"{BASE}/fus/MI000000000000000511/board/BO00000225/ctgynone/list0010v.do",
    },
    "vice": {
        "label": "부교육감 업무추진비",
        "agency": "서울특별시교육청",
        "listUrl": f"{BASE}/fus/MI000000000000000512/board/BO00000226/ctgynone/list0010v.do",
    },
    "org": {
        "label": "본청·교육지원청·직속기관 업무추진비",
        "agency": "",
        "listUrl": f"{BASE}/fus/MI000000000000000513/board/BO00000227/ctgynone/list0010v.do",
    },
}

# 확인된 열린서울교육 기관 카테고리 일부. 사이트가 기관별 URL을 검색엔진에 노출할 때가 있어 우선 시도한다.
# 코드가 틀려도 일반 목록 검색으로 다시 넘어가므로 안전하다.
AGENCY_CATEGORY_HINTS = {
    "동작도서관": "039",
}


def assert_open_sen_url(url: str) -> str:
    parsed = urlparse(urljoin(BASE, url or ""))
    if parsed.netloc != "open.sen.go.kr":
        raise RuntimeError("open.sen.go.kr 주소만 불러올 수 있어요.")
    return parsed.geturl()


def fetch_bytes(url: str, referer: str = BASE, accept: str = "*/*"):
    safe_url = assert_open_sen_url(url)
    req = Request(
        safe_url,
        headers={
            "User-Agent": UA,
            "Accept": accept,
            "Referer": referer,
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=25) as res:
            data = res.read()
            headers = dict(res.headers.items())
            final_url = res.geturl()
            status = getattr(res, "status", 200)
            if status < 200 or status >= 300:
                raise RuntimeError(f"HTTP {status}")
            return data, headers, final_url
    except HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}") from e
    except URLError as e:
        raise RuntimeError(f"네트워크 오류: {getattr(e, 'reason', e)}") from e


def fetch_text(url: str) -> str:
    data, headers, _ = fetch_bytes(
        url,
        BASE,
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    )
    content_type = headers.get("Content-Type", "")
    encodings = []
    m = re.search(r"charset=([^;]+)", content_type, re.I)
    if m:
        encodings.append(m.group(1).strip())
    encodings += ["utf-8", "cp949", "euc-kr"]
    for enc in encodings:
        try:
            return data.decode(enc)
        except Exception:
            pass
    return data.decode("utf-8", errors="replace")


def fetch_binary(url: str, referer: str = BASE):
    data, headers, final_url = fetch_bytes(
        url,
        referer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/octet-stream,*/*",
    )
    content_type = headers.get("Content-Type", "") or headers.get("content-type", "")
    # 엑셀/CSV 확장자 없이도 내려오는 경우가 있어서 HTML만 확실히 제외한다.
    if re.search(r"text/html", content_type, re.I) and b"<html" in data[:600].lower():
        raise RuntimeError("첨부파일 대신 HTML 페이지가 내려왔어요. 상세 URL에 게시글 식별값이 없거나 다운로드 URL이 아닐 수 있어요.")
    disposition = headers.get("Content-Disposition", "") or headers.get("content-disposition", "")
    file_name = guess_file_name_from_headers(disposition) or guess_file_name_from_url(final_url) or "업무추진비_공개자료.xlsx"
    # 너무 작은 HTML/오류 응답 방지
    if len(data) < 200 and b"<" in data:
        raise RuntimeError("파일처럼 보이지 않는 짧은 응답이 내려왔어요.")
    return {"buffer": data, "contentType": content_type, "fileName": file_name, "finalUrl": final_url}


def guess_file_name_from_headers(disposition: str) -> str:
    if not disposition:
        return ""
    m = re.search(r"filename\*=UTF-8''([^;]+)", disposition, re.I)
    if m:
        return unquote(m.group(1).replace("+", "%20"))
    m = re.search(r'filename="?([^";]+)"?', disposition, re.I)
    if m:
        return unquote(m.group(1))
    return ""


def guess_file_name_from_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        last = Path(parsed.path).name
        if re.search(r"\.(xlsx|xls|csv)$", last, re.I):
            return unquote(last)
        qs = parse_qs(parsed.query)
        for key in ["fileName", "filename", "orignlFileNm", "orgFileNm", "atchFileNm"]:
            vals = qs.get(key)
            if vals and vals[0]:
                return unquote(vals[0])
    except Exception:
        pass
    return ""




def is_excel_like(data: bytes, file_name: str = "", content_type: str = "") -> bool:
    """Return True when a downloaded response looks like xlsx/xls/csv rather than an HTML error page."""
    data = data or b""
    name = (file_name or "").lower()
    ctype = (content_type or "").lower()
    head = data[:2048]
    lower_head = head.lower()

    if not data or len(data) < 20:
        return False
    if b"<html" in lower_head or b"<!doctype html" in lower_head:
        return False

    # XLSX is a ZIP container; old XLS is Compound File Binary Format.
    if data.startswith(b"PK\x03\x04") or data.startswith(b"PK\x05\x06") or data.startswith(b"PK\x07\x08"):
        return True
    if data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return True

    if re.search(r"\.(xlsx|xls|csv)$", name, re.I):
        return True
    if any(token in ctype for token in [
        "spreadsheet",
        "excel",
        "vnd.ms-excel",
        "officedocument.spreadsheetml",
        "text/csv",
        "octet-stream",
    ]):
        # octet-stream만으로는 부족하지만 HTML은 위에서 제외했고 공개자료 첨부는 대체로 이 타입으로 내려온다.
        return True

    # CSV-like fallback: enough separators and Korean/ASCII text without binary noise.
    try:
        sample = data[:4096].decode("utf-8")
    except Exception:
        try:
            sample = data[:4096].decode("cp949")
        except Exception:
            sample = ""
    if sample and ("," in sample or "\t" in sample) and any(k in sample for k in ["업무추진비", "집행", "사용", "금액", "일자"]):
        return True
    return False


def html_decode(text: str) -> str:
    return (
        str(text or "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&nbsp;", " ")
        .replace("&#40;", "(")
        .replace("&#41;", ")")
    )


def strip_tags(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html or "", flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html_decode(html)
    return re.sub(r"\s+", " ", html).strip()


def absolute_url(url: str, base_url: str) -> str:
    if not url:
        return ""
    cleaned = html_decode(url.strip().strip('"\''))
    try:
        return urljoin(base_url, cleaned)
    except Exception:
        return ""


def set_query(url: str, updates: dict) -> str:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    for k, v in updates.items():
        if v is None or v == "":
            continue
        qs[k] = [str(v)]
    return parsed._replace(query=urlencode(qs, doseq=True)).geturl()


def page_urls(list_url: str, page_limit: int = 1, agency: str = "", year: str = "", month: str = ""):
    bases = [list_url]
    agency_norm = re.sub(r"\s+", "", agency or "")
    # 기관 카테고리 힌트가 있으면 /ctgynone/을 /코드/로 바꿔 먼저 시도
    if agency_norm in AGENCY_CATEGORY_HINTS:
        bases.insert(0, re.sub(r"/ctgynone/", f"/{AGENCY_CATEGORY_HINTS[agency_norm]}/", list_url))
    # 검색어 GET 파라미터가 먹히는 경우를 대비한 후보들
    if agency:
        for key in ["searchWrd", "searchKeyword", "searchWord", "q"]:
            bases.append(set_query(list_url, {key: agency}))
            bases.append(set_query(list_url, {key: f"{year}년 {month}월 {agency} 업무추진비"}))
        bases.append(set_query(list_url, {"searchCnd": "0", "searchWrd": agency}))
        bases.append(set_query(list_url, {"searchCnd": "1", "searchWrd": agency}))

    urls = []
    for base in bases:
        urls.append(base)
        for page in range(2, page_limit + 1):
            for key in ["pageIndex", "pageNo", "page"]:
                urls.append(set_query(base, {key: page}))
    out, seen = [], set()
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def extract_title(text: str) -> str:
    patterns = [
        r"(\d{4}\s*년\s*\d{1,2}\s*월[^\n]{0,120}?업무추진비[^\n]{0,80}?(?:사용내역|공개)?)",
        r"(\d{1,2}\s*월[^\n]{0,120}?업무추진비[^\n]{0,80}?(?:사용내역|공개)?)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text or "")
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    return ""


def base_view_url(page_url: str) -> str:
    parsed = urlparse(page_url)
    path = re.sub(r"list\d*v\.do", "view0010v.do", parsed.path)
    return parsed._replace(path=path, query="").geturl()


def detail_candidates_from_js(js: str, page_url: str):
    js = html_decode(js or "")
    out = []
    # 이미 URL 조각이 들어있는 경우
    for m in re.finditer(r"(/fus/[^'\"\s)]+view[^'\"\s)]*|https?://open\.sen\.go\.kr/[^'\"\s)]+view[^'\"\s)]*)", js, re.I):
        out.append(absolute_url(m.group(1), page_url))
    for m in re.finditer(r"['\"]([^'\"]*(?:view0010v\.do|view\d*v\.do|ntt|bbs|board|pst|seq|sn|idx)[^'\"]*)['\"]", js, re.I):
        val = m.group(1)
        if "/" in val or "?" in val:
            out.append(absolute_url(val, page_url))
    # 함수 인자 속 숫자 식별값 후보를 다양한 게시판 파라미터명으로 시도
    args = re.findall(r"['\"]([^'\"]{1,120})['\"]", js)
    numeric_args = [a for a in args if re.fullmatch(r"\d{4,}", a)]
    numeric_args += re.findall(r"(?<!\d)(\d{5,})(?!\d)", js)
    bv = base_view_url(page_url)
    for num in dict.fromkeys(numeric_args):
        for qname in ["nttId", "nttSn", "bbscttSn", "bbscttId", "pstSn", "boardSeq", "dataSid", "seq", "idx", "articleNo"]:
            out.append(set_query(bv, {qname: num}))
    # 중복 제거
    final, seen = [], set()
    for u in out:
        if u and "open.sen.go.kr" in u and u not in seen:
            seen.add(u)
            final.append(u)
    return final


def extract_detail_url_candidates(row_html: str, page_url: str):
    candidates = []
    hrefs = [html_decode(m.group(1)) for m in re.finditer(r"href\s*=\s*['\"]([^'\"]+)['\"]", row_html or "", re.I)]
    onclicks = [html_decode(m.group(1)) for m in re.finditer(r"onclick\s*=\s*['\"]([^'\"]+)['\"]", row_html or "", re.I)]
    for href in hrefs:
        if re.match(r"^javascript:", href, re.I):
            candidates += detail_candidates_from_js(href, page_url)
        elif re.search(r"view\d*v\.do|ntt|bbs|board|pst|seq|sn|idx", href, re.I):
            candidates.append(absolute_url(href, page_url))
    for js in onclicks:
        candidates += detail_candidates_from_js(js, page_url)
    # 혹시 tr 자체에 data-*로 식별값이 있는 경우
    for m in re.finditer(r"(?:data-(?:ntt|seq|sn|idx|id)|nttId|nttSn|pstSn)\s*=\s*['\"]?(\d{5,})", row_html or "", re.I):
        num = m.group(1)
        for qname in ["nttId", "nttSn", "bbscttSn", "bbscttId", "pstSn", "boardSeq", "seq", "idx"]:
            candidates.append(set_query(base_view_url(page_url), {qname: num}))
    out, seen = [], set()
    for u in candidates:
        if u and "open.sen.go.kr" in u and u not in seen:
            seen.add(u)
            out.append(u)
    return out[:40]


def extract_rows_from_html(html: str, page_url: str, year: str, month: str, agency: str = "", latest: bool = False):
    rows = []
    tr_matches = [m.group(0) for m in re.finditer(r"<tr[\s\S]*?</tr>", html or "", re.I)]
    chunks = tr_matches or re.split(r"\n(?=\s*\d+\s+)", html or "")
    y = str(year or "").strip()
    mth = re.sub(r"^0+", "", str(month or "").strip())
    agency_norm = re.sub(r"\s+", "", agency or "").strip()

    for chunk in chunks:
        text = strip_tags(chunk)
        compact = re.sub(r"\s+", "", text)
        if "업무추진비" not in text:
            continue
        if not latest and y and f"{y}년" not in compact:
            continue
        if not latest and mth and f"{mth}월" not in compact:
            continue
        if agency_norm and agency_norm not in compact:
            continue
        title = extract_title(text) or text[:120]
        dm = re.search(r"20\d{2}[-.]\d{1,2}[-.]\d{1,2}", text)
        date = dm.group(0) if dm else ""
        detail_candidates = extract_detail_url_candidates(chunk, page_url)
        rows.append({
            "title": title,
            "date": date,
            "detailUrl": detail_candidates[0] if detail_candidates else "",
            "detailUrlCandidates": detail_candidates,
            "text": text,
        })

    # 제목 주변부에서 onclick을 한 번 더 찾기
    if rows and not any(r.get("detailUrl") for r in rows):
        for row in rows:
            key = row["title"][: min(24, len(row["title"]))]
            idx = html.find(key)
            if idx >= 0:
                nearby = html[max(0, idx - 4000) : min(len(html), idx + 4000)]
                cand = extract_detail_url_candidates(nearby, page_url)
                row["detailUrlCandidates"] = cand
                row["detailUrl"] = cand[0] if cand else ""
    return rows


def extract_attachment_urls(html: str, detail_url: str):
    urls = []
    anchors = [m.group(0) for m in re.finditer(r"<a\b[\s\S]*?</a>", html or "", re.I)]
    for a in anchors:
        text = strip_tags(a)
        hm = re.search(r"href\s*=\s*['\"]([^'\"]+)['\"]", a, re.I)
        om = re.search(r"onclick\s*=\s*['\"]([^'\"]+)['\"]", a, re.I)
        href = hm.group(1) if hm else ""
        onclick = om.group(1) if om else ""
        chunk = html_decode(f"{href} {onclick} {text}")
        if not re.search(r"\.xlsx|\.xls|\.csv|엑셀|첨부|download|file|atch|파일", chunk, re.I):
            continue
        if href and not re.match(r"^javascript:", href, re.I):
            urls.append(absolute_url(href, detail_url))
        urls += file_candidates_from_js(chunk, detail_url)

    # 전체 HTML에서 파일 다운로드 함수 호출 탐색
    for call in re.finditer(r"(?:file|File|atch|attach|download|Down|down)[A-Za-z0-9_]*\(([^)]*)\)", html or "", re.I):
        urls += file_candidates_from_js(call.group(0), detail_url)

    for href in [html_decode(m.group(1)) for m in re.finditer(r"href\s*=\s*['\"]([^'\"]+)['\"]", html or "", re.I)]:
        if re.search(r"\.(xlsx|xls|csv)(?:\?|$)|download|filedown|atch|attach|FileDown", href, re.I):
            urls.append(absolute_url(href, detail_url))

    out, seen = [], set()
    for u in urls:
        if u and "open.sen.go.kr" in u and u not in seen:
            seen.add(u)
            out.append(u)
    return out[:50]


def file_candidates_from_js(js: str, detail_url: str):
    js = html_decode(js or "")
    out = []
    for m in re.finditer(r"(/[^'\"\s)]+(?:download|file|File|atch|attach|Down|FileDown)[^'\"\s)]*)", js, re.I):
        out.append(absolute_url(m.group(1), detail_url))
    for m in re.finditer(r"(https?://open\.sen\.go\.kr/[^'\"\s)]+)", js, re.I):
        out.append(absolute_url(m.group(1), detail_url))
    args = [m.group(1) for m in re.finditer(r"['\"]([^'\"]+)['\"]", js)]
    # Egov 계열: atchFileId, fileSn 조합
    for i in range(len(args) - 1):
        file_id, sn = args[i], args[i + 1]
        if not re.search(r"[A-Za-z0-9_-]{6,}", file_id):
            continue
        if not re.fullmatch(r"\d{1,4}", sn):
            continue
        guesses = [
            f"/common/file/FileDown.do?atchFileId={file_id}&fileSn={sn}",
            f"/common/file/fileDown.do?atchFileId={file_id}&fileSn={sn}",
            f"/cmm/fms/FileDown.do?atchFileId={file_id}&fileSn={sn}",
            f"/common/cmm/fms/FileDown.do?atchFileId={file_id}&fileSn={sn}",
            f"/fus/file/fileDown.do?atchFileId={file_id}&fileSn={sn}",
        ]
        out.extend(absolute_url(u, detail_url) for u in guesses)
    return out


def find_post(source="chief", year="", month="", agency="", latest=False, forced_list_url=""):
    board = BOARDS.get(source) or BOARDS["chief"]
    list_url = forced_list_url or board["listUrl"]
    limit = 1 if latest else 12
    candidates, notices = [], []
    for url in page_urls(list_url, limit, agency=agency, year=year, month=month):
        try:
            html = fetch_text(url)
            rows = extract_rows_from_html(html, url, year, month, agency, latest)
            for row in rows:
                row.update({"board": board["label"], "agency": agency or board.get("agency", ""), "pageUrl": url})
            candidates.extend(rows)
            if candidates:
                break
        except Exception as e:
            notices.append(f"{url}: {e}")
    unique, seen = [], set()
    for item in candidates:
        key = f"{item.get('title')}|{item.get('date')}|{item.get('detailUrl')}"
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return board, unique, notices


def download_from_list_url(list_url: str, params: dict):
    source = params.get("source") or "org"
    year = params.get("year") or ""
    month = params.get("month") or ""
    agency = params.get("agency") or ""
    latest = str(params.get("latest") or "").lower() in ["1", "true", "yes"]
    board, candidates, notices = find_post(source, year, month, agency, latest, forced_list_url=list_url)
    if not candidates:
        err = RuntimeError("입력한 목록 URL에서는 조건에 맞는 업무추진비 게시글을 찾지 못했어요. 기관명/월을 비우거나, 제목이 보이는 상세 게시글을 직접 열어 주소를 넣어주세요.")
        err.candidates = candidates
        err.notices = notices
        raise err
    return download_first_candidate(board, candidates, notices, agency)


def download_from_post_url(detail_url: str, params=None):
    params = params or {}
    safe_detail = assert_open_sen_url(detail_url)
    if re.search(r"list\d*v\.do", urlparse(safe_detail).path, re.I):
        return download_from_list_url(safe_detail, params)
    # 첨부파일 주소를 바로 넣은 경우 먼저 시도
    if re.search(r"\.(xlsx|xls|csv)(?:\?|$)|download|filedown|FileDown|atch|attach", safe_detail, re.I):
        try:
            file = fetch_binary(safe_detail, BASE)
            return {**file, "title": "", "detailUrl": safe_detail, "attachmentUrl": safe_detail, "notices": ["입력한 URL을 첨부파일 주소로 보고 직접 다운로드했어요."]}
        except Exception:
            pass
    detail_html = fetch_text(safe_detail)
    title = extract_title(strip_tags(detail_html))
    attachments = extract_attachment_urls(detail_html, safe_detail)
    if not attachments:
        raise RuntimeError("게시글에서 엑셀 첨부파일 링크를 찾지 못했어요. 이 주소가 식별값 없는 view0010v.do라면 목록 URL과 같은 상태라서 게시글을 특정할 수 없어요.")
    errors = []
    for attachment_url in attachments:
        try:
            file = fetch_binary(attachment_url, safe_detail)
            return {**file, "title": title, "detailUrl": safe_detail, "attachmentUrl": attachment_url, "notices": []}
        except Exception as e:
            errors.append(f"{attachment_url}: {e}")
    raise RuntimeError(f"첨부파일 후보는 찾았지만 다운로드하지 못했어요. {errors[0] if errors else ''}")


def download_first_candidate(board, candidates, notices, agency=""):
    errors = []
    for item in candidates:
        detail_urls = item.get("detailUrlCandidates") or ([item.get("detailUrl")] if item.get("detailUrl") else [])
        for detail in detail_urls:
            try:
                file = download_from_post_url(detail, {})
                return {
                    **file,
                    "title": file.get("title") or item.get("title", ""),
                    "agency": agency or item.get("agency", "") or board.get("agency", ""),
                    "candidates": candidates,
                    "notices": notices,
                }
            except Exception as e:
                errors.append(f"{detail}: {e}")
    err = RuntimeError("게시글 후보는 찾았지만 상세/첨부 URL을 확정하지 못했어요. 서울 열린교육 게시판이 클릭용 스크립트/세션 방식이라 URL만으로는 글 번호가 빠질 수 있어요.")
    err.candidates = candidates
    err.notices = notices + errors[:6]
    raise err



def browser_auto_download(params: dict):
    """Playwright로 실제 브라우저를 띄워 게시글 클릭과 첨부 다운로드까지 시도한다."""
    logs = []
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    except Exception as e:
        raise RuntimeError(
            "Playwright 브라우저 자동화가 설치되어 있지 않아요. PowerShell에서 아래를 한 번만 실행해주세요.\n"
            "py -m pip install playwright\n"
            "py -m playwright install chromium\n\n"
            f"설치 확인 오류: {e}"
        )

    source = params.get("source") or "chief"
    year = params.get("year") or ""
    month = params.get("month") or ""
    agency = params.get("agency") or ""
    latest = str(params.get("latest") or "").lower() in ["1", "true", "yes"]
    board, candidates, notices = find_post(source, year, month, agency, latest)
    logs.extend(notices[:4])
    if not candidates:
        err = RuntimeError("게시글 후보를 찾지 못해서 브라우저 자동 다운로드를 시작할 수 없어요. 기관명을 비우거나 월을 확인해주세요.")
        err.candidates = candidates
        err.logs = logs
        raise err

    target = candidates[0]
    target_title = target.get("title") or ""
    page_url = target.get("pageUrl") or board.get("listUrl")
    logs.append(f"후보 선택: {target_title}")
    logs.append(f"목록 접속: {page_url}")

    with tempfile.TemporaryDirectory() as tmpdir:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                accept_downloads=True,
                locale="ko-KR",
                user_agent=UA,
                viewport={"width": 1440, "height": 1000},
            )
            page = context.new_page()
            try:
                page.goto(page_url, wait_until="networkidle", timeout=45000)
            except Exception:
                page.goto(page_url, wait_until="domcontentloaded", timeout=45000)
            logs.append("목록 페이지 열림")

            # 게시글 제목 클릭: 실제 사이트가 onclick/form 방식이어도 사용자가 클릭하는 것과 비슷하게 동작시킨다.
            clicked = False
            click_errors = []
            title_variants = [target_title, re.sub(r"\s+", " ", target_title).strip(), target_title[:40], target_title[:28]]
            for tv in [x for x in title_variants if x]:
                try:
                    locator = page.get_by_text(tv, exact=False).first
                    if locator.count() > 0:
                        try:
                            with page.expect_navigation(wait_until="networkidle", timeout=8000):
                                locator.click(timeout=6000)
                        except PlaywrightTimeoutError:
                            locator.click(timeout=6000)
                            page.wait_for_timeout(1800)
                        clicked = True
                        logs.append(f"게시글 클릭 시도 성공: {tv}")
                        break
                except Exception as e:
                    click_errors.append(f"{tv}: {e}")

            if not clicked:
                # a 태그를 훑어서 제목 조각이 들어있는 링크를 JS로 클릭한다.
                try:
                    js_clicked = page.evaluate(
                        """(title) => {
                            const compact = (s) => (s || '').replace(/\s+/g, '');
                            const key = compact(title).slice(0, 24);
                            const links = [...document.querySelectorAll('a, button, td')];
                            const el = links.find(a => compact(a.innerText || a.textContent || '').includes(key));
                            if (!el) return false;
                            el.click();
                            return true;
                        }""",
                        target_title,
                    )
                    if js_clicked:
                        page.wait_for_load_state("networkidle", timeout=10000)
                        clicked = True
                        logs.append("JS 클릭으로 게시글 열기 시도")
                except Exception as e:
                    click_errors.append(f"JS 클릭: {e}")

            if not clicked:
                browser.close()
                err = RuntimeError("게시글 후보는 찾았지만 실제 브라우저 클릭에 실패했어요. 사이트의 클릭 구조가 예상과 달라요.")
                err.candidates = candidates
                err.logs = logs + click_errors[-6:]
                raise err

            logs.append(f"현재 페이지: {page.url}")

            # 첨부파일 링크/버튼 찾기. 우선 다운로드 이벤트를 기대하고 클릭한다.
            candidate_handles = []
            try:
                link_count = min(page.locator("a, button").count(), 300)
                for i in range(link_count):
                    el = page.locator("a, button").nth(i)
                    try:
                        text = (el.inner_text(timeout=700) or "").strip()
                    except Exception:
                        text = ""
                    href = ""
                    onclick = ""
                    try:
                        href = el.get_attribute("href") or ""
                    except Exception:
                        pass
                    try:
                        onclick = el.get_attribute("onclick") or ""
                    except Exception:
                        pass
                    blob = f"{text} {href} {onclick}".lower()
                    if re.search(r"xlsx|xls|csv|첨부|다운|download|filedown|filedown|atch|attach|file", blob, re.I):
                        candidate_handles.append((i, text, href, onclick))
            except Exception as e:
                logs.append(f"첨부 후보 탐색 오류: {e}")

            logs.append(f"첨부 클릭 후보 {len(candidate_handles)}개")
            errors = []
            for i, text, href, onclick in candidate_handles[:20]:
                try:
                    el = page.locator("a, button").nth(i)
                    with page.expect_download(timeout=15000) as download_info:
                        el.click(timeout=6000)
                    download = download_info.value
                    suggested = download.suggested_filename or guess_file_name_from_url(href) or "업무추진비_공개자료.xlsx"
                    path = download.path()
                    data = Path(path).read_bytes()
                    if not is_excel_like(data, suggested, ""):
                        raise RuntimeError(f"다운로드는 됐지만 엑셀로 보이지 않아요: {suggested}")
                    logs.append(f"다운로드 성공: {suggested}")
                    browser.close()
                    return {
                        "fileName": suggested,
                        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "buffer": data,
                        "title": target_title,
                        "agency": agency or target.get("agency", ""),
                        "detailUrl": page.url,
                        "attachmentUrl": href,
                        "candidates": candidates,
                        "notices": notices,
                        "logs": logs,
                    }
                except Exception as e:
                    errors.append(f"{text or href or onclick[:40] or i}: {e}")
                    # 클릭으로 상세 내 다운로드 페이지로 이동했을 수도 있으니 원 상세 페이지로 되돌리지는 않는다.
                    try:
                        page.wait_for_timeout(500)
                    except Exception:
                        pass

            # 다운로드 이벤트가 안 뜨면 href 직접 요청 fallback
            for i, text, href, onclick in candidate_handles[:20]:
                if not href or href.startswith("javascript:"):
                    continue
                try:
                    url = absolute_url(href, page.url)
                    resp = context.request.get(url, headers={"Referer": page.url}, timeout=15000)
                    data = resp.body()
                    name = guess_file_name_from_url(url) or "업무추진비_공개자료.xlsx"
                    if resp.ok and is_excel_like(data, name, resp.headers.get("content-type", "")):
                        browser.close()
                        logs.append(f"href 직접 다운로드 성공: {name}")
                        return {
                            "fileName": name,
                            "contentType": resp.headers.get("content-type", ""),
                            "buffer": data,
                            "title": target_title,
                            "agency": agency or target.get("agency", ""),
                            "detailUrl": page.url,
                            "attachmentUrl": url,
                            "candidates": candidates,
                            "notices": notices,
                            "logs": logs,
                        }
                except Exception as e:
                    errors.append(f"href fallback {href}: {e}")

            browser.close()
            err = RuntimeError("게시글은 열었지만 첨부 엑셀 다운로드 버튼을 확정하지 못했어요. 진단 로그를 보고 다음 버전에서 선택자 보정이 필요해요.")
            err.candidates = candidates
            err.logs = logs + errors[-10:]
            raise err


def auto_download(params: dict):
    if params.get("directUrl"):
        return download_from_post_url(params.get("directUrl"), params)
    source = params.get("source") or "chief"
    year = params.get("year") or ""
    month = params.get("month") or ""
    agency = params.get("agency") or ""
    latest = str(params.get("latest") or "").lower() in ["1", "true", "yes"]
    board, candidates, notices = find_post(source, year, month, agency, latest)
    if not candidates:
        err = RuntimeError("조건에 맞는 업무추진비 게시글을 찾지 못했어요. 기관명 없이 최근 공개자료로 먼저 테스트하거나, 목록 URL을 아래 URL 칸에 넣어보세요.")
        err.candidates = candidates
        err.notices = notices
        raise err
    return download_first_candidate(board, candidates, notices, agency)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def send_json(self, status: int, payload: dict):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/sen-browser":
            q = {k: (v[0] if v else "") for k, v in parse_qs(parsed.query).items()}
            try:
                result = browser_auto_download(q)
                candidates = result.get("candidates") or []
                payload = {
                    "ok": True,
                    "fileName": result.get("fileName", "업무추진비_공개자료.xlsx"),
                    "contentType": result.get("contentType", ""),
                    "base64": base64.b64encode(result.get("buffer", b"")).decode("ascii"),
                    "title": result.get("title", ""),
                    "agency": result.get("agency", q.get("agency", "")),
                    "detailUrl": result.get("detailUrl", ""),
                    "attachmentUrl": result.get("attachmentUrl", ""),
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:10]
                    ],
                    "notices": result.get("notices", []),
                    "logs": result.get("logs", []),
                    "listUrl": (BOARDS.get(q.get("source") or "chief") or BOARDS["chief"]).get("listUrl", ""),
                }
                self.send_json(200, payload)
            except Exception as e:
                candidates = getattr(e, "candidates", [])
                logs = getattr(e, "logs", [])
                self.send_json(500, {
                    "ok": False,
                    "message": str(e) or "브라우저 자동 수집에 실패했어요.",
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:10]
                    ],
                    "logs": logs,
                    "listUrl": (BOARDS.get(q.get("source") or "chief") or BOARDS["chief"]).get("listUrl", ""),
                })
            return

        if parsed.path == "/api/sen-find":
            q = {k: (v[0] if v else "") for k, v in parse_qs(parsed.query).items()}
            try:
                source = q.get("source") or "chief"
                year = q.get("year") or ""
                month = q.get("month") or ""
                agency = q.get("agency") or ""
                latest = str(q.get("latest") or "").lower() in ["1", "true", "yes"]
                board, candidates, notices = find_post(source, year, month, agency, latest)
                payload = {
                    "ok": True,
                    "board": board.get("label", ""),
                    "listUrl": board.get("listUrl", ""),
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:20]
                    ],
                    "notices": notices,
                }
                self.send_json(200, payload)
            except Exception as e:
                candidates = getattr(e, "candidates", [])
                notices = getattr(e, "notices", [])
                self.send_json(500, {
                    "ok": False,
                    "message": str(e) or "게시글 후보를 찾지 못했어요.",
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:20]
                    ],
                    "notices": notices,
                })
            return

        if parsed.path == "/api/sen-auto":
            q = {k: (v[0] if v else "") for k, v in parse_qs(parsed.query).items()}
            try:
                result = auto_download(q)
                candidates = result.get("candidates") or []
                payload = {
                    "ok": True,
                    "fileName": result.get("fileName", "업무추진비_공개자료.xlsx"),
                    "contentType": result.get("contentType", ""),
                    "base64": base64.b64encode(result.get("buffer", b"")).decode("ascii"),
                    "title": result.get("title", ""),
                    "agency": result.get("agency", q.get("agency", "")),
                    "detailUrl": result.get("detailUrl", ""),
                    "attachmentUrl": result.get("attachmentUrl", result.get("finalUrl", "")),
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:10]
                    ],
                    "notices": result.get("notices", []),
                }
                self.send_json(200, payload)
            except Exception as e:
                candidates = getattr(e, "candidates", [])
                notices = getattr(e, "notices", [])
                self.send_json(500, {
                    "ok": False,
                    "message": str(e) or "공개자료를 불러오지 못했어요.",
                    "candidates": [
                        {"title": item.get("title", ""), "date": item.get("date", ""), "detailUrl": item.get("detailUrl", ""), "board": item.get("board", ""), "agency": item.get("agency", "")}
                        for item in candidates[:10]
                    ],
                    "notices": notices,
                })
            return

        rel = parsed.path.lstrip("/") or "index.html"
        try:
            target = (ROOT / rel).resolve()
            if not str(target).startswith(str(ROOT)) or not target.is_file():
                raise FileNotFoundError()
            data = target.read_bytes()
            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            if ctype.startswith("text/") or target.suffix in [".js", ".css", ".json", ".html"]:
                if "charset" not in ctype:
                    ctype += "; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            data = "Not found".encode("utf-8")
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"교육청 법카맵 v2.2 Python 로컬 서버: http://localhost:{PORT}", flush=True)
    print("종료하려면 이 창에서 Ctrl + C 를 누르세요.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료했어요.")
