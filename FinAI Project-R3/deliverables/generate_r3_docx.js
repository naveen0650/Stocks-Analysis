/* FinAI R3 technical documentation (docx). Run: node generate_r3_docx.js */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  HeadingLevel, BorderStyle, WidthType, ShadingType, Footer, PageNumber, PageBreak,
} = require("docx");

const OUT = path.join(__dirname, "FinAI_R3_Documentation.docx");
const FONT = "Calibri", NAVY = "14324E", TEAL = "1B6B7A";
const b = { style: BorderStyle.SINGLE, size: 4, color: "B8CDD6" };
const borders = { top: b, bottom: b, left: b, right: b };

const t = (text, o = {}) => new TextRun({ text, font: o.mono ? "Consolas" : FONT, size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color });
const P = (text, o = {}) => new Paragraph({ spacing: { after: 120, line: 288 }, alignment: o.align, children: [t(text, o)] });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 160 }, children: [t(text, { size: 32, bold: true, color: NAVY })] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [t(text, { size: 26, bold: true, color: TEAL })] });
const LI = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [t(text)] });
const CODE = (text) => new Paragraph({ shading: { type: ShadingType.CLEAR, fill: "EEF3F6" }, spacing: { before: 80, after: 120 }, children: [t(text, { mono: true, size: 20 })] });
function table(head, rows, widths) {
  const cell = (txt, hdr, w) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: hdr ? { type: ShadingType.CLEAR, fill: TEAL } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [t(txt, { size: 20, bold: hdr, color: hdr ? "FFFFFF" : undefined })] })],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, true, widths[i])) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, false, widths[i])) }))],
  });
}

const children = [
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [t("FinAI", { size: 72, bold: true, color: NAVY })] }),
  P("Advanced AI Based Personal Finance & Investment Analysis Tool", { size: 30, align: AlignmentType.CENTER }),
  P("Revision 3 — Technical Documentation", { size: 26, color: TEAL, bold: true, align: AlignmentType.CENTER }),
  P("Market-adjusted Stock Fair Value: fundamentals · technicals · news buzz", { size: 22, italics: true, align: AlignmentType.CENTER }),
  new Paragraph({ spacing: { before: 1200 } }),
  P("Sugamanchi Naveen  ·  2022WB86112", { align: AlignmentType.CENTER }),
  P("M.Tech Computing Systems & Infrastructure (WIMS) · BITS Pilani WILP", { align: AlignmentType.CENTER }),
  P("Supervisor: Soham Das  ·  Additional Examiner: Smrutirekha Behera", { align: AlignmentType.CENTER }),
  P("October 2026", { align: AlignmentType.CENTER }),
  new Paragraph({ children: [new PageBreak()] }),

  H1("1. Summary of Revision 3"),
  P("R3 adds a market-adjusted fair value for each stock. The R2 valuation engine produced several fundamental fair values (DCF, P/E, EV/EBITDA, DDM) and an explainable score, but did not reflect current market conditions. R3 adds two new engines — a news buzz & sentiment engine and a fair value engine — and combines them so that one number answers \"what is this stock worth right now?\" while every component stays visible."),
  table(["Area", "R2", "R3"], [
    ["Valuation", "Per-method fair values + blended upside", "Market-adjusted fair value + corridor + verdict"],
    ["Technicals", "Indicator values displayed", "Indicators converted into a bounded confluence signal"],
    ["News", "Not implemented", "Lexicon sentiment, recency decay, buzz level, evidence terms"],
    ["UI", "Chart, indicators, valuation table", "Fair Value panel: gauge, waterfall, signal chips, news feed"],
    ["API", "/analysis, /valuation", "+ /fair-value; /analysis includes fair_value & news"],
    ["Launch", "START/STOP-FINAI.bat", "START/STOP-FINAI-R3.cmd (stops R2 automatically)"],
  ], [2000, 3680, 3680]),

  H1("2. Architecture changes"),
  P("The layering rules from docs/01 are unchanged: routes hold no business logic, and the analysis engines are pure functions with no I/O apart from reading fixture files. The new modules sit next to the R2 engines:"),
  CODE("backend/app/market/\n  indicators.py   (R2)  SMA, EMA, RSI, MACD, Bollinger, drawdown, volatility\n  valuation.py    (R2)  DCF, P/E, PEG, EV/EBITDA, DDM, sensitivity, scenarios\n  scoring.py      (R2)  explainable 6-factor stock score\n  sentiment.py    (R3)  headline scoring, recency-weighted aggregate, buzz\n  fair_value.py   (R3)  technical confluence + market-adjusted fair value\n  service.py            orchestration: one analysis payload\n  fixtures/news/  (R3)  illustrative sample headlines per symbol"),
  P("Request flow: GET /market/{symbol}/analysis → provider prices & fundamentals → indicators → valuation (intrinsic anchor) → sentiment.aggregate(news) → fair_value.compute_fair_value → JSON."),

  H1("3. Fair Value methodology"),
  CODE("fair_value = intrinsic_anchor × (1 + technical_adj) × (1 + sentiment_adj)"),
  H2("3.1 Intrinsic anchor"),
  P("The arithmetic mean of the available fundamental fair values (DCF, P/E, EV/EBITDA, DDM) computed by the R2 valuation engine under the current assumptions. If no method is available, fair value is not produced (null) rather than estimated."),
  H2("3.2 Technical confluence (bounded ±8 %)"),
  P("Four signals, each mapped into [-1, 1]; the confluence score is their mean, and technical_adj = score × 0.08."),
  table(["Signal", "Mapping", "Reading"], [
    ["Trend", "0.7 × clip((price/SMA50 − 1) × 10) ± 0.3 for SMA20 vs SMA50", "uptrend / sideways / downtrend"],
    ["RSI(14)", "(RSI − 50)/40 in 30–70; above 70 turns negative (overbought); below 30 positive (oversold)", "overbought / neutral / oversold"],
    ["MACD", "clip(histogram / price × 200)", "bullish / bearish"],
    ["Bollinger", "clip((0.5 − band position) × 1.2) — near lower band = room to rise", "% of band"],
  ], [1600, 5160, 2600]),
  H2("3.3 News-buzz tilt (bounded ±6 %)"),
  P("sentiment_adj = sentiment_score × 0.06 × buzz multiplier, where buzz multiplier is 1.0 (high, ≥5 articles in 7 days), 0.8 (elevated, ≥3) or 0.6 (normal). With no news, the tilt is 0 and the news block is marked not_evaluated."),
  H2("3.4 Corridor and verdict"),
  P("Corridor half-width = 0.5 × annualised volatility, clamped to 5–25 %. Verdict: Undervalued if price < corridor low; Overvalued if price > corridor high; otherwise Fairly valued, with a mild-upside / mild-downside hint when the gap exceeds ±5 %."),
  H2("3.5 Why the tilts are bounded"),
  LI("Fundamentals remain the anchor; market conditions can move the value by at most about 14 % combined."),
  LI("This keeps the estimate stable and defensible, and stops one noisy headline or a short rally from dominating."),
  LI("Every component (anchor, each tilt, each signal, each headline) is returned by the API and shown in the UI."),

  H1("4. News buzz & sentiment engine"),
  LI("Finance-tuned lexicon of weighted words and phrases (e.g. \"raises guidance\" +1.2, \"cuts guidance\" −1.2, \"downgrade\" −1.0)."),
  LI("Phrases are matched first and removed so words are not double-counted; a preceding negator (not, no, never, without) flips polarity."),
  LI("Normalisation: score = x / √(x² + 4), giving a value in (−1, 1). Labels: positive > 0.15, negative < −0.15, otherwise neutral."),
  LI("Aggregate: exponentially recency-weighted mean (weight = 0.5^(age/7 days))."),
  LI("Evidence: each headline returns its matched terms so the reading can be checked."),
  H2("4.1 Data and limitations"),
  P("The bundled headlines in fixtures/news are illustrative sample data written for demonstration and testing. They are not real news and are labelled as such in the files. A live news API can be connected behind load_news() without changing the engine.", { bold: false }),
  P("Lexicon methods miss context. For example, \"attrition declines\" is good news for an IT company but scores negative because both words are in the negative list. Experiment 2 (lexicon vs TF-IDF + linear SVM vs FinBERT, measured by accuracy and F1 on a labelled set) is planned to quantify and address this."),

  H1("5. API reference (new/changed)"),
  table(["Endpoint", "Description"], [
    ["GET /api/v1/market/{symbol}/fair-value", "fair_value (value, corridor, upside, verdict, components, technical signals, method) and news (sentiment, buzz, scored articles)"],
    ["GET /api/v1/market/{symbol}/analysis", "Unchanged fields plus fair_value and news"],
  ], [3600, 5760]),
  P("Both require a bearer token and return 404 for unknown symbols, consistent with the R2 market endpoints."),

  H1("6. User interface"),
  P("frontend/src/components/FairValuePanel.tsx is rendered at the top of the Market page:"),
  LI("Fair value figure, corridor and upside vs current price, with a coloured verdict badge."),
  LI("Gauge showing the current-price marker and fair-value marker relative to the corridor."),
  LI("Waterfall cards: intrinsic anchor → technical tilt → news-buzz tilt."),
  LI("Signal chips for trend, RSI, MACD and Bollinger with their values."),
  LI("News Buzz feed: overall sentiment, positive/negative/neutral counts, each headline with its score and matched terms."),

  H1("7. Testing"),
  P("backend/tests/test_fair_value.py adds 8 tests: headline polarity, negation, score bounds and evidence, recency weighting, not_evaluated without news, adjustment caps (±8 % / ±6 %), verdict boundaries, and the endpoint (200 and 404). Run with: docker run --rm -v \"%cd%\\backend:/app\" -w /app python:3.11-slim sh -c \"pip install -r requirements.txt && pytest -q\"."),

  H1("8. Running R3"),
  LI("Double-click START-FINAI-R3.cmd. It starts Docker Desktop if needed, stops the R2 stack (same ports), builds and starts R3, seeds demo data and opens http://localhost:8080/app."),
  LI("Log in with demo@example.com / Demo#12345 and open Market from the sidebar."),
  LI("Double-click STOP-FINAI-R3.cmd to stop. Data is kept; docker compose -p finai-r3 down -v wipes it."),

  H1("9. Limitations and next steps"),
  LI("Prices, fundamentals and news are recorded/illustrative samples for two symbols; live providers are the next step."),
  LI("Tilt bounds (8 % / 6 %) and the corridor rule are design choices, not fitted parameters. Back-testing the verdicts against later prices is planned for Phase 3."),
  LI("Sentiment is lexicon-based; Experiment 2 will compare learned models."),
  LI("Phase 3: portfolio risk and expense forecasting. Phase 4: RAG research assistant, hardening and deployment."),
  P("FinAI is an educational and analytical tool. Its outputs are not investment advice.", { italics: true }),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("FinAI R3 · Page ", { size: 18, color: "777777" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("Wrote", OUT); });
