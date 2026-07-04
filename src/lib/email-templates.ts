/**
 * Standardized email template generator for the PIERC Innovation Management System (IMS).
 * Aligns email notifications with the PIERC Portal's premium red branding (#d40924).
 */

interface EmailTemplateOptions {
  logoUrl?: string;
  previewText?: string;
  headerTitle: string;
  headerColor?: string; // e.g. '#d40924'
  bodyHtml: string;
  ctaText?: string;
  ctaLink?: string;
  alertType?: 'success' | 'warning' | 'danger' | 'info';
  alertTitle?: string;
  alertContent?: string;
}

/**
 * Standard base layout for all transactional emails.
 */
export function getEmailHtmlTemplate(options: EmailTemplateOptions): string {
  const logoUrl = options.logoUrl || 'https://www.pierc.org/_next/static/media/PIERC.959ad75d.svg';
  const headerColor = options.headerColor || '#d40924'; // PIERC Red

  let alertBoxHtml = '';
  if (options.alertContent) {
    let bgColor = '#eff6ff'; // info blue
    let borderLeftColor = '#3b82f6';
    let textColor = '#1e40af';
    let titleColor = '#1d4ed8';

    if (options.alertType === 'success') {
      bgColor = '#f0fdf4'; // green
      borderLeftColor = '#16a34a';
      textColor = '#14532d';
      titleColor = '#166534';
    } else if (options.alertType === 'warning') {
      bgColor = '#fffbeb'; // amber
      borderLeftColor = '#f59e0b';
      textColor = '#78350f';
      titleColor = '#b45309';
    } else if (options.alertType === 'danger') {
      bgColor = '#fef2f2'; // red
      borderLeftColor = '#ef4444';
      textColor = '#991b1b';
      titleColor = '#b91c1c';
    }

    alertBoxHtml = `
      <div style="background-color: ${bgColor}; border-left: 4px solid ${borderLeftColor}; padding: 16px; margin: 20px 0; border-radius: 8px;">
        ${options.alertTitle ? `<h4 style="margin: 0 0 6px 0; color: ${titleColor}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${options.alertTitle}</h4>` : ''}
        <div style="margin: 0; color: ${textColor}; font-size: 14px; line-height: 1.5;">${options.alertContent}</div>
      </div>
    `;
  }

  const ctaButtonHtml = (options.ctaText && options.ctaLink) ? `
    <div style="text-align: center; margin: 30px 0 20px 0;">
      <a href="${options.ctaLink}" target="_blank" style="background-color: ${headerColor}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(212, 9, 36, 0.15), 0 2px 4px -1px rgba(212, 9, 36, 0.1); border: 1px solid ${headerColor};">
        ${options.ctaText}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.headerTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025); border: 1px solid #e2e8f0;">
                
                <!-- Accent Top Bar -->
                <tr>
                  <td height="6" style="background-color: ${headerColor};"></td>
                </tr>
                
                <!-- Logo Header -->
                <tr>
                  <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
                    <img src="${logoUrl}" alt="PIERC Logo" style="height: 64px; width: auto; display: block;" height="48" />
                  </td>
                </tr>
                
                <!-- Email Title -->
                <tr>
                  <td style="padding: 32px 32px 0 32px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; text-align: left;">
                      ${options.headerTitle}
                    </h1>
                  </td>
                </tr>

                <!-- Email Body -->
                <tr>
                  <td style="padding: 20px 32px 32px 32px; color: #334155; font-size: 15px; line-height: 1.6; text-align: left;">
                    ${options.bodyHtml}
                    ${alertBoxHtml}
                    ${ctaButtonHtml}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px; background-color: #fafafa; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 600;">
                      Parul Innovation & Entrepreneurship Research Center• Parul University
                    </p>
                    <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 11px;">
                      Limda, Waghodia, Vadodara, Gujarat 391760
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                    <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.4;">
                      This is an automated notification from the PIERC Website.<br />Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * 1. Submission Received Email Template
 */
export function getSubmissionEmailHtml(options: {
  startupName: string;
  programmeTitle: string;
  viewLink: string;
}): string {
  return getEmailHtmlTemplate({
    headerTitle: 'Application Received',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        Your application for your idea <strong>${options.startupName}</strong> under the program <strong>${options.programmeTitle}</strong> has been successfully submitted and is now <strong>Under Review</strong>.
      </p>
      <p style="margin-bottom: 8px; line-height: 1.6;">
        You and your team members will receive status updates, revision requests, and meeting invitations directly at your registered email addresses and in the portal notifications center.
      </p>
    `,
    ctaText: 'View Application Portal',
    ctaLink: options.viewLink,
  });
}

/**
 * 2. Application Updated Confirmation Email Template
 */
export function getApplicationUpdatedEmailHtml(options: {
  startupName: string;
  programmeTitle: string;
  viewLink: string;
}): string {
  return getEmailHtmlTemplate({
    headerTitle: 'Application Updated',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        Your application details for <strong>${options.startupName}</strong> under the program <strong>${options.programmeTitle}</strong> have been successfully updated.
      </p>
      <p style="margin-bottom: 8px; line-height: 1.6;">
        You can review your updated details on the PIERC Portal at any time.
      </p>
    `,
    ctaText: 'View Application Portal',
    ctaLink: options.viewLink,
  });
}

/**
 * 3. Application Permanently Removed Email Template
 */
export function getApplicationRemovedEmailHtml(options: {
  startupName: string;
  programmeTitle: string;
}): string {
  return getEmailHtmlTemplate({
    headerTitle: 'Application Removed',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        Please be notified that your application for <strong>${options.startupName}</strong> under the program <strong>${options.programmeTitle}</strong> has been permanently removed from the PIERC Portal by an administrator.
      </p>
      <p style="margin-bottom: 8px; line-height: 1.6;">
        If you believe this was done in error or would like more information, please contact the PIERC Administration Desk.
      </p>
    `
  });
}

/**
 * 4. Application Status Change Email Template
 */
export function getStatusUpdateEmailHtml(options: {
  startupName: string;
  newStatus: string;
  programmeTitle: string;
  remarks?: string;
  viewLink: string;
  mentorName?: string;
  mentorEmail?: string;
  mentorContact?: string;
  fundingPhases?: { phaseName: string; amount: number }[];
  fundingSource?: string;
}): string {
  const { startupName, newStatus, programmeTitle, remarks, viewLink, mentorName, mentorEmail, mentorContact, fundingPhases, fundingSource } = options;

  if (newStatus === 'Revision Needed') {
    return getEmailHtmlTemplate({
      headerTitle: 'Revision Requested',
      bodyHtml: `
        <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          The review panel has requested changes to your application for <strong>${startupName}</strong> under the program <strong>${programmeTitle}</strong>.
        </p>
        <p style="margin-bottom: 8px; line-height: 1.6;">
          Please update your application form with the requested changes as soon as possible.
        </p>
      `,
      alertType: 'warning',
      alertTitle: 'Reviewer Remarks',
      alertContent: `"${remarks || 'Please check the portal for details.'}"`,
      ctaText: 'Edit Application',
      ctaLink: viewLink,
    });
  }

  if (newStatus.includes('Selected') || newStatus === 'Incubated' || newStatus === 'Funding Approved') {
    let additionalInfo = '';
    if (newStatus === 'Phase 2 Selected') {
      additionalInfo = `
        <p style="margin-bottom: 16px; line-height: 1.6;">
          Please upload your Phase 2 PPT in the application portal to proceed.
        </p>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          Additionally, you are required to create an account on the <strong>Yukti Innovation Portal</strong> (<a href="https://yukti.mic.gov.in" target="_blank" style="color: #d40924; text-decoration: underline;">yukti.mic.gov.in</a>) and submit your login ID and password in the application portal under the "Yukti Portal Credentials" section.
        </p>
      `;
    } else if (newStatus === 'Cohort Selected' && mentorName) {
      additionalInfo = `
        <p style="margin-bottom: 16px; line-height: 1.6;">
          You have been assigned <strong>${mentorName}</strong> as your mentor for the duration of this program.
        </p>
        <div style="margin-top: 24px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.05em; border-bottom: 2px solid #d40924; padding-bottom: 6px;">Next Steps</h3>
          <ul style="padding-left: 20px; margin: 0; color: #334155; font-size: 13px; line-height: 1.6;">
            <li style="margin-bottom: 12px;">
              <strong>Market Research Survey:</strong> Please conduct a detailed market research survey to gather insights on your target audience, industry trends, and competitors. This will be a crucial component in validating your business idea and planning your go-to-market strategy.
            </li>
            <li style="margin-bottom: 12px;">
              <strong>Submission:</strong> Once your market research survey is complete, kindly submit the findings to PIERC. Our team will review the submission to ensure it meets the required standards.
            </li>
            <li style="margin-bottom: 12px;">
              <strong>Pre-Incubation Program Selection:</strong> If the market research survey is satisfactory, your start-up will be formally selected for the Pre-Incubation Program. This program will provide you with access to mentorship, resources, and a supportive ecosystem to help you develop your idea further.
            </li>
          </ul>
          <p style="margin-top: 16px; margin-bottom: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
            If you have any questions or need further guidance on the market research process, please do not hesitate to reach out to your mentor <strong>${mentorName}</strong> ${mentorEmail ? `at <a href="mailto:${mentorEmail}" style="color: #d40924; text-decoration: underline;">${mentorEmail}</a>` : ''} ${mentorContact ? `or <strong>${mentorContact}</strong>` : ''}.
          </p>
        </div>
      `;
    }

    if (fundingPhases && fundingPhases.length > 0) {
      const cleanSource = fundingSource ? fundingSource.replace(/^SSIP\s+/, '') : '';
      const sourceText = cleanSource ? `under the <strong>${cleanSource}</strong> grant` : 'funding';
      const phasesRows = fundingPhases.map(p => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #334155;">${p.phaseName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #0f172a; text-align: right;">₹${p.amount?.toLocaleString('en-IN') || '0'}</td>
        </tr>
      `).join('');

      additionalInfo += `
        <p style="margin-top: 20px; margin-bottom: 12px; line-height: 1.6;">
          Your start-up has been approved for funding ${sourceText}. The approved grant phases are listed below:
        </p>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 20px 0; background-color: #f8fafc;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background-color: #f1f5f9;">
              <tr>
                <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Phase Name</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Grant Amount</th>
              </tr>
            </thead>
            <tbody>
              ${phasesRows}
            </tbody>
          </table>
        </div>
      `;
    }

    return getEmailHtmlTemplate({
      headerTitle: 'Congratulations!',
      bodyHtml: `
        <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          Great news! Your application status for <strong>${startupName}</strong> has been updated to <strong>${newStatus}</strong> for the program <strong>${programmeTitle}</strong>.
        </p>
        ${additionalInfo}
      `,
      alertType: 'success',
      alertTitle: remarks ? 'Remarks' : undefined,
      alertContent: remarks || undefined,
      ctaText: 'View Application Details',
      ctaLink: viewLink,
    });
  }

  if (newStatus.includes('Rejected')) {
    return getEmailHtmlTemplate({
      headerTitle: 'Application Status Update',
      bodyHtml: `
        <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          Thank you for applying to the <strong>${programmeTitle}</strong> with your idea <strong>${startupName}</strong>.
        </p>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          We regret to inform you that your application was not selected during this round of evaluations (Status: <strong>${newStatus}</strong>).
        </p>
        <p style="margin-bottom: 8px; line-height: 1.6;">
          We appreciate your dedication and encourage you to refine your business model or technology and apply to our future cohorts.
        </p>
      `,
      alertType: 'danger',
      alertTitle: remarks ? 'Feedback from Review Panel' : undefined,
      alertContent: remarks || undefined,
      ctaText: 'View Portal',
      ctaLink: viewLink,
    });
  }

  // Default / general status update
  return getEmailHtmlTemplate({
    headerTitle: 'Application Status Updated',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        The status of your application for <strong>${startupName}</strong> under the program <strong>${programmeTitle}</strong> has been updated to <strong>${newStatus}</strong>.
      </p>
    `,
    alertType: 'info',
    alertTitle: remarks ? 'Remarks' : undefined,
    alertContent: remarks || undefined,
    ctaText: 'View Application Portal',
    ctaLink: viewLink,
  });
}

/**
 * 5. Session / Evaluation Meeting Scheduled Email Template
 */
export function getMeetingScheduledEmailHtml(options: {
  startupName: string;
  phaseTitle: string;
  formattedDate: string;
  formattedTime: string;
  mode: string;
  locationDetails: string;
  meetingLink?: string;
  viewLink: string;
}): string {
  const { startupName, phaseTitle, formattedDate, formattedTime, mode, locationDetails, meetingLink, viewLink } = options;

  const linkHtml = (mode === 'Online' && meetingLink) ? `
    <p style="margin: 8px 0 0 0;"><strong>Join URL:</strong> <a href="${meetingLink}" style="color: #3b82f6; text-decoration: underline;">${meetingLink}</a></p>
  ` : '';

  const alertContent = `
    <p style="margin: 0 0 6px 0;"><strong>Session:</strong> ${phaseTitle}</p>
    <p style="margin: 0 0 6px 0;"><strong>Date:</strong> ${formattedDate}</p>
    <p style="margin: 0 0 6px 0;"><strong>Time:</strong> ${formattedTime}</p>
    <p style="margin: 0;"><strong>Mode:</strong> ${mode} (${locationDetails})</p>
    ${linkHtml}
  `;

  return getEmailHtmlTemplate({
    headerTitle: 'Evaluation Meeting Scheduled',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Team,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        A new meeting has been scheduled for your startup project <strong>${startupName}</strong>.
      </p>
      <p style="margin-bottom: 8px; line-height: 1.6;">
        Please mark your calendars and join the session on time.
      </p>
    `,
    alertType: 'info',
    alertTitle: 'Meeting Details',
    alertContent: alertContent,
    ctaText: 'View in Calendar',
    ctaLink: viewLink,
  });
}

/**
 * 6. Meeting Cancelled Email Template
 */
export function getMeetingCancelledEmailHtml(options: {
  meetingTitle: string;
  formattedDate: string;
  formattedTime: string;
}): string {
  const { meetingTitle, formattedDate, formattedTime } = options;

  const alertContent = `
    <p style="margin: 0 0 6px 0;"><strong>Session:</strong> ${meetingTitle}</p>
    <p style="margin: 0 0 6px 0;"><strong>Scheduled Date:</strong> ${formattedDate}</p>
    <p style="margin: 0;"><strong>Scheduled Time:</strong> ${formattedTime}</p>
  `;

  return getEmailHtmlTemplate({
    headerTitle: 'Meeting Cancelled',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founders and Mentors,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        Please note that the meeting <strong>${meetingTitle}</strong> has been <strong>Cancelled</strong>.
      </p>
      <p style="margin-bottom: 8px; line-height: 1.6;">
        If a reschedule is necessary, administrative staff will coordinate and schedule a new time shortly.
      </p>
    `,
    alertType: 'danger',
    alertTitle: 'Cancelled Session Info',
    alertContent: alertContent,
  });
}

/**
 * 7. Cohort Schedule Confirmed Email Template
 */
export function getCohortScheduleEmailHtml(options: {
  cohortName: string;
  startDate: string;
  endDate: string;
  whatsappLink?: string;
  viewLink: string;
}): string {
  const whatsappBlock = options.whatsappLink ? `
    <p style="margin-top: 20px; margin-bottom: 12px; line-height: 1.6;">
      An official WhatsApp group has also been created for cohort updates and coordination. Please click the button below to join the group:
    </p>
    <div style="text-align: center; margin: 20px 0 25px 0;">
      <a href="${options.whatsappLink}" target="_blank" style="background-color: #25D366; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 211, 102, 0.15); border: 1px solid #25D366;">
        💬 Join WhatsApp Group
      </a>
    </div>
  ` : '';

  return getEmailHtmlTemplate({
    headerTitle: 'Cohort Schedule Confirmed',
    bodyHtml: `
      <p style="margin-top: 0; margin-bottom: 16px;">Dear Founder / Team Member,</p>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        We are pleased to inform you that the schedule duration for your cohort <strong>${options.cohortName}</strong> has been finalized.
      </p>
      <p style="margin-bottom: 24px; line-height: 1.6;">
        Please note the active timeline for your cohort below. Your project plan, deliverables, and progress reports should align with this timeline.
      </p>
      ${whatsappBlock}
    `,
    alertType: 'success',
    alertTitle: 'Cohort Duration Schedule',
    alertContent: `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; width: 50%; vertical-align: top;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block;">Start Date</span>
            <strong style="font-size: 15px; color: #0f172a; display: block; margin-top: 4px;">${options.startDate}</strong>
          </td>
          <td style="padding: 6px 0; width: 50%; vertical-align: top; padding-left: 20px;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block;">End Date</span>
            <strong style="font-size: 15px; color: #0f172a; display: block; margin-top: 4px;">${options.endDate}</strong>
          </td>
        </tr>
      </table>
    `,
    ctaText: 'View Dashboard',
    ctaLink: options.viewLink,
  });
}
