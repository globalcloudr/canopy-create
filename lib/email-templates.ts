/**
 * HTML email templates for Canopy Create transactional emails.
 *
 * Templates use inline styles for maximum email client compatibility.
 * Brand blue: #2f76dd  |  Light bg: #f4f7fb  |  Text: #1a1a2e
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://create.canopyschool.us";

// ─── Shared layout ─────────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2f76dd,#5c96ea);border-radius:12px 12px 0 0;padding:24px 32px;">
              <span style="font-size:15px;font-weight:700;color:#fff;letter-spacing:0.01em;">Canopy Create</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8fa8;">
                You're receiving this because you're a member of a Canopy Create workspace.<br/>
                <a href="${APP_URL}" style="color:#2f76dd;text-decoration:none;">Open Canopy Create</a>
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

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2f76dd;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;margin-top:24px;">${label}</a>`;
}

function itemCard(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;">
      <span style="font-size:12px;color:#8a8fa8;text-transform:uppercase;letter-spacing:0.05em;">${label}</span><br/>
      <span style="font-size:15px;font-weight:600;color:#1a1a2e;">${value}</span>
    </td>
  </tr>`;
}

// ─── Proof ready ───────────────────────────────────────────────────────────────

export type ProofReadyData = {
  recipientName: string;
  deliverableName: string;
  projectTitle: string;
  workspaceName: string;
  versionLabel?: string;
  itemId: string;
  workspaceId: string;
};

export function proofReadyEmail(data: ProofReadyData): { subject: string; html: string } {
  const reviewUrl = `${APP_URL}/items/${data.itemId}?workspace=${encodeURIComponent(data.workspaceId)}`;

  const body = `
    <p style="margin:0 0 6px;font-size:16px;color:#8a8fa8;">Hi ${escapeHtml(data.recipientName)},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">
      Your proof is ready for review
    </h1>

    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
      A new proof has been uploaded and is waiting for your feedback on
      <strong>${escapeHtml(data.projectTitle)}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      <tbody>
        ${itemCard("Deliverable", data.deliverableName)}
        ${data.versionLabel ? itemCard("Version", data.versionLabel) : ""}
        ${itemCard("Project", data.projectTitle)}
      </tbody>
    </table>

    ${ctaButton(reviewUrl, "Review proof →")}

    <p style="margin:28px 0 0;font-size:13px;color:#8a8fa8;line-height:1.6;">
      Once you've reviewed it, use the approve or request&nbsp;changes buttons on the proof page.
      Your feedback goes directly to the production team.
    </p>
  `;

  return {
    subject: `Proof ready for review: ${data.deliverableName} — ${data.projectTitle}`,
    html: layout(body),
  };
}

// ─── File delivered ────────────────────────────────────────────────────────────

export type DeliveredData = {
  recipientName: string;
  deliverableName: string;
  projectTitle: string;
  workspaceName: string;
  itemId: string;
  workspaceId: string;
};

export function deliveredEmail(data: DeliveredData): { subject: string; html: string } {
  const downloadUrl = `${APP_URL}/items/${data.itemId}?workspace=${encodeURIComponent(data.workspaceId)}`;

  const body = `
    <p style="margin:0 0 6px;font-size:16px;color:#8a8fa8;">Hi ${escapeHtml(data.recipientName)},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">
      Your file is ready to download
    </h1>

    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
      <strong>${escapeHtml(data.deliverableName)}</strong> has been marked as delivered
      on <strong>${escapeHtml(data.projectTitle)}</strong> and is ready for you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      <tbody>
        ${itemCard("Deliverable", data.deliverableName)}
        ${itemCard("Project", data.projectTitle)}
      </tbody>
    </table>

    ${ctaButton(downloadUrl, "Download your file →")}

    <p style="margin:28px 0 0;font-size:13px;color:#8a8fa8;line-height:1.6;">
      Your final file is also available any time in the <strong>Files</strong> tab of your project.
    </p>
  `;

  return {
    subject: `Your file is ready: ${data.deliverableName} — ${data.projectTitle}`,
    html: layout(body),
  };
}

// ─── Changes requested (internal notification) ─────────────────────────────────

export type ChangesRequestedData = {
  recipientName: string;
  deliverableName: string;
  projectTitle: string;
  workspaceName: string;
  clientNote: string | null;
  itemId: string;
  workspaceId: string;
};

export function changesRequestedEmail(data: ChangesRequestedData): { subject: string; html: string } {
  const itemUrl = `${APP_URL}/items/${data.itemId}?workspace=${encodeURIComponent(data.workspaceId)}`;

  const noteBlock = data.clientNote
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#fff8e1;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:14px;color:#444;font-style:italic;">
        "${escapeHtml(data.clientNote)}"
       </blockquote>`
    : `<p style="margin:12px 0;font-size:14px;color:#8a8fa8;font-style:italic;">No note was left.</p>`;

  const body = `
    <p style="margin:0 0 6px;font-size:16px;color:#8a8fa8;">Hi ${escapeHtml(data.recipientName)},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">
      Changes have been requested
    </h1>

    <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.6;">
      <strong>${escapeHtml(data.workspaceName)}</strong> has requested changes on
      <strong>${escapeHtml(data.deliverableName)}</strong>.
    </p>

    <p style="margin:0 0 4px;font-size:13px;color:#8a8fa8;">Client note:</p>
    ${noteBlock}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;border-radius:8px;padding:16px 20px;margin:16px 0 8px;">
      <tbody>
        ${itemCard("Deliverable", data.deliverableName)}
        ${itemCard("Project", data.projectTitle)}
        ${itemCard("Client", data.workspaceName)}
      </tbody>
    </table>

    ${ctaButton(itemUrl, "View deliverable →")}
  `;

  return {
    subject: `Changes requested: ${data.deliverableName} — ${data.workspaceName}`,
    html: layout(body),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
