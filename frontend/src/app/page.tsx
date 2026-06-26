"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Globe, 
  Terminal, 
  RefreshCw, 
  Cpu, 
  Search,
  ArrowRight,
  ChevronRight,
  GitBranch,
  Save,
  Share2,
  ExternalLink
} from "lucide-react";

interface MetricHistory {
  date: string;
  score: number;
}

interface Competitor {
  name: string;
  url: string;
  score: number;
}

interface RemediationFix {
  id: string;
  file: string;
  agent: string;
  title: string;
  description: string;
  diff: string;
  status: string;
}

interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  has_token: boolean;
  masked_token: string;
}

interface DashboardData {
  aeo_score_history: MetricHistory[];
  metrics: {
    overall_aeo_score: number;
    question_success_rate: number;
    documentation_trust: number;
    total_scans_run: number;
  };
  competitors: Competitor[];
  remediation_queue: RemediationFix[];
  github_config: GitHubConfig;
}

export default function Dashboard() {

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  // Scan form state
  const [scanUrl, setScanUrl] = useState("");
  const [competitorsInput, setCompetitorsInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  
  // Fix selection / Diff modal state
  const [selectedFix, setSelectedFix] = useState<RemediationFix | null>(null);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
  const [creatingPrId, setCreatingPrId] = useState<string | null>(null);
  const [prResult, setPrResult] = useState<{ url: string; branch: string } | null>(null);

  // GitHub Settings Form
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghToken, setGhToken] = useState("");
  const [savingGhConfig, setSavingGhConfig] = useState(false);
  const [ghShareLink, setGhShareLink] = useState<string | null>(null);
  const [sharingReport, setSharingReport] = useState(false);

  // Helper to dynamically point to backend port 8000 when running on port 3000
  const getApiUrl = (path: string) => {
    if (typeof window !== "undefined" && window.location.port === "3000") {
      return `http://localhost:8000${path}`;
    }
    return path;
  };

  // Fetch metrics and github config
  const fetchMetrics = async () => {
    try {
      setError(null);
      const res = await fetch(getApiUrl("/api/metrics"));
      if (!res.ok) throw new Error("Failed to fetch current metrics");
      const d = await res.json();
      setData(d);
      
      // Seed Github form with settings
      const ghRes = await fetch(getApiUrl("/api/github/config"));
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        setGhOwner(ghData.owner || "");
        setGhRepo(ghData.repo || "");
        setGhBranch(ghData.branch || "main");
      }
      
      // Update selected fix references if queue updates
      if (selectedFix) {
        const updated = d.remediation_queue.find((q: RemediationFix) => q.id === selectedFix.id);
        if (updated) setSelectedFix(updated);
      } else if (d.remediation_queue.length > 0) {
        setSelectedFix(d.remediation_queue[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load metrics from the control plane.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchMetrics();
  }, []);

  // Trigger AEO scan
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl.trim()) return;
    
    setScanning(true);
    setScanLogs([]);
    
    const logs = [
      "Initializing Nasiko Agent Control Plane...",
      "Assigning tasks to IngestionAgent...",
      "IngestionAgent: Fetching website structure and schemas...",
      "Assigning tasks to UserIntentAgent...",
      "UserIntentAgent: Analyzing content gaps and generating query matrix...",
      "Assigning tasks to EvaluationAgent...",
      "EvaluationAgent: Simulating answers on Vertex AI runtime...",
      "Assigning tasks to CompetitorAgent...",
      "CompetitorAgent: Evaluating competitor benchmarks...",
      "Assigning tasks to ContentGapAgent...",
      "ContentGapAgent: Compiling schema and semantic documentation gaps...",
      "Scan complete. Updating dashboard telemetry..."
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise((resolve) => {
        setTimeout(() => {
          setScanLogs(prev => [...prev, logs[i]]);
          resolve(true);
        }, 120);
      });
    }

    try {
      const comps = competitorsInput
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const res = await fetch(getApiUrl("/api/scan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl, competitors: comps }),
      });
      
      if (!res.ok) throw new Error("Nayana.ai Scan failed");
      
      await fetchMetrics();
    } catch (err: any) {
      console.error(err);
      setScanLogs(prev => [...prev, "ERROR: Scan workflow execution failed."]);
    } finally {
      setScanning(false);
    }
  };

  // Apply codebase fix locally
  const handleApplyFix = async (fixId: string) => {
    setApplyingFixId(fixId);
    try {
      const res = await fetch(getApiUrl("/api/fix"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_id: fixId }),
      });
      
      if (!res.ok) throw new Error("Failed to apply code remediation");
      
      await fetchMetrics();
    } catch (err: any) {
      console.error(err);
      alert("Error applying code remediation.");
    } finally {
      setApplyingFixId(null);
    }
  };

  // Generate GitHub PR for Fix
  const handleCreateGitHubPr = async (fixId: string) => {
    setCreatingPrId(fixId);
    setPrResult(null);
    try {
      const res = await fetch(getApiUrl("/api/github/pr"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_id: fixId }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create PR");
      }
      
      const resData = await res.json();
      setPrResult({ url: resData.pr_url, branch: resData.branch });
      await fetchMetrics();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to trigger GitHub PR creation.");
    } finally {
      setCreatingPrId(null);
    }
  };

  // Save GitHub configuration
  const handleSaveGitHubConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGhConfig(true);
    try {
      const res = await fetch(getApiUrl("/api/github/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: ghOwner,
          repo: ghRepo,
          branch: ghBranch,
          token: ghToken
        }),
      });
      if (!res.ok) throw new Error("Failed to save config");
      alert("GitHub integration updated.");
      setGhToken("");
      await fetchMetrics();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setSavingGhConfig(false);
    }
  };

  // Share Scan Report to GitHub
  const handleShareReport = async () => {
    setSharingReport(true);
    setGhShareLink(null);
    try {
      const res = await fetch(getApiUrl("/api/github/share"), {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to share report");
      const resData = await res.json();
      setGhShareLink(resData.commit_url);
    } catch (err: any) {
      console.error(err);
      alert("Failed to share report.");
    } finally {
      setSharingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] text-[#9A9A9A] flex items-center justify-center font-mono">
        <div className="border border-[#333] p-8 bg-[#0C0C0C] flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#9A9A9A] animate-spin" />
          <p className="text-xs uppercase tracking-widest">[ BOOTING Nayana.ai... ]</p>
        </div>
      </div>
    );
  }

  const score = data?.metrics.overall_aeo_score || 0;
  const totalScans = data?.metrics.total_scans_run || 0;
  const pendingFixes = data?.remediation_queue.filter(q => q.status === "pending") || [];
  
  // Custom ASCII progress helpers
  const getAsciiBar = (val: number, maxChars: number = 20) => {
    const chars = Math.round((val / 100) * maxChars);
    return `[${"=".repeat(chars)}${">"}${"-".repeat(maxChars - chars)}]`;
  };

  const getScoreBar = (val: number, maxChars: number = 30) => {
    const chars = Math.round((val / 100) * maxChars);
    return `[${"█".repeat(chars)}${"░".repeat(maxChars - chars)}]`;
  };

  const sparklineDataEmpty = Array(7).fill({ uv: 0 });
  const radarDataEmpty = [
    { subject: "Nayana.ai Score", A: 0 },
    { subject: "Accuracy", A: 0 },
    { subject: "Hallucination", A: 0 },
    { subject: "Completeness", A: 0 },
    { subject: "Structure", A: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-[#9A9A9A] font-mono selection:bg-[#9A9A9A] selection:text-[#070707] pb-16">
      
      {/* Terminal Style Header */}
      <header className="border-b border-[#1A1A1A] bg-[#0A0A0A] py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab("Dashboard")}
              className="text-white font-bold flex items-center gap-2 hover:text-[#9A9A9A] transition-colors cursor-pointer text-left bg-transparent border-none p-0 font-mono"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Nayana.ai</span>
            </button>
          </div>

          {/* Simple brackets navigation links */}
          <nav className="flex flex-wrap items-center gap-1">
            {["Dashboard", "Scans", "Remediation", "Competitors", "Settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs tracking-wider transition-all ${
                  activeTab === tab 
                    ? "text-white bg-[#1A1A1A] border border-[#333]" 
                    : "text-[#666] hover:text-[#9A9A9A]"
                }`}
              >
                <span className="text-[#444]">[</span> <span className="px-1">{tab.toUpperCase()}</span> <span className="text-[#444]">]</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {error && (
          <div className="bg-[#1A0A0A] border border-[#FF3333] text-[#FF9999] p-4 text-xs font-bold flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>ERROR_LOG: {error}</span>
          </div>
        )}

        {activeTab === "Dashboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            
            {/* ZERO STATE ONBOARDING: Render if no scans have run yet */}
            {totalScans === 0 ? (
              <div className="col-span-4 bg-[#0A0A0A] border border-[#1A1A1A] p-8 text-center space-y-6">
                <div className="text-left font-bold border-b border-[#1A1A1A] pb-3 text-white">
                  Nayana.ai // INITIAL BOOT DIAGNOSTIC
                </div>
                
                <div className="py-8 max-w-2xl mx-auto text-left space-y-5">
                  <p className="text-[#39FF14] font-bold text-xs uppercase tracking-wider">
                    [ STATUS: SYSTEM READY. PENDING SOURCE SCAN ]
                  </p>
                  <p className="text-xs text-[#888] leading-relaxed">
                    The control plane has booted successfully, but no codespace evaluations exist. To start auditing your website documentation and applying multi-agent remediation fixes, please connect a target URL.
                  </p>
                  
                  <div className="border border-[#222] p-4 bg-[#050505] space-y-2 text-xs">
                    <p className="text-white font-bold">ONBOARDING ACTIONS:</p>
                    <p className="text-[#888]">1. Go to the <button onClick={() => setActiveTab("Scans")} className="text-white underline font-bold cursor-pointer hover:text-emerald-400">SCANS</button> tab and input your product landing page URL.</p>
                    <p className="text-[#888]">2. Input your competitor domains for comparative benchmark comparisons.</p>
                    <p className="text-[#888]">3. Trigger the swarm crawler scan to execute evaluation simulation agents.</p>
                    <p className="text-[#888]">4. Review the generated gaps in the <button onClick={() => setActiveTab("Remediation")} className="text-white underline font-bold cursor-pointer hover:text-emerald-400">REMEDIATION</button> queue and apply fixes locally, or enter your GitHub credentials in <button onClick={() => setActiveTab("Settings")} className="text-white underline font-bold cursor-pointer hover:text-emerald-400">SETTINGS</button> to deploy via Pull Requests.</p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setActiveTab("Scans")}
                      className="bg-[#1A1A1A] hover:bg-[#9A9A9A] hover:text-[#0A0A0A] text-white border border-[#333] px-5 py-2.5 text-xs font-bold transition-all cursor-pointer"
                    >
                      [ GO TO SCANS PANEL ]
                    </button>
                    <button 
                      onClick={() => setActiveTab("Settings")}
                      className="border border-[#222] hover:border-white text-[#555] hover:text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer"
                    >
                      [ LINK GITHUB REPOSITORY ]
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* COLUMN 1: Swarm Workflow Tree */}
                <div className="xl:col-span-1">
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 space-y-4">
                    <div className="border-b border-[#1A1A1A] pb-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">SWARM PIPELINE STATE</span>
                      <span className="text-[9px] text-[#666]">CONNECTED</span>
                    </div>

                    <div className="text-[11px] leading-relaxed text-[#888] space-y-3 font-mono">
                      <div>
                        <span className="text-white font-bold">[-] IngestionAgent</span> ............ <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Crawls website structure & schemas</p>
                      </div>
                      <div>
                        <span className="text-[#666]"> └─ </span><span className="text-white font-bold">UserIntentAgent</span> ......... <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Compiles realistic query matrix</p>
                      </div>
                      <div>
                        <span className="text-[#666]">     └─ </span><span className="text-white font-bold">EvaluationAgent</span> ....... <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Simulates answers on Vertex AI</p>
                      </div>
                      <div>
                        <span className="text-[#666]">         └─ </span><span className="text-white font-bold">CompetitorAgent</span> ..... <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Benchmarks rival domains</p>
                      </div>
                      <div>
                        <span className="text-[#666]">             └─ </span><span className="text-white font-bold">ContentGapAgent</span> ... <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Identifies schema/metadata faults</p>
                      </div>
                      <div>
                        <span className="text-[#666]">                 └─ </span><span className="text-white font-bold">Remediation</span> ..... <span className="text-emerald-500">[ ACTIVE ]</span>
                        <p className="text-[9px] text-[#555] pl-6">Generates workspace code fixes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Main Telemetry metrics */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Score Display Card */}
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3 flex-grow">
                      <div className="inline-block text-[10px] text-white border border-[#333] px-2 py-0.5 font-bold uppercase tracking-wider">
                        Metrics telemetry
                      </div>
                      <h2 className="text-lg font-bold text-white uppercase tracking-tight">AI Optimization Index</h2>
                      <p className="text-xs text-[#777] max-w-sm">
                        Calculates how reliably AI search crawlers can read, parse, and verify your codebase contents.
                      </p>
                      <div className="text-[10px] text-[#555] space-y-1">
                        <p>Scanned Target: {data?.competitors[0].url}</p>
                        <p>
                          <button 
                            onClick={fetchMetrics} 
                            className="text-[#9A9A9A] hover:text-white underline cursor-pointer"
                          >
                            [ refresh telemetry ]
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* ASCII Score Box */}
                    <div className="border border-[#1a1a1a] p-5 bg-[#0C0C0C] flex flex-col items-center justify-center w-36 h-36 flex-shrink-0">
                      <span className="text-xs text-[#555] uppercase font-bold tracking-wider">Nayana.ai Score</span>
                      <span className="text-4xl font-bold text-white tracking-tighter my-1">{score}%</span>
                      <span className="text-[8px] text-emerald-500 border border-emerald-950 px-1 bg-black mt-1">
                        ↑ IMPROVING
                      </span>
                    </div>
                  </div>

                  {/* Progress bars Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Metric 1 */}
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex flex-col justify-between h-28">
                      <span className="text-[10px] uppercase font-bold text-[#666]">AI confidence index</span>
                      <span className="text-2xl font-bold text-white mt-1">{data?.metrics.question_success_rate}%</span>
                      <div className="text-[10px] text-[#555] font-mono mt-1">
                        {getAsciiBar(data?.metrics.question_success_rate || 0)}
                      </div>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex flex-col justify-between h-28">
                      <span className="text-[10px] uppercase font-bold text-[#666]">Documentation trust</span>
                      <span className="text-2xl font-bold text-white mt-1">{data?.metrics.documentation_trust}%</span>
                      <div className="text-[10px] text-[#555] font-mono mt-1">
                        {getAsciiBar(data?.metrics.documentation_trust || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Competitors Score list */}
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 space-y-4">
                    <div className="border-b border-[#1A1A1A] pb-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Competitor benchmarks</span>
                    </div>
                    
                    <div className="space-y-3.5 text-xs">
                      {data?.competitors.map((comp, idx) => {
                        const isTarget = idx === 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span className={isTarget ? "text-white font-bold" : "text-[#777]"}>
                                {comp.name} ({comp.url})
                              </span>
                              <span className={isTarget ? "text-white font-bold" : "text-[#777]"}>
                                {comp.score}%
                              </span>
                            </div>
                            <div className="text-[10px] text-[#555]">
                              {getScoreBar(comp.score)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score History List */}
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 space-y-4">
                    <div className="border-b border-[#1A1A1A] pb-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Nayana.ai Scan History</span>
                      <span className="text-[9px] text-[#555] border border-[#1A1A1A] px-1 bg-black">
                        {data?.aeo_score_history.length || 0} SCANS
                      </span>
                    </div>
                    
                    {data?.aeo_score_history && data.aeo_score_history.length > 0 ? (
                      <div className="space-y-3.5 text-xs max-h-[160px] overflow-y-auto">
                        {data.aeo_score_history.map((entry, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span className="text-[#777]">CRAWL SESSION #{idx + 1} ({entry.date})</span>
                              <span className="text-white font-bold">{entry.score}%</span>
                            </div>
                            <div className="text-[10px] text-[#555]">
                              {getScoreBar(entry.score)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#555] uppercase tracking-wider py-1">
                        No previous scan evaluations recorded.
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 3: Remediation / Copilot */}
                <div className="xl:col-span-1 space-y-6">
                  
                  {/* Queue */}
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 space-y-4">
                    <div className="border-b border-[#1A1A1A] pb-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Remediation Queue</span>
                      <span className="text-[9px] text-[#555] border border-[#1A1A1A] px-1 bg-black">
                        {pendingFixes.length} PENDING
                      </span>
                    </div>

                    <div className="space-y-2">
                      {data?.remediation_queue.map((fix) => {
                        const isSelected = selectedFix?.id === fix.id;
                        return (
                          <button
                            key={fix.id}
                            onClick={() => setSelectedFix(fix)}
                            className={`w-full text-left p-3 border text-xs font-mono transition-all flex justify-between items-center ${
                              isSelected 
                                ? "bg-[#1A1A1A] border-[#666] text-white" 
                                : fix.status === "applied"
                                  ? "bg-transparent border-[#111] text-[#333] opacity-40"
                                  : "bg-[#0C0C0C] border-[#1A1A1A] text-[#888] hover:border-[#333]"
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold block truncate">{isSelected ? `> ${fix.title}` : `  ${fix.title}`}</span>
                              <span className="text-[9px] text-[#555] block truncate pl-3">{fix.file}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Code viewer */}
                  <AnimatePresence mode="wait">
                    {selectedFix && (
                      <motion.div 
                        key={selectedFix.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 space-y-4"
                      >
                        <div className="border-b border-[#1A1A1A] pb-2 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-white">{selectedFix.title}</h4>
                            <p className="text-[9px] text-[#555] mt-0.5">{selectedFix.file}</p>
                          </div>
                          <span className="text-[9px] text-[#666] bg-[#111] px-1">
                            {selectedFix.agent}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#777] leading-relaxed">
                          {selectedFix.description}
                        </p>

                        {/* Diff Editor Code Panel */}
                        <div className="bg-[#050505] border border-[#1A1A1A] p-3 font-mono text-[9px] leading-normal overflow-x-auto max-h-[180px]">
                          {selectedFix.diff.split("\n").map((line, idx) => {
                            const isAdd = line.startsWith("+");
                            const isDel = line.startsWith("-");
                            let classNm = "text-[#666]";
                            if (isAdd) classNm = "text-emerald-400 bg-emerald-950/10";
                            if (isDel) classNm = "text-rose-400 bg-rose-950/10";
                            
                            return (
                              <div key={idx} className={`px-1 ${classNm}`}>
                                {line}
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-2 pt-1.5">
                          {selectedFix.status === "applied" ? (
                            <div className="text-center py-2 bg-[#050505] border border-[#333] text-emerald-500 text-[10px] font-bold">
                              [ STATUS: PATCH WRITTEN ON WORKSPACE ]
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 w-full">
                              <button
                                onClick={() => handleApplyFix(selectedFix.id)}
                                disabled={applyingFixId === selectedFix.id}
                                className="w-full bg-[#1A1A1A] hover:bg-[#9A9A9A] hover:text-[#0A0A0A] text-white border border-[#333] py-2 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                {applyingFixId === selectedFix.id ? "[ APPLYING... ]" : "[ APPROVE LOCAL PATCH ]"}
                              </button>

                              <button
                                onClick={() => handleCreateGitHubPr(selectedFix.id)}
                                disabled={creatingPrId === selectedFix.id || !data?.github_config.has_token}
                                className={`w-full text-center py-2 border text-[10px] font-bold transition-all ${
                                  data?.github_config.has_token
                                    ? "bg-transparent border-[#333] hover:border-white text-white cursor-pointer"
                                    : "border-[#111] text-[#333] cursor-not-allowed"
                                }`}
                              >
                                {creatingPrId === selectedFix.id ? "[ PROCESSING... ]" : "[ DEPLOY VIA GITHUB PR ]"}
                              </button>
                            </div>
                          )}
                        </div>

                        {prResult && (
                          <div className="bg-[#050505] border border-[#A020F0] p-3 text-[9px] space-y-1">
                            <p className="text-emerald-500 uppercase tracking-widest">[ PULL REQUEST CREATED ]</p>
                            <p className="text-[#555]">Branch: {prResult.branch}</p>
                            <a 
                              href={prResult.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#00F0FF] hover:underline"
                            >
                              Review on GitHub <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Swarm Scan Panel */}
        {activeTab === "Scans" && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-4">
              <Activity className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Trigger Swarm Evaluation Scan</span>
            </div>
            
            <form onSubmit={handleScan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#666] mb-2 uppercase">Target Domain URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#444] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url" 
                      value={scanUrl} 
                      onChange={(e) => setScanUrl(e.target.value)} 
                      placeholder="Enter website link to scan (e.g., https://example.com)..."
                      disabled={scanning}
                      className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] py-2.5 pl-10 pr-4 text-xs outline-none text-[#9A9A9A]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#666] mb-2 uppercase">Competitors (Comma-separated)</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#444] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={competitorsInput} 
                      onChange={(e) => setCompetitorsInput(e.target.value)} 
                      placeholder="Enter competitor links, comma-separated (e.g. https://competitor.com)..."
                      disabled={scanning}
                      className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] py-2.5 pl-10 pr-4 text-xs outline-none text-[#9A9A9A]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="submit" 
                  disabled={scanning}
                  className="flex-1 bg-[#1A1A1A] hover:bg-[#9A9A9A] hover:text-[#0A0A0A] text-white font-bold py-3 border border-[#333] transition-all text-xs cursor-pointer"
                >
                  {scanning ? "[ AGENT PIPELINE EXECUTING... ]" : "[ LAUNCH SWARM ANALYSIS ]"}
                </button>

                <button
                  type="button"
                  onClick={handleShareReport}
                  disabled={scanning || sharingReport || !data?.github_config.has_token || totalScans === 0}
                  className={`px-6 py-3 border text-xs font-bold transition-all cursor-pointer ${
                    (data?.github_config.has_token && totalScans > 0)
                      ? "bg-transparent border-[#333] hover:border-white text-white"
                      : "border-[#111] text-[#333] cursor-not-allowed"
                  }`}
                >
                  {sharingReport ? "[ SHARING... ]" : "[ SHARE REPORT TO GITHUB ]"}
                </button>
              </div>
            </form>

            {ghShareLink && (
              <div className="bg-[#050508] border border-[#333] p-4 text-xs space-y-2">
                <p className="text-emerald-500 uppercase tracking-widest">[ REPORT COMMITTED TO GITHUB ]</p>
                <p className="text-[#555]">Nayana.ai index metrics updated on remote repository master.</p>
                <a 
                  href={ghShareLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#00F0FF] hover:underline"
                >
                  View Commit on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {scanning || scanLogs.length > 0 ? (
              <div className="bg-[#050505] border border-[#1A1A1A] p-5 space-y-2 max-h-[300px] overflow-y-auto text-xs text-[#777]">
                <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A] text-[#555] font-bold">
                  <span>&gt; nayana.ai SWARM SCAN LOGS</span>
                  <span>{scanning ? "RUNNING" : "DONE"}</span>
                </div>
                {scanLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start py-0.5">
                    <span className="text-[#666] select-none">&gt;&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0A0A0F] border border-[#1A1A1A] border-dashed p-10 text-center">
                <p className="text-xs text-[#555] uppercase tracking-wider">
                  No active scan session. Trigger scan above to observe agent scoring.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Swarm Remediation Queue View */}
        {activeTab === "Remediation" && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-8 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Remediation Queue Details</span>
              </div>
              <span className="text-xs text-[#666] border border-[#333] px-2 py-0.5">
                {pendingFixes.length} Gaps Pending
              </span>
            </div>

            {totalScans === 0 ? (
              <div className="bg-[#050505] border border-dashed border-[#222] p-10 text-center">
                <p className="text-xs text-[#555] uppercase tracking-wider">
                  No optimization gaps identified yet. Run a website scan to populate the remediation queue.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-2">
                  {data?.remediation_queue.map((fix) => {
                    const isSelected = selectedFix?.id === fix.id;
                    return (
                      <button
                        key={fix.id}
                        onClick={() => setSelectedFix(fix)}
                        className={`w-full text-left p-4 border text-xs transition-all flex justify-between items-center ${
                          isSelected 
                            ? "bg-[#1A1A1A] border-[#666] text-white" 
                            : fix.status === "applied"
                              ? "bg-[#111]/45 border-[#111] text-[#333] opacity-40"
                              : "bg-[#0C0C0C] border-[#1A1A1A] text-[#888] hover:border-[#333]"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold block truncate">{fix.title}</span>
                          <span className="text-[9px] text-[#555] block truncate mt-1">{fix.file}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#444]" />
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-2">
                  {selectedFix ? (
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-white">{selectedFix.title}</h4>
                          <p className="text-xs text-[#555] mt-1">{selectedFix.file}</p>
                        </div>
                        <span className="text-xs bg-[#111] px-2 py-0.5 border border-[#1A1A1A] text-[#666] font-bold">
                          {selectedFix.agent}
                        </span>
                      </div>

                      <p className="text-xs text-[#777] leading-relaxed">
                        {selectedFix.description}
                      </p>

                      {/* Diff Editor Code Panel */}
                      <div className="bg-[#050505] border border-[#1A1A1A] p-4 font-mono text-xs overflow-x-auto max-h-[300px]">
                        {selectedFix.diff.split("\n").map((line, idx) => {
                          const isAdd = line.startsWith("+");
                          const isDel = line.startsWith("-");
                          let classNm = "text-[#666]";
                          if (isAdd) classNm = "text-emerald-400 bg-emerald-950/10";
                          if (isDel) classNm = "text-rose-400 bg-rose-950/10";
                          
                          return (
                            <div key={idx} className={`px-1.5 rounded ${classNm}`}>
                              {line}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]">
                        {selectedFix.status === "applied" ? (
                          <span className="px-4 py-2 border border-[#333] text-emerald-500 text-xs font-bold">
                            [ STATUS: PATCH APPLIED TO LOCAL WORKSPACE ]
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateGitHubPr(selectedFix.id)}
                              disabled={creatingPrId === selectedFix.id || !data?.github_config.has_token}
                              className={`px-4 py-2 border text-xs font-bold transition-all cursor-pointer ${
                                data?.github_config.has_token
                                  ? "bg-transparent border-[#333] hover:border-white text-white"
                                  : "border-[#111] text-[#333] cursor-not-allowed"
                              }`}
                            >
                              {creatingPrId === selectedFix.id ? "[ PROCESSING... ]" : "[ DEPLOY VIA GITHUB PR ]"}
                            </button>

                            <button
                              onClick={() => handleApplyFix(selectedFix.id)}
                              disabled={applyingFixId === selectedFix.id}
                              className="bg-[#1A1A1A] hover:bg-[#9A9A9A] hover:text-[#0A0A0A] text-white text-xs font-bold py-2 px-5 border border-[#333] transition-all cursor-pointer"
                            >
                              {applyingFixId === selectedFix.id ? "[ APPLYING... ]" : "[ APPROVE LOCAL PATCH ]"}
                            </button>
                          </div>
                        )}
                      </div>

                      {prResult && (
                        <div className="bg-[#050505] border border-[#A020F0] p-4 text-xs space-y-2">
                          <p className="text-emerald-500 uppercase tracking-widest">[ PULL REQUEST CREATED ]</p>
                          <p className="text-[#555]">Branch: {prResult.branch}</p>
                          <a 
                            href={prResult.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#00F0FF] hover:underline"
                          >
                            Review Pull Request on GitHub <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0A0A0F] border border-[#1A1A1A] border-dashed p-10 text-center h-full flex items-center justify-center">
                      <p className="text-xs text-[#555] uppercase tracking-wider">Select a fix from the list to display contents.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Competitor list detail */}
        {activeTab === "Competitors" && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-4">
              <Globe className="w-5 h-5 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Competitor Benchmark Matrix</span>
            </div>
            
            {totalScans === 0 ? (
              <div className="bg-[#050505] border border-dashed border-[#222] p-10 text-center">
                <p className="text-xs text-[#555] uppercase tracking-wider">
                  No competitor scoring benchmarks compiled yet. Execute a website scan to compare metrics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data?.competitors.map((comp, idx) => {
                  const isTarget = idx === 0;
                  return (
                    <div key={idx} className={`p-6 border ${isTarget ? 'bg-[#111] border-[#333]' : 'bg-[#0A0A0A] border-[#1A1A1A]'} space-y-4`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold tracking-widest text-[#666]">
                          {isTarget ? "SCAN TARGET SITE" : `RIVAL BRAND ${String.fromCharCode(65 + idx - 1)}`}
                        </span>
                        <span className="text-base font-bold bg-black border border-[#222] px-2.5 py-0.5 text-white">
                          {comp.score}%
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white truncate">{comp.name}</h4>
                        <p className="text-[10px] text-[#555] truncate mt-1">{comp.url}</p>
                      </div>
                      <div className="w-full bg-[#111] border border-[#222] h-3">
                        <div className={`h-full ${isTarget ? 'bg-white' : 'bg-slate-700'}`} style={{ width: `${comp.score}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Registry & GitHub Settings */}
        {activeTab === "Settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* System Info settings */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-8 space-y-6">
              <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-4">
                <Cpu className="w-5 h-5 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">System Config</span>
              </div>
              
              <div className="space-y-4 text-xs text-[#777]">
                <div className="p-4 bg-[#070707] border border-[#1A1A1A] space-y-1">
                  <span className="text-white font-bold block uppercase tracking-wider">Orchestration Control Plane</span>
                  <span>http://localhost:8000/api</span>
                </div>
                <div className="p-4 bg-[#070707] border border-[#1A1A1A] space-y-1">
                  <span className="text-white font-bold block uppercase tracking-wider">Google Vertex AI Model</span>
                  <span>gemini-2.5-flash</span>
                </div>
                <div className="p-4 bg-[#070707] border border-[#1A1A1A] space-y-1">
                  <span className="text-white font-bold block uppercase tracking-wider">A2A API Gate (Kong Routing)</span>
                  <span>Port 9100 active (JSONRPC Discoverable)</span>
                </div>
              </div>
            </div>

            {/* GitHub config form settings */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-8 space-y-6">
              <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-4">
                <GitBranch className="w-5 h-5 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">GitHub Repository Linking</span>
              </div>
              
              <form onSubmit={handleSaveGitHubConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#666] uppercase tracking-widest mb-1.5 font-bold">Repo Owner / Organization</label>
                  <input
                    type="text"
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    placeholder="e.g. Nasiko-Labs"
                    className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] p-2.5 text-xs outline-none text-[#9A9A9A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#666] uppercase tracking-widest mb-1.5 font-bold">Repo Name</label>
                  <input
                    type="text"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="e.g. nasiko"
                    className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] p-2.5 text-xs outline-none text-[#9A9A9A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#666] uppercase tracking-widest mb-1.5 font-bold">Target Branch</label>
                  <input
                    type="text"
                    value={ghBranch}
                    onChange={(e) => setGhBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] p-2.5 text-xs outline-none text-[#9A9A9A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#666] uppercase tracking-widest mb-1.5 flex justify-between font-bold">
                    <span>Personal Access Token (PAT)</span>
                    {data?.github_config.has_token && (
                      <span className="text-white">Active: {data.github_config.masked_token}</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder={data?.github_config.has_token ? "••••••••••••••••••••••••••••••••" : "Paste GitHub PAT token..."}
                    className="w-full bg-[#070707] border border-[#1A1A1A] focus:border-[#333] p-2.5 text-xs outline-none text-[#9A9A9A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingGhConfig}
                  className="w-full bg-[#1A1A1A] hover:bg-[#9A9A9A] hover:text-[#0A0A0A] text-white text-xs font-bold py-3 border border-[#333] transition-all cursor-pointer"
                >
                  {savingGhConfig ? "[ SAVING... ]" : "[ SAVE INTEGRATION CONFIG ]"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
