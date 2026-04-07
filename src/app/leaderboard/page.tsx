"use client";

import AppNav from "@/components/AppNav";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="dash-root">
      <AppNav />
      <main className="dash-main">
        <div className="dash-page-header">
          <h1 className="dash-page-title">Global Leaderboard</h1>
          <p className="dash-page-sub">Top predictors ranked by points, win rate &amp; streak</p>
        </div>
        <Leaderboard />
      </main>
    </div>
  );
}
