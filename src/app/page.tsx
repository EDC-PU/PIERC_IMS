'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Rocket, Shield, Users, BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Rocket className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">PIERC PORTAL</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#programmes" className="hover:text-primary transition-colors">Programmes</Link>
          <Link href="#impact" className="hover:text-primary transition-colors">Our Impact</Link>
        </nav>
        <div className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 lg:px-12 text-center space-y-8 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Applications Open for 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
            Nurturing the Next Generation of <span className="text-primary">Innovators</span>.
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            PIERC provides the ecosystem, mentorship, and funding required to turn your groundbreaking ideas into scalable startups.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20" asChild>
              <Link href="/register">Apply Now <ChevronRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="#programmes">Explore Programmes</Link>
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-y bg-slate-50">
          <div className="px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Startups Incubated', value: '150+' },
              { label: 'Funding Raised', value: '$12M+' },
              { label: 'Expert Mentors', value: '50+' },
              { label: 'Success Rate', value: '92%' },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6 lg:px-12">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to scale</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From ideation to investment, our portal manages every step of your incubation journey.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Lifecycle Management', 
                desc: 'Track your application through multiple evaluation phases with real-time updates.',
                icon: Rocket 
              },
              { 
                title: 'Expert Mentorship', 
                desc: 'Get assigned to industry veterans who guide you through technical and business hurdles.',
                icon: Users 
              },
              { 
                title: 'Smart Analytics', 
                desc: 'Visualize your traction and growth with advanced charting and milestone tracking.',
                icon: BarChart3 
              },
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-none p-6 space-y-4 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-6 lg:px-12 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Rocket className="text-white h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">PIERC</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Parul Innovation & Entrepreneurship Research Centre. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
