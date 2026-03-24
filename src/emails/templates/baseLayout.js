export const baseLayout = ({ content }) => {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; background:#f4f6f8; font-family:Arial;">
    <table width="100%" align="center" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" style="background:#fff; border-radius:10px; padding:40px;">
            
            <!-- Logo -->
            <tr>
              <td align="center">
                <img src="https://www.amarlink.com/_next/image?url=%2Fimage%2Flogo.png&w=1920&q=75" width="120"/>
              </td>
            </tr>

            ${content}

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:30px; font-size:12px; color:#aaa;">
                If you didn’t request this, ignore this email.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};
