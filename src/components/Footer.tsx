import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#000000] py-8 mt-auto relative z-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 opacity-50">
          <span className="text-white text-xs font-semibold tracking-widest uppercase">PumpDraft</span>
          <span className="text-[#B3B3B3] text-xs">© 2026</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-xs text-[#B3B3B3] hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-xs text-[#B3B3B3] hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/disclaimer" className="text-xs text-[#B3B3B3] hover:text-white transition-colors">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
