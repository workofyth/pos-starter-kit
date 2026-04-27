/**
 * Email Service using Resend API (via fetch to avoid dependency issues)
 */

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@talertech.com";

  if (!apiKey || apiKey === "re_123456789") {
    console.error("RESEND_API_KEY is not configured. Email not sent.");
    return { success: false, error: "API key missing" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `TALERTECH <${from}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, ""), // Simple HTML to Text fallback
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, id: result.id };
    } else {
      console.error("Resend API error:", result);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
