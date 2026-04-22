package com.edu.teacherai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_URL = "https://api.resend.com/emails";

    @Value("${resend.api.key:}")
    private String apiKey;

    @Value("${app.mail.from:onboarding@smartboard.co.in}")
    private String from;

    @Value("${admin.alert.email:support@smartboard.co.in}")
    private String adminAlertEmail;

    private void send(String to, String subject, String html) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("RESEND_API_KEY not set — skipping email to {}", to);
            return;
        }
        try {
            String body = """
                {"from":"%s","to":["%s"],"subject":"%s","html":%s}
                """.formatted(from, to, subject, jsonString(html)).strip();

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> resp = HttpClient.newHttpClient()
                    .send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                log.info("Email sent to {} (status {})", to, resp.statusCode());
            } else {
                log.warn("Resend API error {}: {}", resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    /** Escapes a raw HTML string into a JSON string literal. */
    private static String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\")
                       .replace("\"", "\\\"")
                       .replace("\n", "\\n")
                       .replace("\r", "") + "\"";
    }

    @Async
    public void sendWelcome(String toEmail, String name) {
        if (toEmail == null || toEmail.isBlank()) return;
        send(toEmail, "Welcome to SmartBoard AI!", buildWelcomeHtml(name));
    }

    @Async
    public void sendNewUserAlert(String name, String email, String mobile, String signupMethod) {
        String displayEmail  = (email  != null && !email.isBlank())  ? email  : "—";
        String displayMobile = (mobile != null && !mobile.isBlank() && !mobile.startsWith("google_") && !mobile.startsWith("email_"))
                ? mobile : "—";
        String html = """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
              <h2 style="color:#1e3a8a;margin:0 0 4px">&#127881; New Teacher Signed Up</h2>
              <p style="margin:0 0 20px;color:#64748b;font-size:13px">SmartBoard AI · New Registration</p>
              <table style="font-size:14px;color:#374151;width:100%%">
                <tr><td style="padding:7px 0;color:#64748b;width:140px">Name</td><td style="font-weight:700">%s</td></tr>
                <tr><td style="padding:7px 0;color:#64748b">Email</td><td>%s</td></tr>
                <tr><td style="padding:7px 0;color:#64748b">Mobile</td><td>%s</td></tr>
                <tr><td style="padding:7px 0;color:#64748b">Signed up via</td><td style="color:#2563eb;font-weight:600">%s</td></tr>
                <tr><td style="padding:7px 0;color:#64748b">Plan</td><td style="color:#d97706;font-weight:700">FREE</td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">View all users in your <a href="https://smartboard.co.in/admin" style="color:#2563eb">Admin Panel</a></p>
            </div>
            """.formatted(
                name != null ? name : "—",
                displayEmail,
                displayMobile,
                signupMethod
        );
        send(adminAlertEmail, "New Signup — " + (name != null ? name : "Teacher"), html);
    }

    @Async
    public void sendPaymentReceipt(String toEmail, String name, String plan, int amountPaise) {
        if (toEmail == null || toEmail.isBlank()) return;
        send(toEmail, "Payment Confirmed — SmartBoard AI " + plan + " Plan",
                buildReceiptHtml(name, plan, amountPaise));
    }

    @Async
    public void sendNewSchoolAlert(String schoolName, String adminEmail, String adminName, String phone) {
        String html = """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
              <h2 style="color:#1e3a8a;margin:0 0 16px">&#127979; New School Signed Up</h2>
              <table style="font-size:14px;color:#374151;width:100%">
                <tr><td style="padding:6px 0;color:#64748b;width:140px">School Name</td><td style="font-weight:700">%s</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Admin Name</td><td>%s</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Admin Email</td><td>%s</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Phone</td><td>%s</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Trial</td><td style="color:#d97706;font-weight:700">7 days · up to 5 teachers</td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#64748b">Login to your admin panel to activate this school after payment.</p>
            </div>
            """.formatted(schoolName, adminName, adminEmail, phone != null ? phone : "—");
        send(adminAlertEmail, "New School Registered — " + schoolName, html);
    }

    @Async
    public void sendPasswordReset(String toEmail, String name, String resetLink) {
        if (toEmail == null || toEmail.isBlank()) return;
        send(toEmail, "Reset your SmartBoard password", buildPasswordResetHtml(name, resetLink));
    }

    /* ── Email templates ── */

    private String buildWelcomeHtml(String name) {
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#1e3a8a,#3730a3);padding:32px 36px;text-align:center">
                <div style="font-size:40px">&#127891;</div>
                <h1 style="color:#fff;margin:12px 0 4px;font-size:24px">Welcome to SmartBoard AI!</h1>
                <p style="color:rgba(255,255,255,0.8);margin:0;font-size:15px">Your AI-powered teaching assistant</p>
              </div>
              <div style="padding:32px 36px">
                <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong>,</p>
                <p style="color:#475569;line-height:1.7">You're all set! Here's what you can do with your FREE account:</p>
                <ul style="color:#475569;line-height:2;padding-left:20px">
                  <li>Generate <strong>3 lesson plans/day</strong></li>
                  <li>Create <strong>2 assessments/day</strong></li>
                  <li>Send <strong>2 notices/day</strong></li>
                  <li>Generate <strong>1 report card/day</strong></li>
                </ul>
                <p style="color:#475569;line-height:1.7">Need more? Upgrade to <strong>PRO at &#8377;199/month</strong> for unlimited access.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://smartboard.co.in/dashboard" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Go to Dashboard &#8594;
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                &#169; 2026 SmartBoard AI &middot; smartboard.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher");
    }

    private String buildPasswordResetHtml(String name, String resetLink) {
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#1e3a8a,#7c3aed);padding:32px 36px;text-align:center">
                <div style="font-size:40px">&#128272;</div>
                <h1 style="color:#fff;margin:12px 0 4px;font-size:22px">Reset Your Password</h1>
                <p style="color:rgba(255,255,255,0.8);margin:0;font-size:15px">SmartBoard AI</p>
              </div>
              <div style="padding:32px 36px">
                <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong>,</p>
                <p style="color:#475569;line-height:1.7">We received a request to reset your password. Click the button below — this link is valid for <strong>1 hour</strong>.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="%s" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Reset Password &#8594;
                  </a>
                </div>
                <p style="color:#94a3b8;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                &#169; 2026 SmartBoard AI &middot; smartboard.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher", resetLink);
    }

    private String buildReceiptHtml(String name, String plan, int amountPaise) {
        String amount = "&#8377;" + (amountPaise / 100);
        return """
            <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
              <div style="background:linear-gradient(135deg,#059669,#047857);padding:32px 36px;text-align:center">
                <div style="font-size:40px">&#9989;</div>
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
                <p style="color:#475569">You now have <strong>unlimited access</strong> to all SmartBoard AI features.</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://smartboard.co.in/dashboard" style="background:#2563eb;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Go to Dashboard &#8594;
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:16px 36px;text-align:center;font-size:12px;color:#94a3b8">
                &#169; 2026 SmartBoard AI &middot; smartboard.co.in
              </div>
            </div>
            """.formatted(name != null ? name : "Teacher", plan, amount);
    }
}
