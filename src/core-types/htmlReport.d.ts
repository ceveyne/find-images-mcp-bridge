export declare function escapeHtml(value: string): string;
/**
 * Shared dark-theme HTML report shell used by every bridge's per-request preview report
 * (opened in Bionic via `open_url_in_app_browser`). Callers supply their own table head
 * and row markup; row/cell content and metadata formatting stay tool-specific.
 */
export declare function renderReportShell(title: string, theadHtml: string, rowsHtml: string): string;
