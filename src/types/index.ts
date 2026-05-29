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
  };
  evaluations?: {
    phase1?: EvaluationRecord;
    phase2?: EvaluationRecord;
    funding?: EvaluationRecord;
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
  status: 'Scheduled' | 'Completed' | 'Cancelled';
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
