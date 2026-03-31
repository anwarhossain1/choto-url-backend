import { baseLayout } from "./baseLayout.js";

export const paymentApprovedTemplate = ({
  userName,
  plan,
  amount,
  billingCycle,
  validUntil,
  dashboardURL,
}) => {
  const content = `
    <tr>
      <td align="center" style="font-size:22px; font-weight:bold;">
        Payment Approved 🎉
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:20px; color:#555;">
        Hi ${userName || "there"}, 👋<br/>
        আপনার পেমেন্ট রিকোয়েস্টটি সফলভাবে 
        <strong style="color:#16a34a;">অনুমোদিত হয়েছে</strong>।
      </td>
    </tr>

    <!-- Info Box -->
    <tr>
      <td align="center" style="padding:10px 20px;">
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#f1f5f9;border-radius:8px;">
          <tr>
            <td><strong>Plan:</strong></td>
            <td align="right">${plan}</td>
          </tr>
          <tr>
            <td><strong>Amount:</strong></td>
            <td align="right">৳ ${amount}</td>
          </tr>
          <tr>
            <td><strong>Billing Cycle:</strong></td>
            <td align="right">${billingCycle}</td>
          </tr>
          <tr>
            <td><strong>Valid Until:</strong></td>
            <td align="right">${validUntil}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:20px; color:#555;">
        🎉 Your subscription is now active. You can start enjoying premium features immediately.
      </td>
    </tr>

    <tr>
      <td align="center">
        <a href="${dashboardURL || "https://amarlink.com/links"}"
          style="background:#2563eb; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none;">
          Go to Dashboard
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding-top:20px; font-size:13px; color:#777;">
        Need help? Contact our support team anytime.
      </td>
    </tr>
  `;

  return baseLayout({ content });
};
