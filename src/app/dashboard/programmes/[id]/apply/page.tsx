'use client';

import { useParams } from 'next/navigation';
import ApplicationForm from '@/components/forms/ApplicationForm';

export default function ApplyPage() {
  const params = useParams();
  const id = params.id as string;

  // Map ID to human-readable title
  const programmeTitles: Record<string, string> = {
    'incubation': 'Incubation Programme',
    'growthpod': 'GrowthPod Programme',
    'need-based': 'Need-Based Support',
    'startup-nivesh': 'Startup Nivesh',
  };

  const title = programmeTitles[id] || 'Programme';

  return (
    <div className="container py-8">
      <ApplicationForm programmeId={id} programmeTitle={title} />
    </div>
  );
}
