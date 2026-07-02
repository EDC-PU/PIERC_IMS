# Email Notifications Requirement Specification

This document details the requirements and triggers for email notifications within the **PIERC Innovation Management System (IMS)**. It ensures that applicants, team members, evaluators, and administrators stay informed about updates to ideas, applications, schedules, and messages.

---

## 1. Overview of Roles & Core Rules

### System Roles
- **Applicant (Owner / Leader):** The primary user who submits the application (`user` role in Firebase Auth, mapped to `userId` on the application).
- **Team Members:** Additional individuals added by the applicant to the application under `app.data.teamMembers` (each having a `name`, `email`, and `phone`).
- **Evaluators / Mentors:** Users with the `mentor` role assigned to evaluate ideas (`evaluatorId` in evaluations or `mentorId` in application documents).
- **Admins & Super Admins:** Administrative staff (`admin` or `super_admin` roles) who review submissions, schedule evaluations, and manage programs.

### Core Rules
1. **Applicant & Team Member Synchronization:** Every status update or structural change to an application/idea must trigger a notification email to the primary applicant AND all listed team members.
2. **Preference Checklist:** Email alerts must respect user preferences stored in `UserProfile.notifications` (e.g., `applications`, `meetings`, `messages`).
3. **Actionable CTAs:** Every notification email must contain a clear, direct, and authenticated link (Call-to-Action button) leading the recipient to the relevant dashboard or page.
4. **Resiliency:** Email delivery failures must be logged, and critical notifications (like phase selections) must have retries.

---

## 2. Email Notifications Matrix

| # | Trigger Event | Target Recipient(s) | Category | Core Condition / Source Property | Template Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | New Account Registered | Applicant | Welcome | User signs up and completes onboarding. | `welcome_email` |
| **2** | Application Submitted | Applicant, Team Members | `applications` | Application goes to `Submitted` / `Under Review`. | `app_submitted` |
| **3** | Idea/Application Edited | Applicant, Team Members | `applications` | Applicant edits text fields, uploads new pitch deck, etc. | `app_updated` |
| **4** | Revision Requested | Applicant, Team Members | `applications` | Admin changes status to `Revision Needed`. | `revision_requested` |
| **5** | Revision Re-submitted | Program Manager (Admin) | `applications` | Applicant re-submits a revised application. | `revision_submitted` |
| **6** | Status Changed (Selected) | Applicant, Team Members | `applications` | Status changes to `Phase 1 Selected`, `Phase 2 Selected`, `Funding Approved`. | `app_selected` |
| **7** | Status Changed (Rejected) | Applicant, Team Members | `applications` | Status changes to `Phase 1 Rejected`, `Phase 2 Rejected`, `Funding Rejected`. | `app_rejected` |
| **8** | Status Changed (Incubated) | Applicant, Team Members | `applications` | Status changes to `Incubated` (final cohort onboarding). | `app_incubated` |
| **9** | Evaluator Assigned | Evaluator (Mentor) | `applications` | Admin assigns `mentorId` or adds application to evaluation queue. | `evaluator_assigned` |
| **10**| Evaluation Scoring Done | Program Manager (Admin) | `applications` | Evaluator submits a score and remarks (`EvaluationRecord`). | `eval_submitted` |
| **11**| Meeting Scheduled | Attendees (Applicant, Team, Mentor) | `meetings` | Admin schedules a pitch session or mentor feedback meeting. | `meeting_scheduled` |
| **12**| Meeting Rescheduled | Attendees (Applicant, Team, Mentor) | `meetings` | Meeting details (time, venue, link) are updated. | `meeting_updated` |
| **13**| Meeting Cancelled | Attendees (Applicant, Team, Mentor) | `meetings` | Meeting status changes to `Cancelled`. | `meeting_cancelled` |
| **14**| New Direct Message | Chat Recipient | `messages` | Direct chat message received (when recipient is offline > 5m). | `new_chat_message` |

---

## 3. Detail of Email Triggers by Recipient Group

### A. Notifications for Applicants & Team Members

Applicants and their team members represent the core innovators. It is crucial that they receive concurrent, real-time emails to maintain trust and transparency.

#### 1. On Application Submission
*   **Trigger:** Successful submission of the application form (`ApplicationStatus` becomes `'Submitted'` or `'Under Review'`).
*   **Recipients:** Primary Applicant Email (`userEmail`) and all emails in `app.data.teamMembers`.
*   **Subject:** `🚀 Submission Received: [Startup Name] - [Program Title]`
*   **Body Content:**
    *   Acknowledgment of receipt of their startup idea: `[Startup Name]`.
    *   Confirmation of the program applied to: `[Program Title]`.
    *   Next steps (e.g., initial administrative check, assignment of Phase 1 Evaluators).
    *   Link to view submission status: `/dashboard/applications/[id]`.

#### 2. On Every Update to Their Idea
*   **Trigger:** Any change made to the application document properties (e.g., description, stage, document links) or any backend timeline change.
*   **Recipients:** Primary Applicant and Team Members.
*   **Subject:** `📝 Update to your Idea: [Startup Name] has been recorded`
*   **Body Content:**
    *   A notification that their idea details were updated.
    *   Highlighting what changed (e.g., "Problem Statement", "Pitch Deck Document").
    *   Link to view the current live submission: `/dashboard/applications/[id]`.

#### 3. On Status Updates (Revisions, Selection, Rejection)
*   **Trigger:** Admin changes the status parameter on the application.
*   **Recipients:** Primary Applicant and Team Members.
*   **Sub-cases & Subjects:**
    *   **Revision Needed:**
        *   **Subject:** `⚠️ Action Required: Revision requested for [Startup Name]`
        *   **Content:** Outlines administrative remarks (`revisionRemarks`) describing what needs to be fixed (e.g., clear financial statement, updated pitch deck). Provides a direct link to edit the form.
    *   **Phase 1 / Phase 2 Selected:**
        *   **Subject:** `🎉 Congratulations! [Startup Name] selected for [Next Stage]`
        *   **Content:** Celebrates the selection, outlines the instructions for the next phase (e.g., uploading the Phase 2 Pitch Presentation), and details dates/timelines.
    *   **Phase 1 / Phase 2/ Funding Rejected:**
        *   **Subject:** `Update regarding your application: [Startup Name]`
        *   **Content:** A polite and encouraging rejection message, highlighting feedback from the evaluation panel, and encouraging them to refine their idea and apply in future cohorts or seek help at the pre-incubation desk.
    *   **Funding Approved:**
        *   **Subject:** `💰 Funding Approved: [Startup Name] - PIERC Committee`
        *   **Content:** Official grant award notification, specifying next steps for agreement signing and document validation.
    *   **Incubated:**
        *   **Subject:** `🤝 Welcome to PIERC: [Startup Name] is officially Incubated!`
        *   **Content:** Welcome pack details, keys to the physical co-working space, induction meeting details, and mentor matching forms.

---

### B. Notifications for Team Members specifically (Onboarding)

When a primary applicant lists team members in the application, these team members might not yet have user accounts on the PIERC Portal.

#### 1. Added to an Idea / Invitation
*   **Trigger:** Application submitted or edited with new email addresses in `teamMembers` array.
*   **Recipient:** The newly added team member's email address.
*   **Subject:** `💡 You've been added to the team for "[Startup Name]" on PIERC Portal`
*   **Body Content:**
    *   Inform them that `[Applicant Name]` has added them as a team member of `[Startup Name]` for `[Program Title]`.
    *   Overview of the idea description or program timeline.
    *   Invitation to sign up on the portal using this email to view progress: `/register?email=[email]`.

---

### C. Notifications for Evaluators (Mentors)

Evaluators need to be notified of pending actions to keep the evaluation cycle short and structured.

#### 1. On Evaluation Assignment
*   **Trigger:** Application assigned to a mentor (admin sets `mentorId` or populates evaluator queue).
*   **Recipient:** Evaluator Email.
*   **Subject:** `🔎 New Application Assigned for Evaluation: [Startup Name]`
*   **Body Content:**
    *   Notice that a new idea `[Startup Name]` is assigned to them under program `[Program Title]`.
    *   List of criteria they need to score (e.g., Innovation, Feasibility, Market potential, Team strength).
    *   Deadline for completing the evaluation.
    *   Link to the evaluation sheet: `/dashboard/evaluate?id=[id]`.

#### 2. Meeting Schedule / Pitch Session
*   **Trigger:** A meeting is scheduled where the evaluator is listed as an attendee.
*   **Recipient:** Evaluator Email.
*   **Subject:** `📅 Pitch Presentation Scheduled: [Startup Name]`
*   **Body Content:**
    *   Date, time, mode (Online / Physical), and Google Meet link or room number.
    *   Brief overview of the startup presentation topic.
    *   Link to review the startup's Pitch Deck before the meeting.

---

### D. Notifications for Admins & Super Admins

Admins need notifications for events requiring manual intervention or approval.

#### 1. On Application Submission (For Program Managers)
*   **Trigger:** New application status is set to `Submitted`.
*   **Recipient:** Assigned Program Manager (if `managerId` is set) or Admin group.
*   **Subject:** `📥 New Application Submitted: [Startup Name] - [Program Title]`
*   **Body Content:**
    *   Notification of a new idea submission.
    *   Summary statistics of the program (e.g., "This is application #45 for this cohort").
    *   Link to assign evaluators: `/dashboard/applications/[id]`.

#### 2. On Revision Submitted
*   **Trigger:** Application status changes from `Revision Needed` to `Revision Submitted`.
*   **Recipient:** Program Manager / Admin.
*   **Subject:** `🔄 Revision Submitted: [Startup Name]`
*   **Body Content:**
    *   Notification that the applicant has updated their data based on feedback.
    *   Display of admin remarks that requested the revision.
    *   Link to verify: `/dashboard/applications/[id]`.

---

## 4. Specific Email Events: Meetings & Direct Messages

These alerts are time-critical and rely heavily on notifications being sent promptly.

### A. Meetings Notifications
*   **Scheduled:**
    *   **Recipient:** Applicant, Team Members, and Assigned Mentors.
    *   **Subject:** `📅 Meeting Scheduled: [Meeting Title]`
    *   **Details:** Date, Time block, Platform/Location, Join Link, Agenda/Notes.
*   **Rescheduled / Updated:**
    *   **Subject:** `🔄 Meeting Update: [Meeting Title] has been rescheduled`
    *   **Details:** Clearly states the previous time and highlights the new time/location.
*   **Cancelled:**
    *   **Subject:** `❌ Meeting Cancelled: [Meeting Title]`
    *   **Details:** Explains cancellation details, notes (if provided), and options to reschedule.

### B. Direct Message Notifications
*   **Trigger:** A new message is sent in the chat (`messages` collection).
*   **Recipient:** Offline recipient (either Applicant, Mentor, or Admin).
*   **Subject:** `💬 New Message from [Sender Name] on PIERC`
*   **Trigger Delay:** To prevent inbox spamming, this notification should only fire if the recipient has not read the message within **5 minutes** of sending (i.e. they are offline).
*   **Content:**
    *   Preview of the message content.
    *   Link to open the chat window: `/dashboard/messages?userId=[senderId]`.

---

## 5. Technical Implementation Guidelines (Recommendation)

### A. Firebase Trigger Email Extension (Simple)
The easiest way to implement this in the current stack is using the official Firebase **Trigger Email** extension.
1. Create a `mail` Firestore collection.
2. In the cloud function or client-side code, when an update is made, write a document to `mail`:
   ```javascript
   await addDoc(collection(db, 'mail'), {
     to: recipientEmails, // Array of strings [applicantEmail, ...teamEmails]
     message: {
       subject: `🚀 Submission Received: ${startupName}`,
       text: `Dear Founder, your submission has been received...`,
       html: `<h1>Dear Founder...</h1>`
     }
   });
   ```

### B. Firebase Cloud Functions + Resend / SendGrid (Recommended for Premium Branding)
For high-quality HTML templates and tracking:
1. Listen to Firestore writes on `applications/{appId}` and `meetings/{meetingId}` using Cloud Functions (`onWrite` or `onUpdate`).
2. Detect status change or data change:
   - If `before.data.status !== after.data.status`, look up the status change and fetch the email template.
3. Fetch user email preference from `users/{userId}` to make sure they haven't opted out.
4. Send the email using a transactional mail provider (like **Resend** or **Postmark**) using professional components (e.g. `@react-email/components` inside Next.js).

### C. Example Firestore Schema for Email Queueing
If building a custom cron or database queue:
```typescript
interface EmailQueueItem {
  id: string;
  recipientEmail: string;
  templateId: string;
  templateVariables: Record<string, string>;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttempt?: number;
  error?: string;
  createdAt: number;
}
```
