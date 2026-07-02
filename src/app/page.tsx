'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Cpu, Shield, Server, Cloud, ArrowRight, Star, Layers, Zap, Globe, ChevronDown, Menu, X, CheckCircle, Users, BarChart3, CreditCard, Headphones, Lock, Activity, Grid3X3, Mail, ExternalLink, Database, HardDrive, Wifi, Clock, DollarSign, TrendingUp, Code2, LifeBuoy, BookOpen, ChevronRight, PlusCircle, FileText, MessageSquare, Calendar, Bell } from 'lucide-react';

function useOnScreen(ref: React.RefObject<HTMLElement | null>, threshold = 0.3) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function AnimatedStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const step = Math.max(1, Math.floor(value / 60));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, duration / 60);
    return () => clearInterval(timer);
  }, [visible, value]);
  return (
    <div ref={ref} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center hover:bg-white/[0.04] hover:border-blue-500/20 transition duration-500 group" style={{ transform: `translateZ(${Math.random() > 0.5 ? 10 : -10}px)` }}>
      <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text mb-1">
        {visible ? count.toLocaleString() : '0'}{suffix}
      </p>
      <p className="text-xs text-zinc-500 font-mono">{label}</p>
    </div>
  );
}

function FaqItem({ q, a, open: defaultOpen }: { q: string; a: string; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden transition-all duration-300">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition cursor-pointer">
        <span className="text-sm font-semibold text-white pr-4">{q}</span>
        <ChevronRight className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(Math.min(window.scrollY / 600, 1));
    const onMouse = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('scroll', onScroll);
    window.addEventListener('mousemove', onMouse);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMouse); };
  }, []);

  const features = [
    { icon: Server, title: 'Infrastructure Control', desc: 'Real-time server monitoring, resource allocation, and automated provisioning across global nodes.' },
    { icon: Layers, title: 'Billing Engine', desc: 'Automated invoicing, multi-currency support, tax handling, and payment gateway integrations.' },
    { icon: Shield, title: 'Client Portal', desc: 'Customer management with service tracking, ticket support, and detailed analytics.' },
    { icon: Globe, title: 'Multi-Region DNS', desc: 'Domain registration, DNS management, SSL certificates, and global CDN orchestration.' },
    { icon: Zap, title: 'Automation Rules', desc: 'Smart triggers for provisioning, suspensions, renewals, and resource scaling.' },
    { icon: Cloud, title: 'Hybrid Cloud Bridge', desc: 'Seamless integration with Pterodactyl, Paymenter, and third-party APIs.' },
  ];

  const featureCategories = [
    {
      title: 'Operations & Billing',
      items: [
        { icon: DollarSign, label: 'Revenue Tracking', desc: 'Real-time MRR, invoice history, and payment reconciliation.' },
        { icon: FileText, label: 'Invoice Automation', desc: 'Auto-generate invoices, tax calculation, multi-currency support.' },
        { icon: CreditCard, label: 'Payment Gateways', desc: 'Stripe, PayPal, and custom gateway integration with webhook handling.' },
        { icon: TrendingUp, label: 'Financial Reports', desc: 'Profit & loss, expense tracking, and growth analytics.' },
      ]
    },
    {
      title: 'Infrastructure & Hosting',
      items: [
        { icon: HardDrive, label: 'Server Management', desc: 'Track CPU, RAM, storage allocation across all nodes in real time.' },
        { icon: Database, label: 'Provider Sync', desc: 'Automated sync with Hetzner, OVH, Contabo, and other providers.' },
        { icon: Activity, label: 'Resource Monitoring', desc: 'Live utilization graphs with alerts for over-provisioning.' },
        { icon: Wifi, label: 'Network Tools', desc: 'IP management, bandwidth tracking, and DDoS protection status.' },
      ]
    },
    {
      title: 'Customer & Support',
      items: [
        { icon: Users, label: 'Customer Portal', desc: 'Full customer profiles with service history, invoices, and notes.' },
        { icon: MessageSquare, label: 'Ticket System', desc: 'Kanban-style support board with priority management and SLA tracking.' },
        { icon: Bell, label: 'Notifications', desc: 'Automated alerts for renewals, suspensions, and system events.' },
        { icon: LifeBuoy, label: 'Automated Emails', desc: 'SMTP integration for invoice delivery, reminders, and service updates.' },
      ]
    }
  ];

  const integrations = [
    { name: 'Pterodactyl', desc: 'Game & VPS panel sync', icon: Server },
    { name: 'Paymenter', desc: 'Billing automation', icon: CreditCard },
    { name: 'Stripe', desc: 'Payment processing', icon: CreditCard },
    { name: 'Discord', desc: 'Notification webhooks', icon: MessageSquare },
    { name: 'SMTP', desc: 'Email delivery', icon: Mail },
    { name: 'REST API', desc: 'v1 public endpoints', icon: Code2 },
  ];

  const faqs = [
    { q: 'What is Zyphron Cloud Management System?', a: 'ZCMS is an internal operations platform for hosting providers. It replaces spreadsheets with a unified dashboard for managing customers, services, billing, servers, domains, support tickets, and business analytics.' },
    { q: 'Who is this platform for?', a: 'ZCMS is designed for hosting companies, datacenter operators, and managed service providers who need to track infrastructure, automate billing, and manage customer relationships from one place.' },
    { q: 'Can I integrate with my existing billing panel?', a: 'Yes. ZCMS supports integration with Paymenter for billing sync and Pterodactyl for game/VPS server management. Additional integrations are available via the REST API.' },
    { q: 'Is my data secure?', a: 'ZCMS runs on your own infrastructure. Authentication uses encrypted session cookies, API endpoints require keys, and all passwords are hashed. Role-based access control limits sensitive operations to authorized staff.' },
    { q: 'Can I migrate from spreadsheets?', a: 'Yes. ZCMS provides a complete data model for customers, services, invoices, expenses, domains, and assets. Use the Master Records view to audit joined data, and the backup tool to export your full database anytime.' },
    { q: 'What kind of support is available?', a: 'The platform includes a built-in ticket system, activity audit logs, and notification engine. For operational questions, use the Settings section to configure SMTP and staff accounts.' },
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Login failed'); return; }
      if (data.success) { window.location.href = '/dashboard'; }
    } catch { setAuthError('Connection error'); }
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Sign up failed'); return; }
      setAuthError('');
      setAuthModal('signin');
    } catch { setAuthError('Connection error'); }
    finally { setAuthLoading(false); }
  };

  const isSignIn = authModal === 'signin';

  return (
    <div className="min-h-screen bg-[#05030a] text-white overflow-x-hidden font-sans">
      {/* 3D Floating Orbs Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ perspective: '1200px' }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-purple-600/8 blur-[80px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.04) 0%, transparent 50%)'
        }} />
      </div>

      {/* Floating 3D Particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="fixed rounded-full pointer-events-none z-0"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(${[59, 130, 246, 6, 182, 212, 168, 85, 247][i % 3 * 3]},${[59, 130, 246, 6, 182, 212, 168, 85, 247][i % 3 * 3 + 1]},${[59, 130, 246, 6, 182, 212, 168, 85, 247][i % 3 * 3 + 2]},${0.15 + Math.random() * 0.25})`,
            boxShadow: `0 0 ${4 + Math.random() * 12}px rgba(59,130,246,${0.1 + Math.random() * 0.2})`,
            transform: `translateZ(${Math.random() * 200}px)`,
            animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}

      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled > 0.1 ? 'bg-[#05030a]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 transition-all duration-300" style={{ transform: 'translateZ(20px)' }}>
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              <span className="text-white">Zyphron</span>
              <span className="text-blue-400">Cloud</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#showcase" className="hover:text-white transition">Showcase</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <a href="/portal" className="hover:text-white transition">Portal</a>
            <button onClick={() => setAuthModal('signin')} className="text-zinc-300 hover:text-white font-medium transition cursor-pointer">Sign In</button>
            <button onClick={() => setAuthModal('signup')} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-600/20 cursor-pointer">
              Get Started <ArrowRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-zinc-400 hover:text-white cursor-pointer">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-[#05030a]/95 backdrop-blur-xl border-b border-white/5 px-4 py-4 space-y-3 text-sm">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">Features</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">Pricing</a>
            <a href="#showcase" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">Showcase</a>
            <a href="#faq" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">FAQ</a>
            <a href="#tech" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">Tech</a>
            <a href="/portal" onClick={() => setMobileMenu(false)} className="block text-zinc-400 hover:text-white transition">Client Portal</a>
            <button onClick={() => { setMobileMenu(false); setAuthModal('signin'); }} className="block w-full text-left text-zinc-300 hover:text-white transition cursor-pointer">Sign In</button>
            <button onClick={() => { setMobileMenu(false); setAuthModal('signup'); }} className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg text-center cursor-pointer">Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center pt-16" style={{ perspective: '1200px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div style={{ transform: `translateZ(${80 * (1 - mousePos.x * 0.5)}px) rotateY(${(mousePos.x - 0.5) * 4}deg) rotateX(${(mousePos.y - 0.5) * -4}deg)`, transition: 'transform 0.3s ease-out' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-6">
                <Star className="w-3 h-3" />
                Next-Gen Management Suite v2.0
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
                Command Your{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 text-transparent bg-clip-text">
                  Infrastructure
                </span>
                {' '}from One Console
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed max-w-lg mb-8">
                Zyphron Cloud Management System — unified control panel for billing, servers, domains, support, and business analytics. Replace spreadsheets with automation.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#pricing" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 flex items-center gap-2 group">
                  Browse Plans <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </a>
                <a href="/api/auth/demo" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-sm rounded-xl transition flex items-center gap-2">
                  Admin Demo <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a href="/portal" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-sm rounded-xl transition flex items-center gap-2">
                  Client Portal <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-xs text-zinc-500 font-mono">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 99.9% Uptime</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 20+ Integrations</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Real-time Sync</span>
              </div>
            </div>

            {/* 3D Hero Card */}
            <div className="hidden lg:block relative" style={{ transform: `translateZ(${120 * mousePos.x}px) rotateY(${(mousePos.x - 0.5) * -6}deg) rotateX(${(mousePos.y - 0.5) * 6}deg)`, transition: 'transform 0.3s ease-out' }}>
              <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-purple-600/10 border border-white/10 overflow-hidden shadow-2xl" style={{ transform: 'translateZ(40px)' }}>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05030a]/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-600/30">
                      <Cpu className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-white">ZCMS Console</p>
                    <div className="flex gap-2 justify-center">
                      {['CPU', 'RAM', 'NET'].map(label => (
                        <span key={label} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-zinc-400">{label}</span>
                      ))}
                    </div>
                    <div className="flex gap-3 justify-center mt-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '1s' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-6">
                      {[65, 42, 88].map((v, i) => (
                        <div key={i} className="space-y-1">
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${v}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-zinc-500">{v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#05030a] to-transparent" />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-transparent to-cyan-500/20 rounded-3xl blur-3xl -z-10 opacity-60" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        </div>
      </section>

      {/* Animated Stats Counters */}
      <section className="relative z-10 py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatedStat value={1200} label="Active Services" suffix="+" />
            <AnimatedStat value={40} label="Server Nodes" suffix="+" />
            <AnimatedStat value={800} label="Customers Managed" suffix="+" />
            <AnimatedStat value={99} label="Uptime Guarantee" suffix=".9%" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Scale</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">One unified platform to manage your entire hosting operation — from provisioning to billing to support.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ transformStyle: 'preserve-3d' }}>
            {features.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-500"
                style={{
                  transform: `translateZ(${(i % 3) * 8}px)`,
                  transition: 'transform 0.3s ease-out, background 0.3s, border-color 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateZ(30px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = `translateZ(${(i % 3) * 8}px)`; }}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Feature Categories */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Deep Dive Into{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Capabilities</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">Every tool you need to run a hosting business, organized by function.</p>
          </div>

          {featureCategories.map((cat, ci) => (
            <div key={ci} className="mb-16 last:mb-0">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full" />
                {cat.title}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-300">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1.5">{item.label}</h4>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview Mockups */}
      <section id="showcase" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Dashboard{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Previews</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">Real interfaces from inside the ZCMS console.</p>
          </div>

          {/* Preview 1 - Overview Stats */}
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-6 group hover:border-blue-500/30 transition-all duration-500">
            <div className="bg-[#0a0720] p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-zinc-600 font-mono ml-2">overview.tsx — Dashboard Overview</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue', value: '$84,250', change: '+12.5%', up: true },
                  { label: 'Active Customers', value: '1,847', change: '+8.2%', up: true },
                  { label: 'Pending Invoices', value: '23', change: '-3.1%', up: false },
                  { label: 'Open Tickets', value: '12', change: '-2', up: true },
                ].map((s, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className={`text-[10px] font-mono mt-1 ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.change}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-20 bg-white/[0.02] border border-white/5 rounded-xl flex items-end gap-1 px-3 py-2">
                {[40, 55, 45, 70, 60, 80, 65, 75, 90, 85, 72, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/40 to-cyan-500/30 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview 2 - Customers Table */}
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-6 group hover:border-blue-500/30 transition-all duration-500">
            <div className="bg-[#0a0720] p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-zinc-600 font-mono ml-2">customers.tsx — Customer Records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Spending</th>
                      <th className="pb-2">Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Acme Corp', 'contact@acme.com', 'Active', '$12,400', '3'],
                      ['NovaHost LLC', 'billing@novahost.io', 'Active', '$8,920', '2'],
                      ['PixelByte Inc', 'ops@pixelbyte.com', 'Suspended', '$3,150', '1'],
                      ['CloudForge Ltd', 'admin@cloudforge.dev', 'Active', '$21,700', '5'],
                      ['DataWave GmbH', 'info@datawave.de', 'Active', '$6,830', '2'],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-4 text-white font-medium">{row[0]}</td>
                        <td className="py-2.5 pr-4 text-zinc-400">{row[1]}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${row[2] === 'Active' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/30 text-red-400 border border-red-500/20'}`}>{row[2]}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-300 font-mono">{row[3]}</td>
                        <td className="py-2.5 text-zinc-400 font-mono">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Preview 3 - Sidebar Navigation */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-white/10 overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
              <div className="bg-[#0a0720] p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono ml-2">navigation — Sidebar Menu</span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Customers', 'Services', 'Invoices', 'Renewals', 'Servers', 'Tickets', 'Settings'].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${i === 0 ? 'bg-blue-600/10 text-blue-300 border border-blue-500/20' : 'text-zinc-400 hover:bg-white/[0.03]'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview 4 - Kanban Board */}
            <div className="rounded-2xl border border-white/10 overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
              <div className="bg-[#0a0720] p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono ml-2">tickets.tsx — Kanban Board</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { title: 'Open', count: 4, color: 'bg-yellow-500/20 border-yellow-500/20' },
                    { title: 'In Progress', count: 3, color: 'bg-blue-500/20 border-blue-500/20' },
                    { title: 'Resolved', count: 8, color: 'bg-emerald-500/20 border-emerald-500/20' },
                  ].map((col, i) => (
                    <div key={i} className="bg-white/[0.02] rounded-lg p-2 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-zinc-400">{col.title}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${col.color}`}>{col.count}</span>
                      </div>
                      {col.count > 0 && (
                        <div className="space-y-1.5">
                          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                            <p className="text-[10px] text-zinc-300 truncate">Server migration req.</p>
                            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">#TKT-{100 + i}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                            <p className="text-[10px] text-zinc-300 truncate">Billing discrepancy</p>
                            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">#TKT-{200 + i}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <a href="/api/auth/demo" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-base rounded-xl transition shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 group scale-100 hover:scale-105 transition-all duration-300">
              Launch Live Demo <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition" />
            </a>
            <p className="text-[10px] text-zinc-600 mt-3 font-mono">No account needed — instant access with demo credentials</p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Connect Your{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Stack</span>
          </h2>
          <p className="text-sm text-zinc-500 mb-10 max-w-xl mx-auto">Built-in integrations with the tools you already use. Extend via REST API.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((int, i) => (
              <div key={i} className="px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] hover:border-blue-500/20 transition cursor-default">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <int.icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">{int.name}</p>
                  <p className="text-[9px] text-zinc-500 font-mono">{int.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Pricing</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">Choose the plan that fits your needs. All plans include 24/7 support and a 30-day satisfaction guarantee.</p>
          </div>

          <PricingCards onSelectPlan={() => setAuthModal('signup')} />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Frequently Asked{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Questions</span>
            </h2>
            <p className="text-sm text-zinc-500">Everything you need to know about ZCMS.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} open={i === 0} />)}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Built on Modern{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Stack</span>
          </h2>
          <p className="text-sm text-zinc-500 mb-10">Powered by industry-leading technologies for reliability and performance.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Docker', 'Redis'].map(tech => (
              <div key={tech} className="px-5 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-mono text-zinc-400 hover:bg-white/[0.06] hover:text-blue-400 hover:border-blue-500/20 transition cursor-default">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-blue-600/5 via-cyan-500/5 to-purple-600/5 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] -z-10" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Take Control?</h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-lg mx-auto">Launch the ZCMS console to manage customers, billing, infrastructure, and support from a single dashboard.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/portal" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 group">
                  Client Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </a>
                <a href="/dashboard" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-sm rounded-xl transition">
                  Admin Dashboard <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pt-12 pb-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-left">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold">
                  <span className="text-white">Zyphron</span>
                  <span className="text-blue-400">Cloud</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 leading-relaxed">Internal operations console for hosting infrastructure management, billing automation, and customer support.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</h4>
              <div className="space-y-2 text-[11px]">
                <a href="#features" className="block text-zinc-500 hover:text-white transition">Features</a>
                <a href="#pricing" className="block text-zinc-500 hover:text-white transition">Pricing</a>
                <a href="#showcase" className="block text-zinc-500 hover:text-white transition">Showcase</a>
                <a href="#tech" className="block text-zinc-500 hover:text-white transition">Tech Stack</a>
                <a href="/portal" className="block text-zinc-500 hover:text-white transition">Client Portal</a>
                <a href="/dashboard" className="block text-zinc-500 hover:text-white transition">Admin Dashboard</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Resources</h4>
              <div className="space-y-2 text-[11px]">
                <a href="#faq" className="block text-zinc-500 hover:text-white transition">FAQ</a>
                <a href="/dashboard" className="block text-zinc-500 hover:text-white transition">API Console</a>
                <a href="/dashboard" className="block text-zinc-500 hover:text-white transition">Activity Logs</a>
                <a href="/dashboard" className="block text-zinc-500 hover:text-white transition">Settings</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Connect</h4>
              <div className="space-y-2 text-[11px]">
                <a href="#" className="flex items-center gap-2 text-zinc-500 hover:text-white transition">
                  <Code2 className="w-3.5 h-3.5" /> GitHub
                </a>
                <a href="#" className="flex items-center gap-2 text-zinc-500 hover:text-white transition">
                  <Mail className="w-3.5 h-3.5" /> Contact
                </a>
                <a href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-white transition">
                  <Headphones className="w-3.5 h-3.5" /> Support
                </a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-zinc-600 font-mono">
              &copy; {new Date().getFullYear()} Zyphron Cloud Management System &mdash; Internal Operations Console v2.0
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03000a]/80 backdrop-blur-sm p-4" onClick={() => setAuthModal(null)}>
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isSignIn ? 'Sign In' : 'Create Account'}
              </h3>
              <button onClick={() => setAuthModal(null)} className="text-muted-foreground/70 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <a href="/api/auth/google"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </a>
                <a href="/api/auth/discord"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Discord
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] rounded-lg mb-2">
                <a href="/portal" className="py-2 text-center text-[10px] font-bold text-blue-400 bg-blue-950/20 border border-blue-800/30 rounded-md hover:bg-blue-950/40 transition">
                  Client Portal
                </a>
                <button type="button" onClick={() => { setAuthEmail('admin'); setAuthPassword('admin123'); }} className="py-2 text-center text-[10px] font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition cursor-pointer">
                  Staff Login
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <div className="flex-1 h-px bg-border/50" />
                <span>or Staff Sign In</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <div className="p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-lg">
                <p className="text-[10px] text-blue-300 font-semibold text-center">
                  🔐 Demo mode — <a href="/api/auth/demo" className="underline hover:text-blue-200">sign in instantly</a> or use <span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
                </p>
              </div>

              {authError && (
                <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded-lg text-[10px] text-red-300 font-mono text-center">{authError}</div>
              )}

              {isSignIn && (
                <button type="button" onClick={() => { setAuthEmail('admin'); setAuthPassword('admin123'); }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition cursor-pointer">
                  ↩ Auto-fill demo credentials
                </button>
              )}

              <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-3">
                {!isSignIn && (
                  <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Full name" required
                    className="w-full px-3 py-2.5 bg-[#110e20] border border-border rounded-lg text-xs text-white placeholder-zinc-600 focus:border-blue-500/50 transition" />
                )}
                  <input type="text" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder={isSignIn ? 'Username (admin)' : 'Email address'} required
                  className="w-full px-3 py-2.5 bg-[#110e20] border border-border rounded-lg text-xs text-white placeholder-zinc-600 focus:border-blue-500/50 transition" />
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={isSignIn ? 'Password (admin123)' : 'Password'} required minLength={6}
                  className="w-full px-3 py-2.5 bg-[#110e20] border border-border rounded-lg text-xs text-white placeholder-zinc-600 focus:border-blue-500/50 transition" />
                <button type="submit" disabled={authLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-lg disabled:opacity-50 cursor-pointer">
                  {authLoading ? 'Please wait...' : isSignIn ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="text-[10px] text-center text-muted-foreground/70">
                {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={() => { setAuthModal(isSignIn ? 'signup' : 'signin'); setAuthError(''); }} className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer">{isSignIn ? 'Sign up' : 'Sign in'}</button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.4; }
          25% { transform: translateY(-20px) translateX(10px) scale(1.2); opacity: 0.8; }
          50% { transform: translateY(-10px) translateX(-10px) scale(0.9); opacity: 0.5; }
          75% { transform: translateY(-30px) translateX(5px) scale(1.1); opacity: 0.7; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

function PricingCards({ onSelectPlan }: { onSelectPlan: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(data => { setPlans(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[1, 2, 3].map(i => <div key={i} className="h-80 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (plans.length === 0) return (
    <div className="text-center py-12">
      <p className="text-zinc-500 text-xs font-mono">Coming soon — pricing plans are being configured.</p>
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {plans.slice(0, 3).map((plan, i) => (
        <div key={plan.id} className={`relative rounded-2xl p-6 border text-center transition hover:scale-[1.02] ${plan.popular ? 'border-blue-500 bg-blue-950/20 shadow-xl shadow-blue-600/10' : 'border-white/10 bg-white/[0.02]'}`}>
          {plan.popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-bold rounded-full uppercase tracking-wider shadow-lg">
              Most Popular
            </span>
          )}
          <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${plan.popular ? 'from-blue-600 to-cyan-500' : 'from-blue-600/20 to-cyan-500/20'} flex items-center justify-center mb-4`}>
            <Server className={`w-6 h-6 ${plan.popular ? 'text-white' : 'text-blue-400'}`} />
          </div>
          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">{plan.description}</p>
          <p className="text-3xl font-bold text-white">${plan.monthlyPrice}<span className="text-xs text-zinc-500 font-mono">/mo</span></p>
          {plan.yearlyPrice > 0 && <p className="text-[10px] text-zinc-600 mt-1">${plan.yearlyPrice}/year — save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%</p>}
          {plan.setupFee > 0 && <p className="text-[10px] text-zinc-600">+ ${plan.setupFee} setup</p>}

          <ul className="mt-6 space-y-3 text-left">
            {plan.features.slice(0, 6).map((f: string, fi: number) => (
              <li key={fi} className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          <button onClick={onSelectPlan}
            className={`w-full mt-6 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white'}`}>
            Get Started
          </button>
        </div>
      ))}
    </div>
  );
}
