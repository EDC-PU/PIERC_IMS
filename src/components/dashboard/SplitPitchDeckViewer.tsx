'use client';

import { useState, useRef } from 'react';
import { 
  FileText, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  Download, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  X,
  FileCheck2,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SplitPitchDeckViewerProps {
  documents: {
    pitchDeck?: string;
    phase2PPT?: string;
    [key: string]: any;
  };
  startupTitle: string;
  applicantName?: string;
  defaultDocument?: 'pitchDeck' | 'phase2PPT';
  onClose?: () => void;
  className?: string;
}

export default function SplitPitchDeckViewer({
  documents,
  startupTitle,
  applicantName,
  defaultDocument = 'pitchDeck',
  onClose,
  className
}: SplitPitchDeckViewerProps) {
  const [activeDocKey, setActiveDocKey] = useState<'pitchDeck' | 'phase2PPT'>(
    documents[defaultDocument] ? defaultDocument : (documents.pitchDeck ? 'pitchDeck' : 'phase2PPT')
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeUrl = documents[activeDocKey];
  const hasMultipleDocs = !!(documents.pitchDeck && documents.phase2PPT);

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error('Fullscreen error:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error('Exit fullscreen error:', err));
    }
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  if (!activeUrl) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
          <FileText className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">No Pitch Deck Document Uploaded</p>
          <p className="text-xs text-slate-400 mt-1">The founder has not attached a PDF pitch deck yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col h-full min-h-[620px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-300",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-none",
        className
      )}
    >
      {/* Top Header Control Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Document Switcher / Info */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-xs">
                {startupTitle}
              </span>
              <Badge className="bg-white/10 text-white font-mono text-[9px] uppercase px-1.5 py-0 border-none">
                PDF
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {activeDocKey === 'pitchDeck' ? 'Phase 1 Pitch Deck' : 'Phase 2 Presentation'}
              {applicantName ? ` • ${applicantName}` : ''}
            </p>
          </div>
        </div>

        {/* Document Selector Tabs (if multiple exist) */}
        {hasMultipleDocs && (
          <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveDocKey('pitchDeck')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeDocKey === 'pitchDeck' ? "bg-primary text-white shadow-xs" : "text-slate-400 hover:text-white"
              )}
            >
              Pitch Deck
            </button>
            <button
              type="button"
              onClick={() => setActiveDocKey('phase2PPT')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeDocKey === 'phase2PPT' ? "bg-primary text-white shadow-xs" : "text-slate-400 hover:text-white"
              )}
            >
              Phase 2 PPT
            </button>
          </div>
        )}

        {/* Actions Controls (Zoom, New Tab, Fullscreen, Close) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          
          {/* Open in New Window */}
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Open in new browser tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Download Deck */}
          <a
            href={activeUrl}
            download={`${startupTitle.replace(/\s+/g, '_')}_Deck.pdf`}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </a>

          {/* Toggle Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close split viewer if callback provided */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              title="Close Deck Viewer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

        </div>

      </div>

      {/* Embedded In-App PDF Container */}
      <div className="relative flex-1 w-full bg-slate-950 flex flex-col overflow-hidden">
        <iframe
          key={`${activeUrl}-${iframeKey}`}
          src={`${activeUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className="w-full flex-1 border-none bg-slate-900"
          title={`Pitch Deck - ${startupTitle}`}
          loading="lazy"
        />

        {/* Floating Quick Action Footer inside Viewer */}
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive In-App Pitch Deck Mode</span>
          </div>
          <span className="hidden sm:inline text-slate-500">
            Scroll to navigate slides • Use controls at top for fullscreen
          </span>
        </div>
      </div>

    </div>
  );
}
