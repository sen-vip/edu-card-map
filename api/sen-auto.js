const { autoDownload } = require('../lib/sen-scraper');

module.exports = async function handler(req, res) {
  try {
    const q = req.query || {};
    const source = q.source || 'chief';
    const year = q.year || '';
    const month = q.month || '';
    const agency = q.agency || '';
    const latest = q.latest === '1' || q.latest === 'true';
    const directUrl = q.directUrl || '';

    const result = await autoDownload({ source, year, month, agency, latest, directUrl });
    res.setHeader('cache-control', 'no-store');
    res.status(200).json({
      ok: true,
      fileName: result.fileName,
      contentType: result.contentType,
      base64: result.buffer.toString('base64'),
      title: result.title || '',
      agency: result.agency || agency || '',
      detailUrl: result.detailUrl || '',
      attachmentUrl: result.attachmentUrl || result.finalUrl || '',
      candidates: (result.candidates || []).slice(0, 10).map(item => ({
        title: item.title,
        date: item.date,
        detailUrl: item.detailUrl,
        board: item.board,
        agency: item.agency,
      })),
      notices: result.notices || [],
    });
  } catch (error) {
    res.setHeader('cache-control', 'no-store');
    res.status(500).json({
      ok: false,
      message: error.message || '공개자료를 불러오지 못했어요.',
      candidates: (error.candidates || []).slice(0, 10).map(item => ({
        title: item.title,
        date: item.date,
        detailUrl: item.detailUrl,
        board: item.board,
        agency: item.agency,
      })),
      notices: error.notices || [],
    });
  }
};
