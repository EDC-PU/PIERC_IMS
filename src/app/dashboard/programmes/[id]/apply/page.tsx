'use client';

import { useParams } from 'next/navigation';
import ApplicationForm from '@/components/forms/ApplicationForm';

export default function ApplyPage() {
  const params = useParams();
  const id = params.id as string;

  // Map ID to human-readable title
  const programmeTitles: Record<string, string> = {
    'incubation': 'Incubation Programme',
    'growthpad': 'GrowthPad Programme',
    'need-based': 'Need-Based Support',
    'startup-nivesh': 'Startup Nivesh',
  };

  const title = programmeTitles[id] || 'Programme';

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-1 sm:px-4">
      <ApplicationForm programmeId={id} programmeTitle={title} />
    </div>
  );
}
