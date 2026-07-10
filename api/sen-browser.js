const { BOARDS, browserAutoDownload, autoDownload } = require('../lib/sen-scraper');

function toCandidate(item) {
  return {
    title: item.title || '',
    date: item.date || '',
    detailUrl: item.detailUrl || '',
    board: item.board || '',
    agency: item.agency || '',
  };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const source = q.source || 'chief';
  const board = BOARDS[source] || BOARDS.chief;
  const startedAt = Date.now();
  const logs = [
    `조회 시작: ${board.label}`,
    `조건: ${q.year || ''}년 ${q.month || ''}월${q.agency ? ` / ${q.agency}` : ''}`,
  ];

  try {
    const params = {
      source,
      year: q.year || '',
      month: q.month || '',
      agency: q.agency || '',
      latest: q.latest === '1' || q.latest === 'true',
      directUrl: q.directUrl || '',
    };

    let result;
    try {
      result = await browserAutoDownload(params);
    } catch (browserError) {
      // 브라우저 자동화가 설치/실행되지 않는 환경에서는 기존 URL 추출 방식으로 한 번 더 시도한다.
      try {
        result = await autoDownload(params);
      } catch (simpleError) {
        simpleError.logs = (browserError.logs || []).concat(simpleError.logs || simpleError.notices || []);
        simpleError.candidates = simpleError.candidates || browserError.candidates;
        simpleError.notices = simpleError.notices || browserError.notices;
        throw simpleError;
      }
    }
    logs.push(`게시글 확인: ${result.title || '제목 없음'}`);
    logs.push(`첨부파일 확인: ${result.fileName || '파일명 없음'}`);
    logs.push(`처리시간: ${Math.round((Date.now() - startedAt) / 100) / 10}초`);

    res.setHeader('cache-control', 'no-store');
    res.status(200).json({
      ok: true,
      fileName: result.fileName,
      contentType: result.contentType,
      base64: result.buffer.toString('base64'),
      title: result.title || '',
      agency: result.agency || params.agency || board.agency || '',
      detailUrl: result.detailUrl || '',
      attachmentUrl: result.attachmentUrl || result.finalUrl || '',
      listUrl: board.listUrl,
      candidates: (result.candidates || []).slice(0, 10).map(toCandidate),
      notices: result.notices || [],
      logs: logs.concat(result.notices || []),
    });
  } catch (error) {
    logs.push(error.message || '자동 수집 실패');
    res.setHeader('cache-control', 'no-store');
    res.status(500).json({
      ok: false,
      message: error.message || '공개자료 수집에 실패했어요.',
      listUrl: board.listUrl,
      candidates: (error.candidates || []).slice(0, 10).map(toCandidate),
      notices: error.notices || [],
      logs: logs.concat(error.logs || error.notices || []),
    });
  }
};
