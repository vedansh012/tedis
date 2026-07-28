import { serverEnv } from "@/config/env";

/**
 * Branded HTML email shell.
 *
 * Written to the constraints of real mail clients, not the browser:
 *  - table layout, because Outlook (Word rendering engine) has no flex/grid
 *  - every style inlined, because Gmail strips <style> blocks in some contexts
 *  - a bulletproof VML button so the CTA is clickable in Outlook too
 *  - no external CSS, webfonts, or images — those get blocked by default and
 *    would leave the message looking broken before the reader opts in
 *  - `prefers-color-scheme` is honoured where supported, with a light-mode
 *    design that stays legible if it isn't
 *
 * Every value passed in is escaped: these strings end up inside an HTML
 * document, and an address or name could otherwise inject markup.
 */

export interface EmailBody {
  /** Hidden text shown next to the subject in the inbox list. */
  preheader: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Expiry/one-time-use wording, shown under the button. */
  outro: string;
  /** Quiet "if this wasn't you" line. */
  footnote: string;
}

const BRAND = "#E85D04"; // TedIS orange, darkened for contrast on white
const INK = "#16181D";
const MUTED = "#5B6070";
const BORDER = "#E6E4E1";

/** Escape for HTML text/attribute context. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmail(b: EmailBody): string {
  const appName = serverEnv.APP_NAME;
  const appUrl = serverEnv.APP_URL;
  const url = esc(b.ctaUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(b.heading)}</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F6F5F3;color:${INK};-webkit-font-smoothing:antialiased;">
  <!-- preheader: shown in the inbox preview, hidden in the body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(b.preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F5F3;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:14px;">

          <!-- wordmark -->
          <tr>
            <td style="padding:28px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <a href="${esc(appUrl)}" style="color:${BRAND};font-size:18px;font-weight:700;letter-spacing:-0.2px;text-decoration:none;">${esc(appName)}</a>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${esc(b.heading)}</h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${MUTED};">${esc(b.intro)}</p>
            </td>
          </tr>

          <!-- CTA (VML fallback keeps it a real button in Outlook) -->
          <tr>
            <td align="left" style="padding:24px 32px 0 32px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                           href="${url}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="20%"
                           stroke="f" fillcolor="${BRAND}">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(b.ctaLabel)}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${url}"
                 style="display:inline-block;background:${BRAND};color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:600;line-height:46px;height:46px;padding:0 28px;border-radius:10px;text-decoration:none;">${esc(b.ctaLabel)}</a>
              <!--<![endif]-->
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">${esc(b.outro)}</p>
            </td>
          </tr>

          <!-- copyable fallback: some clients mangle or strip the button -->
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <p style="margin:0 0 6px 0;font-size:12px;color:${MUTED};">Or paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${url}" style="color:${BRAND};text-decoration:underline;">${url}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <div style="border-top:1px solid ${BORDER};padding-top:16px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">${esc(b.footnote)}</p>
              </div>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:16px 8px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#8A8F9C;">
                ${esc(appName)} · Build in the open<br>
                <a href="${esc(appUrl)}/privacy" style="color:#8A8F9C;text-decoration:underline;">Privacy</a> ·
                <a href="${esc(appUrl)}/terms" style="color:#8A8F9C;text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
