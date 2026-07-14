export type UserRole = 'user' | 'admin' | 'mentor' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phoneNumber?: string;
  contactNumber?: string;
  enrollmentNumber?: string;
  institute?: string;
  category?: string;
  socialCategory?: string;
  gender?: string;
  caste?: string;
  othersSpecify?: string;
  startupName?: string;
  website?: string;
  linkedin?: string;
  bio?: string;
  notifications?: {
    applications: boolean;
    meetings: boolean;
    messages: boolean;
    marketing: boolean;
  };
  onboardingCompleted: boolean;
  createdAt: number;
}

export interface Programme {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  timeline: string;
  active: boolean;
  managerId?: string;
  applicationCount: number;
}

export type ApplicationStatus = 
  | 'Submitted' 
  | 'Revision Needed'
  | 'Revision Submitted'
  | 'Under Review' 
  | 'Phase 1 Evaluation' 
  | 'Phase 1 Selected' 
  | 'Phase 1 Rejected' 
  | 'Phase 2 Evaluation' 
  | 'Phase 2 Selected' 
  | 'Phase 2 Rejected' 
  | 'Funding Committee Review' 
  | 'Funding Approved' 
  | 'Funding Rejected' 
  | 'Incubated';

export interface Application {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userContact?: string;
  userCategory?: string;
  userSocialCategory?: string;
  userGender?: string;
  userCaste?: string;
  userInstitute?: string;
  userEnrollment?: string;
  programmeId: string;
  programmeTitle: string;
  status: ApplicationStatus | string;
  submittedAt: number;
  updatedAt: number;
  timeline?: any[];
  revisionRemarks?: string;
  meetings?: Record<string, any>;
  data: Record<string, any>;
  documents: {
    pitchDeck?: string;
    businessPlan?: string;
    incorporationCert?: string;
    panGst?: string;
    phase2PPT?: string;
    other?: string[];
    yuktiPortalId?: string;
    yuktiPortalPassword?: string;
    signedApplicationForm?: string;
    selfAttestedIDs?: string;
    selfAttestedAadharCards?: string;
    passportPhotographs?: string;
    pitchDeckPPT?: string;
    fundBifurcationSheet?: string;
    validationForm?: string;
    cancelledCheque?: string;
    signedAffidavit?: string;
  };
  evaluations?: {
    phase1?: EvaluationRecord;
    phase2?: EvaluationRecord;
    funding?: EvaluationRecord;
  };
  mentorId?: string;
  mentorName?: string;
  mentorEmail?: string;
  mentorContact?: string;
  cohortId?: string;
  cohortName?: string;
  incubationType?: 'Only Incubation' | 'Selected for Funding' | 'On Hold';
  fundingPhases?: { phaseName: string; amount: number }[];
  fundingSource?: string;
  monthlyReports?: Record<string, {
    progressReport: string;
    marketValidationUpdate: string;
    updatedAt: number;
  }>;
  milestones?: StartupMilestone[];
  transactions?: any[];
  revisedFields?: string[];
  preRevisionData?: {
    startupName?: string;
    problemStatement?: string;
    solution?: string;
    currentStage?: string;
    teamMembers?: any[];
    pitchDeck?: string;
  };
}

export interface EvaluationRecord {
  evaluatorId: string;
  score: number;
  remarks: string;
  timestamp: number;
  criteriaScores: Record<string, number>;
}

export interface Meeting {
  id: string;
  applicationId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  mode: 'Online' | 'Offline' | 'Hybrid';
  link?: string;
  location?: string;
  attendees: string[]; // UIDs
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Absent';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
  link?: string;
}

export interface Cohort {
  id: string;
  name: string;
  createdAt: number;
  startDate?: string;
  endDate?: string;
  whatsappLink?: string;
}

export interface PortalEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mode: 'Online' | 'Offline';
  linkOrLocation: string;
  targetAudience: ('all_users' | 'pu_staff' | 'pu_student' | 'cohort_leaders' | 'cohort_participants')[];
  cohortIds?: string[];
  cohortNames?: string[];
  registeredUsers: string[]; // UIDs
  createdBy: string;
  createdAt: number;
  flyerUrl?: string;
  status: 'published' | 'draft';
  allowCancellation?: boolean;
}

export interface StartupMilestone {
  id: string;
  title: string;
  description: string;
  phase?: 'Phase 1' | 'Phase 2' | 'Incubation' | 'Graduation';
  status: 'Pending' | 'Completed' | 'Delayed';
  dueDate?: number;      // timestamp
  completedAt?: number; // timestamp
  updatedBy: string;    // UID
  completionDetails?: string;
  documentUrl?: string;
  documentName?: string;
}

export interface GrantTransaction {
  id: string;
  userId: string;
  applicationId: string;
  startupName: string;
  vendorName: string;
  gstNumber: string;
  amount: number;
  invoiceDate: number; // timestamp
  description?: string;
  phaseName: string; // e.g., "Phase 1"
  invoiceUrl?: string;
  invoiceFileName?: string;
  status: 'Pending Review' | 'Approved' | 'Rejected';
  createdAt: number;
}


