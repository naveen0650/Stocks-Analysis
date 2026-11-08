/* FinAI - M.Tech Project Documentation generator (docx-js).
 * Cover: Recipe R1 (Pure Paragraph Left), palette DM-1 (Deep Cyan - AI/tech).
 * Sections: [1] cover (margin 0) [2] front matter (Roman) [3] body (Arabic from 1).
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber, PageBreak,
  BorderStyle, WidthType, ShadingType, TableLayoutType, SectionType,
  NumberFormat, TableOfContents, VerticalAlign,
} = require("docx");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "FinAI_Project_Documentation.docx");
const SHOTS = path.join(__dirname, "screenshots");

/* ---------------------------------------------------------------- palette */
const P = {
  bg: "162235",            // DM-1 deep cyan cover background
  accent: "37DCF2",        // cover accent
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078",
  // body-page tokens (darkened for white pages per DM-1 rule)
  h1: "14424E", h2: "1B6B7A", body: "000000", secondary: "5A6B75",
  tHeaderBg: "1B6B7A", tHeaderText: "FFFFFF", tInnerLine: "C8DDE2", tSurface: "EDF3F5",
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { ...noBorders, insideHorizontal: NB, insideVertical: NB };

const EN = { ascii: "Times New Roman", eastAsia: "SimSun" };
const EN_HEAD = { ascii: "Times New Roman", eastAsia: "SimHei" };

/* -------------------------------------------------- cover layout helpers */
function calcTitleLayoutEn(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // English average glyph width ~ 0.5 em -> pt * 10 twips
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / (pt * 10));
  let titlePt = preferredPt;
  let lines = [title];
  const split = (text, cpl) => {
    if (text.length <= cpl) return [text];
    const words = text.split(" ");
    const out = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > cpl && cur) { out.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) out.push(cur);
    if (out.length > 1 && out[out.length - 1].split(" ").length === 1 && out[out.length - 1].length <= 4) {
      const last = out.pop(); out[out.length - 1] += " " + last;
    }
    return out;
  };
  while (titlePt >= minPt) {
    lines = split(title, charsPerLine(titlePt));
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(p) {
  const { titleLineCount = 1, titlePt = 40, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 400, pageHeight = 16838 } = p;
  const SAFETY = 1200;
  const usable = pageHeight - SAFETY;
  const titleH = titleLineCount * (titlePt * 23 + 200);
  const subH = hasSubtitle ? 2 * (12 * 23 + 320) : 0;   // two manual subtitle lines
  const engH = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaH = metaLineCount * (10 * 23 + 100);
  const implicit = 3 * 300;
  const remaining = Math.max(usable - (titleH + subH + engH + metaH + fixedHeight + implicit), 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(remaining * 0.45);
  const rawBottom = Math.floor(remaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}

function buildCoverR1(cfg) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayoutEn(cfg.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!cfg.subtitle, hasEnglishLabel: !!cfg.englishLabel,
    metaLineCount: (cfg.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (cfg.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: cfg.englishLabel.split("").join("  "), size: 18, color: P.accent, font: { ascii: "Arial" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.titleColor, font: { ascii: "Arial", eastAsia: "SimHei" } })],
    }));
  }
  for (const sub of cfg.subtitleLines || []) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 120, line: Math.ceil(12 * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: sub, size: 24, color: P.subtitleColor, font: { ascii: "Arial" } })],
    }));
  }
  for (const line of (cfg.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.metaColor, font: { ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: cfg.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                                            " }),
      new TextRun({ text: cfg.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        verticalAlign: VerticalAlign.TOP,
        children,
      })],
    })],
  })];
}

/* -------------------------------------------------------- body helpers */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180, line: Math.ceil(16 * 23), lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 32, color: P.h1, font: EN_HEAD })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140, line: Math.ceil(14 * 23), lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 28, color: P.h2, font: EN_HEAD })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: P.body, font: EN, ...opts })],
  });
}
function bodyRuns(runs) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: runs.map(r => new TextRun({ size: 24, color: P.body, font: EN, ...r })),
  });
}
function bullet(text, boldLead) {
  const runs = boldLead
    ? [{ text: boldLead + " - ", bold: true }, { text }]
    : [{ text }];
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    children: runs.map(r => new TextRun({ size: 24, color: P.body, font: EN, ...r })),
  });
}
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    children: [new TextRun({ text, size: 21, color: P.secondary, italics: true, font: EN })],
  });
}
function figure(file, text) {
  const img = fs.readFileSync(path.join(SHOTS, file));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160 },
      children: [new ImageRun({ type: "png", data: img, transformation: { width: 580, height: 326 } })],
    }),
    caption(text),
  ];
}
function formula(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 140, line: 312 },
    children: [new TextRun({ text, size: 24, italics: true, color: P.body, font: EN })],
  });
}
function cell(text, o = {}) {
  return new TableCell({
    width: { size: o.w || 25, type: WidthType.PERCENTAGE },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: 276 },
      children: [new TextRun({ text, size: 21, bold: !!o.bold, color: o.color || P.body, font: EN })],
    })],
  });
}
function table(headers, widths, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.tHeaderBg },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.tHeaderBg },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.tInnerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => cell(t, { w: widths[i], bold: true, color: P.tHeaderText, fill: P.tHeaderBg })),
      }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((t, i) => cell(t, { w: widths[i], fill: ri % 2 === 0 ? "FFFFFF" : P.tSurface })),
      })),
    ],
  });
}
function spacer(after = 160) {
  return new Paragraph({ spacing: { after }, children: [] });
}

/* ------------------------------------------------------------ footers */
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary, font: EN })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.tInnerLine, space: 4 } },
      children: [new TextRun({ text: "FinAI - M.Tech Project Documentation (Phase 1)", size: 16, color: P.secondary, font: EN })],
    })],
  });
}

/* ============================================================ CONTENT */
const bodyChildren = [];

/* ---- Chapter 1 ---- */
bodyChildren.push(h1("Chapter 1  Introduction"));
bodyChildren.push(h2("1.1  Background"));
bodyChildren.push(body("Personal finance management and investment analysis have traditionally been handled by disconnected tools: expense trackers that record spending without explaining it, spreadsheet portfolios that demand manual maintenance, and stock research platforms that present raw numbers without interpretation or transparency. With the maturity of machine learning and natural language processing, it is now feasible to build a unified platform that not only records financial data but analyses it, detects anomalies, generates grounded insights, and explains every conclusion it draws."));
bodyChildren.push(body("FinAI (An AI-Driven Personal Finance, Investment Analytics and Financial Intelligence Platform) is a full-stack web application developed as an M.Tech dissertation project. It unifies personal expense management, budget tracking, statistical analytics, AI-assisted insight generation and an explainable financial health score in one secure, production-quality platform. Finance is the application domain; software engineering, AI/ML and data engineering are the academic focus."));
bodyChildren.push(h2("1.2  Problem Statement"));
bodyChildren.push(body("Conventional personal finance applications suffer from three structural deficiencies. First, they are passive: they display what the user spent but never explain why it matters, what changed, or what to do next. Second, their scoring mechanisms, where present, are black boxes - users cannot see how a rating was computed or which factor contributed what. Third, they do not integrate behavioural spending data with investment analysis, leaving users to correlate the two themselves. There is a need for an integrated, explainable, data-grounded financial intelligence platform that treats analytical output as a first-class feature rather than an afterthought."));
bodyChildren.push(h2("1.3  Objectives"));
bodyChildren.push(body("The dissertation objectives, phased across three semesters, are:"));
bodyChildren.push(bullet("Design and implement a secure, layered full-stack architecture (API, business logic, analysis engine, data access) with role-based access control and versioned risk-disclaimer governance."));
bodyChildren.push(bullet("Implement core financial management: expense and income recording, custom categories, budgets with threshold alerts, and multi-granularity analytics."));
bodyChildren.push(bullet("Build an AI layer that is statistically grounded and explainable: z-score anomaly detection, a guarded insight rule engine whose every output cites its evidence, and a transparent weighted financial health score."));
bodyChildren.push(bullet("Phase 2-4 roadmap: investment analytics (valuation engine, news sentiment), portfolio intelligence (risk metrics, stress testing, planning calculators) and a retrieval-augmented research assistant."));
bodyChildren.push(bullet("Evaluate all models with measurable metrics (precision, recall, F1, MAE/RMSE/MAPE) rather than unsupported accuracy claims."));
bodyChildren.push(h2("1.4  Scope of Phase 1"));
bodyChildren.push(body("This documentation covers Phase 1 - Foundation and Core Financial Management - the first of four planned increments. Phase 1 delivers the complete platform skeleton (authentication, RBAC, audit trail, disclaimer gate), expense/income/budget management, the analytics engine, the guarded AI insight engine, the explainable health score, an administrative console, and a verified test suite. Investment analytics begins in Phase 2; accordingly, no financial-market data is fabricated anywhere in the current build."));
bodyChildren.push(h2("1.5  Report Organization"));
bodyChildren.push(body("Chapter 2 surveys existing systems and the research gap. Chapter 3 specifies the proposed system. Chapters 4-7 document architecture, database, API and security design. Chapter 8 details the AI/ML methodology with formulas. Chapter 9 walks through the implementation with annotated interface captures. Chapter 10 reports testing and results, Chapter 11 deployment, and Chapter 12 limitations and the phase roadmap. Chapter 13 concludes."));

/* ---- Chapter 2 ---- */
bodyChildren.push(h1("Chapter 2  Literature Survey and Research Gap"));
bodyChildren.push(h2("2.1  Existing Systems and Their Limitations"));
bodyChildren.push(body("A survey of representative personal finance and investment tools was conducted to establish the baseline. The findings are summarised below."));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["System", "Core Capability", "Key Limitations"],
  [22, 30, 48],
  [
    ["Spreadsheet budgets", "Fully manual tracking", "No automation, no anomaly detection, error-prone, no aggregation or trends"],
    ["Bank/wallet apps", "Automatic transaction capture", "Recording only; categorisation is shallow; no explanation, scoring or budget intelligence"],
    ["Expense trackers (general)", "Categorised spending views", "Insight-free: charts without interpretation; no data-sufficiency guards; no health scoring"],
    ["Investment trackers", "Holdings and returns", "Detached from daily spending; opaque metrics; no valuation or sentiment context"],
    ["Robo-advisory tools", "Allocated portfolios", "Black-box recommendations; no explainability; advice orientation rather than education"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("2.2  Research Gap"));
bodyChildren.push(body("Synthesising the survey, five gaps recur across existing tools, and each maps to a concrete FinAI response:"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["#", "Gap in Existing Tools", "FinAI Answer"],
  [6, 44, 50],
  [
    ["1", "Expense tracking without explanation", "Guarded insight engine; every insight cites the aggregated figures it was derived from (Chapter 8)"],
    ["2", "Black-box scores", "Weighted, documented health score with per-factor contribution and weight redistribution (Chapter 8)"],
    ["3", "No integrated investment research", "Provider-abstraction based stock analyzer, valuation engine and sentiment pipeline (Phase 2)"],
    ["4", "AI without grounding", "Retrieval-augmented assistant with mandatory citations; refuses when retrieval is empty (Phase 4)"],
    ["5", "Planning divorced from behaviour", "Goals and calculators planned to consume the user's actual expense history (Phase 3)"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("2.3  Positioning of the Proposed Work"));
bodyChildren.push(body("FinAI deliberately positions itself as an analytical and educational system, not an advisory one. The platform states plainly that it is not a SEBI-registered investment adviser, provides no futures-and-options recommendations (explicitly out of scope), and stores a versioned record of every user's disclaimer acceptance before the application becomes usable. This compliance-first framing distinguishes the work from advisory-oriented commercial systems."));

/* ---- Chapter 3 ---- */
bodyChildren.push(h1("Chapter 3  Proposed System"));
bodyChildren.push(h2("3.1  System Overview"));
bodyChildren.push(body("FinAI is a single-page application backed by a versioned REST API. Users first confront an investment risk disclaimer and must explicitly acknowledge it; the acceptance (version, IP address, timestamp) is persisted. They then register with an email or a mobile number, authenticate via short-lived JWT access tokens and rotating refresh tokens, and land on a dashboard that unifies financial, expense, budget and AI-insight snapshots. An admin role - reachable only through the same hardened login - sees operational metrics exclusively and can never inspect a user's financial records."));
bodyChildren.push(h2("3.2  Functional Requirements (Phase 1)"));
bodyChildren.push(bullet("Registration with email or Indian mobile number, login, logout, refresh-token rotation, password change and reset, active-session listing and revocation.", "FR-1"));
bodyChildren.push(bullet("Versioned disclaimer acceptance recorded before first use; login refused until the current version is accepted.", "FR-2"));
bodyChildren.push(bullet("Expense CRUD with category, subcategory, payment method, merchant, tags, recurring flag, date filtering, free-text search and pagination; soft deletion.", "FR-3"));
bodyChildren.push(bullet("Income recording with source and recurrence.", "FR-4"));
bodyChildren.push(bullet("Monthly or yearly budgets, overall or per category, with customisable alert thresholds and live utilisation status.", "FR-5"));
bodyChildren.push(bullet("Analytics: period summaries, monthly trend series, month-over-month deltas, category distribution, top merchants.", "FR-6"));
bodyChildren.push(bullet("AI module: anomaly flags with reference statistics, guarded insights, explainable health score.", "FR-7"));
bodyChildren.push(bullet("Admin console: platform overview, DAU/MAU, feature usage, user management, audit trail, login-activity timeline.", "FR-8"));
bodyChildren.push(h2("3.3  Non-Functional Requirements"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Attribute", "Requirement", "Mechanism"],
  [24, 38, 38],
  [
    ["Security", "No plaintext credentials; brute-force resistance", "bcrypt hashing, JWT + rotating refresh tokens, lockout, rate limiting, audit log"],
    ["Privacy", "Strict user data isolation; admin least privilege", "Per-user query scoping; admin endpoints expose counts only"],
    ["Reliability", "Container dependencies may restart independently", "Startup waits for database readiness (30 retries); health endpoint"],
    ["Performance", "Responsive dashboards on bounded windows", "Composite indexes, bounded aggregation windows, pagination"],
    ["Maintainability", "Layered, testable design", "Pure analysis engine, service layer, 47 automated tests"],
    ["Portability", "Zero-setup local run and production-shaped deployment", "SQLAlchemy dialect portability; Docker Compose stack"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("3.4  Design Principles"));
bodyChildren.push(bullet("Every generated statement must cite the data behind it; the system stays silent when data is insufficient.", "No fabrication"));
bodyChildren.push(bullet("Scores decompose into weighted factors with visible contributions; nothing is hidden behind a single number.", "Explainability"));
bodyChildren.push(bullet("External data sources sit behind swappable interfaces so no provider is load-bearing (Phase 2).", "Provider abstraction"));
bodyChildren.push(bullet("Every phase ships a usable, tested increment that can be demonstrated end to end.", "Incremental delivery"));

/* ---- Chapter 4 ---- */
bodyChildren.push(h1("Chapter 4  System Architecture and Technology Stack"));
bodyChildren.push(h2("4.1  Layered Architecture"));
bodyChildren.push(body("The backend follows a strict four-layer discipline. Each layer has a single responsibility and a forbidden direction of dependency: routes never contain business rules, services never touch HTTP, and the analysis engine is pure computation with no I/O, which is what makes it unit-testable in isolation."));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Layer", "Responsibility", "Must Not"],
  [22, 44, 34],
  [
    ["API routes", "HTTP parsing, authentication, status codes, rate limiting", "Contain business logic"],
    ["Services", "Business rules and cross-entity orchestration", "Use HTTP constructs"],
    ["Analysis engine", "Pure computation: aggregation, anomaly, insights, scoring", "Perform any I/O"],
    ["Data access", "SQLAlchemy models and session handling", "Embed business rules"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(body("The request path for analytics illustrates the flow: a route authenticates the caller and applies rate limits, the service fetches that user's rows within a bounded window, and the pure engine computes series, flags, insights and scores before the response is serialised. A public health endpoint reports liveness including a database round trip, and the container startup sequence waits for database readiness so dependency restarts cannot crash the application."));
bodyChildren.push(h2("4.2  Technology Stack and Justification"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Concern", "Choice", "Justification"],
  [20, 24, 56],
  [
    ["API framework", "FastAPI (Python)", "Native async, Pydantic validation, automatic OpenAPI; first-class fit with the Python ML ecosystem used in later phases"],
    ["Data validation", "Pydantic v2", "Typed, fast, single source of truth for API contracts"],
    ["ORM / database", "SQLAlchemy 2.0; PostgreSQL (prod) / SQLite (dev)", "Typed Mapped models; identical schema across dialects enables zero-setup local development"],
    ["Authentication", "JWT access (30 min) + rotating refresh (14 days), bcrypt", "Stateless API with revocable persisted sessions; digests stored, never raw tokens"],
    ["Frontend", "React 18 + TypeScript + Vite", "Authenticated analytics SPA; SSR adds cost without benefit; fast HMR and clean builds"],
    ["Styling / charts", "Tailwind CSS 3; Recharts", "Consistent custom glassmorphism design system; lightweight React-native chart composition"],
    ["Testing", "pytest + FastAPI TestClient", "Isolated database per test; public-API-driven integration tests"],
    ["Packaging", "Docker Compose", "Production-shaped stack: PostgreSQL 16, Redis 7 (Phase 2+), API, nginx-served web build"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("4.3  Key Architecture Decisions"));
bodyChildren.push(bullet("SQLite for development, PostgreSQL for production through one SQLAlchemy schema (ADR-001) - a demonstration must run on any laptop, while production concerns are met by PostgreSQL without code changes."));
bodyChildren.push(bullet("Vite SPA instead of Next.js (ADR-002) - the product is a private dashboard, not a content site; separation keeps the API the single security boundary."));
bodyChildren.push(bullet("Analysis engine as pure functions (ADR-003) - later phases swap rule-based components for trained models behind identical signatures, so the API surface never changes."));
bodyChildren.push(bullet("In-process rate limiting with an interface backing store (ADR-004) - correct for single-process deployment; Redis backing arrives with horizontal scaling in Phase 4."));

/* ---- Chapter 5 ---- */
bodyChildren.push(h1("Chapter 5  Database Design"));
bodyChildren.push(h2("5.1  Entity Overview"));
bodyChildren.push(body("Phase 1 implements eight entities. The schema is deliberately drawn so the Phase 2-4 entities (stock, financial statement, news article, sentiment analysis, valuation, portfolio and holdings, reports, notifications, API usage) attach without reshaping existing tables."));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Entity", "Purpose", "Key Attributes"],
  [24, 34, 42],
  [
    ["User", "Identity and role", "email (unique, nullable), mobile (unique, nullable), password_hash, role, is_active, lockout counters"],
    ["SessionToken", "Revocable refresh session", "token_hash (unique), user_agent, ip, expires_at, revoked_at, last_used_at"],
    ["DisclaimerAcceptance", "Versioned consent", "version, ip_address, accepted_at"],
    ["PasswordResetToken", "Single-use reset", "token_hash, expires_at, used_at"],
    ["ExpenseCategory", "System (user_id NULL) + custom categories", "name, user_id"],
    ["Expense", "Core transaction", "expense_date, amount(14,2), category FK, payment_method, merchant, tags, is_recurring, is_deleted"],
    ["Income", "Inflow records", "income_date, amount, source, is_recurring, is_deleted"],
    ["Budget", "Spending limits", "period, amount, category FK (NULL = overall), alert_thresholds (JSON), is_active"],
    ["AuditLog", "Append-only trail", "action, entity, entity_id, ip, user_agent, meta (JSON)"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("5.2  Integrity and Indexing"));
bodyChildren.push(body("Money columns use Numeric(14,2) - floating point is never used for currency. Soft deletion (is_deleted) preserves analytics history across corrections. Composite indexes serve the dominant access patterns: expenses (user_id, expense_date) for range analytics and (user_id, category_id) for distribution queries; incomes (user_id, income_date); session_tokens token_hash unique for refresh lookup; audit_logs (user_id, created_at) and (action) for admin timelines."));
bodyChildren.push(h2("5.3  Design Decisions"));
bodyChildren.push(bullet("Email and mobile are both unique but nullable - the product allows signup with either; at least one is enforced at the service layer."));
bodyChildren.push(bullet("Refresh tokens are stored only as HMAC-SHA256 digests keyed by the server secret; a database leak yields no usable credentials."));
bodyChildren.push(bullet("System categories (user_id NULL) are shared and protected: they cannot be deleted, and categories in use by expenses or budgets are deletion-blocked at the service layer."));

/* ---- Chapter 6 ---- */
bodyChildren.push(h1("Chapter 6  API Design"));
bodyChildren.push(h2("6.1  Conventions"));
bodyChildren.push(body("All endpoints are versioned under /api/v1. Responses are JSON with ISO-8601 timestamps and decimal-safe numbers. Errors return a machine-readable code with a human message. Interactive OpenAPI documentation is generated at /docs. The complete endpoint catalogue appears in Appendix A."));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Code", "HTTP", "Meaning"],
  [30, 14, 56],
  [
    ["DISCLAIMER_REQUIRED", "403", "Current disclaimer version not accepted"],
    ["INVALID_CREDENTIALS", "401", "Bad login"],
    ["ACCOUNT_LOCKED", "423", "Temporary lock after repeated failures"],
    ["TOKEN_EXPIRED", "401", "Access or refresh token expired"],
    ["VALIDATION_ERROR", "422", "Request failed schema validation"],
    ["RATE_LIMITED", "429", "Too many requests"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("6.2  Rate Limiting"));
bodyChildren.push(body("A sliding-window limiter protects the surface: authentication endpoints allow 10 requests per 5 minutes per IP, authenticated mutations 120 per minute per user, and reads 300 per minute per user. The limiter is an interface; Phase 4 swaps the backing store to Redis for multi-instance deployment."));
bodyChildren.push(h2("6.3  Endpoint Groups"));
bodyChildren.push(bullet("12 endpoints: registration, login, refresh, logout, profile view/update, password change, session list/revoke, password forgot/reset.", "Auth"));
bodyChildren.push(bullet("13 endpoints: expense CRUD with filters and pagination, category list/create/delete, income CRUD, budget CRUD with live status.", "Finance"));
bodyChildren.push(bullet("7 endpoints: dashboard, summary, trends, categories, anomalies, insights, health-score.", "Analytics"));
bodyChildren.push(bullet("5 endpoints: overview, user search/management, audit logs, login activity.", "Admin"));
bodyChildren.push(bullet("2 endpoints: liveness with database check, public current-disclaimer document.", "Meta"));

/* ---- Chapter 7 ---- */
bodyChildren.push(h1("Chapter 7  Security Architecture"));
bodyChildren.push(h2("7.1  Authentication"));
bodyChildren.push(body("Passwords are hashed with bcrypt (cost 12); plaintext never touches storage or logs. Access tokens are HS256 JWTs with a 30-minute expiry and a per-token jti; refresh tokens are 48-byte random values stored only as keyed digests, expiring after 14 days. Every refresh rotates the session - the used token is revoked and replaced - so replayed refresh tokens fail fast. Five consecutive failures lock the account for 15 minutes; every attempt, successful or not, is audit-logged with IP and user agent."));
bodyChildren.push(h2("7.2  Authorization and Least Privilege"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Capability", "User", "Admin"],
  [50, 25, 25],
  [
    ["Own financial data CRUD and analytics", "Allowed", "Denied"],
    ["Admin panel, user management, audit trail", "Denied (403)", "Allowed"],
    ["View any user's financial records", "Denied", "Denied by design"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("7.3  Input Handling and Transport Headers"));
bodyChildren.push(body("Every request body is validated by typed Pydantic schemas (range, length, format - including an Indian mobile pattern). All database access uses SQLAlchemy bound parameters, eliminating string-built SQL. The API sets X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: no-referrer and Cache-Control: no-store on every response. Tokens travel exclusively in the Authorization header, removing the classic cookie CSRF vector."));
bodyChildren.push(h2("7.4  Audit Trail"));
bodyChildren.push(body("An append-only audit log records registrations, logins and failures, password changes and resets, disclaimer acceptances and every admin action, each with actor, IP, user agent and structured metadata. The admin console aggregates this trail into a login-activity timeline and raises a suspicious-activity flag when 24-hour failures exceed a threshold."));
bodyChildren.push(h2("7.5  Known Phase 1 Limitations"));
bodyChildren.push(bullet("Password-reset tokens are returned in responses only in development; production requires SMTP wiring (tracked for Phase 2)."));
bodyChildren.push(bullet("Rate-limiter state is per-process - correct for the single-instance deployment, Redis-backed in Phase 4."));
bodyChildren.push(bullet("Email/mobile verification is stubbed until a delivery provider is configured."));

/* ---- Chapter 8 ---- */
bodyChildren.push(h1("Chapter 8  AI/ML Methodology"));
bodyChildren.push(h2("8.1  Principles"));
bodyChildren.push(body("Three principles govern every algorithmic component: no hallucinated finance (insights cite their numbers; insufficient data means silence); statistical transparency first, learned models later (Phase 2-3 models slot in behind identical function signatures); and explainability as a feature - scores decompose into weighted factors, flags carry their reference statistics."));
bodyChildren.push(h2("8.2  Anomaly Detection (Z-Score)"));
bodyChildren.push(body("Two detectors run over a bounded window. The transaction detector scores each expense against its category's distribution; the daily-total detector scores aggregate days against the user's baseline. Both require a minimum history before anything is flagged - 8 samples per category and 14 days overall - and both report the full reference statistics with every flag."));
bodyChildren.push(formula("z = (x - \u03BC) / \u03C3          flag when z > 2.5"));
bodyChildren.push(body("where x is the candidate amount, and \u03BC and \u03C3 are the mean and population standard deviation of the reference distribution. A flag's payload contains the amount, \u03BC, \u03C3, z, the sample size and a plain-language explanation, so the interface can show exactly why the transaction stood out."));
bodyChildren.push(h2("8.3  Guarded Insight Rule Engine"));
bodyChildren.push(body("Six deterministic rules convert aggregates into natural-language insights. Each rule has a data-sufficiency guard and fires only when its guard passes; each output carries an evidence object containing the exact figures used."));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Rule", "Fires When", "Example Output"],
  [20, 42, 38],
  [
    ["Category spike", "category spend > 1.2 \u00D7 previous month AND delta \u2265 \u20B9500", "\u201CFood spending is up 185% - \u20B92,198 vs \u20B9770 last month.\u201D"],
    ["Concentration", "one category > 35% of period spend", "\u201CHousing represents 71% of spending this period.\u201D"],
    ["Recurring load", "\u2265 3 merchants recurring across \u2265 3 months", "\u201CNetflix, Spotify repeat monthly - about \u20B9798/month.\u201D"],
    ["Weekend pattern", "weekend daily average > 1.3 \u00D7 weekday and \u2265 14 days data", "\u201CWeekends cost 1.6\u00D7 your weekday average.\u201D"],
    ["Savings trend", "savings-rate change > \u00B15 pp with 2 months history", "\u201CSavings rate declined 8 points month-over-month.\u201D"],
    ["Budget pressure", "utilisation crosses a configured threshold", "\u201CBudget 'Food' exceeded - 146% used.\u201D"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("8.4  Explainable Financial Health Score"));
bodyChildren.push(body("The score is a weighted sum over six factors. Factors lacking data are marked not_evaluated and their weight is redistributed proportionally across the evaluated ones - the model never invents inputs. The response reports every factor's weight, effective weight, factor score, contribution, a plain-language explanation and a suggestion when the factor scores below 80."));
bodyChildren.push(formula("Score = \u03A3  factorScore(i) \u00D7 effectiveWeight(i),   effectiveWeight(i) = w(i) / \u03A3 w(evaluated)"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Factor", "Weight", "Mapping to 0-100"],
  [30, 12, 58],
  [
    ["Savings rate", "0.25", "Linear, full marks at 20% of income saved, zero at 0%"],
    ["Expense-to-income", "0.20", "1.0 at ratio \u2264 0.5; 0 at ratio \u2265 1.0"],
    ["Budget adherence", "0.15", "Full marks at \u2264 85% utilisation; zero at \u2265 120%"],
    ["Recurring expense ratio", "0.10", "Full marks at \u2264 30% of spend; zero at \u2265 60%"],
    ["Emergency fund", "0.15", "Months of average expenses covered; full marks at 6 months"],
    ["Diversification", "0.15", "Portfolio-based; not_evaluated in Phase 1 (Phase 3 module)"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(body("Grades band the score: 85+ Excellent, 70+ Good, 55+ Fair, 40+ Needs Work, otherwise At Risk. Because contributions are additive and visible, the user can verify the arithmetic - a deliberate contrast with black-box scoring."));
bodyChildren.push(h2("8.5  Planned Experiments (Phase 2-3 Evaluation Plan)"));
bodyChildren.push(bullet("Expense anomaly detection: statistical threshold vs Isolation Forest on injected outliers; metrics precision, recall, F1.", "Experiment 1"));
bodyChildren.push(bullet("Financial news sentiment: rule-based vs TF-IDF + linear SVM vs distilled transformer on a labelled sample; metrics accuracy, precision, recall, F1.", "Experiment 2"));
bodyChildren.push(bullet("Expense forecasting: moving average vs Holt linear vs ARIMA vs gradient boosting with walk-forward validation; metrics MAE, RMSE, MAPE.", "Experiment 3"));
bodyChildren.push(bullet("Explainable investment scoring: transparent weighted scoring vs opaque baseline; comprehensibility study plus factor ablation.", "Experiment 4"));

/* ---- Chapter 9 ---- */
bodyChildren.push(h1("Chapter 9  Implementation"));
bodyChildren.push(h2("9.1  Repository Layout"));
bodyChildren.push(body("The project is a monorepo: backend/ (FastAPI application - core, db, models, schemas, services, analytics, api/routes - plus tests and scripts), frontend/ (React + TypeScript application), docs/ (ten architecture documents, 01-10), docker-compose.yml, and a root README. The analysis engine lives in backend/app/analytics as four pure modules: aggregation, anomaly, insights and health_score."));
bodyChildren.push(h2("9.2  Backend Implementation"));
bodyChildren.push(body("The service layer encapsulates all orchestration. auth_service handles the credential lifecycle including lockout and rotation; expense_service covers expenses, categories, incomes and budgets with live utilisation computation; analytics_service assembles bounded windows of user data and feeds the pure engine; admin_service exposes operational aggregates only; audit_service appends the immutable trail. Startup initialises the schema, ensures the twelve system categories, and waits for database readiness."));
bodyChildren.push(h2("9.3  Frontend Implementation"));
bodyChildren.push(body("The SPA implements a glassmorphism design system on an ambient aurora background with a dark/light-capable token set. A thin typed API client performs silent JWT refresh-and-retry on 401. Route guards enforce authentication; the disclaimer gate precedes registration; role gating exposes the admin console to admins only. Charts are Recharts-based (donut, bar, line, area) with muted axes and direct value labels."));
bodyChildren.push(h2("9.4  Interface Walkthrough"));
bodyChildren.push(body("The following captures are taken from the running containerised deployment (production build, nginx on port 8080, PostgreSQL backend) with a seeded demo account carrying two months of transactions."));
bodyChildren.push(...figure("01-disclaimer.png", "Figure 1: Versioned investment risk disclaimer - acknowledgement is mandatory and recorded server-side"));
bodyChildren.push(...figure("02-dashboard.png", "Figure 2: Dashboard - financial snapshot, six-month cash-flow, evidence-backed AI insights, budget utilisation"));
bodyChildren.push(...figure("03-expenses.png", "Figure 3: Expense manager - filters, search, pagination, custom categories, recurring and tag support"));
bodyChildren.push(...figure("04-budgets.png", "Figure 4: Budgets - live utilisation bars with threshold alerts"));
bodyChildren.push(...figure("05-analytics.png", "Figure 5: Expense analytics - monthly trend, category distribution, top merchants, anomaly flags"));
bodyChildren.push(...figure("06-health.png", "Figure 6: Financial health - transparent score with per-factor weights, contributions and suggestions"));
bodyChildren.push(...figure("07-insights.png", "Figure 7: AI insights feed - each card exposes its underlying evidence"));
bodyChildren.push(...figure("08-admin-overview.png", "Figure 8: Admin console - operational metrics only; user financial data is never exposed"));
bodyChildren.push(...figure("09-admin-users.png", "Figure 9: Admin user management - activation, role changes, audit trail and login-activity views"));

/* ---- Chapter 10 ---- */
bodyChildren.push(h1("Chapter 10  Testing and Results"));
bodyChildren.push(h2("10.1  Test Strategy"));
bodyChildren.push(body("The suite follows the test pyramid. Unit tests exercise the pure analytics engine without I/O; integration tests drive the real application over an isolated SQLite database per test, seeding exclusively through the public API so behaviour - not implementation - is verified. Financial assertions use approximate comparison throughout."));
bodyChildren.push(h2("10.2  Test Inventory and Outcome"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Suite", "Coverage", "Tests", "Result"],
  [28, 44, 12, 16],
  [
    ["Analytics engine (unit)", "Aggregation, MoM/YoY, distribution, weekend split, recurring detection, z-score guards, all six insight rules, score weight redistribution", "17", "Pass"],
    ["Authentication (integration)", "Register (email/mobile/duplicate), disclaimer gate, lockout, refresh rotation, logout revocation, password change/reset, sessions, RBAC denial", "13", "Pass"],
    ["Expenses & categories (integration)", "CRUD, validation, filters, pagination, cross-user isolation, category lifecycle guards, income flow", "7", "Pass"],
    ["Budgets, analytics & admin (integration)", "Budget math and alerts, dashboard/trends/categories payloads, anomaly and insight shapes, health factors, admin flows, self-deactivation guard", "10", "Pass"],
    ["Total", "", "47", "All pass"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(h2("10.3  End-to-End Verification"));
bodyChildren.push(body("A scripted journey exercises the deployed system exactly as a demonstration would: disclaimer fetch, registration, income and expense creation, budget creation, listing, dashboard and analytics retrieval, insight generation, health scoring, RBAC refusal of a non-admin on admin endpoints, admin login and administrative views. The journey passes in full against both the development and the containerised PostgreSQL deployment, with the demo dataset producing two evidence-backed insights, a 94.1% budget utilisation triggering the 50/75/90 alert chain, and a health score of 95 (Excellent) with five of six factors evaluated - diversification correctly reported as not evaluated."));
bodyChildren.push(h2("10.4  Observations"));
bodyChildren.push(bullet("Data-sufficiency guards behaved as designed: with sparse history the anomaly detector stays silent instead of fabricating flags."));
bodyChildren.push(bullet("Weight redistribution kept the health score arithmetically consistent when the diversification factor was unavailable."));
bodyChildren.push(bullet("Refresh-token rotation invalidated replayed tokens immediately in every attempt, and revocation propagated to logout within the same session."));

/* ---- Chapter 11 ---- */
bodyChildren.push(h1("Chapter 11  Deployment"));
bodyChildren.push(h2("11.1  Development Setup"));
bodyChildren.push(body("The backend runs from a virtual environment (requirements.txt) with a .env file supplying SECRET_KEY, DATABASE_URL, CORS origins and the disclaimer version; a seed script creates system categories and the initial administrator. The frontend runs under the Vite dev server, which proxies /api to the backend so the browser sees a single origin."));
bodyChildren.push(h2("11.2  Containerised Stack"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Service", "Image / Build", "Port", "Role"],
  [18, 34, 14, 34],
  [
    ["postgres", "postgres:16-alpine", "5432", "Primary datastore (volume-persisted), health-checked"],
    ["redis", "redis:7-alpine", "6379", "Provisioned for Phase 2+ caching and job queues"],
    ["api", "Built (python:3.11-slim)", "8000", "FastAPI application; waits for database readiness at startup"],
    ["web", "Built (node build + nginx)", "8080", "Production SPA bundle; reverse-proxies /api to the API container"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(body("Secrets are injected via environment; .env files are git-ignored and .env.example documents every key. The API image excludes tests, virtual environments and local databases through .dockerignore, and no API key or secret ever reaches the frontend bundle."));
bodyChildren.push(h2("11.3  Operational Behaviour"));
bodyChildren.push(body("The startup sequence demonstrates the reliability requirement: on first boot the API container encountered a momentarily refusing database and, rather than crashing permanently, waited for readiness and completed initialisation - schema creation, category seeding and service start - without manual intervention. A /healthz endpoint reports application and database status for orchestrators."));

/* ---- Chapter 12 ---- */
bodyChildren.push(h1("Chapter 12  Limitations and Future Work"));
bodyChildren.push(h2("12.1  Current Limitations"));
bodyChildren.push(bullet("Investment analytics are not yet implemented; market-data panels correctly display 'Data unavailable' rather than fabricated values."));
bodyChildren.push(bullet("The rate limiter and password-reset delivery carry the Phase 1 constraints documented in Chapter 7."));
bodyChildren.push(bullet("Forecasting and learned models await sufficient historical data by design - guards refuse to run on thin data."));
bodyChildren.push(h2("12.2  Phase 2 - Investment Analytics"));
bodyChildren.push(body("Provider abstraction (FinancialDataProvider interface) with a first provider and response caching; stock analyzer covering fundamentals, statement interpretation and technical indicators (SMA/EMA, RSI, MACD, Bollinger, drawdown); news ingestion from legitimate APIs; the Experiment 2 sentiment comparison; a valuation engine with DCF (editable assumptions and sensitivity grids), PE, PEG, EV/EBITDA and DDM; explainable stock scoring; PDF research reports; Alembic migrations begin."));
bodyChildren.push(h2("12.3  Phase 3 - Portfolio Intelligence and Financial Planning"));
bodyChildren.push(body("Portfolio analyzer with holdings, allocation and P/L; risk metrics (volatility, maximum drawdown, HHI concentration, beta); benchmark comparison and stress-test scenarios; net-worth tracking; goals engine; FD, SIP, lumpsum and compound-growth calculators; retirement planner and inflation analysis; the Experiment 1 and 3 evaluations."));
bodyChildren.push(h2("12.4  Phase 4 - Intelligent Financial Platform"));
bodyChildren.push(body("Retrieval-augmented research assistant with mandatory citations; LLM summarisation over retrieved context only; background jobs on Redis (ingestion, sentiment batches, report generation); caching and observability; expanded admin analytics; security hardening; Playwright end-to-end suite; performance testing and deployment guide; dissertation documentation freeze."));

/* ---- Chapter 13 ---- */
bodyChildren.push(h1("Chapter 13  Conclusion"));
bodyChildren.push(body("Phase 1 of FinAI demonstrates that an explainable, data-grounded approach to personal financial intelligence is achievable with production engineering discipline. The delivered increment comprises a hardened authentication and authorization core governed by a versioned disclaimer, complete expense and budget management, a multi-granularity analytics engine, and an AI layer - anomaly detection, guarded insights, transparent health scoring - whose every output is either supported by the user's data or withheld. The implementation is verified by 47 passing tests and a scripted end-to-end journey against a containerised, production-shaped deployment."));
bodyChildren.push(body("The phase plan keeps the academic focus on engineering: each subsequent phase adds a well-bounded capability - investment analytics, portfolio intelligence, and finally a retrieval-grounded assistant - behind interfaces that already exist. The result is a platform fit for its four internal reviews, the final demonstration, and the dissertation's methodological chapters."));

/* ---- References ---- */
bodyChildren.push(h1("References"));
const refs = [
  "Ramirez, E. and team, FastAPI: Modern, Fast Web Framework for Building APIs with Python, https://fastapi.tiangolo.com (accessed September 2026).",
  "SQLAlchemy 2.0 Documentation, SQLAlchemy authors, https://docs.sqlalchemy.org (accessed September 2026).",
  "React - A JavaScript Library for Building User Interfaces, Meta Open Source, https://react.dev (accessed September 2026).",
  "Recharts: A Composable Charting Library Built on React Components, https://recharts.org (accessed September 2026).",
  "Provos, N. and Mazieres, D., A Future-Adaptable Password Scheme (bcrypt), Proceedings of the USENIX Annual Technical Conference, 1999.",
  "Jones, M., Bradley, J. and Sakimura, N., RFC 7519: JSON Web Token (JWT), IETF, 2015.",
  "Liu, F. T., Ting, K. M. and Zhou, Z.-H., Isolation Forest, Proceedings of the IEEE International Conference on Data Mining, 2008.",
  "Hyndman, R. J. and Athanasopoulos, G., Forecasting: Principles and Practice, 3rd ed., OTexts, 2021.",
  "PostgreSQL 16 Documentation, The PostgreSQL Global Development Group, https://www.postgresql.org/docs/ (accessed September 2026).",
  "Graham, B., The Intelligent Investor, Harper & Brothers, 1949 (valuation principles referenced for Phase 2).",
  "Docker Documentation, Docker Inc., https://docs.docker.com (accessed September 2026).",
  "Pydantic Documentation - Data Validation Using Python Type Hints, https://docs.pydantic.dev (accessed September 2026).",
];
refs.forEach((r, i) => bodyChildren.push(new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { line: 312, after: 100 },
  indent: { left: 360, hanging: 360 },
  children: [new TextRun({ text: `[${i + 1}]  ${r}`, size: 22, color: P.body, font: EN })],
})));

/* ---- Appendix A ---- */
bodyChildren.push(h1("Appendix A  REST API Catalogue (Phase 1)"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Group", "Method & Path", "Purpose"],
  [16, 46, 38],
  [
    ["Auth", "POST /auth/register", "Create account with disclaimer acceptance"],
    ["Auth", "POST /auth/login", "Authenticate; lockout after 5 failures"],
    ["Auth", "POST /auth/refresh", "Rotate access + refresh tokens"],
    ["Auth", "POST /auth/logout", "Revoke the presented refresh session"],
    ["Auth", "GET/PATCH /auth/me", "Profile view / update"],
    ["Auth", "POST /auth/change-password", "Change password (requires current)"],
    ["Auth", "GET/DELETE /auth/sessions", "List active sessions / revoke one"],
    ["Auth", "POST /auth/password/forgot | /reset", "Dev-visible token; single-use reset, sessions revoked"],
    ["Finance", "GET/POST /expenses; GET/PATCH/DELETE /expenses/{id}", "Expense list (filters, search, paging) and CRUD"],
    ["Finance", "GET/POST /categories; DELETE /categories/{id}", "System + custom categories with usage guards"],
    ["Finance", "GET/POST /incomes; PATCH/DELETE /incomes/{id}", "Income CRUD"],
    ["Finance", "GET/POST /budgets; PATCH/DELETE /budgets/{id}", "Budgets with live utilisation and alerts"],
    ["Analytics", "GET /analytics/dashboard", "One-shot dashboard payload"],
    ["Analytics", "GET /analytics/summary | trends | categories", "Period totals, monthly series, distributions"],
    ["Analytics", "GET /analytics/anomalies | insights | health-score", "AI outputs with evidence"],
    ["Admin", "GET /admin/overview", "Users, DAU/MAU, feature usage, system health"],
    ["Admin", "GET /admin/users; PATCH /admin/users/{id}", "Search and manage accounts (activate, role)"],
    ["Admin", "GET /admin/audit-logs | login-activity", "Security trail and login timeline"],
    ["Meta", "GET /healthz; GET /config/disclaimer", "Liveness with DB check; public disclaimer"],
  ]
));
bodyChildren.push(spacer());

/* ---- Appendix B ---- */
bodyChildren.push(h1("Appendix B  Risk Register"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["#", "Risk", "L", "I", "Mitigation"],
  [5, 37, 7, 7, 44],
  [
    ["1", "Data provider changes terms or breaks", "H", "H", "Provider abstraction; cached history; never fabricate missing data"],
    ["2", "External API quota exhaustion", "M", "M", "Server-side caching with freshness; staggered ingestion (P2)"],
    ["3", "LLM hallucination in research answers", "M", "H", "RAG with mandatory citations; refuse when retrieval is empty"],
    ["4", "Weak sentiment accuracy on finance text", "M", "M", "Three-model comparison experiment before selection; rule-based fallback"],
    ["5", "Scope creep", "H", "H", "Strict four-phase plan; demo-first increments"],
    ["6", "Insufficient history for forecasting", "M", "M", "Minimum-data guards refuse to run"],
    ["7", "Secret leakage", "L", "H", "Backend-only env; git-ignored .env; no keys in frontend"],
    ["8", "Credential stuffing", "M", "M", "Rate limiting + lockout + audit alerts (implemented)"],
    ["9", "Password reset without SMTP", "M", "M", "Dev-only token exposure; SMTP tracked for P2"],
    ["10", "SQLite to PostgreSQL drift", "L", "M", "Portable types; compose ships PostgreSQL; tested"],
    ["11", "Performance on large histories", "L", "M", "Indexes, pagination, bounded windows; profiling in P4"],
    ["12", "Single-process rate-limit state", "L", "L", "Interface limiter; Redis backing in P4"],
    ["13", "Platform mistaken for advice", "M", "H", "Disclaimer gate; analysis-not-advice framing throughout"],
    ["14", "Timeline pressure across reviews", "M", "M", "Milestones M1-M8; riskiest integration early in P2"],
  ]
));
bodyChildren.push(spacer());

/* ---- Appendix C ---- */
bodyChildren.push(h1("Appendix C  Four-Phase Roadmap and Review Plan"));
bodyChildren.push(spacer(60));
bodyChildren.push(table(
  ["Phase", "Focus", "Review Emphasis", "Status"],
  [14, 38, 34, 14],
  [
    ["Phase 1", "Foundation: architecture, auth, expenses, budgets, analytics, guarded AI insights, health score, admin", "Can we build it? Architecture, stack, ER, security, initial AI", "Complete"],
    ["Phase 2", "Investment analytics: providers, stock analyzer, valuation, sentiment, PDF reports", "Can we analyse financial data intelligently? DCF math, NLP, explainability", "Planned"],
    ["Phase 3", "Portfolio intelligence and planning: holdings, risk, stress tests, calculators, goals", "Can we integrate portfolio intelligence and planning?", "Planned"],
    ["Phase 4", "Intelligent platform: RAG assistant, jobs, caching, observability, hardening, e2e", "Can we demonstrate a complete AI-driven platform?", "Planned"],
  ]
));
bodyChildren.push(spacer());
bodyChildren.push(body("Final demonstration flow: disclaimer, registration, dashboard, income and expense recording, analytics, AI insight, stock analysis, valuation, sentiment, research report, portfolio and stress test, calculators, PDF report, and admin monitoring with the audit trail - each step mapping one-to-one onto a delivered or planned module."));

/* ============================================================ DOCUMENT */
const doc = new Document({
  creator: "FinAI",
  title: "FinAI - M.Tech Project Documentation (Phase 1)",
  styles: {
    default: {
      document: {
        run: { font: EN, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: EN_HEAD, size: 32, bold: true, color: P.h1 } },
      heading2: { run: { font: EN_HEAD, size: 28, bold: true, color: P.h2 } },
    },
  },
  sections: [
    { // 1. cover
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1({
        title: "FinAI",
        subtitleLines: [
          "An AI-Driven Personal Finance, Investment Analytics",
          "and Financial Intelligence Platform",
        ],
        englishLabel: "FINAI",
        metaLines: [
          "M.Tech Dissertation Project",
          "Phase 1: Foundation & Core Financial Management",
          "Internal Review 1 - Documentation",
          "September 2026",
        ],
        footerLeft: "Department of Computer Science & Engineering",
        footerRight: "Version 1.0",
      }),
    },
    { // 2. front matter (Roman)
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      headers: { default: docHeader() },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Executive Summary", bold: true, size: 32, font: EN_HEAD, color: P.h1 })],
        }),
        body("FinAI is a full-stack web platform that unifies personal expense management, budget intelligence, statistical analytics and explainable AI-generated insight under one secure, disclaimer-governed system. This document presents the complete Phase 1 engineering record: problem statement and research gap, layered architecture and technology-stack justification, database and API design, security architecture, the AI/ML methodology with explicit formulas and guards, implementation walkthrough with interface captures, the testing record (47 passing tests plus a scripted end-to-end journey), containerised deployment, and the four-phase roadmap through which investment analytics, portfolio intelligence and a retrieval-augmented research assistant will be layered onto the delivered foundation."),
        body("The defining engineering commitment is explainability with integrity: every insight cites the aggregated data that produced it, the anomaly detector reports its reference statistics, and the financial health score exposes every factor's weight and contribution. Where data is insufficient, the system reports that fact instead of inventing output - a discipline the dissertation carries into all later phases."),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: EN_HEAD, color: P.h1 })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888", font: EN,
          })],
        }),
      ],
    },
    { // 3. body (Arabic from 1)
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: docHeader() },
      footers: { default: pageFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("WROTE", OUT, buf.length, "bytes");
});
