import { Programme } from '@/types';

export const programmeDefaults: Programme[] = [
  {
    id: 'incubation',
    title: 'Incubation Programme',
    description: 'Nurturing early-stage startups with mentorship, infrastructure, and seed funding support.',
    eligibility: 'Student/Faculty/Early-stage founders with a validated prototype.',
    timeline: '6 - 12 Months',
    active: true,
    applicationCount: 45,
  },
  {
    id: 'growthpad',
    title: 'GrowthPad Programme',
    description: 'Accelerating revenue-making startups to scale their operations and reach new markets.',
    eligibility: 'Startups with traction and consistent monthly revenue.',
    timeline: '3 - 6 Months',
    active: true,
    applicationCount: 28,
  },
  {
    id: 'need-based',
    title: 'Need-Based Support',
    description: 'Specific technical, legal, or market access support for innovative projects.',
    eligibility: 'Innovative ideas requiring specialized intervention.',
    timeline: 'On-demand',
    active: true,
    applicationCount: 15,
  },
  {
    id: 'startup-nivesh',
    title: 'Startup Nivesh',
    description: 'Direct investment platform connecting PIERC startups with angel investors and VCs.',
    eligibility: 'Investment-ready startups with pitch deck and financial projections.',
    timeline: 'Ongoing',
    active: true,
    applicationCount: 12,
  },
];
