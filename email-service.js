// Email Notification Service using Nodemailer (FREE with Gmail SMTP)
const nodemailer = require('nodemailer');

// ============================================
// EMAIL TRANSPORT CONFIGURATION
// ============================================

function createEmailTransport() {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  Email notifications disabled: EMAIL_USER and EMAIL_PASS not configured in .env');
        return null;
    }

    // Create reusable transporter using Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,     // Your Gmail address
            pass: process.env.EMAIL_PASS       // App-specific password (not your regular Gmail password)
        }
    });

    return transporter;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateProjectUpdateEmail(project, updateType, updateDetails) {
    const subject = `Iowa DOT Update: ${project.name}`;

    let updateMessage = '';
    if (updateType === 'status_change') {
        updateMessage = `<p><strong>Status Updated:</strong> ${updateDetails.old_status} → ${updateDetails.new_status}</p>`;
    } else if (updateType === 'completion_change') {
        updateMessage = `<p><strong>Completion Updated:</strong> ${updateDetails.old_completion}% → ${updateDetails.new_completion}%</p>`;
    } else if (updateType === 'new_comment') {
        updateMessage = `<p><strong>New Comment:</strong> "${updateDetails.comment_text}"</p>`;
    } else if (updateType === 'milestone') {
        updateMessage = `<p><strong>Milestone Reached:</strong> ${updateDetails.milestone}</p>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #03617A 0%, #19405B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .project-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .category-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 20px; }
        .update-box { background: white; padding: 20px; border-left: 4px solid #03617A; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #03617A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        .unsubscribe { color: #9ca3af; font-size: 11px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🚧 Iowa DOT Project Update</h1>
        </div>
        <div class="content">
            <div class="project-name">${project.name}</div>
            <div class="category-badge">${project.category}</div>

            <div class="update-box">
                ${updateMessage}

                <p><strong>Current Status:</strong> ${project.status}</p>
                <p><strong>Completion:</strong> ${project.completion_percentage}%</p>

                ${project.description ? `<p style="color: #6b7280; margin-top: 15px;">${project.description}</p>` : ''}
            </div>

            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" class="button">
                View Full Project Details
            </a>

            <div class="footer">
                <p>You're receiving this because you subscribed to updates for this Iowa DOT project.</p>
                <div class="unsubscribe">
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/unsubscribe?email={{email}}&project=${project.id}" style="color: #9ca3af;">
                        Unsubscribe from this project
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, html };
}

function generateWelcomeEmail(subscriberEmail, project) {
    const subject = `Subscribed to updates: ${project.name}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #03617A 0%, #19405B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #03617A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">✅ Subscription Confirmed</h1>
        </div>
        <div class="content">
            <p>You're now subscribed to updates for:</p>
            <h2 style="color: #03617A; margin: 20px 0;">${project.name}</h2>
            <p>You'll receive email notifications when:</p>
            <ul style="line-height: 2;">
                <li>Project status changes</li>
                <li>Completion percentage is updated</li>
                <li>Major milestones are reached (25%, 50%, 75%, 100%)</li>
                <li>New comments are added</li>
            </ul>
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" class="button">
                View Project Dashboard
            </a>
            <div class="footer">
                <p>Subscription email: ${subscriberEmail}</p>
                <p style="font-size: 11px; color: #9ca3af;">
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/unsubscribe?email=${subscriberEmail}&project=${project.id}" style="color: #9ca3af;">
                        Unsubscribe
                    </a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, html };
}

// ============================================
// SEND EMAIL FUNCTIONS
// ============================================

async function sendProjectUpdateNotification(subscribers, project, updateType, updateDetails) {
    const transporter = createEmailTransport();

    if (!transporter) {
        console.log('📧 Email service not configured - skipping notifications');
        return { success: false, message: 'Email service not configured' };
    }

    const { subject, html } = generateProjectUpdateEmail(project, updateType, updateDetails);

    const results = {
        sent: 0,
        failed: 0,
        errors: []
    };

    for (const subscriber of subscribers) {
        try {
            const personalizedHtml = html.replace('{{email}}', encodeURIComponent(subscriber.email));

            await transporter.sendMail({
                from: `"Iowa DOT Tracker" <${process.env.EMAIL_USER}>`,
                to: subscriber.email,
                subject: subject,
                html: personalizedHtml
            });

            results.sent++;
            console.log(`✅ Sent notification to ${subscriber.email}`);
        } catch (error) {
            results.failed++;
            results.errors.push({ email: subscriber.email, error: error.message });
            console.error(`❌ Failed to send to ${subscriber.email}:`, error.message);
        }
    }

    return results;
}

async function sendWelcomeNotification(email, project) {
    const transporter = createEmailTransport();

    if (!transporter) {
        return { success: false, message: 'Email service not configured' };
    }

    const { subject, html } = generateWelcomeEmail(email, project);

    try {
        await transporter.sendMail({
            from: `"Iowa DOT Tracker" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html
        });

        console.log(`✅ Sent welcome email to ${email}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// DIGEST EMAIL (Weekly Summary)
// ============================================

async function sendWeeklyDigest(email, projects) {
    const transporter = createEmailTransport();

    if (!transporter) {
        return { success: false, message: 'Email service not configured' };
    }

    const subject = `Iowa DOT Weekly Digest - ${projects.length} Project Updates`;

    const projectsList = projects.map(p => `
        <div style="background: white; padding: 15px; margin-bottom: 15px; border-left: 4px solid #03617A; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #03617A;">${p.name}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${p.status} | <strong>Completion:</strong> ${p.completion_percentage}%</p>
        </div>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #03617A 0%, #19405B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📊 Weekly Project Digest</h1>
        </div>
        <div class="content">
            <p>Here's your weekly summary of subscribed Iowa DOT projects:</p>
            ${projectsList}
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" style="display: inline-block; background: #03617A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                View Dashboard
            </a>
        </div>
    </div>
</body>
</html>
    `;

    try {
        await transporter.sendMail({
            from: `"Iowa DOT Tracker" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

async function sendPasswordResetEmail(email, displayName, resetToken) {
    const transporter = createEmailTransport();

    // If email is not configured, log to console instead
    if (!transporter) {
        console.log('\n📧 ===== PASSWORD RESET EMAIL (Email not configured) =====');
        console.log(`To: ${email}`);
        console.log(`Name: ${displayName}`);
        console.log(`Reset Link: http://localhost:3000/reset-password.html?token=${resetToken}`);
        console.log('========================================================\n');
        return { success: true, note: 'Email service not configured - link logged to console' };
    }

    const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    const subject = 'Password Reset Request - Iowa DOT Tracker';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #03617A 0%, #19405B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #03617A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🔐 Password Reset</h1>
        </div>
        <div class="content">
            <p>Hello ${displayName},</p>
            <p>We received a request to reset your password for the Iowa DOT SLTP Tracker.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="button">
                    Reset Your Password
                </a>
            </div>

            <div class="warning">
                <strong>⏰ This link will expire in 1 hour.</strong>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #03617A; word-break: break-all;">${resetLink}</a>
            </p>

            <div style="background: #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #4b5563;">
                    <strong>Didn't request this?</strong><br>
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
            </div>

            <div class="footer">
                <p>Iowa DOT SLTP Tracker</p>
                <p style="font-size: 11px; color: #9ca3af;">
                    This is an automated email. Please do not reply to this message.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    try {
        await transporter.sendMail({
            from: `"Iowa DOT Tracker" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendProjectUpdateNotification,
    sendWelcomeNotification,
    sendWeeklyDigest,
    sendPasswordResetEmail
};
