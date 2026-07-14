'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  ArrowUpRight, 
  Users, 
  Target,
  LayoutGrid,
  List as ListIcon,
  Globe,
  Briefcase,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/export';

export default function StartupsDirectory() {
  const [startups, setStartups] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  useEffect(() => {
    const appsCol = collection(db, 'applications');
    const unsubscribe = onSnapshot(appsCol, (snapshot) => {
      setStartups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Application[]);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sectors = ['All Sectors', ...Array.from(new Set(startups.map(s => s.data?.sector || 'Other')))];

  const filteredStartups = startups.filter(s => {
    const name = (s.data?.startupTitle || s.programmeTitle).toLowerCase();
    const sector = (s.data?.sector || 'Other');
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'All Sectors' || sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const sortedStartups = [...filteredStartups].sort((a, b) => {
    const nameA = (a.data?.startupTitle || a.programmeTitle).toLowerCase();
    const nameB = (b.data?.startupTitle || b.programmeTitle).toLowerCase();
    if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
    
    const sectorA = (a.data?.sector || 'Other').toLowerCase();
    const sectorB = (b.data?.sector || 'Other').toLowerCase();
    if (sortBy === 'sector-asc') return sectorA.localeCompare(sectorB);
    if (sortBy === 'sector-desc') return sectorB.localeCompare(sectorA);

    const statusA = (a.status || '').toLowerCase();
    const statusB = (b.status || '').toLowerCase();
    if (sortBy === 'status-asc') return statusA.localeCompare(statusB);
    if (sortBy === 'status-desc') return statusB.localeCompare(statusA);

    return 0;
  });

  const handleExportStartups = () => {
    const headers = [
      'Startup Title',
      'Founder',
      'Founder Email',
      'Programme Track',
      'Sector',
      'City HQ',
      'Status'
    ];
    const keys = [
      'startupTitle',
      'userName',
      'userEmail',
      'programmeTitle',
      'sector',
      'cityHQ',
      'status'
    ];

    const dataToExport = filteredStartups.map(s => ({
      ...s,
      startupTitle: s.data?.startupTitle || s.programmeTitle,
      sector: s.data?.sector || 'Other',
      cityHQ: s.data?.cityHQ || 'N/A'
    }));

    exportToCSV(dataToExport, 'startups_report.csv', headers, keys);
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Assembling Startup Ecosystem...</p>
    </div>
  );

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Startup Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Exploring {startups.length} ventures in the PIERC ecosystem.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportStartups} className="rounded-xl font-bold flex items-center gap-2 border-slate-200 h-11 px-6 shadow-sm bg-white hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-9 rounded-lg px-3", viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-9 rounded-lg px-3", viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
            <Rocket className="h-4 w-4 mr-2" /> Register Startup
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by startup name or mission..." 
              className="h-12 pl-12 rounded-2xl border-slate-100 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="h-12 px-6 rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="h-12 px-6 rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Sort by: Name (A-Z)</option>
              <option value="name-desc">Sort by: Name (Z-A)</option>
              <option value="sector-asc">Sort by: Sector (A-Z)</option>
              <option value="sector-desc">Sort by: Sector (Z-A)</option>
              <option value="status-asc">Sort by: Status (A-Z)</option>
              <option value="status-desc">Sort by: Status (Z-A)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedStartups.map((startup) => (
            <Link key={startup.id} href={`/dashboard/applications/${startup.id}`}>
              <Card className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-none ring-1 ring-slate-100 rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col">
                <div className="h-32 bg-slate-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-50"></div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                      {startup.status}
                    </Badge>
                  </div>
                  <div className="absolute -bottom-6 left-8">
                    <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3 ring-4 ring-white">
                      <Rocket className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-8 pt-10 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight line-clamp-1">
                        {startup.data?.startupTitle || startup.programmeTitle}
                      </h3>
                      <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                        <Target className="h-3 w-3 mr-1.5" />
                        {startup.data?.sector || 'General Tech'}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed italic">
                      {startup.data?.briefDescription || startup.data?.problemStatement || "Exploring innovation frontiers in the PIERC incubation ecosystem."}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none rounded-lg text-[9px] font-bold">
                        <Users className="h-3 w-3 mr-1" /> Team of {startup.data?.teamMembers?.length || 1}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none rounded-lg text-[9px] font-bold">
                        <MapPin className="h-3 w-3 mr-1" /> Vadodara
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400">
                          U{i}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      View Profile <ArrowUpRight className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b">
                <tr>
                  <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Startup / Founder</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Sector</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Stage</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStartups.map((startup) => (
                  <tr key={startup.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <Rocket className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-primary transition-colors">{startup.data?.startupTitle || startup.programmeTitle}</p>
                          <p className="text-xs text-slate-400 font-bold">{startup.userName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center text-xs font-bold text-slate-600">
                        <Target className="h-3 w-3 mr-2 text-primary/60" />
                        {startup.data?.sector || 'General'}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">
                      {startup.data?.currentStage || 'N/A'}
                    </td>
                    <td className="px-6 py-6">
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase px-3 py-1">
                        {startup.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link href={`/dashboard/applications/${startup.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredStartups.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Search className="h-8 w-8 text-slate-200" />
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No ventures found matching your criteria.</p>
          <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedSector('All Sectors'); }}>Clear all filters</Button>
        </div>
      )}
    </div>
  );
}
