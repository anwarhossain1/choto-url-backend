import { baseLayout } from "./baseLayout.js";

export const resetPasswordSuccessTemplate = ({ name, loginURL }) => {
  const content = `
    <!-- Heading -->
    <tr>
      <td align="center" style="font-size:22px; font-weight:bold; color:#16a34a;">
        Password Reset Successful
      </td>
    </tr>

    <!-- Message -->
    <tr>
      <td align="center" style="padding:20px; font-size:15px; color:#555; line-height:1.6;">
        Hi ${name || "there"},<br/><br/>
        Your password has been successfully updated. You can now sign in using your new password.
      </td>
    </tr>

    <!-- Button -->
    <tr>
      <td align="center" style="padding: 10px 0 20px;">
        <a href="${loginURL}" 
          style="background-color:#16a34a; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-size:14px; font-weight:600; display:inline-block;">
          Go to Login
        </a>
      </td>
    </tr>

    <!-- Security Warning -->
    <tr>
      <td align="center" style="font-size:13px; color:#777; line-height:1.6; padding-top:10px;">
        If you did not perform this action, please reset your password immediately or contact support.
      </td>
    </tr>

    <!-- Extra Info -->
    <tr>
      <td align="center" style="padding-top:15px; font-size:12px; color:#999;">
        For security reasons, we recommend not sharing your password with anyone.
      </td>
    </tr>
  `;

  return baseLayout({ content });
};
