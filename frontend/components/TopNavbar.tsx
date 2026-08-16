"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Clock, Calendar } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "./NotificationCenter";
import api from "@/lib/api";

export function TopNavbar() {
  const pathname = usePathname();
  
  // START: Dynamic Software Name Logic
  const [softwareName, setSoftwareName] = useState('InvoiceCore'); // Default fallback
  const [timeState, setTimeState] = useState<{ time: string; date: string } | null>(null);

  useEffect(() => {
    api.get('/settings/software-name')
      .then(res => {
        if (res.data?.software_name) {
          setSoftwareName(res.data.software_name);
        }
      })
      .catch(e => console.error("Failed to fetch software name", e));
  }, []);

  // Live Date & Time ticker
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeState({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        date: now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      });
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSoftwareNameParts = () => {
    // Splits the name by capital letters for coloring, e.g., "InvoiceCore" -> ["Invoice", "Core"]
    const parts = softwareName.split(/([A-Z][a-z]+)/).filter(Boolean);
    
    return parts.map((part, index) => {
        if (index === parts.length - 1 && part.toLowerCase().endsWith('core')) {
            return <span key={index} className="text-primary">Core</span>;
        }
        return part;
    });
  };

  // Format current path for Breadcrumbs (e.g. "/invoices/new" -> "Invoices / New")
  const pageTitle = pathname === "/" 
    ? "Dashboard" 
    : pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:p-6 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-200">
      
      {/* Container */}
      <div className="flex items-center gap-4 w-full">
        
        {/* --- MOBILE HAMBURGER MENU (Sheet) --- */}
        <Sheet>
          <SheetTrigger asChild>
            {/* Visible only on Mobile (< 768px) */}
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-foreground hover:bg-muted">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          
          {/* Drawer Content */}
          <SheetContent side="left" className="p-0 w-[290px] border-r border-border bg-card flex flex-col h-full">
             
             {/* Accessibility: Hidden Titles (Required by Radix UI) */}
             <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
             <SheetDescription className="sr-only">Main site navigation</SheetDescription>

             {/* 1. Custom Mobile Header (Logo) */}
             <div className="h-20 flex items-center px-6 shrink-0 border-b border-border/50">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 text-white font-black text-xl shrink-0">
                        {/* Dynamic First Letter */}
                        {softwareName.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {/* Dynamic Software Name */}
                        {getSoftwareNameParts()}
                    </h2>
                 </div>
             </div>

             {/* 2. Embed Sidebar */}
             <div className="flex-1 overflow-hidden">
                <Sidebar 
                  // Remove default sidebar borders/shadows since Sheet handles layout
                  className="w-full border-none h-full static shadow-none" 
                  // Hide the Sidebar's internal logo (we used the custom one above)
                  hideLogo={true} 
                  // Force text labels to show, ignoring "Mini" mode from desktop preference
                  forceExpand={true} 
                />
             </div>

          </SheetContent>
        </Sheet>

        {/* --- BREADCRUMBS / TITLE --- */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">Pages / {pageTitle}</span>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight truncate">
            {pageTitle.split(' / ').pop()}
          </h1>
        </div>

        {/* --- RIGHT SIDE ACTIONS --- */}
        <div className="flex items-center gap-3 ml-auto">
            {/* Live Date & Time Widget */}
            {timeState && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-card border border-border/60 shadow-sm backdrop-blur-md text-xs font-medium text-foreground hover:border-primary/40 transition-all">
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary/80" />
                  <span>{timeState.date}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{timeState.time}</span>
                </div>
              </div>
            )}

            {/* Notification Center */}
            <NotificationCenter />
        </div>

      </div>
      
    </header>
  );
}