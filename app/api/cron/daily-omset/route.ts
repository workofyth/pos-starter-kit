import { NextRequest, NextResponse } from "next/server";
import { getDailyOmsetSummary, getReportRecipients, isEmailReportingEnabled } from "@/lib/reporting-service";
import { sendEmail } from "@/lib/email-service";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  // 1. Simple Security Check
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    // 2. Check if Reporting is Enabled
    const isEnabled = await isEmailReportingEnabled();
    if (!isEnabled) {
      console.log("Daily email reporting is disabled in settings.");
      return NextResponse.json({ success: true, message: "Reporting is disabled" });
    }

    // 3. Get Data for Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = format(yesterday, "EEEE, dd MMMM yyyy");
    
    const summaries = await getDailyOmsetSummary(yesterday);
    const recipients = await getReportRecipients();

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: "No report recipients found" });
    }

    if (summaries.length === 0) {
       // Send an email even if no sales, just to confirm it's working?
       // For now, let's just log and skip if no sales to avoid spamming empty emails
       console.log("No sales data for yesterday, skipping email.");
       return NextResponse.json({ success: true, message: "No sales data found for yesterday" });
    }

    // 3. Format HTML Content
    const totalOmsetAll = summaries.reduce((sum, s) => sum + s.netRevenue, 0);
    
    const tableRows = summaries.map(s => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${s.branchName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${s.totalTransactions}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rp ${s.totalOmset.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rp ${s.totalDiscount.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">Rp ${s.netRevenue.toLocaleString()}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Daily Omset Summary</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">${dateString}</p>
        </div>
        
        <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="font-size: 18px; margin-bottom: 20px;">Business Performance Overview</h2>
          
          <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Total Network Omset</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-bold; color: #2563eb;">Rp ${totalOmsetAll.toLocaleString()}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Total Branches Active</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-bold; color: #2563eb;">${summaries.length}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left;">Branch</th>
                <th style="padding: 12px; text-align: center;">Orders</th>
                <th style="padding: 12px; text-align: right;">Gross</th>
                <th style="padding: 12px; text-align: right;">Disc.</th>
                <th style="padding: 12px; text-align: right;">Net Omset</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>This is an automated report from TALERTECH POS System.</p>
            <p>&copy; 2026 TALERTECH Inc.</p>
          </div>
        </div>
      </div>
    `;

    // 4. Send Email to all Admins
    const emailResult = await sendEmail({
      to: recipients,
      subject: `[TALERTECH] Daily Omset Report - ${dateString}`,
      html: htmlContent
    });

    return NextResponse.json({ 
      success: emailResult.success, 
      message: emailResult.success ? "Reports sent successfully" : emailResult.error,
      recipientCount: recipients.length,
      dataDate: dateString
    });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
