/* FinAI - M.Tech Review 1 presentation (pptxgenjs).
 * Palette (product brand): BG ink #0B1120, PRIMARY aurora #6E83FF, ACCENT mint #34D399.
 * Motif: rupee logo square + glass cards with soft shadows. Dark throughout.
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const SHOTS = path.join(__dirname, "screenshots");
const OUT = path.join(__dirname, "FinAI_Review1_Presentation.pptx");

const BG = "0B1120", CARD = "141E33", CARD2 = "18233A";
const PRIMARY = "6E83FF", PRIMARY_DIM = "3D4ED9";
const ACCENT = "34D399", AMBER = "FBBF24", ROSE = "FB7185";
const TEXT = "E2E8F0", MUTED = "94A3B8", FAINT = "64748B";
const F = "Arial";

const W = 13.33, H = 7.5, M = 0.6;

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.author = "FinAI";
p.title = "FinAI - M.Tech Review 1";

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.35 });

function card(s, x, y, w, h, fill = CARD) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: fill }, rectRadius: 0.09, shadow: shadow(),
    line: { color: "223050", width: 0.75 },
  });
}

function logo(s, x = M, y = 0.42, size = 0.46) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, {
    x, y, w: size, h: size, fill: { color: PRIMARY_DIM }, rectRadius: 0.08,
  });
  s.addText("\u20B9", {
    x, y: y - 0.02, w: size, h: size, align: "center", valign: "middle",
    fontSize: 20, bold: true, color: "FFFFFF", fontFace: F, margin: 0,
  });
}

function header(s, title, kicker) {
  logo(s);
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 1.22, y: 0.30, w: 9.5, h: 0.3, fontSize: 11, color: PRIMARY,
      fontFace: F, charSpacing: 3, bold: true, margin: 0,
    });
    s.addText(title, {
      x: 1.22, y: 0.56, w: 11.4, h: 0.62, fontSize: 26, bold: true, color: "FFFFFF",
      fontFace: F, margin: 0,
    });
  } else {
    s.addText(title, {
      x: 1.22, y: 0.42, w: 11.4, h: 0.62, fontSize: 26, bold: true, color: "FFFFFF",
      fontFace: F, margin: 0, valign: "middle",
    });
  }
}

function footer(s, n) {
  s.addText(`FinAI  \u00B7  M.Tech Review 1  \u00B7  Phase 1`, {
    x: M, y: 7.08, w: 6, h: 0.3, fontSize: 10, color: FAINT, fontFace: F, margin: 0,
  });
  s.addText(String(n), {
    x: W - 1.0, y: 7.08, w: 0.4, h: 0.3, fontSize: 10, color: FAINT,
    fontFace: F, align: "right", margin: 0,
  });
}

function dotRow(s, x, y, w, lead, text, dotColor = PRIMARY) {
  s.addShape(p.shapes.OVAL, { x, y: y + 0.09, w: 0.09, h: 0.09, fill: { color: dotColor } });
  const runs = [];
  if (lead) runs.push({ text: lead + "  ", options: { bold: true, color: "FFFFFF" } });
  runs.push({ text, options: { color: TEXT } });
  s.addText(runs, {
    x: x + 0.22, y, w: w - 0.22, h: 0.42, fontSize: 13, fontFace: F, margin: 0, valign: "top",
  });
}

function shot(s, file, x, y, w) {
  const h = w * 900 / 1600;
  s.addImage({ path: path.join(SHOTS, file), x, y, w, h });
  s.addShape(p.shapes.RECTANGLE, {
    x, y, w, h, fill: { type: "none" }, line: { color: "33415E", width: 1 },
  });
  return h;
}

/* ============================================================ 1 TITLE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  // ambient glow blobs
  s.addShape(p.shapes.OVAL, { x: 9.4, y: -1.6, w: 6.2, h: 6.2, fill: { color: PRIMARY_DIM, transparency: 82 } });
  s.addShape(p.shapes.OVAL, { x: -1.8, y: 4.8, w: 5.6, h: 5.6, fill: { color: "14532D", transparency: 84 } });

  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.35, w: 0.95, h: 0.95, fill: { color: PRIMARY_DIM }, rectRadius: 0.16, shadow: shadow() });
  s.addText("\u20B9", { x: M, y: 1.31, w: 0.95, h: 0.95, align: "center", valign: "middle", fontSize: 44, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });

  s.addText("FinAI", { x: M, y: 2.45, w: 10.5, h: 1.25, fontSize: 66, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  s.addText("An AI-Driven Personal Finance, Investment Analytics and\nFinancial Intelligence Platform", {
    x: M, y: 3.72, w: 10.6, h: 0.95, fontSize: 19, color: TEXT, fontFace: F, margin: 0,
  });
  s.addText([
    { text: "M.TECH D I S S E R T A T I O N   \u00B7   INTERNAL REVIEW 1", options: { color: PRIMARY, bold: true, breakLine: true } },
    { text: "Phase 1 - Foundation & Core Financial Management", options: { color: MUTED, breakLine: true } },
    { text: "September 2026", options: { color: MUTED } },
  ], { x: M, y: 5.35, w: 9, h: 1.15, fontSize: 13, fontFace: F, margin: 0, paraSpaceAfter: 4 });
  s.addNotes("Introduce the project in one line: a single platform where daily expenses, budgets and AI-generated, evidence-backed insight live together. Phase 1 is complete and demoable end to end.");
}

/* ============================================================ 2 AGENDA */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Agenda", "Review 1");
  const items = [
    ["01", "Problem statement & existing system limitations"],
    ["02", "Research gap and proposed system objectives"],
    ["03", "System architecture & technology stack"],
    ["04", "Database, API and security design"],
    ["05", "Phase 1 AI module: anomalies, insights, health score"],
    ["06", "UI prototype, implementation status & test results"],
    ["07", "Limitations and the Phase 2 roadmap"],
  ];
  items.forEach(([n, t], i) => {
    const y = 1.55 + i * 0.72;
    card(s, M, y, 12.13, 0.58, i % 2 ? CARD : CARD2);
    s.addText(n, { x: M + 0.25, y: y + 0.05, w: 0.7, h: 0.48, fontSize: 16, bold: true, color: PRIMARY, fontFace: F, margin: 0, valign: "middle" });
    s.addText(t, { x: M + 1.05, y: y + 0.05, w: 10.8, h: 0.48, fontSize: 14, color: TEXT, fontFace: F, margin: 0, valign: "middle" });
  });
  footer(s, 2);
}

/* ============================================================ 3 PROBLEM */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Problem Statement", "Why this project");
  card(s, M, 1.55, 12.13, 1.5, CARD2);
  s.addText([
    { text: "Existing tools record financial life but never explain it. ", options: { bold: true, color: "FFFFFF" } },
    { text: "Scores are black boxes, investment analysis is divorced from daily behaviour, and AI output - where it exists - is unsupported by the user's actual data.", options: { color: TEXT } },
  ], { x: M + 0.35, y: 1.75, w: 11.4, h: 1.1, fontSize: 16.5, fontFace: F, margin: 0 });

  const pains = [
    ["Passive tracking", "Apps display spending but never interpret change, cause or action.", ROSE],
    ["Black-box scores", "A number appears with no factors, weights or arithmetic to verify.", AMBER],
    ["Ungrounded AI", "Generic tips that no dataset supports - hallucination, not analysis.", PRIMARY],
  ];
  pains.forEach(([t, d, c], i) => {
    const x = M + i * 4.18;
    card(s, x, 3.45, 3.86, 2.6);
    s.addText("\u25A0", { x: x + 0.3, y: 3.75, w: 0.4, h: 0.4, fontSize: 18, color: c, fontFace: F, margin: 0 });
    s.addText(t, { x: x + 0.3, y: 4.2, w: 3.3, h: 0.4, fontSize: 16.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.3, y: 4.66, w: 3.3, h: 1.2, fontSize: 12.5, color: MUTED, fontFace: F, margin: 0 });
  });
  s.addText("Target: an integrated, explainable, data-grounded financial intelligence platform.", {
    x: M, y: 6.45, w: 12.1, h: 0.4, fontSize: 13, italic: true, color: ACCENT, fontFace: F, margin: 0,
  });
  footer(s, 3);
}

/* ============================================================ 4 EXISTING SYSTEMS */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Existing System Limitations", "Literature survey");
  const rows = [
    ["Spreadsheet budgets", "Manual, error-prone, zero automation or anomaly detection"],
    ["Bank / UPI apps", "Capture transactions but only record - no interpretation"],
    ["Expense trackers", "Charts without meaning: no guards, no evidence, no scoring"],
    ["Investment trackers", "Detached from daily spending; opaque return metrics"],
    ["Robo-advisory tools", "Black-box recommendations; advice, not education"],
  ];
  rows.forEach(([t, d], i) => {
    const y = 1.6 + i * 0.98;
    card(s, M, y, 12.13, 0.84);
    s.addText(t, { x: M + 0.32, y: y + 0.1, w: 3.4, h: 0.64, fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0, valign: "middle" });
    s.addText(d, { x: M + 3.9, y: y + 0.1, w: 7.9, h: 0.64, fontSize: 13, color: MUTED, fontFace: F, margin: 0, valign: "middle" });
  });
  s.addNotes("Five tool families surveyed. The pattern: recording is solved, explanation is not.");
  footer(s, 4);
}

/* ============================================================ 5 RESEARCH GAP */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Research Gap \u2192 FinAI Answer", "From survey to proposal");
  const gaps = [
    ["Tracking without explanation", "Guarded insight engine: every insight cites its evidence"],
    ["Black-box scores", "Weighted health score with visible per-factor contributions"],
    ["No integrated research", "Stock analyzer + valuation + sentiment (Phase 2, provider-abstracted)"],
    ["AI without grounding", "RAG assistant with mandatory citations; refuses on empty retrieval (P4)"],
    ["Planning divorced from behaviour", "Goals & calculators consume the user's real expense history (P3)"],
  ];
  gaps.forEach(([g, a], i) => {
    const y = 1.55 + i * 1.02;
    s.addText(String(i + 1), { x: M, y: y + 0.12, w: 0.75, h: 0.7, fontSize: 30, bold: true, color: PRIMARY, fontFace: F, margin: 0 });
    card(s, M + 0.85, y, 11.28, 0.88);
    s.addText(g, { x: M + 1.15, y: y + 0.09, w: 4.6, h: 0.7, fontSize: 13.5, bold: true, color: ROSE, fontFace: F, margin: 0, valign: "middle" });
    s.addText("\u2192", { x: M + 5.8, y: y + 0.09, w: 0.5, h: 0.7, fontSize: 16, color: FAINT, fontFace: F, margin: 0, valign: "middle" });
    s.addText(a, { x: M + 6.35, y: y + 0.09, w: 5.6, h: 0.7, fontSize: 12.5, color: TEXT, fontFace: F, margin: 0, valign: "middle" });
  });
  footer(s, 5);
}

/* ============================================================ 6 PROPOSED SYSTEM */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Proposed System & Objectives", "What Phase 1 delivers");
  card(s, M, 1.5, 5.9, 5.2);
  s.addText("Objectives", { x: M + 0.3, y: 1.72, w: 5, h: 0.4, fontSize: 17, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const objs = [
    "Secure layered architecture with RBAC and versioned disclaimer governance",
    "Expense, income and budget management with threshold alerts",
    "Statistically grounded AI: anomaly detection, guarded insights, transparent scoring",
    "Measurable evaluation for every model (precision / recall / F1 / MAPE)",
    "Phase 2-4: investment analytics \u2192 portfolio intelligence \u2192 RAG assistant",
  ];
  objs.forEach((o, i) => dotRow(s, M + 0.32, 2.28 + i * 0.85, 5.35, "", o, i === 4 ? ACCENT : PRIMARY));

  card(s, 6.85, 1.5, 5.88, 5.2, CARD2);
  s.addText("Explicitly out of scope", { x: 7.15, y: 1.72, w: 5.2, h: 0.4, fontSize: 17, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  s.addText([
    { text: "No F&O recommendations", options: { bold: true, color: ROSE, breakLine: true } },
    { text: "Derivatives trading is outside platform scope - higher complexity and risk. Stated in the product itself.", options: { color: MUTED, breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "Not investment advice", options: { bold: true, color: ROSE, breakLine: true } },
    { text: "Analytical and educational only. A versioned risk disclaimer must be accepted before use; acceptance (version, IP, time) is stored.", options: { color: MUTED } },
  ], { x: 7.15, y: 2.3, w: 5.3, h: 2.6, fontSize: 13, fontFace: F, margin: 0, paraSpaceAfter: 6 });
  const chips = [["47", "tests passing"], ["35", "REST endpoints"], ["8", "DB entities"], ["4", "dev phases"]];
  chips.forEach(([n, t], i) => {
    const x = 7.15 + (i % 2) * 2.7, y = 5.05 + Math.floor(i / 2) * 0.85;
    s.addText(n, { x, y, w: 1.1, h: 0.6, fontSize: 28, bold: true, color: ACCENT, fontFace: F, margin: 0 });
    s.addText(t, { x: x + 1.05, y: y + 0.14, w: 1.6, h: 0.5, fontSize: 11, color: MUTED, fontFace: F, margin: 0 });
  });
  footer(s, 6);
}

/* ============================================================ 7 ARCHITECTURE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "System Architecture", "Layered discipline");
  const layers = [
    ["Browser SPA", "React 18 + TypeScript + Tailwind - glassmorphism dashboard", "1A6EF5"],
    ["API routes", "FastAPI \u00B7 validation \u00B7 JWT auth \u00B7 RBAC \u00B7 rate limiting", "2F5FE0"],
    ["Services", "Business rules: auth, expenses, budgets, analytics, admin, audit", "4A4AC9"],
    ["Analysis engine", "Pure functions - aggregation \u00B7 anomaly \u00B7 insights \u00B7 scoring (no I/O)", "3A8FA3"],
    ["Data access", "SQLAlchemy 2.0 models + session scoping", "2E8B6E"],
  ];
  layers.forEach(([t, d, c], i) => {
    const y = 1.5 + i * 0.92;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 7.5, h: 0.76, fill: { color: CARD }, rectRadius: 0.07, line: { color: c, width: 1.2 }, shadow: shadow() });
    s.addText(t, { x: M + 0.28, y: y + 0.06, w: 2.35, h: 0.62, fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0, valign: "middle" });
    s.addText(d, { x: M + 2.7, y: y + 0.06, w: 4.65, h: 0.62, fontSize: 11.5, color: MUTED, fontFace: F, margin: 0, valign: "middle" });
    if (i < layers.length - 1) {
      s.addShape(p.shapes.LINE, { x: M + 1.1, y: y + 0.76, w: 0, h: 0.16, line: { color: FAINT, width: 1.5, endArrowType: "triangle" } });
    }
  });
  s.addShape(p.shapes.LINE, { x: M + 1.1, y: 6.1, w: 0, h: 0.18, line: { color: FAINT, width: 1.5, dashType: "dash" } });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 6.28, w: 7.5, h: 0.62, fill: { color: CARD2 }, rectRadius: 0.07, line: { color: "33415E", width: 1, dashType: "dash" } });
  s.addText("PostgreSQL (prod) / SQLite (dev)      \u00B7      Redis + external providers reserved for Phase 2+", {
    x: M + 0.28, y: 6.33, w: 7.1, h: 0.5, fontSize: 11.5, color: MUTED, fontFace: F, margin: 0, valign: "middle",
  });

  card(s, 8.6, 1.5, 4.13, 5.4);
  s.addText("Layer rules", { x: 8.9, y: 1.7, w: 3.6, h: 0.4, fontSize: 16, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const rules = [
    ["Routes", "never contain business logic"],
    ["Services", "never touch HTTP constructs"],
    ["Engine", "pure computation - unit-testable without I/O"],
    ["Data", "no business rules"],
  ];
  rules.forEach(([a, b], i) => dotRow(s, 8.9, 2.25 + i * 0.92, 3.6, a, b));
  s.addText("Startup waits for database readiness; /healthz reports app + DB status.", {
    x: 8.9, y: 6.0, w: 3.55, h: 0.75, fontSize: 11, italic: true, color: ACCENT, fontFace: F, margin: 0,
  });
  footer(s, 7);
}

/* ============================================================ 8 STACK */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Technology Stack & Justification", "Choices with reasons");
  const stack = [
    ["Backend", "FastAPI + Pydantic v2", "Async, typed contracts, auto-OpenAPI; fits Python ML ecosystem"],
    ["Database", "PostgreSQL 16 / SQLite dev", "One SQLAlchemy schema - zero-setup laptop demo, production-grade deploy"],
    ["Auth", "JWT 30 min + rotating refresh, bcrypt", "Revocable hashed sessions; no plaintext credentials"],
    ["Frontend", "React 18 + TypeScript + Vite", "Private dashboard: no SSR benefit; fast builds, strict types"],
    ["UI / charts", "Tailwind 3 + Recharts", "Consistent glass design system; light chart composition"],
    ["Testing", "pytest + TestClient", "Isolated DB per test; public-API-driven integration"],
    ["Deploy", "Docker Compose", "postgres + redis + api + nginx web - production-shaped"],
  ];
  stack.forEach(([a, b, c], i) => {
    const y = 1.5 + i * 0.74;
    card(s, M, y, 12.13, 0.62, i % 2 ? CARD : CARD2);
    s.addText(a, { x: M + 0.28, y: y + 0.05, w: 1.75, h: 0.52, fontSize: 12.5, bold: true, color: PRIMARY, fontFace: F, margin: 0, valign: "middle" });
    s.addText(b, { x: M + 2.15, y: y + 0.05, w: 3.9, h: 0.52, fontSize: 12.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0, valign: "middle" });
    s.addText(c, { x: M + 6.2, y: y + 0.05, w: 5.75, h: 0.52, fontSize: 11, color: MUTED, fontFace: F, margin: 0, valign: "middle" });
  });
  footer(s, 8);
}

/* ============================================================ 9 DATABASE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Database Design", "Phase 1 entities");
  const ents = ["users", "session_tokens", "disclaimer_acceptances", "password_reset_tokens", "expense_categories", "expenses", "incomes", "budgets", "audit_logs"];
  ents.forEach((e, i) => {
    const x = M + (i % 3) * 2.62, y = 1.5 + Math.floor(i / 3) * 0.86;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.44, h: 0.7, fill: { color: CARD }, rectRadius: 0.07, line: { color: "2E8B6E", width: 1 } });
    s.addText(e, { x: x + 0.12, y: y + 0.05, w: 2.2, h: 0.6, fontSize: 12.5, bold: true, color: TEXT, fontFace: F, margin: 0, valign: "middle" });
  });

  card(s, M, 4.35, 12.13, 2.35, CARD2);
  s.addText("Design decisions", { x: M + 0.3, y: 4.52, w: 5, h: 0.4, fontSize: 16, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const dec = [
    ["Money = Numeric(14,2)", "floating point never touches currency"],
    ["Soft deletion", "analytics history survives corrections"],
    ["Token digests only", "HMAC-SHA256 of refresh tokens; a DB leak yields nothing usable"],
    ["Composite indexes", "(user_id, expense_date) \u00B7 (user_id, category_id) \u00B7 token_hash unique"],
    ["System vs custom categories", "system rows shared, deletion-guarded at service layer"],
  ];
  dec.forEach(([a, b], i) => dotRow(s, M + 0.32, 5.05 + i * 0.42, 11.5, a + " -", b, ACCENT));
  footer(s, 9);
}

/* ============================================================ 10 AUTH FLOW */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Authentication Architecture", "JWT + rotating refresh");
  const steps = [
    ["1", "Login", "bcrypt verify; 5 failures \u2192 15 min lock; audit-logged"],
    ["2", "Token pair", "access JWT 30 min (jti) + refresh 14 days stored as HMAC digest"],
    ["3", "Refresh rotates", "used token revoked & replaced - replay fails fast"],
    ["4", "Sessions", "list devices, revoke any; logout revokes server-side"],
  ];
  steps.forEach(([n, t, d], i) => {
    const x = M + i * 3.13;
    card(s, x, 1.6, 2.86, 2.15);
    s.addText(n, { x: x + 0.24, y: 1.75, w: 0.8, h: 0.6, fontSize: 26, bold: true, color: PRIMARY, fontFace: F, margin: 0 });
    s.addText(t, { x: x + 0.24, y: 2.36, w: 2.4, h: 0.36, fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.24, y: 2.74, w: 2.42, h: 0.92, fontSize: 10.5, color: MUTED, fontFace: F, margin: 0 });
    if (i < 3) s.addShape(p.shapes.LINE, { x: x + 2.86, y: 2.67, w: 0.27, h: 0, line: { color: FAINT, width: 1.5, endArrowType: "triangle" } });
  });

  card(s, M, 4.15, 12.13, 2.5, CARD2);
  s.addText("Disclaimer governance & hardening", { x: M + 0.3, y: 4.32, w: 8, h: 0.4, fontSize: 16, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const hard = [
    ["Versioned disclaimer", "acceptance (version, IP, timestamp) persisted; login blocked until current version accepted"],
    ["Brute force", "per-IP rate limit 10/5 min + account lockout + failure audit"],
    ["Reset flow", "single-use expiring hashed tokens; dev-only visibility; all sessions revoked on reset"],
    ["Transport", "Authorization-header tokens only - no cookie CSRF surface; nosniff, DENY, no-store headers"],
  ];
  hard.forEach(([a, b], i) => dotRow(s, M + 0.32, 4.85 + i * 0.44, 11.5, a, b, i === 0 ? ACCENT : PRIMARY));
  footer(s, 10);
}

/* ============================================================ 11 EXPENSE MODULE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Expense & Budget Management", "Module walkthrough");
  const feats = [
    ["Full metadata", "date, amount, category/subcategory, payment method, merchant, tags, notes"],
    ["Recurring flags", "feed the recurring-load insight and recurring-ratio score"],
    ["Custom categories", "12 system categories shared; user categories deletion-guarded"],
    ["Budgets", "monthly/yearly, overall or per category, 50/75/90% alert chain"],
    ["Soft delete + audit", "history preserved; every change recoverable"],
  ];
  feats.forEach(([a, b], i) => dotRow(s, M, 1.75 + i * 0.95, 4.6, a, b));
  s.addText("Budget screens: live utilisation bars, remaining amounts and triggered alerts.", {
    x: M, y: 6.45, w: 4.6, h: 0.6, fontSize: 11, italic: true, color: FAINT, fontFace: F, margin: 0,
  });
  const h1 = shot(s, "03-expenses.png", 5.35, 1.75, 7.35);
  s.addText("Expense manager - filters, search, pagination, custom categories", { x: 5.35, y: 1.81 + h1, w: 7.35, h: 0.3, fontSize: 10.5, italic: true, color: FAINT, fontFace: F, margin: 0, align: "center" });
  footer(s, 11);
}

/* ============================================================ 12 ANOMALY */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "AI Module \u00B7 Anomaly Detection", "Z-score with guards");
  card(s, M, 1.55, 12.13, 1.7, CARD2);
  s.addText("z = (x \u2212 \u03BC) / \u03C3          flag when z > 2.5", {
    x: M + 0.4, y: 1.75, w: 11.3, h: 0.75, fontSize: 24, italic: true, bold: true, color: "FFFFFF", fontFace: F, margin: 0, align: "center",
  });
  s.addText("Two detectors: per-transaction within category \u00B7 daily totals against user baseline", {
    x: M + 0.4, y: 2.55, w: 11.3, h: 0.5, fontSize: 13, color: MUTED, fontFace: F, margin: 0, align: "center",
  });
  const guards = [
    ["\u2265 8 samples", "per category before any transaction flag"],
    ["\u2265 14 days", "of history before daily-total detection"],
    ["\u03BC, \u03C3, z, n reported", "every flag carries its reference statistics and a plain-language explanation"],
    ["Silence over invention", "thin data produces zero flags, by design"],
  ];
  guards.forEach(([a, b], i) => {
    const x = M + (i % 2) * 6.2, y = 3.65 + Math.floor(i / 2) * 1.5;
    card(s, x, y, 5.93, 1.28);
    s.addText(a, { x: x + 0.3, y: y + 0.14, w: 5.3, h: 0.42, fontSize: 16, bold: true, color: ACCENT, fontFace: F, margin: 0 });
    s.addText(b, { x: x + 0.3, y: y + 0.56, w: 5.35, h: 0.62, fontSize: 12, color: MUTED, fontFace: F, margin: 0 });
  });
  s.addText("Every flag: amount \u00B7 mean \u00B7 std \u00B7 z-score \u00B7 sample size \u00B7 explanation", {
    x: M, y: 6.6, w: 12.1, h: 0.35, fontSize: 12.5, italic: true, color: ACCENT, fontFace: F, margin: 0, align: "center",
  });
  footer(s, 12);
}

/* ============================================================ 13 INSIGHTS */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "AI Module \u00B7 Guarded Insight Engine", "Six rules, each citing evidence");
  const rules = [
    ["Category spike", "> 1.2\u00D7 previous month and +\u20B9500", "\u201CFood up 185% - \u20B92,198 vs \u20B9770.\u201D"],
    ["Concentration", "one category > 35% of spend", "\u201CHousing is 71% of this period.\u201D"],
    ["Recurring load", "\u2265 3 merchants over \u2265 3 months", "\u201CNetflix + Spotify \u2248 \u20B9798/month.\u201D"],
    ["Weekend pattern", "weekend avg > 1.3\u00D7 weekday, \u2265 14 days", "\u201CWeekends cost 1.6\u00D7 weekdays.\u201D"],
    ["Savings trend", "rate change > \u00B15 pp, 2 months", "\u201CSavings rate fell 8 points.\u201D"],
    ["Budget pressure", "utilisation crosses threshold", "\u201CFood budget exceeded - 146%.\u201D"],
  ];
  rules.forEach(([t, g, ex], i) => {
    const x = M + (i % 3) * 4.18, y = 1.55 + Math.floor(i / 3) * 2.45;
    card(s, x, y, 3.86, 2.25);
    s.addText(t, { x: x + 0.26, y: y + 0.14, w: 3.35, h: 0.38, fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
    s.addText("fires when  " + g, { x: x + 0.26, y: y + 0.54, w: 3.4, h: 0.62, fontSize: 11, color: MUTED, fontFace: F, margin: 0 });
    s.addText(ex, { x: x + 0.26, y: y + 1.3, w: 3.4, h: 0.75, fontSize: 11.5, italic: true, color: ACCENT, fontFace: F, margin: 0 });
  });
  s.addText("Guard fails \u2192 rule stays silent. Guard passes \u2192 insight + evidence object with the exact figures.", {
    x: M, y: 6.5, w: 12.1, h: 0.4, fontSize: 13, italic: true, color: PRIMARY, fontFace: F, margin: 0, align: "center",
  });
  footer(s, 13);
}

/* ============================================================ 14 HEALTH SCORE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Explainable Financial Health Score", "Transparent weighted model");
  s.addChart(p.charts.DOUGHNUT, [{
    name: "Weights",
    labels: ["Savings rate", "Expense-to-income", "Budget adherence", "Recurring ratio", "Emergency fund", "Diversification"],
    values: [25, 20, 15, 10, 15, 15],
  }], {
    x: M - 0.05, y: 1.6, w: 4.6, h: 4.4,
    chartColors: ["6E83FF", "34D399", "FBBF24", "FB7185", "22D3EE", "A78BFA"],
    holeSize: 62, showLegend: true, legendPos: "b", legendColor: MUTED, legendFontSize: 9,
    showValue: false, showPercent: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 9,
    chartArea: { fill: { color: BG } },
  });
  s.addText("weights", { x: M + 1.55, y: 3.28, w: 1.4, h: 0.4, fontSize: 12, color: MUTED, fontFace: F, align: "center", margin: 0 });

  card(s, 5.3, 1.6, 7.43, 2.1, CARD2);
  s.addText([
    { text: "Score = \u03A3 factorScore \u00D7 effectiveWeight", options: { fontSize: 17, bold: true, italic: true, color: "FFFFFF", breakLine: true } },
    { text: "Factors without data are marked not_evaluated and their weight is redistributed across evaluated ones - the model never invents inputs. Response exposes every weight, factor score and contribution.", options: { fontSize: 12, color: MUTED } },
  ], { x: 5.62, y: 1.85, w: 6.8, h: 1.7, fontFace: F, margin: 0, paraSpaceAfter: 8 });

  const bands = [["85+", "Excellent", ACCENT], ["70+", "Good", PRIMARY], ["55+", "Fair", AMBER], ["40+", "Needs Work", "FB923C"], ["<40", "At Risk", ROSE]];
  bands.forEach(([r, g, c], i) => {
    const x = 5.3 + i * 1.5;
    card(s, x, 3.95, 1.36, 1.05);
    s.addText(r, { x, y: 4.05, w: 1.36, h: 0.42, fontSize: 15, bold: true, color: c, fontFace: F, align: "center", margin: 0 });
    s.addText(g, { x, y: 4.48, w: 1.36, h: 0.4, fontSize: 10, color: MUTED, fontFace: F, align: "center", margin: 0 });
  });

  card(s, 5.3, 5.25, 7.43, 1.35);
  s.addText([
    { text: "Live demo output:  ", options: { bold: true, color: "FFFFFF" } },
    { text: "score 70 (Good) - savings 100 \u00B7 expense ratio 100 \u00B7 budget 0 \u00B7 recurring 0 \u00B7 emergency 87 \u00B7 diversification not evaluated (Phase 3)", options: { color: TEXT } },
  ], { x: 5.62, y: 5.45, w: 6.85, h: 1.0, fontSize: 12.5, fontFace: F, margin: 0 });
  footer(s, 14);
}

/* ============================================================ 15 UI PROTOTYPE */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "UI / UX Prototype", "Glassmorphism design system");
  const h1 = shot(s, "02-dashboard.png", M, 1.6, 6.0);
  s.addText("Dashboard - snapshot, cash-flow, insights, budgets", { x: M, y: 1.66 + h1, w: 6.0, h: 0.3, fontSize: 10.5, italic: true, color: FAINT, fontFace: F, align: "center", margin: 0 });
  const h2 = shot(s, "06-health.png", 7.05, 1.6, 6.0);
  s.addText("Financial health - every factor, weight and contribution", { x: 7.05, y: 1.66 + h2, w: 6.0, h: 0.3, fontSize: 10.5, italic: true, color: FAINT, fontFace: F, align: "center", margin: 0 });
  const feats = ["Responsive desktop-first, mobile-ready", "Keyboard-accessible forms, ARIA labels", "Dark ambient aurora theme, glass cards", "Interactive Recharts: donut \u00B7 bar \u00B7 line \u00B7 area"];
  feats.forEach((t, i) => dotRow(s, M + 0.1 + (i % 2) * 6.3, 5.75 + Math.floor(i / 2) * 0.5, 6.0, "", t));
  footer(s, 15);
}

/* ============================================================ 16 SECURITY */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Security Design", "Defence in depth");
  const sec = [
    ["Authentication", "bcrypt (cost 12) \u00B7 JWT +jti \u00B7 rotating digest-stored refresh \u00B7 lockout \u00B7 rate limits 10/5min auth, 120/min mutations"],
    ["Authorization", "RBAC: users see only their data; admin sees operational counts - never user financial records"],
    ["Input & injection", "Pydantic schemas on every body \u00B7 bound-parameter SQL only \u00B7 React escaping \u00B7 security headers on all responses"],
    ["Audit & observability", "append-only trail: logins, failures, resets, admin actions \u00B7 suspicious-activity flag on failure bursts"],
  ];
  sec.forEach(([a, b], i) => {
    const x = M + (i % 2) * 6.2, y = 1.6 + Math.floor(i / 2) * 2.3;
    card(s, x, y, 5.93, 2.05);
    s.addText(a, { x: x + 0.3, y: y + 0.16, w: 5.3, h: 0.42, fontSize: 16.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
    s.addText(b, { x: x + 0.3, y: y + 0.66, w: 5.35, h: 1.25, fontSize: 12, color: MUTED, fontFace: F, margin: 0 });
  });
  s.addText("Known Phase 1 limits, tracked openly: dev-only reset tokens \u00B7 per-process limiter (Redis in P4) \u00B7 verification stubbed", {
    x: M, y: 6.35, w: 12.1, h: 0.4, fontSize: 12, italic: true, color: AMBER, fontFace: F, margin: 0, align: "center",
  });
  footer(s, 16);
}

/* ============================================================ 17 IMPLEMENTATION */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Current Implementation & Testing", "Status");
  const stats = [["47", "backend tests, all passing"], ["35", "documented REST endpoints"], ["9", "UI modules delivered"], ["13", "architecture documents"]];
  stats.forEach(([n, t], i) => {
    const x = M + i * 3.13;
    card(s, x, 1.55, 2.86, 1.5);
    s.addText(n, { x: x + 0.24, y: 1.66, w: 2.4, h: 0.75, fontSize: 40, bold: true, color: ACCENT, fontFace: F, margin: 0 });
    s.addText(t, { x: x + 0.24, y: 2.44, w: 2.45, h: 0.5, fontSize: 11.5, color: MUTED, fontFace: F, margin: 0 });
  });

  s.addChart(p.charts.BAR, [{
    name: "Tests",
    labels: ["Analytics engine (unit)", "Authentication", "Expenses & categories", "Budgets, analytics, admin"],
    values: [17, 13, 7, 10],
  }], {
    x: M, y: 3.4, w: 7.3, h: 3.3, barDir: "bar",
    chartColors: [PRIMARY, PRIMARY, PRIMARY, ACCENT], varyColors: true,
    chartArea: { fill: { color: BG } },
    catAxisLabelColor: TEXT, catAxisLabelFontSize: 10, valAxisLabelColor: MUTED, valAxisLabelFontSize: 9,
    valGridLine: { color: "1E2A44", size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "FFFFFF", dataLabelFontSize: 11,
    showLegend: false, valAxisMaxVal: 20,
  });
  s.addText("Test distribution by suite (47 total)", { x: M, y: 6.7, w: 7.3, h: 0.3, fontSize: 10.5, italic: true, color: FAINT, fontFace: F, margin: 0, align: "center" });

  card(s, 8.2, 3.4, 4.53, 3.3, CARD2);
  s.addText("Test strategy", { x: 8.5, y: 3.58, w: 4, h: 0.4, fontSize: 15.5, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const ts = [
    "Unit: pure analytics engine, no I/O",
    "Integration: isolated DB per test",
    "Seeding via public API only",
    "pytest.approx for all money math",
    "RBAC + isolation explicitly tested",
  ];
  ts.forEach((t, i) => dotRow(s, 8.5, 4.1 + i * 0.5, 4.0, "", t));
  footer(s, 17);
}

/* ============================================================ 18 RESULTS */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Initial Results", "Scripted end-to-end journey on the Docker stack");
  const steps = ["Disclaimer", "Register", "Income", "7 expenses", "Budget", "Dashboard", "Insights", "Health", "RBAC 403", "Admin views"];
  steps.forEach((t, i) => {
    const x = M + i * 1.24;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 1.1, h: 0.62, fill: { color: CARD }, rectRadius: 0.07, line: { color: "2E8B6E", width: 1 } });
    s.addText(t, { x, y: 1.6, w: 1.1, h: 0.62, fontSize: 9.5, bold: true, color: TEXT, fontFace: F, align: "center", valign: "middle", margin: 0 });
    if (i < 9) s.addShape(p.shapes.LINE, { x: x + 1.1, y: 1.91, w: 0.14, h: 0, line: { color: FAINT, width: 1.2, endArrowType: "triangle" } });
  });
  s.addText("ALL CHECKS PASSED - on SQLite (dev) and PostgreSQL (containerised production build)", {
    x: M, y: 2.5, w: 12.1, h: 0.4, fontSize: 14, bold: true, color: ACCENT, fontFace: F, margin: 0, align: "center",
  });

  const results = [
    ["Insights", "2 evidence-backed insights generated: budget pressure + category concentration", ACCENT],
    ["Budget alerts", "94.1% utilisation triggered the 50 / 75 / 90 alert chain correctly", PRIMARY],
    ["Health score", "95 (Excellent); 5 of 6 factors evaluated - diversification correctly not evaluated", AMBER],
    ["RBAC", "user forbidden on admin endpoints (403); admin overview + audit trail verified", "22D3EE"],
  ];
  results.forEach(([a, b, c], i) => {
    const y = 3.25 + i * 0.88;
    card(s, M, y, 12.13, 0.74);
    s.addText(a, { x: M + 0.3, y: y + 0.07, w: 2.4, h: 0.6, fontSize: 13.5, bold: true, color: c, fontFace: F, margin: 0, valign: "middle" });
    s.addText(b, { x: M + 2.85, y: y + 0.07, w: 9.0, h: 0.6, fontSize: 12.5, color: TEXT, fontFace: F, margin: 0, valign: "middle" });
  });
  footer(s, 18);
}

/* ============================================================ 19 LIMITATIONS + ROADMAP */
{
  const s = p.addSlide();
  s.background = { color: BG };
  header(s, "Limitations & Phase 2 Roadmap", "Honest scope");
  card(s, M, 1.55, 5.9, 5.2);
  s.addText("Current limitations", { x: M + 0.3, y: 1.75, w: 5, h: 0.4, fontSize: 17, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const lims = [
    "Market panels show \u201CData unavailable\u201D - no fabrication before Phase 2",
    "Rate limiter per-process; Redis backing arrives in Phase 4",
    "Password reset via dev tokens until SMTP is wired",
    "Forecasting waits for sufficient history (guards refuse thin data)",
  ];
  lims.forEach((t, i) => dotRow(s, M + 0.32, 2.3 + i * 0.9, 5.3, "", t, AMBER));
  s.addText("Documented, not hidden - see risk register (14 items).", {
    x: M + 0.32, y: 6.1, w: 5.3, h: 0.5, fontSize: 11.5, italic: true, color: MUTED, fontFace: F, margin: 0,
  });

  card(s, 6.85, 1.55, 5.88, 5.2, CARD2);
  s.addText("Phase 2 - Investment Analytics", { x: 7.15, y: 1.75, w: 5.3, h: 0.4, fontSize: 17, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  const p2 = [
    ["Provider abstraction", "FinancialDataProvider interface + cache; no site is load-bearing"],
    ["Stock analyzer", "fundamentals, statements, SMA/EMA \u00B7 RSI \u00B7 MACD \u00B7 Bollinger"],
    ["Sentiment (Exp. 2)", "rules vs TF-IDF+SVM vs transformer - precision / recall / F1"],
    ["Valuation engine", "DCF with sensitivity grids \u00B7 PE \u00B7 PEG \u00B7 EV/EBITDA \u00B7 DDM"],
    ["Scoring + reports", "explainable stock score; PDF research reports; Alembic begins"],
  ];
  p2.forEach(([a, b], i) => dotRow(s, 7.15, 2.3 + i * 0.9, 5.3, a, b, ACCENT));
  footer(s, 19);
}

/* ============================================================ 20 CLOSING */
{
  const s = p.addSlide();
  s.background = { color: BG };
  s.addShape(p.shapes.OVAL, { x: 9.8, y: 4.6, w: 6, h: 6, fill: { color: PRIMARY_DIM, transparency: 82 } });
  s.addShape(p.shapes.OVAL, { x: -1.5, y: -2, w: 5, h: 5, fill: { color: "14532D", transparency: 84 } });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.7, w: 0.85, h: 0.85, fill: { color: PRIMARY_DIM }, rectRadius: 0.14, shadow: shadow() });
  s.addText("\u20B9", { x: M, y: 1.66, w: 0.85, h: 0.85, align: "center", valign: "middle", fontSize: 38, bold: true, color: "FFFFFF", fontFace: F, margin: 0 });
  s.addText("Phase 1: complete, tested, deployed.", {
    x: M, y: 2.85, w: 12, h: 0.9, fontSize: 40, bold: true, color: "FFFFFF", fontFace: F, margin: 0,
  });
  s.addText("47 passing tests \u00B7 full end-to-end journey on the containerised stack \u00B7 every AI output explainable and evidence-backed", {
    x: M, y: 3.85, w: 11.5, h: 0.6, fontSize: 16, color: TEXT, fontFace: F, margin: 0,
  });
  s.addText([
    { text: "Next: Phase 2 - Investment Analytics", options: { bold: true, color: ACCENT, breakLine: true } },
    { text: "Provider abstraction \u00B7 stock analyzer \u00B7 valuation \u00B7 sentiment experiment \u00B7 PDF reports", options: { color: MUTED } },
  ], { x: M, y: 4.85, w: 11, h: 0.9, fontSize: 14, fontFace: F, margin: 0, paraSpaceAfter: 4 });
  s.addText("Thank you  \u00B7  Questions & demonstration ready", {
    x: M, y: 6.15, w: 11, h: 0.5, fontSize: 15, bold: true, color: PRIMARY, fontFace: F, margin: 0,
  });
  s.addNotes("Offer the live demonstration: the containerized stack is running locally with a seeded demo account.");
}

p.writeFile({ fileName: OUT }).then(() => console.log("WROTE", OUT));
