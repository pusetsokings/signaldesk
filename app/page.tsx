import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Gauge,
  Globe2,
  Inbox,
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

const navItems = [
  { label: "Products", icon: BriefcaseBusiness },
  { label: "Signals", icon: Radar },
  { label: "Opportunities", icon: Inbox, active: true },
  { label: "Responses", icon: MessageSquareText },
  { label: "Leads", icon: Users },
  { label: "Campaigns", icon: Megaphone },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings }
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

export default function Home() {
  return (
    <main className="appShell">
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
                href="#"
                key={item.label}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">signal.brandlytics.agency</div>
            <h1>Global signal harvesting for Brandlytics CRM</h1>
            <div className="tagline">
              Find people already asking for what you sell.
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
            <button className="button primary" type="button">
              <Bot size={17} aria-hidden="true" />
              Run signal scan
            </button>
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

          <article className="panel profilePanel">
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

          <article className="panel wide">
            <div className="sectionHeader">
              <h2>Opportunity Inbox</h2>
              <span className="pill">
                <Globe2 size={14} aria-hidden="true" />
                Global by default
              </span>
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

          <article className="panel side">
            <div className="sectionHeader">
              <h2>Engine Map</h2>
              <span className="pill">
                <Gauge size={14} aria-hidden="true" />
                MVP
              </span>
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

          <article className="panel wide">
            <div className="sectionHeader">
              <h2>Response Drafts</h2>
              <span className="pill">
                <Sparkles size={14} aria-hidden="true" />
                Approval first
              </span>
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

          <article className="panel side">
            <div className="sectionHeader">
              <h2>CRM Sync</h2>
              <span className="pill">
                <PlugZap size={14} aria-hidden="true" />
                Brandlytics
              </span>
            </div>
            <div className="mapList">
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
        </section>
      </section>
    </main>
  );
}
