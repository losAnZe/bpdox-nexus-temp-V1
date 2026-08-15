"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DollarSign, Activity, Wallet, Loader2, Check, ChevronsUpDown, BadgePercent, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { 
  format, isWithinInterval, startOfDay, endOfDay, subDays,
  startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, 
  subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear
} from "date-fns";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

// --- DATE HELPERS ---

const getFinancialYearDates = (startYear: number) => {
    // Strictly use 12:00 PM to avoid timezone rollback issues in API calls
    const from = new Date(startYear, 3, 1, 12, 0, 0); // April 1st, 12:00 PM
    const to = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st next year
    return { from, to };
};

const getOverviewDates = (filter: string, dateRange?: DateRange) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (filter === 'custom' && dateRange?.from) {
        return {
            from: startOfDay(dateRange.from),
            to: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
        };
    }

    if (filter.startsWith('FY-')) {
        const startYear = parseInt(filter.split('-')[1]);
        return getFinancialYearDates(startYear);
    }

    switch (filter) {
        case 'today': 
            return { 
                from: startOfDay(now),
                to: endOfDay(now)
            };
        case 'yesterday': 
            const yesterday = subDays(now, 1);
            return { 
                from: startOfDay(yesterday),
                to: endOfDay(yesterday)
            };
        case 'this_week': 
            return { 
                from: startOfWeek(now, { weekStartsOn: 1 }),
                to: endOfWeek(now, { weekStartsOn: 1 })
            };
        case 'last_week': 
            const lastWeek = subWeeks(now, 1);
            return { 
                from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
                to: endOfWeek(lastWeek, { weekStartsOn: 1 })
            };
        case 'monthly': 
        case 'this_month': 
            return { 
                from: startOfMonth(now), 
                to: endOfMonth(now) 
            };
        case 'last_month': 
            const lastMonth = subMonths(now, 1);
            return { 
                from: startOfMonth(lastMonth), 
                to: endOfMonth(lastMonth) 
            };
        case 'quarterly': 
        case 'this_quarter': 
            return { 
                from: startOfQuarter(now), 
                to: endOfQuarter(now) 
            };
        case 'yearly': 
        case 'this_year': 
            return { 
                from: startOfYear(now), 
                to: endOfYear(now) 
            };
        case 'all': 
            return { 
                from: new Date(2000, 0, 1), 
                to: new Date() 
            };
        default: 
            return { 
                from: startOfMonth(now), 
                to: endOfMonth(now) 
            };
    }
};

// ROBUST DATE PARSER
const parseFlexibleDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    
    const match = String(dateStr).match(/([a-zA-Z]{3,})[\s\-'"]*(\d{2,4})/);
    
    if (match) {
        const monthPart = match[1];
        let yearPart = match[2];
        if (yearPart.length === 2) {
            yearPart = "20" + yearPart;
        }
        const d = new Date(`${monthPart} 1, ${yearPart}`);
        if (!isNaN(d.getTime())) return d;
    }
    
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date(NaN) : fallback;
};

export default function DashboardPage() {
  const router = useRouter();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const canViewDashboard = hasPermission('dashboard', 'view');

  const [mounted, setMounted] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const initialFyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  // --- STATE MANAGEMENT ---
  const [activeYears, setActiveYears] = useState<number[]>([initialFyStart]); 
  const [overviewFilter, setOverviewFilter] = useState<string>("monthly");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [summary, setSummary] = useState<any>({});

  const [comparisonYears, setComparisonYears] = useState<number[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  // Unified Dashboard Data (replaces separate fetches)
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expenseTable, setExpenseTable] = useState<any[]>([]);
  const [expenseColumns, setExpenseColumns] = useState<string[]>([]);
  const [sharedInvoices, setSharedInvoices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  // Auto-redirect if Dashboard permission is unchecked
  useEffect(() => {
    if (!permsLoading && !canViewDashboard) {
      if (hasPermission('invoices', 'view')) router.replace('/invoices');
      else if (hasPermission('quotations', 'view')) router.replace('/quotations');
      else if (hasPermission('clients', 'view')) router.replace('/clients');
      else if (hasPermission('assets', 'view')) router.replace('/assets');
      else if (hasPermission('vault', 'view')) router.replace('/vault');
      else if (hasPermission('expenses', 'view')) router.replace('/expenses');
      else if (hasPermission('reports', 'view')) router.replace('/ledger');
      else if (hasPermission('activity', 'view')) router.replace('/activity');
      else if (hasPermission('settings', 'view')) router.replace('/settings');
    }
  }, [permsLoading, canViewDashboard, hasPermission, router]);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (permsLoading || !canViewDashboard) return;

    const fetchInit = async () => {
        try {
            const dates = getOverviewDates(overviewFilter, dateRange);
            const params = new URLSearchParams({
                from: dates.from.toISOString(),
                to: dates.to.toISOString(),
                sections: 'summary,availableYears,monthlyStats,expenseTable'
            });

            const [statsRes, sharedRes] = await Promise.all([
                api.get(`/dashboard/stats?${params}`),
                api.get('/invoices/shared')
            ]);
            
            setSummary(statsRes.data.summary);
            setMonthlyData(statsRes.data.charts.monthlyStats || []);
            setExpenseTable(statsRes.data.tables.expenseTable || []);
            setExpenseColumns(statsRes.data.tables.expenseColumns || []);
            setSharedInvoices(sharedRes.data || []);

            if (statsRes.data.availableYears && statsRes.data.availableYears.length > 0) {
                const years = statsRes.data.availableYears.map((y: any) => Number(y));
                setActiveYears(years);
                // Initialize comparison with up to 4 recent years
                setComparisonYears(years.slice(0, 4));
            }
        } catch (e) { 
            console.error("Dashboard initial load failed", e); 
        } finally { 
            setLoading(false); 
        }
    };
    fetchInit();
  }, [permsLoading, canViewDashboard]);

  // --- GLOBAL FILTER HANDLER ---
  const handleFilterChange = async (filter: string, range?: DateRange) => {
    setOverviewFilter(filter);
    if (range) {
        setDateRange(range);
    } else if (filter !== 'custom') {
        setDateRange(undefined);
    }

    try {
        setLoadingStats(true);
        const dates = getOverviewDates(filter, range || dateRange);
        const params = new URLSearchParams({
            from: dates.from.toISOString(),
            to: dates.to.toISOString(),
            sections: 'summary,monthlyStats,expenseTable'
        });

        const res = await api.get(`/dashboard/stats?${params}`);
        setSummary(res.data.summary);
        setMonthlyData(res.data.charts.monthlyStats || []);
        setExpenseTable(res.data.tables.expenseTable || []);
        setExpenseColumns(res.data.tables.expenseColumns || []);
    } catch (e) {
        console.error("Failed to load filtered stats", e);
    } finally {
        setLoadingStats(false);
    }
  };

  // --- FETCH YEARLY COMPARISON ---
  useEffect(() => {
    if (loading || comparisonYears.length === 0) return;
    const fetchYearly = async () => {
        try {
            const params = new URLSearchParams({
                years: comparisonYears.join(','),
                sections: 'yearlyComparison'
            });
            const res = await api.get(`/dashboard/stats?${params}`);
            setYearlyData(res.data.charts.yearlyComparison || []);
        } catch (e) { console.error(e); }
    };
    fetchYearly();
  }, [comparisonYears, loading]);

  const toggleComparisonYear = (year: number) => {
      setComparisonYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  // Enforce 2 decimal places formatted for currency (Indian numbering format)
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(val || 0);

  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)" fontSize={11}>{payload.value}</text>
      </g>
    );
  };

  // --- EXPENSE FOOTER CALCULATION ---
  const expenseFooter = useMemo(() => {
    if (!expenseTable || expenseTable.length === 0) return null;
    const totals: Record<string, number> = {};
    expenseColumns.forEach(col => {
        totals[col] = expenseTable.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    });
    totals.grandTotal = expenseTable.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    totals.averageTotal = expenseTable.reduce((sum, row) => sum + (Number(row.average) || 0), 0);
    return totals;
  }, [expenseTable, expenseColumns]);

  // --- CUMULATIVE BALANCE CALCULATION ---
  const historyWithBalance = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];
    
    // The backend already returns cumulative balance starting from opening balance,
    // so we can use the backend balance directly or verify it.
    return [...monthlyData].sort((a, b) => {
        const dateA = parseFlexibleDate(a.date || a.month);
        const dateB = parseFlexibleDate(b.date || b.month);
        return dateA.getTime() - dateB.getTime();
    });
  }, [monthlyData]);

  if (!mounted) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 w-full max-w-[100vw] overflow-x-hidden">
      
      {/* HEADER WITH FILTERS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground font-medium">Real-time financial analytics and metric tracking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            <span className="text-sm font-semibold text-muted-foreground hidden md:inline">Filter By:</span>
            
            {/* Global Date Selector Menu */}
            <Select value={overviewFilter} onValueChange={(val) => handleFilterChange(val)}>
                <SelectTrigger className="h-9 w-[180px] bg-background border-input shadow-sm font-semibold">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <div className="max-h-[320px] overflow-y-auto p-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1.5 tracking-wider">Presets</p>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="last_week">Last Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="this_quarter">This Quarter</SelectItem>
                        <SelectItem value="this_year">This Year (Jan-Dec)</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                        
                        <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1.5 mt-2 tracking-wider">Financial Years</p>
                        {activeYears.map(year => (
                            <SelectItem key={year} value={`FY-${year}`}>
                                FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                            </SelectItem>
                        ))}
                    </div>
                </SelectContent>
            </Select>

            <span className="text-muted-foreground text-xs font-black px-1">OR</span>

            {/* Custom Range Calendar Date Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-[220px] justify-start text-left font-semibold", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, yyyy")} - {format(dateRange.to, "LLL dd, yyyy")}</>
                            ) : format(dateRange.from, "LLL dd, yyyy")
                        ) : <span>Custom Date Range</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => {
                            if (range) {
                                handleFilterChange('custom', range);
                            }
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>

            {/* Clear Filter Button */}
            {(dateRange || overviewFilter !== 'monthly') && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleFilterChange('monthly')}>
                    <X className="w-4 h-4" />
                </Button>
            )}

            {loadingStats && <Loader2 className="animate-spin text-primary h-5 w-5 ml-2" />}
        </div>
      </div>
      
      {/* 1. TOP METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-0">
        <MetricCard 
            title="Total Revenue" 
            value={summary?.totalRevenue || 0} 
            icon={<DollarSign />} 
            color="text-blue-600" 
            bg="bg-blue-50 dark:bg-blue-900/20" 
            formatCurrency={formatCurrency}
        />
        <MetricCard 
            title="Total Expenses" 
            value={summary?.totalExpense || 0} 
            icon={<Wallet />} 
            color="text-red-600" 
            bg="bg-red-50 dark:bg-red-900/20" 
            formatCurrency={formatCurrency}
        />
        <MetricCard 
            title="Net Profit" 
            value={summary?.netProfit || 0} 
            icon={<Activity />} 
            color="text-green-600" 
            bg="bg-green-50 dark:bg-green-900/20" 
            formatCurrency={formatCurrency}
        />
        <MetricCard 
            title="Avg Monthly Sale" 
            value={summary?.avgSale || 0} 
            icon={<BadgePercent />} 
            color="text-indigo-600" 
            bg="bg-indigo-50 dark:bg-indigo-900/20" 
            formatCurrency={formatCurrency}
        />
      </div>

      {/* 2. TOP CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        
        {/* YEARLY COMPARISON */}
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Yearly Comparison" 
            description="Revenue per Financial Year"
            action={
                <Popover open={isYearDropdownOpen} onOpenChange={setIsYearDropdownOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-dashed font-semibold">
                            Select Years <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                        <Command>
                            <CommandGroup>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {activeYears.map((year) => (
                                        <CommandItem key={year} value={year.toString()} onSelect={() => toggleComparisonYear(year)}>
                                            <Check className={cn("mr-2 h-4 w-4", comparisonYears.includes(year) ? "opacity-100" : "opacity-0")} />
                                            FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                                        </CommandItem>
                                    ))}
                                </div>
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            }
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={yearlyData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" interval={0} tick={<CustomizedAxisTick />} height={60} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} width={45} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={tooltipStyle} formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="total" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        {/* NET BALANCE TREND */}
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Net Balance Trend" 
            description="Cumulative business assets over selected range"
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={historyWithBalance}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} width={45} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => formatCurrency(val)} />
                    <Area type="monotone" dataKey="balance" name="Net Balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 3. MONTHLY PERFORMANCE */}
      <div className="grid grid-cols-1 gap-6 min-w-0">
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Monthly Performance" 
            description="Issued Sales Invoices vs Total Expenses"
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={historyWithBalance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} width={45} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.2)'}} contentStyle={tooltipStyle} formatter={(val: number) => formatCurrency(val)} />
                    <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                    <Bar dataKey="revenue" name="Sales" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 4. EXPENSE breakdowns */}
      <Card className="shadow-sm border border-border/50 bg-card overflow-hidden min-w-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Granular expense analysis for the filtered period</CardDescription>
            </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-x-auto md:p-6">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[150px] md:w-[200px] font-bold text-foreground">Category</TableHead>
                        {expenseColumns.map((col: string) => <TableHead key={col} className="text-right whitespace-nowrap px-3 text-foreground font-semibold">{col}</TableHead>)}
                        <TableHead className="text-right font-bold text-foreground px-3">Total</TableHead>
                        <TableHead className="text-right font-bold text-foreground px-3">Avg</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenseTable.length === 0 ? (
                        <TableRow><TableCell colSpan={expenseColumns.length + 3} className="text-center py-10 text-muted-foreground font-semibold">No expense data found in this range.</TableCell></TableRow>
                    ) : expenseTable.map((row: any, i: number) => (
                        <TableRow key={i}>
                            <TableCell className="font-semibold text-foreground whitespace-nowrap">{row.category}</TableCell>
                            {expenseColumns.map((col: string) => (
                                <TableCell key={col} className="text-right text-muted-foreground whitespace-nowrap font-medium">{row[col] ? formatCurrency(row[col]) : '-'}</TableCell>
                            ))}
                            <TableCell className="text-right font-bold text-foreground bg-muted/20 whitespace-nowrap">{formatCurrency(row.total)}</TableCell>
                            <TableCell className="text-right font-semibold text-muted-foreground bg-muted/20 whitespace-nowrap">{formatCurrency(row.average)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                {expenseFooter && (
                    <TableFooter className="bg-muted/50 font-bold border-t-2 border-primary/20">
                        <TableRow>
                            <TableCell className="text-foreground font-bold">Total</TableCell>
                            {expenseColumns.map(col => (
                                <TableCell key={col} className="text-right text-foreground whitespace-nowrap font-bold">
                                    {formatCurrency(expenseFooter[col] || 0)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right text-primary whitespace-nowrap font-bold">
                                {formatCurrency(expenseFooter.grandTotal)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap font-bold">
                                {formatCurrency(expenseFooter.averageTotal)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </CardContent>
      </Card>
      
      {/* 5. BOTTOM TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          <Card className="shadow-sm border border-border/50 bg-card min-w-0">
            <CardHeader>
                <CardTitle>Balances History</CardTitle>
                <CardDescription>Monthly revenue vs expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
                <div className="h-[350px] overflow-y-auto">
                  <div className="min-w-full inline-block align-middle">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px] text-foreground font-semibold">Month</TableHead>
                                <TableHead className="text-right text-foreground font-semibold">Revenue</TableHead>
                                <TableHead className="text-right text-foreground font-semibold">Expense</TableHead>
                                <TableHead className="text-right text-foreground font-semibold">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...historyWithBalance].reverse().map((m: any, index: number) => (
                                <TableRow key={`${m.month}-${m.balance || 0}-${index}`}>
                                    <TableCell className="font-semibold text-foreground whitespace-nowrap">{m.month}</TableCell>
                                    <TableCell className="text-right text-green-600 font-semibold whitespace-nowrap">+{formatCurrency(m.revenue)}</TableCell>
                                    <TableCell className="text-right text-red-600 font-semibold whitespace-nowrap">-{formatCurrency(m.expense)}</TableCell>
                                    <TableCell className={`text-right font-bold whitespace-nowrap ${m.balance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                                        {formatCurrency(m.balance)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                </div>
            </CardContent>
        </Card>

        {/* PENDING/SHARED INVOICES */}
        <Card className="shadow-sm border border-border/50 bg-card min-w-0">
            <CardHeader>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>All invoices awaiting client payment.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-foreground font-semibold">Invoice</TableHead>
                            <TableHead className="text-foreground font-semibold">Client</TableHead>
                            <TableHead className="text-foreground font-semibold">Status</TableHead>
                            <TableHead className="text-right text-foreground font-semibold">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sharedInvoices.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-semibold">No shared or overdue invoices.</TableCell></TableRow>
                        ) : sharedInvoices.map((inv: any) => (
                            <TableRow key={inv.id}>
                                <TableCell className="font-mono text-xs text-foreground font-semibold whitespace-nowrap">{inv.invoice_number}</TableCell>
                                <TableCell className="text-muted-foreground text-sm font-semibold truncate max-w-[120px]" title={inv.client?.company_name}>{inv.client?.company_name || "Unknown"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        inv.status === 'SENT' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800',
                                        inv.status === 'OVERDUE' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
                                        inv.status === 'PARTIAL' && 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800',
                                        inv.status === 'SHARED' && 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800'
                                    )}>{inv.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                                    {formatCurrency(Number(inv.grand_total))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Metric Card Component
function MetricCard({ title, value, icon, color, bg, formatCurrency }: any) {
    return (
        <Card className="shadow-sm border border-border/50 bg-card hover:scale-[1.02] transition-transform duration-200 min-w-0">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1 truncate">{formatCurrency(Number(value))}</h3>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    {React.isValidElement(icon) 
                      ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6" }) 
                      : icon}
                </div>
            </CardContent>
        </Card>
    )
}

const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '12px',
    border: '1px solid hsl(var(--border))'
};