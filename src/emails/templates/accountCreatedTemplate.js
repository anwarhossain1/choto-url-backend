import { baseLayout } from "./baseLayout.js";

export const accountCreatedTemplate = ({ name, loginURL }) => {
  const content = `
    <tr>
      <td align="center" style="font-size:22px; font-weight:bold;">
        Welcome to AmarLink 🎉
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:20px; color:#555;">
        Hi ${name || "there"},<br/>
        Your account has been successfully created. We're excited to have you onboard!
      </td>
    </tr>

    <tr>
      <td align="center" style="padding-bottom:10px; color:#555;">
        You can now start creating and managing your short links easily.
      </td>
    </tr>

    <tr>
      <td align="center">
        <a href="${loginURL}" style="background:#10b981; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none;">
          Go to Dashboard
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding-top:20px; font-size:13px; color:#777;">
        If you did not create this account, please ignore this email.
      </td>
    </tr>
  `;

  return baseLayout({ content });
};
