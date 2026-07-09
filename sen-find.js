const { autoDownload } = require('../lib/sen-scraper');

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
    const params = {
      source: q.source || 'chief',
      year: q.year || '',
      month: q.month || '',
      agency: q.agency || '',
      latest: q.latest === '1' || q.latest === 'true',
      directUrl: q.directUrl || '',
    };

    const result = await autoDownload(params);
    res.setHeader('cache-control', 'no-store');
    res.status(200).json({
      ok: true,
      fileName: result.fileName,
      contentType: result.contentType,
      base64: result.buffer.toString('base64'),
      title: result.title || '',
      agency: result.agency || params.agency || '',
      detailUrl: result.detailUrl || '',
      attachmentUrl: result.attachmentUrl || result.finalUrl || '',
      candidates: (result.candidates || []).slice(0, 10).map(toCandidate),
      notices: result.notices || [],
      logs: result.logs || result.notices || [],
    });
  } catch (error) {
    res.setHeader('cache-control', 'no-store');
    res.status(500).json({
      ok: false,
      message: error.message || '공개자료를 불러오지 못했어요.',
      candidates: (error.candidates || []).slice(0, 10).map(toCandidate),
      notices: error.notices || [],
      logs: error.logs || error.notices || [],
    });
  }
};
