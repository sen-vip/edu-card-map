const { BOARDS, findPost } = require('../lib/sen-scraper');

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
  try {
    const q = req.query || {};
    const source = q.source || 'chief';
    const params = {
      source,
      year: q.year || '',
      month: q.month || '',
      agency: q.agency || '',
      latest: q.latest === '1' || q.latest === 'true',
    };

    const result = await findPost(params);
    const board = result.board || BOARDS[source] || BOARDS.chief;
    const candidates = (result.candidates || []).slice(0, 20).map(toCandidate);

    res.setHeader('cache-control', 'no-store');
    res.status(200).json({
      ok: true,
      board: board.label,
      listUrl: board.listUrl,
      candidates,
      notices: result.notices || [],
      logs: result.notices || [],
    });
  } catch (error) {
    const source = req.query?.source || 'chief';
    const board = BOARDS[source] || BOARDS.chief;
    res.setHeader('cache-control', 'no-store');
    res.status(500).json({
      ok: false,
      message: error.message || '게시글 후보를 찾지 못했어요.',
      listUrl: board.listUrl,
      candidates: (error.candidates || []).slice(0, 20).map(toCandidate),
      notices: error.notices || [],
      logs: error.logs || error.notices || [],
    });
  }
};
