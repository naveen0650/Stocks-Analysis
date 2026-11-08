/* FinAI R3 presentation (pptxgenjs). Run: node build_r3_pptx.js */
const pptxgen = require("pptxgenjs");
const path = require("path");

const OUT = path.join(__dirname, "FinAI_R3_Presentation.pptx");
const BG = "0B1220", CARD = "131D33", PRIMARY = "38BDF8", ACCENT = "818CF8",
  GOOD = "34D399", BAD = "FB7185", TEXT = "E2E8F0", MUTED = "94A3B8", F = "Segoe UI";

const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
p.title = "FinAI - Revision 3";

let n = 0;
function slide(title, kicker) {
  const s = p.addSlide();
  s.background = { color: BG };
  n += 1;
  if (title) {
    s.addShape(p.ShapeType.rect, { x: 0.6, y: 0.55, w: 0.12, h: 0.6, fill: { color: PRIMARY } });
    s.addText(title, { x: 0.85, y: 0.45, w: 11, h: 0.8, fontSize: 30, bold: true, color: "FFFFFF", fontFace: F });
    if (kicker) s.addText(kicker, { x: 0.85, y: 1.15, w: 11, h: 0.4, fontSize: 14, color: MUTED, fontFace: F });
  }
  s.addText(`FinAI  ·  Revision 3  ·  ${n}`, { x: 0.6, y: 7.0, w: 12, h: 0.3, fontSize: 10, color: MUTED, fontFace: F });
  return s;
}
function card(s, x, y, w, h, title, body, color = PRIMARY) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: CARD }, line: { color: color, width: 1 }, rectRadius: 0.12 });
  s.addText(title, { x: x + 0.2, y: y + 0.12, w: w - 0.4, h: 0.45, fontSize: 16, bold: true, color, fontFace: F });
  s.addText(body, { x: x + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.7, fontSize: 12.5, color: TEXT, fontFace: F, valign: "top", paraSpaceAfter: 4 });
}

// 1 Title
{
  const s = slide();
  s.addText("FinAI", { x: 0.8, y: 1.6, w: 11, h: 1.2, fontSize: 66, bold: true, color: PRIMARY, fontFace: F });
  s.addText("Advanced AI Based Personal Finance & Investment Analysis Tool", { x: 0.8, y: 2.8, w: 11.5, h: 0.7, fontSize: 24, color: "FFFFFF", fontFace: F });
  s.addText("Revision 3 · Market-adjusted Stock Fair Value", { x: 0.8, y: 3.5, w: 11, h: 0.5, fontSize: 18, color: ACCENT, fontFace: F });
  s.addText([
    { text: "Sugamanchi Naveen  ·  2022WB86112", options: { breakLine: true } },
    { text: "M.Tech Computing Systems & Infrastructure (WIMS) · BITS Pilani WILP", options: { breakLine: true } },
    { text: "Supervisor: Soham Das  ·  Additional Examiner: Smrutirekha Behera" },
  ], { x: 0.8, y: 4.8, w: 11, h: 1.3, fontSize: 14, color: MUTED, fontFace: F });
}

// 2 Progress
{
  const s = slide("Where the project stands", "Four-phase roadmap — R3 completes the investment-analytics core");
  const rows = [
    ["Phase 1", "Foundation & core finance", "Done (R1)", GOOD],
    ["Phase 2a", "Indicators · valuation · stock score", "Done (R2)", GOOD],
    ["Phase 3 (pulled fwd)", "SIP / FD / XIRR calculators", "Done (R2)", GOOD],
    ["Phase 2b", "News sentiment + market-adjusted Fair Value", "Done (R3)", PRIMARY],
    ["Phase 3", "Portfolio risk · forecasting", "Next", MUTED],
    ["Phase 4", "RAG assistant · hardening · deploy", "Planned", MUTED],
  ];
  rows.forEach((r, i) => {
    const y = 1.8 + i * 0.78;
    s.addShape(p.ShapeType.roundRect, { x: 0.8, y, w: 11.7, h: 0.62, fill: { color: CARD }, line: { color: r[3], width: 1 }, rectRadius: 0.1 });
    s.addText(r[0], { x: 1.0, y, w: 2.6, h: 0.62, fontSize: 14, bold: true, color: r[3], fontFace: F, valign: "middle" });
    s.addText(r[1], { x: 3.6, y, w: 6.5, h: 0.62, fontSize: 14, color: TEXT, fontFace: F, valign: "middle" });
    s.addText(r[2], { x: 10.2, y, w: 2.1, h: 0.62, fontSize: 14, bold: true, color: r[3], fontFace: F, valign: "middle", align: "right" });
  });
}

// 3 Problem
{
  const s = slide("The R3 question", "\"What is this stock actually worth right now?\"");
  card(s, 0.8, 1.9, 3.8, 3.6, "Fundamentals alone", "DCF / P/E give a long-run value but ignore current trend, momentum and what the market is talking about.", ACCENT);
  card(s, 4.8, 1.9, 3.8, 3.6, "Charts alone", "Technicals capture momentum but have no notion of intrinsic worth — a stock can trend far above value.", ACCENT);
  card(s, 8.8, 1.9, 3.8, 3.6, "News alone", "Headlines move prices short term but are noisy and easy to over-react to.", ACCENT);
  s.addText("R3 combines all three — with fundamentals as the anchor and every adjustment visible.", { x: 0.8, y: 5.8, w: 11.8, h: 0.6, fontSize: 17, bold: true, color: PRIMARY, fontFace: F });
}

// 4 Formula
{
  const s = slide("Market-adjusted Fair Value", "backend/app/market/fair_value.py");
  s.addShape(p.ShapeType.roundRect, { x: 0.8, y: 1.8, w: 11.7, h: 1.1, fill: { color: CARD }, line: { color: PRIMARY, width: 1.5 }, rectRadius: 0.12 });
  s.addText("Fair Value = Intrinsic Anchor × (1 + Technical tilt) × (1 + News-buzz tilt)", { x: 0.8, y: 1.8, w: 11.7, h: 1.1, fontSize: 22, bold: true, color: "FFFFFF", fontFace: F, align: "center", valign: "middle" });
  card(s, 0.8, 3.2, 3.8, 2.9, "Intrinsic anchor", "Mean of DCF (2-stage + Gordon TV), P/E, EV/EBITDA and DDM fair values from the R2 valuation engine.", GOOD);
  card(s, 4.8, 3.2, 3.8, 2.9, "Technical tilt · ±8%", "Confluence of trend (price vs SMA50, SMA20/50 cross), RSI (overbought-aware), MACD histogram, Bollinger position.", PRIMARY);
  card(s, 8.8, 3.2, 3.8, 2.9, "News-buzz tilt · ±6%", "Recency-weighted headline sentiment × buzz multiplier (high 1.0 · elevated 0.8 · normal 0.6).", ACCENT);
  s.addText("Corridor = ±0.5 × annualised volatility (5–25%).  Verdict: Undervalued · Fairly valued · Overvalued.", { x: 0.8, y: 6.3, w: 11.8, h: 0.5, fontSize: 14, color: MUTED, fontFace: F });
}

// 5 Sentiment
{
  const s = slide("News buzz & sentiment engine", "backend/app/market/sentiment.py");
  card(s, 0.8, 1.8, 5.8, 4.6, "How a headline is scored", [
    "• Finance lexicon: words + phrases (\"raises guidance\", \"margin expansion\")",
    "• Negation flips polarity (\"not weak\")",
    "• Normalised: score = x / √(x² + 4) → (-1, 1)",
    "• Matched terms returned as evidence",
    "• Recency decay, 7-day half-life",
    "• Buzz level from 7-day article count",
  ].join("\n"), PRIMARY);
  card(s, 6.8, 1.8, 5.8, 4.6, "Honest limitations", [
    "• News is illustrative sample data, clearly labelled — not real headlines",
    "• Lexicons miss context: \"attrition declines\" is good news but scores negative",
    "• Next: Experiment 2 — lexicon vs TF-IDF+SVM vs FinBERT on a labelled set (accuracy / F1)",
    "• Live news API plugs in behind load_news()",
  ].join("\n"), BAD);
}

// 6 Design principles
{
  const s = slide("Why bounded tilts?", "Design decision you can defend");
  card(s, 0.8, 1.8, 3.8, 4.4, "Anchor stays fundamental", "Technical + news can move value by at most ~14% combined. Short-term noise cannot dominate the estimate.", GOOD);
  card(s, 4.8, 1.8, 3.8, 4.4, "Fully explainable", "API returns anchor, each tilt %, every technical signal and every scored headline. UI shows the waterfall.", PRIMARY);
  card(s, 8.8, 1.8, 3.8, 4.4, "Graceful degradation", "No news → sentiment tilt = 0 and marked not_evaluated. Missing indicators are skipped, never invented.", ACCENT);
}

// 7 UI
{
  const s = slide("What the user sees", "Market page · new Fair Value panel (frontend/src/components/FairValuePanel.tsx)");
  card(s, 0.8, 1.8, 7.4, 4.6, "Fair Value card", [
    "• Big fair-value figure + corridor",
    "• Verdict badge (Undervalued / Fairly valued / Overvalued)",
    "• Gauge: price marker vs fair-value marker inside corridor",
    "• Waterfall: anchor → technical tilt → news tilt",
    "• Signal chips: trend · RSI · MACD · Bollinger with values",
  ].join("\n"), PRIMARY);
  card(s, 8.4, 1.8, 4.2, 4.6, "News Buzz feed", [
    "• Overall sentiment + label",
    "• 👍 / 👎 / neutral counts",
    "• Each headline with score and matched terms",
  ].join("\n"), ACCENT);
}

// 8 API & tests
{
  const s = slide("API, tests & running it", "");
  card(s, 0.8, 1.6, 5.8, 2.4, "New endpoint", "GET /api/v1/market/{symbol}/fair-value\n/analysis now also returns fair_value + news", PRIMARY);
  card(s, 6.8, 1.6, 5.8, 2.4, "Tests", "8 new tests in test_fair_value.py: polarity, negation, bounds, recency, caps, verdicts, endpoint, 404.", GOOD);
  card(s, 0.8, 4.2, 11.8, 2.3, "One-click", "START-FINAI-R3.cmd → starts Docker, stops R2 if running, builds, seeds demo data, opens http://localhost:8080/app\nSTOP-FINAI-R3.cmd → stops containers, keeps data", ACCENT);
}

// 9 Next
{
  const s = slide("Next steps", "Toward Review 3 / final");
  card(s, 0.8, 1.8, 3.8, 4.4, "Phase 2 close-out", "• Live market + news provider\n• Experiment 2: sentiment model comparison\n• PDF research report", PRIMARY);
  card(s, 4.8, 1.8, 3.8, 4.4, "Phase 3", "• Portfolio analyzer & risk (HHI, beta)\n• Expense forecasting experiment (MA/Holt/ARIMA/GBM)\n• Back-test the Fair Value verdicts", GOOD);
  card(s, 8.8, 1.8, 3.8, 4.4, "Phase 4", "• RAG research assistant with citations\n• Hardening, e2e tests, deployment\n• Dissertation freeze", ACCENT);
}

// 10 Thanks
{
  const s = slide();
  s.addText("Thank you", { x: 0.8, y: 2.6, w: 11.7, h: 1.2, fontSize: 54, bold: true, color: PRIMARY, fontFace: F, align: "center" });
  s.addText("Questions & live demo", { x: 0.8, y: 3.8, w: 11.7, h: 0.6, fontSize: 20, color: TEXT, fontFace: F, align: "center" });
  s.addText("Educational/analytical tool — not investment advice. Demo uses recorded sample data.", { x: 0.8, y: 5.6, w: 11.7, h: 0.4, fontSize: 12, color: MUTED, fontFace: F, align: "center" });
}

p.writeFile({ fileName: OUT }).then(() => console.log("Wrote", OUT));
