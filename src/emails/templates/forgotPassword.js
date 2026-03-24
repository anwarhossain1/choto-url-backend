import { baseLayout } from "./baseLayout.js";

export const forgotPasswordTemplate = ({ resetURL, name }) => {
  const content = `
    <tr>
      <td align="center" style="font-size:22px; font-weight:bold;">
        Reset Your Password
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:20px; color:#555;">
        Hi ${name || "there"},<br/>
        Click below to reset your password.
      </td>
    </tr>

    <tr>
      <td align="center">
        <a href="${resetURL}" style="background:#4f46e5; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none;">
          Reset Password
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding-top:20px; font-size:13px; color:#777;">
        This link expires in 15 minutes.
      </td>
    </tr>
  `;

  return baseLayout({ content });
};
