import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.emailUser,
      pass: env.emailPass,
    },
  });

  await transporter.sendMail({
    from: `"Support" <${env.emailUser}>`,
    to,
    subject,
    html,
  });
};

export default sendEmail;
