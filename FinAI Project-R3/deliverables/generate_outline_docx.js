const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  TableLayoutType,
  VerticalAlign
} = require("docx");

const OUT_PATH = path.join(__dirname, "FinAI_Project_Outline.docx");

// Styling constants matching BITS PILANI project outline specification
const FONT_FAMILY = "Times New Roman";
const PRIMARY_COLOR = "003366"; // Deep Academic Navy Blue
const TEXT_COLOR = "000000";
const MUTED_COLOR = "444444";
const BORDER_COLOR = "444444";
const HEADER_BG = "EBF2F7"; // Soft pastel slate/blue for table headers

const standardBorder = {
  style: BorderStyle.SINGLE,
  size: 6, // ~0.75 pt
  color: BORDER_COLOR,
};

const cellBorders = {
  top: standardBorder,
  bottom: standardBorder,
  left: standardBorder,
  right: standardBorder,
};

const defaultCellMargins = {
  top: 120, // 6pt
  bottom: 120,
  left: 150, // 7.5pt
  right: 150,
};

// Helper function to create standard text run
function run(text, options = {}) {
  return new TextRun({
    text: text,
    font: FONT_FAMILY,
    size: options.size || 22, // 11pt = 22 half-pts
    bold: options.bold || false,
    italics: options.italics || false,
    color: options.color || TEXT_COLOR,
  });
}

// Helper function for bullet items
function bullet(title, text) {
  const children = [];
  if (title) {
    children.push(run(title + ": ", { bold: true, size: 21 }));
  }
  children.push(run(text, { size: 21 }));
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 80, after: 80, line: 276 },
    children: children,
  });
}

// Section heading helper
function sectionHeading(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 140 },
    children: [
      new TextRun({
        text: `${num}. ${title}`,
        font: FONT_FAMILY,
        size: 24, // 12pt
        bold: true,
        color: PRIMARY_COLOR,
      }),
    ],
  });
}

// Table 1: Initial Summary Table
const metaTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3200, 6160], // total ~ 9360 twips (6.5 inches)
  rows: [
    createMetaRow("Course No.", "CSIWZG628T", true),
    createMetaRow("Course Title", "Dissertation / Project / Project Work", true),
    createMetaRow("Student Name", "NAVEEN C H", true),
    createMetaRow("BITS ID", "2022WB86112", true),
    createMetaRow("Degree Program", "M.Tech in Computing Systems & Infrastructure (WIMS)", true),
    createMetaRow("Research Area", "Web Technologies", true),
    createMetaRow("Project carried out at", "Wipro Limited, Bangalore", false),
    createMetaRow("Supervisor", "Soham Das", false),
    createMetaRow("Additional Examiner", "Smrutirekha Behera", false),
    createMetaRow("Submission Month and Year", "Oct 2026", false),
  ],
});

function createMetaRow(label, value, boldValue = false) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 3200, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(label, { bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 6160, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(value, { bold: boldValue, size: 20 })],
          }),
        ],
      }),
    ],
  });
}

// Table 2: Detailed Project Outline Table
const outlineDetailsTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3400, 5960],
  rows: [
    createOutlineRow("Student ID No.", "2022WB86112"),
    createOutlineRow("Name of Student", "NAVEEN C H"),
    createOutlineRow("Student Email Address", "2022wb86112@wilp.bits-pilani.ac.in"),
    createOutlineRow("Student's Employing Organization & Location", "Wipro Limited, Bangalore"),
    createOutlineRow("Supervisor's Name", "Soham Das"),
    createOutlineRow("Supervisor's Organization & Location", "Wipro Technologies Ltd., Plot No. 1, 7, 8 & 9, Block DM, Sector V, Salt Lake City (Bidhannagar), Kolkata, West Bengal 700091"),
    createOutlineRow("Supervisor's Email Address", "soham.das@wipro.com"),
    createOutlineRow("Additional Examiner's Name", "Smrutirekha Behera"),
    createOutlineRow("Additional Examiner's Organization & Location", "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301"),
    createOutlineRow("Additional Examiner's Email Address", "smrutirekha.behera@wipro.com"),
    createOutlineRow("Project Title", "Advanced AI Based Personal Finance & Investment Analysis Tool", true),
  ],
});

function createOutlineRow(label, value, boldValue = false) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 3400, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(label, { bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 5960, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(value, { bold: boldValue, size: 20 })],
          }),
        ],
      }),
    ],
  });
}

// Table 3: Plan of Work Table
const planOfWorkTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [2200, 4360, 2800],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("Phase", 2200),
        createHeaderCell("Planned Work", 4360),
        createHeaderCell("Deliverable", 2800),
      ],
    }),
    createPlanRow(
      "Phase 1 – Project Definition & Core Architecture",
      "Finalize problem statement, research gap, system architecture, database schema, and security model. Implement JWT authentication with versioned disclaimer gate, core expense/income management, budget tracking, statistical Z-score anomaly detection, and explainable financial health scoring.",
      "Approved project outline, system architecture document, and functional Phase 1 core web application with automated unit/integration tests."
    ),
    createPlanRow(
      "Phase 2 – Investment Analytics & Valuation Engines",
      "Develop financial provider abstraction interface with recorded deterministic market fixtures. Implement technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Drawdown) and multi-method valuation engines (DCF, DDM, P/E, PEG, EV/EBITDA, sensitivity grids, scenario analysis). Implement financial news sentiment pipeline.",
      "Market analysis module, valuation engine with interactive scenarios, explainable stock scoring, and comparative sentiment analysis report."
    ),
    createPlanRow(
      "Phase 3 – Portfolio Intelligence & Planning Calculators",
      "Build comprehensive financial calculators (SIP with step-up, lumpsum, FD, CAGR, XIRR, inflation adjustments). Implement portfolio risk analytics (volatility, max drawdown, HHI concentration, benchmark comparison) and machine learning expense forecasting (ARIMA, Holt-Winters, Gradient Boosting).",
      "Interactive financial planning suite, portfolio risk analytics dashboard, and expense forecasting model evaluation report."
    ),
    createPlanRow(
      "Phase 4 – AI Assistant, Hardening & Cloud Deployment",
      "Integrate grounded RAG financial research assistant with verified citations and anti-hallucination guardrails. Conduct comprehensive system hardening, Playwright end-to-end testing, Docker containerization, and cloud deployment on production infrastructure.",
      "End-to-end deployed AI financial platform, containerized microservices, comprehensive test suite, and performance benchmarks."
    ),
    createPlanRow(
      "Phase 5 – Experimental Evaluation & Dissertation Submission",
      "Conduct empirical experiments (statistical vs Isolation Forest anomaly detection; sentiment classification across lexicon, SVM, and FinBERT; expense forecasting validation). Prepare dissertation thesis, viva presentation, and project demonstration.",
      "Completed M.Tech dissertation final report, presentation slide deck, viva defense artifacts, and project demonstration."
    ),
  ],
});

function createHeaderCell(text, widthDxa) {
  return new TableCell({
    borders: cellBorders,
    margins: defaultCellMargins,
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 60, after: 60 },
        children: [run(text, { bold: true, size: 21, color: PRIMARY_COLOR })],
      }),
    ],
  });
}

function createPlanRow(phase, work, deliverable) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 2200, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [run(phase, { bold: true, size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 4360, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60, line: 260 },
            children: [run(work, { size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 2800, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60, line: 260 },
            children: [run(deliverable, { size: 19 })],
          }),
        ],
      }),
    ],
  });
}

// Table 4: Particulars of Supervisor & Examiner
const particularsTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [2600, 3380, 3380],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("Particulars", 2600),
        createHeaderCell("Supervisor", 3380),
        createHeaderCell("Additional Examiner", 3380),
      ],
    }),
    createParticularRow("Name", "Soham Das", "Smrutirekha Behera"),
    createParticularRow("Qualification", "Bachelor of Technology (B.Tech) in Computer Science and Engineering (CSE)", "Master of Technology (M.Tech) in Software Engineering"),
    createParticularRow("Designation", "Senior Technical Specialist (7 years of IT experience)", "Technical Consultant (12 years of IT experience)"),
    createParticularRow("Employing organization and location", "Wipro Technologies Ltd., Plot No. 1, 7, 8 & 9, Block DM, Sector V, Salt Lake City (Bidhannagar), Kolkata, West Bengal 700091", "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301"),
    createParticularRow("Phone number", "+91 7073143358", "+91 8885489246"),
    createParticularRow("Email address", "soham.das@wipro.com", "smrutirekha.behera@wipro.com"),
  ],
});

function createParticularRow(label, supVal, examVal) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 2600, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(label, { bold: true, size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 3380, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(supVal, { size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: defaultCellMargins,
        width: { size: 3380, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(examVal, { size: 19 })],
          }),
        ],
      }),
    ],
  });
}

// Table 5: Signature block table
const signatureTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3120, 3120, 3120],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Student Signature", { bold: true, size: 20, color: PRIMARY_COLOR })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Supervisor Signature", { bold: true, size: 20, color: PRIMARY_COLOR })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Additional Examiner Signature", { bold: true, size: 20, color: PRIMARY_COLOR })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 200, after: 40 },
              children: [run("Name: NAVEEN C H", { bold: true, size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Date: 27/10/2026", { size: 19 })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 200, after: 40 },
              children: [run("Name: Soham Das", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Date: ____________________", { size: 19 })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: defaultCellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 200, after: 40 },
              children: [run("Name: Smrutirekha Behera", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [run("Date: ____________________", { size: 19 })],
            }),
          ],
        }),
      ],
    }),
  ],
});

// Construct the Document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: FONT_FAMILY,
          size: 22, // 11pt default
          color: TEXT_COLOR,
        },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            bottom: 1440,
            left: 1440,
            right: 1440,
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "M.Tech Project Outline | FinAI – Advanced AI Based Personal Finance & Investment Analysis Tool",
                  font: FONT_FAMILY,
                  size: 16, // 8pt
                  italics: true,
                  color: MUTED_COLOR,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120 },
              children: [
                new TextRun({
                  text: "Page ",
                  font: FONT_FAMILY,
                  size: 18,
                  color: MUTED_COLOR,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT_FAMILY,
                  size: 18,
                  color: MUTED_COLOR,
                }),
                new TextRun({
                  text: " of ",
                  font: FONT_FAMILY,
                  size: 18,
                  color: MUTED_COLOR,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: FONT_FAMILY,
                  size: 18,
                  color: MUTED_COLOR,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ==================== PAGE 1: TITLE & INSTITUTION ====================
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 80 },
          children: [
            new TextRun({
              text: "BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI",
              font: FONT_FAMILY,
              size: 28, // 14pt
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({
              text: "WORK INTEGRATED LEARNING PROGRAMMES (WILP) DIVISION",
              font: FONT_FAMILY,
              size: 22, // 11pt
              bold: true,
              color: MUTED_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 220 },
          children: [
            new TextRun({
              text: "DISSERTATION / PROJECT OUTLINE",
              font: FONT_FAMILY,
              size: 26, // 13pt
              bold: true,
              color: TEXT_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 260 },
          children: [
            new TextRun({
              text: "FinAI – Advanced AI Based Personal Finance & Investment Analysis Tool",
              font: FONT_FAMILY,
              size: 24, // 12pt
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),

        metaTable,

        new Paragraph({
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: "Project Outline",
              font: FONT_FAMILY,
              size: 24, // 12pt
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),

        outlineDetailsTable,

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 2: BROAD AREA & BACKGROUND ====================
        sectionHeading("1", "Broad Academic Area of Work"),
        bullet(
          "Artificial Intelligence & Machine Learning in Financial Engineering",
          "Statistical anomaly detection (Z-score & Isolation Forest), natural language processing for financial news sentiment analysis (lexicon, TF-IDF + SVM, and fine-tuned FinBERT), and time-series expense forecasting (ARIMA, Holt-Winters, Gradient Boosting)."
        ),
        bullet(
          "Modern Full-Stack Cloud Architecture & Web Technologies",
          "Production-grade distributed web application development featuring an asynchronous Python FastAPI REST backend, SQLAlchemy 2.0 ORM, PostgreSQL database, and high-performance React 18 TypeScript frontend with Vite and Tailwind CSS."
        ),
        bullet(
          "Explainable Financial Modeling & Multi-Method Valuation",
          "Transparent quantitative financial analysis algorithms including Discounted Cash Flow (DCF with Gordon Growth terminal values and sensitivity grids), Dividend Discount Model (DDM), Relative Valuation multiples (P/E, PEG, EV/EBITDA), and rule-based financial health scoring."
        ),
        bullet(
          "Portfolio Intelligence & Mathematical Financial Planning",
          "Modern Portfolio Theory (MPT) metrics, portfolio volatility, maximum drawdown, Herfindahl-Hirschman Index (HHI) concentration risk, Compound Annual Growth Rate (CAGR), and Extended Internal Rate of Return (XIRR) planning engines."
        ),
        bullet(
          "Data Privacy, Security & Compliance Engineering",
          "Enterprise security design implementing bcrypt password hashing, stateless JWT authentication with revocable refresh tokens, strict Role-Based Access Control (RBAC), multi-layer rate limiting, and legally binding versioned compliance disclaimers."
        ),

        sectionHeading("2", "Background & Problem Statement"),
        bullet(
          "Fragmentation of Personal Finance & Investment Tools",
          "Modern retail users are forced to juggle disconnected applications—one for manual expense logging, another for bank statements, separate portals for market tracking, and complex spreadsheets for valuation, leading to cognitive fatigue and poor financial decisions."
        ),
        bullet(
          "Lack of Mathematical Explainability in Existing Solutions",
          "Contemporary budgeting and credit-scoring apps present opaque, black-box scores with superficial summaries, failing to explain the mathematical derivation, weighted factor contributions, or evidence-backed rationale behind their alerts."
        ),
        bullet(
          "Disconnection Between Daily Spending Habits & Long-Term Wealth Planning",
          "Traditional financial calculators operate in a static vacuum, demanding hypothetical inputs that disregard the user's actual transactional history, cash flows, and discretionary surplus."
        ),
        bullet(
          "Unreliable AI Hallucinations in Financial Advisory",
          "The unchecked proliferation of generative Large Language Models (LLMs) in finance introduces severe risks of hallucinated figures, fabricated stock data, and ungrounded advice without audit trails or cited evidence."
        ),
        bullet(
          "Proposed FinAI Solution",
          "FinAI resolves these critical gaps by delivering a unified, API-first, full-stack intelligence platform that combines automated personal financial management, transparent quantitative stock valuation, verifiable AI-driven insights, and goal-seek calculators underpinned by rigorous academic engineering."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 3: OBJECTIVES & SCOPE ====================
        sectionHeading("3", "Objectives"),
        bullet(
          "Develop a Unified Personal Financial Management Engine",
          "Engineer an automated tracking system for multi-category expenses and income streams, configurable monthly budgets with real-time threshold notifications, and comprehensive month-over-month / year-over-year financial trend analytics."
        ),
        bullet(
          "Implement Transparent Statistical Anomaly Detection & Financial Health Scoring",
          "Formulate pure Python analytics engines that detect transaction outliers using rolling category Z-scores (flagging |z| > 2.5 against baseline histories) and compute transparent, multi-factor financial health scores with automated weight redistribution."
        ),
        bullet(
          "Build a Multi-Method Stock Valuation & Equity Analysis Engine",
          "Implement quantitative valuation algorithms encompassing two-stage DCF with WACC/terminal growth sensitivity matrices, Graham PEG valuation, P/E, EV/EBITDA, DDM, technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands), and multi-factor stock attractiveness scoring."
        ),
        bullet(
          "Architect an Abstraction-Layered Financial Data Provider",
          "Design a resilient provider architecture (`FinancialDataProvider` interface) that decouples business logic from external market vendors, executing on deterministic recorded-sample fixtures for zero-dependency testability while enabling seamless live API switching."
        ),
        bullet(
          "Create Comprehensive Portfolio Intelligence & Goal Calculators",
          "Develop interactive mathematical planning modules including SIP with annual step-up, lumpsum investments, fixed deposits with inflation drag, XIRR calculations, and portfolio concentration/drawdown metrics."
        ),
        bullet(
          "Deploy an Explainable, Grounded AI Research Assistant (RAG)",
          "Integrate a Retrieval-Augmented Generation (RAG) assistant that delivers grounded summaries from ingested market filings and news with mandatory citation indices, strictly enforcing 'insufficient data' over hallucinations."
        ),
        bullet(
          "Ensure Enterprise-Grade Security, Role Governance & Cloud Scalability",
          "Enforce stateless JWT security, immutable administrative audit trails, client rate limiting, versioned disclaimer compliance, and containerized Docker orchestration ready for cloud deployment."
        ),

        sectionHeading("4", "Scope of Work"),
        bullet(
          "Core Financial Management Module",
          "User registration/login, versioned legal disclaimer verification, full CRUD operations for expenses and recurring transactions, multi-income management, budget allocation with dynamic visual utilization progress bars, and CSV/JSON data export."
        ),
        bullet(
          "Analytics & AI Insight Engine Module",
          "Historical spending aggregation, category breakdown donut charts, MoM/YoY growth deltas, merchant concentration analytics, statistical Z-score outlier flagging, and guarded rule-based financial insight generation."
        ),
        bullet(
          "Market Analytics & Valuation Engine Module",
          "NSE/BSE symbol analysis, technical indicator computation (RSI, MACD, Bollinger Bands, max drawdown, annualized volatility), multi-model equity valuation (DCF, PEG, P/E, EV/EBITDA, DDM), bear/base/bull scenario presets, and explainable stock scoring."
        ),
        bullet(
          "Planning Calculators & Wealth Engineering Module",
          "SIP calculator with annual step-up and expense-ratio drag analysis, lumpsum wealth projections, Fixed Deposit compound interest modeling, goal-seeking savings targets, and interactive inflation-adjusted visual trajectories."
        ),
        bullet(
          "Administration & Compliance Governance Module",
          "System-wide administrative dashboard, active user management, session controls, immutable security audit logging, and disclaimer version tracking."
        ),
        bullet(
          "Technology & Engineering Scope",
          "Backend: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, PostgreSQL, SQLite, pytest. Frontend: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons. Cloud & DevOps: Docker, Docker Compose, Git, GitHub."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 4: PLAN OF WORK & REFERENCES ====================
        sectionHeading("5", "Plan of Work"),
        new Paragraph({
          spacing: { before: 80, after: 140 },
          children: [
            run(
              "The following structured phase-wise roadmap outlines the planned schedule across the semester, aligned with BITS Pilani WILP academic milestones and supervisor reviews:",
              { italics: true, size: 20 }
            ),
          ],
        }),

        planOfWorkTable,

        new Paragraph({ spacing: { before: 180 } }),

        sectionHeading("6", "Literature References"),
        bullet(
          "FastAPI Documentation",
          "Tiangolo, S. (2024). 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.' https://fastapi.tiangolo.com/"
        ),
        bullet(
          "SQLAlchemy 2.0 Documentation",
          "Bayer, M. (2024). 'SQLAlchemy: The Database Toolkit for Python.' SQLAlchemy Authors. https://docs.sqlalchemy.org/en/20/"
        ),
        bullet(
          "React & Vite Documentation",
          "Meta Open Source & Evan You (2024). 'React: The library for web and native user interfaces' & 'Vite: Next Generation Frontend Tooling.' https://react.dev/ and https://vite.dev/"
        ),
        bullet(
          "Damodaran on Valuation",
          "Damodaran, A. (2012). 'Investment Valuation: Tools and Techniques for Determining the Value of Any Asset.' 3rd Edition, John Wiley & Sons."
        ),
        bullet(
          "Financial Sentiment Analysis with FinBERT",
          "Araci, D. (2019). 'FinBERT: Financial Sentiment Analysis with Pre-trained Language Models.' arXiv preprint arXiv:1908.10063."
        ),
        bullet(
          "Machine Learning in Time-Series Forecasting",
          "Box, G. E., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). 'Time Series Analysis: Forecasting and Control.' 5th Edition, John Wiley & Sons."
        ),
        bullet(
          "Scikit-Learn Machine Learning in Python",
          "Pedregosa, F., et al. (2011). 'Scikit-learn: Machine Learning in Python.' Journal of Machine Learning Research, 12, 2825-2830. https://scikit-learn.org/"
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 5: PARTICULARS & SIGNATURES ====================
        sectionHeading("7", "Particulars of the Supervisor and Additional Examiner"),

        particularsTable,

        new Paragraph({ spacing: { before: 200 } }),

        sectionHeading("8", "Remarks of the Supervisor"),
        new Paragraph({
          spacing: { before: 60, after: 200 },
          children: [
            run("[For supervisor's comments, evaluation feedback, and approval.]", {
              italics: true,
              color: MUTED_COLOR,
              size: 20,
            }),
          ],
        }),

        signatureTable,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT_PATH, buffer);
  console.log("Successfully generated:", OUT_PATH);
});
