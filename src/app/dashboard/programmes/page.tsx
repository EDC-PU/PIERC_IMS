'use client';

import { Programme } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Target, Users, Zap } from 'lucide-react';
import Link from 'next/link';

const initialProgrammes: Programme[] = [
  {
    id: 'incubation',
    title: 'Incubation Programme',
    description: 'Nurturing early-stage startups with mentorship, infrastructure, and seed funding support.',
    eligibility: 'Student/Faculty/Early-stage founders with a validated prototype.',
    timeline: '6 - 12 Months',
    active: true,
    applicationCount: 45
  },
  {
    id: 'growthpod',
    title: 'GrowthPod Programme',
    description: 'Accelerating revenue-making startups to scale their operations and reach new markets.',
    eligibility: 'Startups with traction and consistent monthly revenue.',
    timeline: '3 - 6 Months',
    active: true,
    applicationCount: 28
  },
  {
    id: 'need-based',
    title: 'Need-Based Support',
    description: 'Specific technical, legal, or market access support for innovative projects.',
    eligibility: 'Innovative ideas requiring specialized intervention.',
    timeline: 'On-demand',
    active: true,
    applicationCount: 15
  },
  {
    id: 'startup-nivesh',
    title: 'Startup Nivesh',
    description: 'Direct investment platform connecting PIERC startups with angel investors and VCs.',
    eligibility: 'Investment-ready startups with pitch deck and financial projections.',
    timeline: 'Ongoing',
    active: true,
    applicationCount: 12
  }
];

export default function ProgrammesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Incubation Programmes</h1>
        <p className="text-slate-500">Select a programme that fits your startup stage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialProgrammes.map((prog) => (
          <Card key={prog.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {prog.id === 'incubation' && <Rocket className="h-6 w-6 text-primary" />}
                  {prog.id === 'growthpod' && <Zap className="h-6 w-6 text-primary" />}
                  {prog.id === 'need-based' && <Target className="h-6 w-6 text-primary" />}
                  {prog.id === 'startup-nivesh' && <Users className="h-6 w-6 text-primary" />}
                </div>
                <Badge variant={prog.active ? "default" : "secondary"}>
                  {prog.active ? "Open" : "Closed"}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-xl">{prog.title}</CardTitle>
              <CardDescription>{prog.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Eligibility</h4>
                <p className="text-sm text-slate-500">{prog.eligibility}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Timeline</h4>
                <p className="text-sm text-slate-500">{prog.timeline}</p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button asChild className="w-full" disabled={!prog.active}>
                <Link href={`/dashboard/programmes/${prog.id}/apply`}>
                  Apply Now
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
