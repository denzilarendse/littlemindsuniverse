/* Export controls for the existing teacher weekly-report editor.
 * Uses the existing report UI and approval workflow; it does not create or approve reports.
 */
(function () {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  let panel = null;
  let target = null;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
  const toast = message => {
    const node = $('#toast');
    if (node) { node.textContent = message; node.classList.add('show'); }
  };
  function getReportCard() {
    const root = $('#teacherReportsPanel');
    if (!root) return null;
    const summary = $('#teacherReportSummary', root);
    if (summary) return summary.closest('.card');
    return [...root.querySelectorAll('.card')].find(card => card.textContent.includes('Approved and released')) || null;
  }
  function fieldValue(card, id, label) {
    const input = $('#' + id, card);
    if (input) return input.value.trim();
    const paragraph = [...card.querySelectorAll('p')].find(p => p.textContent.trim().toLowerCase().startsWith(label.toLowerCase() + ':'));
    return paragraph ? paragraph.textContent.trim().slice(label.length + 1).trim() : '';
  }
  function readReport(card) {
    const heading = $('h2', card)?.textContent.trim() || 'Weekly report';
    const week = heading.match(/week of\s+(\d{4}-\d{2}-\d{2})/i)?.[1] || '';
    const status = card.textContent.includes('Approved and released') ? 'APPROVED' : 'DRAFT — NOT APPROVED';
    return {
      heading, week, status,
      summary: fieldValue(card, 'teacherReportSummary', 'Summary'),
      strengths: fieldValue(card, 'teacherReportStrengths', 'Strengths'),
      nextSteps: fieldValue(card, 'teacherReportNextSteps', 'Next steps'),
      homeSupport: fieldValue(card, 'teacherReportHomeSupport', 'Home support')
    };
  }
  function exportText() {
    const card = getReportCard();
    if (!card) return toast('Choose a weekly report first.');
    const report = readReport(card);
    const text = [
      'LittleMindsUniverse — Teacher weekly report',
      'Report: ' + report.heading,
      'Week starting: ' + (report.week || 'Not available'),
      'Status: ' + report.status,
      '',
      'Summary\n' + (report.summary || 'Not supplied'),
      '',
      'Strengths\n' + (report.strengths || 'Not supplied'),
      '',
      'Next steps\n' + (report.nextSteps || 'Not supplied'),
      '',
      'Home support\n' + (report.homeSupport || 'Not supplied'),
      '',
      'Generated from the current teacher report view. Drafts are not approved results.'
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lmu-weekly-report-' + (report.week || 'current') + '-' + report.status.toLowerCase().replace(/[^a-z]+/g, '-') + '.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Weekly report exported as text.');
  }
  function printReport() {
    target = getReportCard();
    if (!target) return toast('Choose a weekly report first.');
    document.querySelectorAll('.lmu-report-print-target').forEach(node => node.classList.remove('lmu-report-print-target'));
    target.classList.add('lmu-report-print-target');
    document.body.classList.add('lmu-print-report-only');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('lmu-print-report-only');
      target?.classList.remove('lmu-report-print-target');
      target = null;
    }, 500);
  }
  function decorate() {
    const current = $('#teacherReportsPanel');
    if (!current) { panel = null; return; }
    const card = getReportCard();
    if (!card) return;
    if (panel === current && $('#lmuReportExportActions', current)) return;
    panel = current;
    const heading = $('h2', card);
    if (!heading) return;
    const actions = document.createElement('div');
    actions.id = 'lmuReportExportActions';
    actions.className = 'actions lmu-report-export-actions';
    actions.innerHTML = '<button type="button" class="ghost" id="lmuReportExportTxt">Export report (.txt)</button><button type="button" class="ghost" id="lmuReportPrint">Print / Save PDF</button>';
    heading.insertAdjacentElement('afterend', actions);
    $('#lmuReportExportTxt', actions).addEventListener('click', exportText);
    $('#lmuReportPrint', actions).addEventListener('click', printReport);
  }
  const style = document.createElement('style');
  style.textContent = '@media print{body.lmu-print-report-only #app>*{display:none!important}body.lmu-print-report-only #teacherReportsPanel{display:block!important}body.lmu-print-report-only #teacherReportsPanel>*{display:none!important}body.lmu-print-report-only #teacherReportsPanel .lmu-report-print-target{display:block!important;box-shadow:none!important;border:0!important}body.lmu-print-report-only .lmu-report-export-actions{display:none!important}body.lmu-print-report-only .lmu-report-print-target textarea{border:0!important;white-space:pre-wrap!important}body.lmu-print-report-only .footer{display:none!important}}';
  document.head.appendChild(style);
  const observer = new MutationObserver(decorate);
  function boot() {
    const root = $('#app');
    if (root) observer.observe(root, { childList: true, subtree: true });
    decorate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();