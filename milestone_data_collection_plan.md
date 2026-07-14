# PIERC Portal - Milestone & ERP Data Collection Plan

This document outlines the strategy for transitioning the newly added incubation KPIs from default/zero values to 100% real-time data gathered directly from founders and admins.

---

## 1. Milestone Tracking System

### Core Concept
Each incubated startup will have a structured checklist of **Milestones** directly attached to their Application/Startup profile in Firestore.

### Milestone Schema
Add a `milestones` array inside the `Application` or `Startup` document:
```typescript
interface StartupMilestone {
  id: string;
  title: string;
  description: string;
  phase: 'Phase 1' | 'Phase 2' | 'Incubation' | 'Graduation';
  status: 'Pending' | 'Completed' | 'Delayed';
  dueDate: number;      // timestamp
  completedAt?: number; // timestamp
  updatedBy: string;    // UID
}
```

### Collection Method
1. **Founder Dashboard View**: Introduce a **"My Milestones"** tab in the User/Founder Dashboard. Founders can view their goals (e.g., "Submit Pitch Deck", "Complete Prototype", "DPIIT Registration") and request status updates.
2. **Admin Milestone Console**: Admins can define standard milestone templates for each cohort program. When a startup is incubated, these standard milestones are automatically created. Admins can click to mark milestones as "Completed" or "Delayed".

---

## 2. ERP Data Points & User Collection Strategies

| KPI Term | Data Field Needed | User Collection Mechanism |
| :--- | :--- | :--- |
| **Startups Graduated** | `isGraduated: boolean` | **Graduation Review Form**: When a startup finishes their incubation period, admins trigger a graduation checklist. Marking it complete sets `isGraduated` to `true`. |
| **Outstanding Incubation Agreements** | `agreementSigned: boolean` | **Document Upload Block**: In the founder dashboard, show a mandatory document upload module. Founders must download the agreement template, sign it, and upload the scanned copy. |
| **Pending Monthly Progress Reports** | `monthlyReports: MonthlyReport[]` | **Monthly Report Scheduler**: Set up a cron/timer notification on the portal on the 1st of every month. Founders get an alert to fill out a 5-question form (Revenue, Funding Raised, Key Hires, Blockers). |
| **DPIIT Registered Startups** | `dpiitNumber: string` | **Profile Settings Field**: Add a "DPIIT Registration Number" field under Startup Details. Founders edit their profiles to supply this once certificate is received. |
| **Funding Raised (Grants / Equity)** | `fundingPhases: FundingPhase[]` | **Funding Intake Dialog**: When a startup gets funded (either internal seed grant or external VC), admins or founders record the transaction details (Amount, Date, Source, Round Type) in the portal. |

---

## 3. Database Updates Plan

We will roll out the schema updates in Firestore as follows:

1. **Schema Migration Script**: A simple script to add default empty structures (`milestones: []`, `documents: {}`, `fundingPhases: []`) to existing application docs.
2. **Settings Extensions**: Update `src/app/dashboard/settings/page.tsx` or the Profile view to include fields for DPIIT numbers and startup sector selection.
3. **Monthly Report Collection**: Build `/dashboard/reports` page for founders to submit monthly updates.

---
*Created by PIERC Portal Systems Management*
