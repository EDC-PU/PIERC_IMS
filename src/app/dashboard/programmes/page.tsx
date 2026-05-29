'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Programme } from '@/types';
import { programmeDefaults } from '@/lib/programmes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Target, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>(programmeDefaults);

  useEffect(() => {
    const programmesRef = ref(db, 'programmes');
    const unsubscribe = onValue(programmesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        return;
      }

      const loadedProgrammes = Object.entries(data).map(([id, value]) => {
        const programme = value as any;
        const defaultProgramme = programmeDefaults.find((p) => p.id === id);
        return {
          id,
          title: programme.title || programme.name || defaultProgramme?.title || id.replace(/-/g, ' ').replace(/\b\w/g, (chr) => chr.toUpperCase()),
          description: programme.description || defaultProgramme?.description || '',
          eligibility: programme.eligibility || defaultProgramme?.eligibility || '',
          timeline: programme.timeline || defaultProgramme?.timeline || '',
          active: programme.isApplicationOpen ?? defaultProgramme?.active ?? false,
          applicationCount: programme.applicationCount ?? defaultProgramme?.applicationCount ?? 0,
        };
      });

      setProgrammes(loadedProgrammes);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-12">
      <div className="relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
        <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-2">Opportunities</h2>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Our Programmes</h1>
        <p className="text-slate-500 mt-2 max-w-xl font-medium text-lg">
          Select a specialized track designed to propel your startup through the PIERC ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {programmes.map((prog) => (
          <div
            key={prog.id}
            className="group relative flex flex-col glass-card border-white/50 p-1 hover:border-primary/20 transition-all duration-500 hover:scale-[1.01]"
          >
            {/* Card Content Interior */}
            <div className="bg-white/40 rounded-[1.4rem] p-8 flex-1 flex flex-col h-full">
              <div className="flex justify-between items-start mb-8">
                <div className={cn(
                  "p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-500",
                  prog.id === 'incubation' ? "bg-gradient-to-br from-orange-400 to-rose-500 text-white" :
                    prog.id === 'growthpad' ? "bg-gradient-to-br from-blue-400 to-indigo-600 text-white" :
                      prog.id === 'need-based' ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white" :
                        "bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white"
                )}>
                  {prog.id === 'incubation' && <Rocket className="h-8 w-8" />}
                  {prog.id === 'growthpad' && <Zap className="h-8 w-8" />}
                  {prog.id === 'need-based' && <Target className="h-8 w-8" />}
                  {prog.id === 'startup-nivesh' && <Users className="h-8 w-8" />}
                </div>
                <Badge className={cn(
                  "px-4 py-1.5 rounded-full font-black tracking-widest text-[10px] uppercase shadow-sm border-none",
                  prog.active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {prog.active ? "Applications Open" : "Closed"}
                </Badge>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors">{prog.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{prog.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eligibility</span>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{prog.eligibility}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</span>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{prog.timeline}</p>
                  </div>
                </div>
              </div>

              <Button
                asChild
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300",
                  prog.active ? "bg-primary hover:bg-slate-900 text-white shadow-md shadow-primary/20" : "bg-slate-100 text-slate-400 pointer-events-none"
                )}
                disabled={!prog.active}
              >
                <Link href={`/dashboard/programmes/${prog.id}/apply`} className="flex items-center justify-center gap-2">
                  Apply Now <Rocket className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
