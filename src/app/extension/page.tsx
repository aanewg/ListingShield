import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chrome Extension — ListingShield",
  description:
    "Install the free ListingShield Chrome extension to analyze Facebook Marketplace listings for scams, fake sellers, and price manipulation.",
};

const STEPS = [
  {
    n: "01",
    title: "Install the extension",
    body: "Download the extension and load it into Chrome. Takes about two minutes — no account needed.",
    detail: true,
  },
  {
    n: "02",
    title: "Log in to Facebook",
    body: "Open facebook.com and sign in to your account. Facebook hides listing details from logged-out visitors.",
  },
  {
    n: "03",
    title: "Open a Marketplace listing",
    body: "Browse to any item on Facebook Marketplace. Navigate to the individual listing page — not the feed.",
  },
  {
    n: "04",
    title: "Click the ListingShield icon",
    body: "Find the ListingShield icon in your Chrome toolbar (top-right). Click it to open the extension popup.",
  },
  {
    n: "05",
    title: "Click \"Extract & Analyze Listing\"",
    body: "Hit the button in the popup. The extension reads the listing data — price, title, seller info — and sends it to ListingShield automatically.",
  },
  {
    n: "06",
    title: "Review your results",
    body: "You'll be taken to the full analysis: trust score, risk flags, seller profile, price comparison, and an AI verdict.",
  },
];

const FAQS = [
  {
    q: "Why can't you just read Facebook like eBay or Mercari?",
    a: "Facebook Marketplace requires you to be logged in to see prices and seller details. Our server can't log in on your behalf — the extension runs in your browser where you're already signed in, so it can read what you see.",
  },
  {
    q: "The extension says I need to log in.",
    a: "Make sure you're signed into facebook.com in the same Chrome browser before clicking the extension. The extension checks your login status before extracting data.",
  },
  {
    q: "I see \"Extraction failed\" or got an error.",
    a: "Refresh the listing page and try again — Facebook sometimes loads slowly. If it still fails, use the screenshot option: take a screenshot of the listing and upload it on the Analyze page. Claude reads the data directly from the image.",
  },
  {
    q: "I don't see a price in the results.",
    a: "Facebook hides prices from logged-out users. If you're logged in and the price still isn't showing, the listing may have been removed. Try the screenshot option as a fallback.",
  },
  {
    q: "Does this work on mobile?",
    a: "Chrome extensions are desktop-only. On mobile, take a screenshot of the listing and upload it on the Analyze page — Claude will extract the price, title, and seller info from the image.",
  },
  {
    q: "Is it safe? What does the extension actually do?",
    a: "The extension only reads data from Facebook Marketplace listing pages — it never posts, likes, messages, or modifies anything. No data is sent to our servers until you explicitly click Analyze. We don't store your Facebook session or credentials.",
  },
];

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mono mb-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Home
      </Link>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="mb-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 mono mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
          Chrome Extension · Beta
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
          Analyze Facebook Marketplace<br className="hidden sm:block" /> listings in seconds.
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Facebook hides prices and seller data unless you&apos;re logged in.
          Our free extension reads it all for you — right from the listing page — and sends it straight to ListingShield.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          {/* Primary CTA — manual install for now */}
          <a
            href="#install"
            className="rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Install Extension (Free)
          </a>
          <a
            href="#how-it-works"
            className="rounded-xl border border-[#1e2a3f] bg-[#0d1117] px-6 py-3.5 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            See how it works ↓
          </a>
        </div>

        <p className="text-xs text-slate-600">
          Already installed?{" "}
          <a
            href="https://www.facebook.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Open Facebook Marketplace →
          </a>
        </p>
      </div>

      {/* ── Platform comparison ───────────────────────────────────────────── */}
      <div className="mb-14">
        <p className="text-center text-xs text-slate-500 mono uppercase tracking-widest mb-5">
          How analysis works by platform
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Standard platforms */}
          <div className="card border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
              <p className="text-sm font-semibold text-white">eBay, Mercari, Poshmark, Depop</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste the listing URL on the home page. We read the data automatically — no login, no extension needed.
            </p>
            <p className="mt-3 text-xs text-green-400 font-semibold mono">Paste URL → Done</p>
          </div>

          {/* Facebook */}
          <div className="card border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Facebook Marketplace</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Prices and seller info are hidden without login. The Chrome extension reads listing data while you&apos;re already signed in.
            </p>
            <p className="mt-3 text-xs text-blue-400 font-semibold mono">Extension required (free)</p>
          </div>

          {/* Screenshot */}
          <div className="card border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Any listing · Screenshot</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Take a screenshot of any listing — Facebook, local ads, anything. Upload it and Claude reads the data directly from the image.
            </p>
            <p className="mt-3 text-xs text-purple-400 font-semibold mono">Works everywhere</p>
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div id="how-it-works" className="mb-14 scroll-mt-20">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">How it works</h2>
        <p className="text-slate-500 text-sm text-center mb-8">Six steps from install to results.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STEPS.map((step) => (
            <div key={step.n} className="card flex gap-4">
              <div className="shrink-0 h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mono text-blue-400 text-sm font-bold">
                {step.n}
              </div>
              <div>
                <p className="font-semibold text-white text-sm mb-1">{step.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Manual install instructions ───────────────────────────────────── */}
      <div id="install" className="mb-14 scroll-mt-20">
        <div className="card border-blue-500/20">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Install the extension</h2>
              <p className="text-xs text-slate-500">
                We&apos;re working on submitting to the Chrome Web Store. Until then, install manually — it takes about two minutes.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] text-yellow-400 mono font-semibold uppercase tracking-wider">
              Manual
            </span>
          </div>

          {/* Chrome Web Store placeholder */}
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-600 shrink-0" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="text-xs text-slate-600">Chrome Web Store — coming soon</span>
          </div>

          {/* Manual steps */}
          <ol className="space-y-4">
            {[
              {
                label: "Download the extension",
                body: (
                  <span>
                    Download the extension ZIP file from the link below and unzip it to a folder on your computer.
                    <br />
                    <a
                      href="#"
                      className="inline-flex items-center gap-1.5 mt-2 text-blue-400 hover:text-blue-300 transition-colors text-xs font-semibold"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download listingshield-extension.zip
                    </a>
                  </span>
                ),
              },
              {
                label: "Open Chrome extensions",
                body: (
                  <span>
                    In Chrome, navigate to{" "}
                    <code className="mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[11px]">chrome://extensions</code>
                    {" "}in your address bar and press Enter.
                  </span>
                ),
              },
              {
                label: "Enable Developer Mode",
                body: "In the top-right corner of the Extensions page, toggle on Developer Mode.",
              },
              {
                label: "Load unpacked",
                body: "Click the \"Load unpacked\" button that appears. Select the unzipped extension folder.",
              },
              {
                label: "Pin it to your toolbar",
                body: "Click the puzzle-piece icon in Chrome's toolbar, find ListingShield, and click the pin icon so it's always visible.",
              },
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="shrink-0 h-6 w-6 rounded-full bg-[#1a2235] border border-[#1e2a3f] flex items-center justify-center text-[11px] text-slate-400 mono font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{step.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-3 text-xs text-slate-500">
            <span className="text-slate-400 font-semibold">Note:</span> Developer Mode is only needed for manually installed extensions. Once we&apos;re on the Chrome Web Store, installation will be one click.
          </div>
        </div>
      </div>

      {/* ── Screenshot alternative ────────────────────────────────────────── */}
      <div className="mb-14">
        <div className="card border-purple-500/20 bg-purple-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={1.5} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1">Don&apos;t want to install anything?</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Take a screenshot of any Facebook Marketplace listing and upload it on the Analyze page.
              Claude reads the price, title, and seller info directly from the image — no extension required.
            </p>
          </div>
          <Link
            href="/analyze"
            className="shrink-0 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-colors whitespace-nowrap"
          >
            Analyze with Screenshot →
          </Link>
        </div>
      </div>

      {/* ── Privacy & permissions ─────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white mb-2">Privacy & permissions</h2>
        <p className="text-slate-500 text-sm mb-5">What the extension can and can&apos;t do.</p>

        <div className="card">
          <div className="flex flex-wrap gap-2 mb-5">
            {["Read-only", "Facebook Marketplace only", "No account required", "Nothing stored locally"].map((badge) => (
              <span key={badge} className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-400 font-semibold">
                {badge}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-500">
            {[
              { can: true,  text: "Read listing title, price, description, and images" },
              { can: true,  text: "Read seller username, rating, account age, and location" },
              { can: false, text: "Post, comment, like, or share anything" },
              { can: false, text: "Access your Facebook messages or friends" },
              { can: false, text: "Store your Facebook credentials or session token" },
              { can: false, text: "Send data anywhere without your explicit action" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 font-bold ${item.can ? "text-green-400" : "text-red-400"}`}>
                  {item.can ? "✓" : "✗"}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-600 border-t border-[#1e2a3f] pt-4">
            Data is only sent to ListingShield when you click &quot;Extract &amp; Analyze Listing.&quot; Nothing is transmitted during passive browsing.
          </p>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white mb-2">Common questions</h2>
        <p className="text-slate-500 text-sm mb-5">Troubleshooting and things people ask.</p>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details key={i} className="card group cursor-pointer">
              <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-white list-none cursor-pointer select-none">
                {faq.q}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed border-t border-[#1e2a3f] pt-3">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#1e2a3f] bg-[#0d1117] p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Ready to check a listing?</h2>
        <p className="text-slate-500 text-sm mb-6">
          Installed the extension? Head to Facebook Marketplace and start checking listings for scams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://www.facebook.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Open Facebook Marketplace →
          </a>
          <Link
            href="/"
            className="rounded-xl border border-[#1e2a3f] bg-[#111827] px-6 py-3 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            Analyze a different platform
          </Link>
        </div>
      </div>

    </div>
  );
}
