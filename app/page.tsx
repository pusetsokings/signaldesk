import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Cpu,
  Gauge,
  Globe2,
  Inbox,
  KeyRound,
  Megaphone,
  MessageSquareText,
  PlugZap,
  Radar,
  Settings,
  Sparkles,
  Target,
  Users,
  WandSparkles
} from "lucide-react";
import { LiveSignalTester } from "./components/live-signal-tester";
import { ManualSignalEntry } from "./components/manual-signal-entry";

// Render per-request so the Engine Connections status reflects the live
// environment variables instead of a stale build-time snapshot.
export const dynamic = "force-dynamic";

const navItems = [
  { label: "Products", icon: BriefcaseBusiness, href: "#products", active: true },
  { label: "Signals", icon: Radar, href: "#signals" },
  { label: "Opportunities", icon: Inbox, href: "#opportunities" },
  { label: "Responses", icon: MessageSquareText, href: "#responses" },
  { label: "Leads", icon: Users, href: "#leads" },
  { label: "Campaigns", icon: Megaphone, href: "#campaigns" },
  { label: "Analytics", icon: BarChart3, href: "#analytics" },
  { label: "Settings", icon: Settings, href: "#settings" }
];

const metrics = [
  { label: "Signals harvested", value: "42", hint: "Last agent run" },
  { label: "Qualified opportunities", value: "18", hint: "Intent score 70+" },
  { label: "CRM-ready leads", value: "7", hint: "Ready for Brandlytics" },
  { label: "Global mode", value: "On", hint: "Location filters optional" }
];

const offerProfiles = [
  {
    name: "Prayer App",
    type: "Digital product",
    mode: "Global",
    signals: "prayer help, consistency, spiritual discouragement"
  },
  {
    name: "Construction Client",
    type: "Service business",
    mode: "Location toggled",
    signals: "contractor, renovation, quote request, recommendations"
  }
];

const opportunities = [
  {
    platform: "Reddit",
    source: "r/PrayerRequests",
    score: 91,
    text: "I don't know how to pray anymore and I need a way to become consistent again.",
    offer: "Prayer App",
    intent: "Pain + need",
    location: "Global"
  },
  {
    platform: "YouTube",
    source: "Comment on fasting video",
    score: 86,
    text: "Does anyone have a simple fasting plan for beginners? I always start and fail.",
    offer: "Fasting PDF",
    intent: "Education + buying",
    location: "Global"
  },
  {
    platform: "LinkedIn",
    source: "Construction discussion",
    score: 94,
    text: "Looking for a reliable contractor in Gaborone for a small commercial renovation.",
    offer: "Construction Client",
    intent: "Buying",
    location: "Gaborone, Botswana"
  }
];

const drafts = [
  {
    title: "Value-first Reddit reply",
    text: "A simple restart is one honest sentence, one gratitude, and one specific request. Small prayers still count. If you want, I can share a simple rhythm that helps people stay consistent."
  },
  {
    title: "Construction lead response",
    text: "For a commercial renovation, ask for a scope visit, written quote, timeline, and references from similar jobs. I can connect you with a team that handles this in Gaborone."
  }
];

const engineMap = [
  { label: "Products / Services", value: "12 configured offers", width: "82%" },
  { label: "Signal Rules", value: "148 intent phrases", width: "74%" },
  { label: "Agent Runs", value: "Daily + on demand", width: "64%" },
  { label: "Brandlytics CRM", value: "Push threshold 80+", width: "88%" }
];

const signalRules = [
  "Need and recommendation requests",
  "Pain phrases and complaints",
  "Buying intent and quote requests",
  "Education intent and how-to questions"
];

const leads = [
  { name: "example_user", source: "Reddit", offer: "Prayer App", score: 91 },
  { name: "linkedin_member", source: "LinkedIn", offer: "Construction Client", score: 94 }
];

const campaigns = [
  "Prayer App Global Demand",
  "Fasting PDF YouTube Comments",
  "Construction Leads Botswana"
];

const engineProviders = [
  {
    name: "OpenAI",
    env: "OPENAI_API_KEY",
    role: "Primary classifier and response draft engine"
  },
  {
    name: "Claude",
    env: "ANTHROPIC_API_KEY",
    role: "Long-context reasoning and careful reply drafting"
  },
  {
    name: "Perplexity",
    env: "PERPLEXITY_API_KEY",
    role: "Research-backed enrichment and source discovery"
  },
  {
    name: "DeepSeek",
    env: "DEEPSEEK_API_KEY",
    role: "Cost-efficient classification and bulk scoring"
  }
];

const integrations = [
  { name: "Hacker News connector (no key needed)", connected: true },
  { name: "Bluesky connector (no key needed)", connected: true },
  { name: "Mastodon connector (no key needed)", connected: true },
  { name: "Reddit connector", connected: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) },
  { name: "Brandlytics CRM webhook", connected: Boolean(process.env.BRANDLYTICS_CRM_WEBHOOK_URL) }
];

export default function Home() {
  return (
    <main className="appShell" id="top">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <Radar size={20} aria-hidden="true" />
          </div>
          <span>SignalDesk</span>
        </div>
        <nav className="nav" aria-label="SignalDesk sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                className={`navItem ${item.active ? "active" : ""}`}
                href={item.href}
                key={item.label}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <a className="overviewLink" href="#top">
          Back to overview
        </a>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">signal.brandlytics.agency</div>
            <h1>Global signal harvesting for Brandlytics CRM</h1>
            <div className="promiseBlock">
              <span>SignalDesk promise</span>
              <strong>Find people already asking for what you sell.</strong>
            </div>
            <p className="subtitle">
              The agent finds demand signals across public conversations,
              classifies intent, drafts the next best response, and supplies
              qualified leads to crm.brandlytics.agency.
            </p>
          </div>
          <div className="actions">
            <button className="button" type="button">
              <Bell size={17} aria-hidden="true" />
              Daily brief
            </button>
            <a className="button primary" href="#live-test">
              <Bot size={17} aria-hidden="true" />
              Run signal scan
            </a>
          </div>
        </header>

        <section className="grid" aria-label="SignalDesk overview">
          {metrics.map((metric) => (
            <article className="panel metric" key={metric.label}>
              <div className="metricLabel">{metric.label}</div>
              <div className="metricValue">{metric.value}</div>
              <div className="metricHint">{metric.hint}</div>
            </article>
          ))}

          <article className="panel profilePanel" id="products">
            <div className="sectionHeader">
              <div>
                <h2>Products / Services</h2>
                <p className="sectionNote">
                  This is where you profile what SignalDesk should harvest for.
                </p>
              </div>
              <span className="pill greenPill">
                <WandSparkles size={14} aria-hidden="true" />
                Harvest profile
              </span>
            </div>
            <div className="profileGrid">
              <form className="profileForm">
                <label>
                  Offer name
                  <input defaultValue="Prayer App" aria-label="Offer name" />
                </label>
                <label>
                  Product or service type
                  <select defaultValue="digital">
                    <option value="digital">Digital product / app</option>
                    <option value="service">Service business</option>
                    <option value="client">Client campaign</option>
                  </select>
                </label>
                <label>
                  Problems solved
                  <textarea
                    defaultValue="Inconsistent prayer, not knowing what to pray, needing encouragement."
                    aria-label="Problems solved"
                  />
                </label>
                <label>
                  Signal phrases
                  <textarea
                    defaultValue="I need prayer, how do I pray, fasting guide, looking for help, recommend an app."
                    aria-label="Signal phrases"
                  />
                </label>
                <div className="toggleRow">
                  <span>Global harvesting</span>
                  <strong>On</strong>
                </div>
                <div className="toggleRow">
                  <span>Location targeting</span>
                  <strong>Optional</strong>
                </div>
              </form>
              <div className="profileList">
                {offerProfiles.map((profile) => (
                  <div className="profileCard" key={profile.name}>
                    <div className="profileCardTop">
                      <strong>{profile.name}</strong>
                      <span className="pill">{profile.mode}</span>
                    </div>
                    <span className="metricHint">{profile.type}</span>
                    <p>{profile.signals}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="panel profilePanel" id="live-test">
            <div className="sectionHeader">
              <div>
                <h2>Live Signal Test</h2>
                <p className="sectionNote">
                  Run real scans against Hacker News, Bluesky, and Mastodon
                  (no credentials needed) &mdash; or Reddit once API access is
                  approved.
                </p>
              </div>
              <a className="backLink" href="#top">
                Back to overview
              </a>
            </div>
            <LiveSignalTester />
          </article>

          <article className="panel profilePanel" id="manual-signal">
            <div className="sectionHeader">
              <div>
                <h2>Manual Signal Entry</h2>
                <p className="sectionNote">
                  Paste a post you found yourself &mdash; works even before
                  Reddit API access is approved.
                </p>
              </div>
              <a className="backLink" href="#top">
                Back to overview
              </a>
            </div>
            <ManualSignalEntry />
          </article>

          <article className="panel wide" id="opportunities">
            <div className="sectionHeader">
              <h2>Opportunity Inbox</h2>
              <div className="headerActions">
                <span className="pill">
                  <Globe2 size={14} aria-hidden="true" />
                  Global by default
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="opportunityList">
              {opportunities.map((item) => (
                <div className="opportunity" key={`${item.platform}-${item.text}`}>
                  <div className="opportunityTop">
                    <div className="source">
                      <Target size={15} aria-hidden="true" />
                      <span>
                        {item.platform} / {item.source}
                      </span>
                    </div>
                    <span className="score">{item.score}</span>
                  </div>
                  <p className="signalText">{item.text}</p>
                  <div className="metaRow">
                    <span className="pill">{item.offer}</span>
                    <span className="pill">{item.intent}</span>
                    <span className="pill">{item.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel side" id="signals">
            <div className="sectionHeader">
              <h2>Signals</h2>
              <div className="headerActions">
                <span className="pill">
                  <Gauge size={14} aria-hidden="true" />
                  MVP
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="mapList">
              {signalRules.map((rule) => (
                <div className="mapItem" key={rule}>
                  <strong>{rule}</strong>
                  <span className="metricHint">Active signal category</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel wide" id="responses">
            <div className="sectionHeader">
              <h2>Response Drafts</h2>
              <div className="headerActions">
                <span className="pill">
                  <Sparkles size={14} aria-hidden="true" />
                  Approval first
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            {drafts.map((draft) => (
              <div className="draft" key={draft.title}>
                <div className="draftTitle">
                  <MessageSquareText size={16} aria-hidden="true" />
                  {draft.title}
                </div>
                <p>{draft.text}</p>
              </div>
            ))}
          </article>

          <article className="panel side" id="leads">
            <div className="sectionHeader">
              <h2>Leads</h2>
              <div className="headerActions">
                <span className="pill">
                  <Users size={14} aria-hidden="true" />
                  CRM ready
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="mapList">
              {leads.map((lead) => (
                <div className="mapItem" key={lead.name}>
                  <strong>{lead.name}</strong>
                  <span className="metricHint">
                    {lead.source} / {lead.offer} / {lead.score}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel wide" id="campaigns">
            <div className="sectionHeader">
              <h2>Campaigns</h2>
              <div className="headerActions">
                <span className="pill">
                  <Megaphone size={14} aria-hidden="true" />
                  Harvest runs
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="mapList compactGrid">
              {campaigns.map((campaign) => (
                <div className="mapItem" key={campaign}>
                  <strong>{campaign}</strong>
                  <span className="metricHint">Daily scan and draft generation</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel side" id="analytics">
            <div className="sectionHeader">
              <h2>Analytics</h2>
              <div className="headerActions">
                <span className="pill">
                  <BarChart3 size={14} aria-hidden="true" />
                  Summary
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="mapList">
              {engineMap.map((item) => (
                <div className="mapItem" key={item.label}>
                  <strong>{item.label}</strong>
                  <span className="metricHint">{item.value}</span>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel side" id="settings">
            <div className="sectionHeader">
              <h2>Settings</h2>
              <div className="headerActions">
                <span className="pill">
                  <PlugZap size={14} aria-hidden="true" />
                  Brandlytics
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="mapList">
              <div className="mapItem">
                <strong>Engine trigger</strong>
                <span className="metricHint">
                  Run signal scan starts the source connector and AI scoring flow.
                </span>
              </div>
              <div className="mapItem">
                <strong>Destination</strong>
                <span className="metricHint">crm.brandlytics.agency</span>
              </div>
              <div className="mapItem">
                <strong>Push rule</strong>
                <span className="metricHint">Intent score 80 or higher</span>
              </div>
              <div className="mapItem">
                <strong>MVP posting mode</strong>
                <span className="metricHint">Draft only, human approval</span>
              </div>
            </div>
          </article>

          <article className="panel wide" id="engine-connections">
            <div className="sectionHeader">
              <div>
                <h2>Engine Connections</h2>
                <p className="sectionNote">
                  Connect the LLM provider that classifies signals and writes
                  drafts.
                </p>
              </div>
              <div className="headerActions">
                <span className="pill">
                  <Cpu size={14} aria-hidden="true" />
                  Provider layer
                </span>
                <a className="backLink" href="#top">
                  Back
                </a>
              </div>
            </div>
            <div className="engineGrid">
              {engineProviders.map((provider) => {
                const connected = Boolean(process.env[provider.env]);
                return (
                  <div className="engineCard" key={provider.name}>
                    <div className="engineCardTop">
                      <strong>{provider.name}</strong>
                      <span className={`pill ${connected ? "greenPill" : ""}`}>
                        {connected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p>{provider.role}</p>
                    <code>{provider.env}</code>
                  </div>
                );
              })}
            </div>
            <div className="engineNote">
              <KeyRound size={16} aria-hidden="true" />
              <span>
                Add provider keys as Vercel environment variables, then redeploy.
                Scans route through OpenAI first, then Claude, then DeepSeek,
                with rule-based scoring as the final fallback.
              </span>
            </div>
            <div className="mapList">
              {integrations.map((item) => (
                <div className="mapItem" key={item.name}>
                  <strong>{item.name}</strong>
                  <span className="metricHint">
                    {item.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
