'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Rocket, Shield, Users, BarChart3, ChevronRight, CheckCircle2, Calendar, ArrowUpRight, LayoutDashboard } from 'lucide-react';

const Facebook = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const teamMembers = [
  {
    id: 1,
    name: "Mr. Jay Sudani",
    position: "Chief Executive Officer",
    image: "https://i.ibb.co/p6QwjPxk/DSC09250.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 2,
    name: "Mr. Ajay Barot",
    position: "Strategic Lead",
    image: "https://i.ibb.co/8gtzBGsf/IMG-5509-1.png",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 3,
    name: "Hardik Kharva",
    position: "Deputy Director",
    image: "https://i.ibb.co/0pSb7B8w/hardik.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 4,
    name: "Mr. Hutesh Baviskar",
    position: "Incubation Manager",
    image: "https://i.ibb.co/zT49sqfY/DSC08987.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 5,
    name: "Mrs. Sonal Sudani",
    position: "Incubation Manager",
    image: "https://i.ibb.co/pvCHVy9S/DSC09018.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 6,
    name: "Pancham Baria",
    position: "Centre Head, Surat Startup Studio",
    image: "https://i.ibb.co/twTnffw1/DSC08998.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 7,
    name: "Juned Shaikh",
    position: "Centre Head, Ahmedabad Startup Studio",
    image: "https://i.ibb.co/LzjZN9Jk/juned-sheikh.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 8,
    name: "Anup Chaudhari",
    position: "Manager, Incubation Program",
    image: "https://i.ibb.co/JWn1khBV/anup.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 9,
    name: "Prashant Khanna",
    position: "Manager, Incubation Program",
    image: "https://i.ibb.co/BbqJKQs/DSC09001.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 10,
    name: "Himanshu Das",
    position: "Fablab Engineer",
    image: "https://i.ibb.co/5gSbw7M3/himanshu.jpg",
    facebook: null,
    linkedIn: "https://linkedin.com"
  },
  {
    id: 11,
    name: "Tushar Thakur",
    position: "Assistant Manager",
    image: "https://i.ibb.co/pjrgBqM3/DSC09006.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 12,
    name: "Paritosh Sharma",
    position: "Assistant Manager",
    image: "https://i.ibb.co/jPJ0gtSs/paritosh.jpg",
    facebook: "https://facebook.com",
    linkedIn: "https://linkedin.com"
  },
  {
    id: 13,
    name: "Shlok Solanki",
    position: "Assistant Social Media Manager",
    image: "https://i.ibb.co/whJRV9rr/DSC09030.jpg",
    facebook: null,
    linkedIn: "https://linkedin.com"
  },
  {
    id: 14,
    name: "Soor Solanki",
    position: "Facility Manager, Vadodara Startup Studio",
    image: "https://i.ibb.co/1Y3YTM7B/DSC09023.jpg",
    facebook: null,
    linkedIn: "https://linkedin.com"
  }
];

export default function LandingPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/30">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between sticky top-0 glass z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Rocket className="text-white h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tighter text-slate-900">PIERC</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parul University</span>
          </div>
        </div>
        <nav className="hidden lg:flex gap-8 text-sm font-bold text-slate-600">
          <Link href="#about" className="hover:text-primary transition-all">About Us</Link>
          <Link href="#offerings" className="hover:text-primary transition-all">Offerings</Link>
          <Link href="#events" className="hover:text-primary transition-all">Events</Link>
          <Link href="#team" className="hover:text-primary transition-all">Team</Link>
          <Link href="#programs" className="hover:text-primary transition-all">Programs</Link>
          <Link href="#contact" className="hover:text-primary transition-all">Contact</Link>
        </nav>
        <div className="flex gap-4">
          {user ? (
            <Button variant="outline" className="rounded-xl border-primary/20 text-primary font-bold px-6 h-11" asChild>
              <Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="font-bold text-slate-600" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="rounded-xl shadow-lg shadow-primary/20 font-bold px-6" asChild>
                <Link href="/register">Apply Now</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 animate-page-entry">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 px-6 lg:px-12 text-center space-y-8 max-w-6xl mx-auto overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
             <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-200/20 rounded-full blur-[150px] animate-pulse delay-700" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Ideate • Innovate • Incubate
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 leading-[0.95]">
            Parul Innovation & <br />
            <span className="text-gradient-red">Entrepreneurship</span> <br />
            Research Centre
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
            Empowering the next generation of job creators through a world-class startup support system at Parul University.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            {user ? (
              <Button size="lg" className="h-16 px-10 text-lg shadow-2xl shadow-primary/30 rounded-2xl font-bold" asChild>
                <Link href="/dashboard">Return to Dashboard <LayoutDashboard className="ml-2 h-5 w-5" /></Link>
              </Button>
            ) : (
              <Button size="lg" className="h-16 px-10 text-lg shadow-2xl shadow-primary/30 rounded-2xl font-bold" asChild>
                <Link href="/register">Apply for Startup Support <ChevronRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            )}
          </div>
        </section>

        {/* Real Stats Section */}
        <section className="py-12 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Startups Incubated', value: '212+' },
              { label: 'Funds to Support', value: '₹8 Cr+' },
              { label: 'Students Reached', value: '36,431+' },
              { label: 'Employment Generated', value: '569+' },
              { label: 'Startup Revenue', value: '₹28 Cr+' },
              { label: 'Networking Events', value: '84+' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-6 text-center border-white/40 hover:scale-105 transition-all duration-500">
                <p className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Established 2013</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                  Driving the Hub of <br /><span className="text-gradient-red">Creative Entrepreneurship</span>
                </h3>
              </div>
              <p className="text-slate-500 leading-relaxed text-lg font-medium">
                The Entrepreneurship Development Cell (EDC) is one of the creative hubs of Parul University formed to support students and aspiring entrepreneurs. In 2015, the university registered a Section 8 company, Parul Innovation and Entrepreneurship Research Center (PIERC) as an incubator to formally extend its services from Idea Stage to Growth Stage.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="glass-card p-8 space-y-3 bg-white/80">
                  <h4 className="text-xl font-bold text-slate-900">Our Vision</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    To create a Startup Support System that enables 5% of our students to follow an entrepreneurial career.
                  </p>
                </div>
                <div className="glass-card p-8 space-y-3 bg-white/80 border-primary/10">
                  <h4 className="text-xl font-bold text-slate-900">Our Mission</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    To foster the culture of Research, Innovation and Entrepreneurship in students and faculty members.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-rose-200/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-80 transition-all" />
              <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white">
                <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000" 
                  alt="Team PIERC" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Offerings Section */}
        <section id="offerings" className="py-24 px-6 lg:px-12 bg-white/40 backdrop-blur-3xl">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">What We Do</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">PIERC Ecosystem Offerings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Counselling & Support', desc: 'Ensuring entrepreneurial ideas meet current global needs.', icon: Users },
                { title: 'Grants & Funding', desc: 'Access to Pre-Seed, Seed, Angel, and VC opportunities.', icon: BarChart3 },
                { title: 'Co-working Space', desc: 'Flexi & Dedicated desks, Meeting Lounges, and allied resources.', icon: Rocket },
                { title: 'Startup Programs', desc: 'Incubation, Growthpad, and Need-Based Support Programs.', icon: CheckCircle2 },
                { title: 'Product Development', desc: 'Access to FABLAB and high-end prototyping facilities.', icon: Rocket },
                { title: 'Mentor Connect', desc: 'Connection to a vast pool of experienced startup mentors.', icon: Users },
                { title: 'Community Connect', desc: 'Networking opportunities with ecosystem stakeholders.', icon: Users },
                { title: 'Startup Events', desc: 'Festivals, Demo Days, Expos, Pitching, and E-Talks.', icon: Calendar },
              ].map((offering, i) => (
                <div key={i} className="glass-card p-8 space-y-4 hover:border-primary/30 group transition-all duration-300 hover:-translate-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <offering.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">{offering.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{offering.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section id="events" className="py-24 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="space-y-4">
                <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Flagship Events</h2>
                <h3 className="text-4xl font-black tracking-tight text-slate-900">Ecosystem Catalysts</h3>
              </div>
              <Button variant="outline" className="font-bold border-2 rounded-xl">View Gallery</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Vadodara Startup Festival', desc: 'Networking and learning platform for leading entrepreneurs.' },
                { name: 'Vadodara Hackathon', desc: 'The largest regional technical problem-solving event.' },
                { name: 'Women Startup Meet', desc: 'Empowering female founders in the ecosystem.' },
              ].map((event, i) => (
                <div key={i} className="group relative rounded-[2rem] overflow-hidden aspect-[4/5] glass-card border-none shadow-2xl hover:scale-[1.02] transition-all duration-500">
                  <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/20 transition-all z-10" />
                  <img 
                    src={`https://images.unsplash.com/photo-1540575861501-7ce0e220beff?auto=format&fit=crop&q=80&w=600`} 
                    alt={event.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-8 z-20 space-y-2">
                    <h4 className="text-2xl font-black text-white">{event.name}</h4>
                    <p className="text-sm text-white/80 font-medium line-clamp-2">{event.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-24 px-6 lg:px-12 bg-white/40 backdrop-blur-3xl">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Our People</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Meet the PIERC Team</h3>
              <p className="text-slate-500 max-w-2xl mx-auto font-medium">The dedicated professionals driving innovation and supporting entrepreneurial dreams at Parul University.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <div key={member.id} className="group glass-card p-4 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-6">
                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors duration-500" />
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex justify-center gap-3">
                        {member.linkedIn && (
                          <Link href={member.linkedIn} target="_blank" className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-900 hover:bg-primary hover:text-white transition-all shadow-lg">
                            <Linkedin className="h-5 w-5" />
                          </Link>
                        )}
                        {member.facebook && (
                          <Link href={member.facebook} target="_blank" className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-900 hover:bg-primary hover:text-white transition-all shadow-lg">
                            <Facebook className="h-5 w-5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-center">
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">{member.name}</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{member.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="border-t py-24 px-6 lg:px-12 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Rocket className="text-white h-5 w-5" />
              </div>
              <span className="text-3xl font-black tracking-tighter">PIERC</span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              BBA Building, Parul University P.O.Limda, Ta.Waghodia – 391760 Dist. Vadodara, Gujarat (India)
            </p>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-primary text-[10px]">T</span> 0266-8260350
              </p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-primary text-[10px]">E</span> pierc@paruluniversity.ac.in
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-lg font-black text-slate-900">Useful Links</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Achievements</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-black text-slate-900">Our Programs</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link href="#" className="hover:text-primary transition-colors">Startup Incubation Program</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Startup Growthpad Program</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Need-Based Support</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-black text-slate-900">Newsletter</h4>
            <p className="text-sm text-slate-500 font-medium">Subscribe to our feed for latest updates.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Enter email" className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-primary/20" />
              <Button size="icon" className="shrink-0 rounded-xl"><ArrowUpRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">© Copyright 2026. Parul University.</p>
          <div className="flex gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
