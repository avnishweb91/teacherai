package com.edu.teacherai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendWelcome(String toEmail, String name) {
        if (toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(from);
            h.setTo(toEmail);
            h.setSubject("Welcome to TeacherCopilot!");
            h.setText(buildWelcomeHtml(name), true);
            mailSender.send(msg);
            log.info("Welcome email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPaymentReceipt(String toEmail, String name, String plan, int amountPaise) {
        if (toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(from);
            h.setTo(toEmail);
            h.setSubject("Payment Confirmed — TeacherCopilot " + plan + " Plan");
            h.setText(buildReceiptHtml(name, plan, amountPaise), true);
            mailSender.send(msg);
            log.info("Payment receipt sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send receipt email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPasswordReset(String toEmail, String name, String resetLink) {
        if (toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(from);
            h.setTo(toEmail);
            h.setSubject("Reset your SmartBoard password");
            h.setText(buildPasswordResetHtml(name, resetLink), true);
            mailSender.send(msg);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    /* ── Email templates ── */

    private String buildWelcomeHtml(String name) {
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#1e3a8a,#3730a3);padding:32px 36px;text-align:center">
                <div style="font-size:40px">🎓</div>
                <h1 style="color:#fff;margin:12px 0 4px;font-size:24px">Welcome to TeacherCopilot!</h1>
                <p style="color:rgba(255,255,255,0.8);margin:0;font-size:15px">Your AI-powered teaching assistant</p>
              </div>
              <div style="padding:32px 36px">
                <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong>,</p>
                <p style="color:#475569;line-height:1.7">You're all set! Here's what you can do with your FREE account:</p>
                <ul style="color:#475569;line-height:2;padding-left:20px">
                  <li>📘 Generate <strong>3 lesson plans/day</strong></li>
                  <li>📝 Create <strong>2 assessments/day</strong></li>
                  <li>📢 Send <strong>2 notices/day</strong></li>
                  <li>📄 Generate <strong>1 report card/day</strong></li>
                </ul>
                <p style="color:#475569;line-height:1.7">Need more? Upgrade to <strong>PRO at ₹199/month</strong> for unlimited access.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://teachercopilot.co.in" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Go to Dashboard →
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                © 2025 TeacherCopilot · teachercopilot.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher");
    }

    private String buildPasswordResetHtml(String name, String resetLink) {
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#1e3a8a,#7c3aed);padding:32px 36px;text-align:center">
                <div style="font-size:40px">🔐</div>
                <h1 style="color:#fff;margin:12px 0 4px;font-size:22px">Reset Your Password</h1>
                <p style="color:rgba(255,255,255,0.8);margin:0;font-size:15px">SmartBoard AI</p>
              </div>
              <div style="padding:32px 36px">
                <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong>,</p>
                <p style="color:#475569;line-height:1.7">We received a request to reset your password. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="%s" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Reset Password →
                  </a>
                </div>
                <p style="color:#94a3b8;font-size:13px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                © 2025 SmartBoard AI · smartboard.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher", resetLink);
    }

    private String buildReceiptHtml(String name, String plan, int amountPaise) {
        String amount = "₹" + (amountPaise / 100);
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#059669,#047857);padding:32px 36px;text-align:center">
                <div style="font-size:40px">✅</div>
                <h1 style="color:#fff;margin:12px 0 4px;font-size:22px">Payment Successful!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:0;font-size:15px">Your plan has been upgraded</p>
              </div>
              <div style="padding:32px 36px">
                <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong>,</p>
                <p style="color:#475569">Thank you for upgrading! Here are your payment details:</p>
                <div style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin:20px 0;border:1px solid #e2e8f0">
                  <table style="width:100%%;font-size:14px;color:#374151">
                    <tr><td style="padding:6px 0;color:#64748b">Plan</td><td style="text-align:right;font-weight:700">%s</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b">Amount Paid</td><td style="text-align:right;font-weight:700;color:#059669">%s</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b">Status</td><td style="text-align:right;font-weight:700;color:#059669">Confirmed</td></tr>
                  </table>
                </div>
                <p style="color:#475569">You now have <strong>unlimited access</strong> to all TeacherCopilot features.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://teachercopilot.co.in/dashboard" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Go to Dashboard →
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                © 2025 TeacherCopilot · teachercopilot.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher", plan, amount);
    }
}
