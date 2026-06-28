"use client";

import React, { useEffect, useState } from "react";
import {
  Trophy,
  MapPin,
  Calendar,
  Flag,
  Bike,
  Timer,
  TrendingUp,
  Award,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

// --- Mock Data ---

const mockStanding = {
  position: 12,
  ofTotal: 87,
  category: "Cat 4 Men",
  points: 245,
  totalRaces: 5,
  bestFinish: 8,
  trend: [
    { week: 1, points: 40 },
    { week: 2, points: 80 },
    { week: 3, points: 130 },
    { week: 4, points: 160 },
    { week: 5, points: 200 },
    { week: 6, points: 220 },
    { week: 7, points: 245 },
  ],
};

const mockNextRace = {
  name: "CRIT #3",
  date: "SAT, MAY 24, 2025 · 5:00 PM",
  location: "SOUTHMORELAND PARK",
  city: "Kansas City, MO",
  countdown: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
};

const mockRecentResults = [
  { id: "1", date: "MAY 10", icon: "crit", raceName: "Crit #2", position: "15TH" },
  { id: "2", date: "APR 26", icon: "time_trial", raceName: "TT #1", position: "11TH" },
  { id: "3", date: "APR 12", icon: "crit", raceName: "Crit #1", position: "9TH" },
  { id: "4", date: "MAR 29", icon: "road_race", raceName: "Road Race #1", position: "13TH" },
];

const mockAchievements = [
  { id: "1", name: "First Race", label: "Completed", icon: "🏁", earned: true },
  { id: "2", name: "Team Player", label: "5 Races", icon: "🤝", earned: true },
  { id: "3", name: "Rising", label: "Moved Up", icon: "📈", earned: true },
  { id: "4", name: "Top Ten", label: "3/10", icon: "🔟", earned: true },
  { id: "5", name: "Next Up", label: "5 Races In Top 10", icon: "⭐", earned: false },
];

const mockUpcomingEvents = [
  { id: "1", month: "MAY", day: "24", name: "CRIT #3", location: "Southmoreland Park", color: "bg-[#B87333]" },
  { id: "2", month: "JUN", day: "7", name: "TT #2", location: "Longview Lake", color: "bg-[#4A90D9]" },
  { id: "3", month: "JUN", day: "21", name: "CRIT #4", location: "Southmoreland Park", color: "bg-[#B87333]" },
  { id: "4", month: "JUL", day: "12", name: "ROAD RACE #2", location: "Platte County", color: "bg-[#6BCB77]" },
  { id: "5", month: "JUL", day: "26", name: "CRIT #5", location: "Southmoreland Park", color: "bg-[#B87333]" },
];

// --- Helpers ---

function getRaceTypeIcon(raceType: string) {
  switch (raceType) {
    case "crit":
      return <Zap className="h-3.5 w-3.5 text-[#B87333]" />;
    case "time_trial":
      return <Timer className="h-3.5 w-3.5 text-[#5B9BD5]" />;
    case "road_race":
      return <Flag className="h-3.5 w-3.5 text-[#6BCB77]" />;
    case "gravel":
      return <Target className="h-3.5 w-3.5 text-[#D4915A]" />;
    default:
      return <Bike className="h-3.5 w-3.5 text-[#9CA3AF]" />;
  }
}

// --- Main Component ---

export function RacerDashboard() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateCountdown() {
      const now = new Date().getTime();
      const target = mockNextRace.countdown.getTime();
      const diff = Math.max(0, target - now);
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <div className="relative h-96 overflow-hidden rounded-xl">
        <img
          src="/images/dashboard-banner.png"
          alt="Cyclists racing"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111214]/95 via-[#111214]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#111214] via-transparent to-transparent w-full" />
        <div className="relative flex h-full items-center px-8">
          <div>
            <h1 className="font-extrabold italic leading-[0.95]">
              <span className="block text-5xl text-white">RACE TOGETHER.</span>
              <span className="block text-5xl text-[#B87333]">GET FASTER.</span>
            </h1>
            <p className="mt-3 text-sm text-[#C5CBD3]">
              The all-in-one platform for racers, teams,<br />mentors and promoters.
            </p>
            <div className="mt-6 flex gap-4">
              <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#D4915A] via-[#B87333] to-[#7A4A1E] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.2)]">
                VIEW NEXT RACE <ChevronRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-[#C5CBD3]/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/5">
                MY SCHEDULE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main widgets row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* League Standing */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">League Standing</h3>
            <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
              VIEW FULL STANDINGS &gt;
            </a>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">{mockStanding.position}</span>
            <span className="text-lg font-bold text-[#6B7280]">TH</span>
          </div>
          <p className="text-xs text-[#6B7280]">OF {mockStanding.ofTotal}</p>
          <p className="text-xs text-[#9CA3AF]">{mockStanding.category}</p>
          
          {/* Sparkline */}
          <div className="my-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockStanding.trend}>
                <Line type="monotone" dataKey="points" stroke="#B87333" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#2E3038] pt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{mockStanding.points}</p>
              <p className="text-[10px] uppercase text-[#6B7280]">Points</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{mockStanding.totalRaces}</p>
              <p className="text-[10px] uppercase text-[#6B7280]">Races</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{mockStanding.bestFinish}<span className="text-sm text-[#6B7280]">TH</span></p>
              <p className="text-[10px] uppercase text-[#6B7280]">Best Finish</p>
            </div>
          </div>
        </div>

        {/* Next Race */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Next Race</h3>
          <div className="flex gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#2E3038]">
              <img src="/images/hero-cyclists.png" alt="Race" className="h-full w-full object-cover opacity-60" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{mockNextRace.name}</p>
              <p className="text-xs text-[#9CA3AF]">{mockNextRace.date}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#9CA3AF]">
                <MapPin className="h-3 w-3" /> {mockNextRace.location}
              </p>
              <p className="text-[10px] text-[#6B7280]">{mockNextRace.city}</p>
            </div>
          </div>
          {/* Countdown */}
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              { value: String(countdown.days).padStart(2, "0"), label: "DAYS" },
              { value: String(countdown.hours).padStart(2, "0"), label: "HRS" },
              { value: String(countdown.minutes).padStart(2, "0"), label: "MIN" },
              { value: String(countdown.seconds).padStart(2, "0"), label: "SEC" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-[#2E3038] bg-[#111214] py-2">
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-[9px] text-[#6B7280]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Results</h3>
            <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
              VIEW ALL &gt;
            </a>
          </div>
          <div className="space-y-3">
            {mockRecentResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#6B7280] w-12">{result.date}</span>
                  {getRaceTypeIcon(result.icon)}
                  <span className="text-sm text-[#C5CBD3]">{result.raceName}</span>
                </div>
                <span className="text-sm font-bold text-white">{result.position}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row — Achievements, Training, Academy */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Achievements */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Achievements</h3>
            <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
              VIEW ALL &gt;
            </a>
          </div>
          <div className="flex justify-between">
            {mockAchievements.map((a) => (
              <div key={a.id} className="flex flex-col items-center gap-1.5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${a.earned ? "bg-[#B87333]/15 border border-[#B87333]/30" : "bg-[#2E3038] border border-[#2E3038]"}`}>
                  {a.icon}
                </div>
                <span className="text-[9px] font-medium text-[#C5CBD3] text-center leading-tight w-14 truncate">
                  {a.name}
                </span>
                <span className="text-[8px] text-[#6B7280]">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Training & Progress */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Training & Progress</h3>
            <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
              VIEW DETAILS &gt;
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase text-[#6B7280] mb-1">This Week</p>
              <p className="text-3xl font-bold text-white">8.4 <span className="text-sm text-[#6B7280]">HRS</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#6B7280] mb-1">Fitness</p>
              <p className="text-3xl font-bold text-white">84 <span className="text-sm text-[#6B7280]">CTL</span></p>
              <p className="text-[10px] text-[#6BCB77]">+6</p>
            </div>
          </div>
          {/* Mini bar chart placeholder */}
          <div className="mt-3 flex items-end gap-1 h-10">
            {[40, 65, 55, 80, 70, 45, 30].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-[#B87333]/40" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[8px] text-[#6B7280]">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </div>

        {/* Academy Progress */}
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Academy Progress</h3>
            <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
              VIEW ACADEMY &gt;
            </a>
          </div>
          <div className="flex items-center gap-4">
            {/* Circular progress */}
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2E3038"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#B87333"
                  strokeWidth="3"
                  strokeDasharray="60, 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">60<span className="text-xs text-[#6B7280]">%</span></span>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-white">LEVEL 2</p>
              <p className="text-xs text-[#9CA3AF]">Cornering &<br />Race Skills</p>
              <p className="mt-1 text-[10px] text-[#6B7280]">3 of 5 Modules Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Upcoming Events</h3>
          <a href="#" className="text-[10px] font-semibold uppercase tracking-wider text-[#B87333]">
            VIEW CALENDAR &gt;
          </a>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mockUpcomingEvents.map((event) => (
            <div key={event.id} className="flex shrink-0 items-center gap-3 rounded-lg border border-[#2E3038] bg-[#111214] px-4 py-3">
              <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-md ${event.color} text-white`}>
                <span className="text-[8px] font-bold leading-none">{event.month}</span>
                <span className="text-lg font-bold leading-tight">{event.day}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{event.name}</p>
                <p className="text-[10px] text-[#6B7280]">{event.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
