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
  VerticalAlign,
} = require("docx");

const OUT_PATH = "C:\\Users\\Naveen\\Downloads\\FinAI_Project_Outline.docx";

const FONT_FAMILY = "Times New Roman";
const PRIMARY_COLOR = "003366"; // Academic Deep Navy Blue
const TEXT_COLOR = "000000";
const MUTED_COLOR = "444444";
const BORDER_COLOR = "555555";
const HEADER_BG = "EBF2F7";

const standardBorder = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: BORDER_COLOR,
};

const cellBorders = {
  top: standardBorder,
  bottom: standardBorder,
  left: standardBorder,
  right: standardBorder,
};

const cellMargins = {
  top: 100,
  bottom: 100,
  left: 140,
  right: 140,
};

function run(text, options = {}) {
  return new TextRun({
    text: text,
    font: FONT_FAMILY,
    size: options.size || 22, // 11pt default
    bold: options.bold || false,
    italics: options.italics || false,
    color: options.color || TEXT_COLOR,
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 70, after: 70, line: 260 },
    children: [run(text, { size: 21 })],
  });
}

function sectionHeading(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
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
  columnWidths: [3100, 6260],
  rows: [
    createMetaRow("Course No.", "CSIWZG628T", true),
    createMetaRow("Course Title", "Dissertation / Project / Project Work", true),
    createMetaRow("Student Name", "Sugamanchi Naveen", true),
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
        margins: cellMargins,
        width: { size: 3100, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(label, { bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 6260, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
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
  columnWidths: [3300, 6060],
  rows: [
    createOutlineRow("Student ID No.", "2022WB86112"),
    createOutlineRow("Name of Student", "Sugamanchi Naveen"),
    createOutlineRow("Student Email Address", "2022wb86112@wilp.bits-pilani.ac.in"),
    createOutlineRow("Student's Employing Organization & Location", "Wipro Limited, Bangalore"),
    createOutlineRow("Supervisor's Name", "Soham Das"),
    createOutlineRow("Supervisor's Organization & Location", "Wipro Technologies Ltd., Salt Lake City, Kolkata"),
    createOutlineRow("Supervisor's Email Address", "soham.das@wipro.com"),
    createOutlineRow("Additional Examiner's Name", "Smrutirekha Behera"),
    createOutlineRow("Additional Examiner's Organization & Location", "Wipro Limited, SEZ Gopanapally, Hyderabad"),
    createOutlineRow("Additional Examiner's Email Address", "smrutirekha.behera@wipro.com"),
    createOutlineRow("Project Title", "Advanced AI Based Personal Finance & Investment Analysis Tool", true),
  ],
});

function createOutlineRow(label, value, boldValue = false) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 3300, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(label, { bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 6060, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(value, { bold: boldValue, size: 20 })],
          }),
        ],
      }),
    ],
  });
}

// Table 3: Plan of Work Table (Clean, concise & realistic)
const planOfWorkTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [2200, 4460, 2700],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("Phase", 2200),
        createHeaderCell("Planned Work", 4460),
        createHeaderCell("Deliverable", 2700),
      ],
    }),
    createPlanRow(
      "Phase 1 – Requirements & Architecture",
      "Finalize requirements, database schema, and system architecture. Implement user authentication, core income and expense tracking, and monthly budget management.",
      "Approved project outline, system design specification, and core tracking application."
    ),
    createPlanRow(
      "Phase 2 – Analytics & Anomaly Detection",
      "Develop category-wise trend analytics, visual charts, statistical Z-score expense anomaly detection, and explainable financial health scoring.",
      "Functional analytics dashboard with anomaly alerts and health score module."
    ),
    createPlanRow(
      "Phase 3 – Investment & Valuation Engines",
      "Implement financial planning calculators (SIP, FD, CAGR, XIRR) and equity valuation models (DCF, Graham PEG, P/E multiples, and technical indicators).",
      "Interactive investment analysis tools, valuation engine, and stock analysis reports."
    ),
    createPlanRow(
      "Phase 4 – AI Assistant & System Integration",
      "Integrate grounded AI assistant with data citations for market queries, complete end-to-end integration, performance optimization, and containerized deployment.",
      "Integrated full-stack AI financial platform ready for cloud deployment."
    ),
    createPlanRow(
      "Phase 5 – Testing, Evaluation & Dissertation",
      "Perform functional testing, user evaluation, and accuracy validation of financial models. Prepare final dissertation report, slides, and viva demonstration.",
      "Completed dissertation thesis, presentation slides, and viva demonstration."
    ),
  ],
});

function createHeaderCell(text, widthDxa) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        spacing: { before: 50, after: 50 },
        children: [run(text, { bold: true, size: 20, color: PRIMARY_COLOR })],
      }),
    ],
  });
}

function createPlanRow(phase, work, deliverable) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 2200, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [run(phase, { bold: true, size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 4460, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50, line: 250 },
            children: [run(work, { size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 2700, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50, line: 250 },
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
    createParticularRow("Qualification", "B.Tech in Computer Science and Engineering", "M.Tech in Software Engineering"),
    createParticularRow("Designation", "Senior Technical Specialist", "Technical Consultant"),
    createParticularRow("Employing organization and location", "Wipro Technologies Ltd., Salt Lake City, Kolkata", "Wipro Limited, SEZ Gopanapally, Hyderabad"),
    createParticularRow("Phone number", "+91 7073143358", "+91 8885489246"),
    createParticularRow("Email address", "soham.das@wipro.com", "smrutirekha.behera@wipro.com"),
  ],
});

function createParticularRow(label, supVal, examVal) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 2600, type: WidthType.DXA },
        shading: { fill: "F7F9FB", type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(label, { bold: true, size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 3380, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(supVal, { size: 19 })],
          }),
        ],
      }),
      new TableCell({
        borders: cellBorders,
        margins: cellMargins,
        width: { size: 3380, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 35, after: 35 },
            children: [run(examVal, { size: 19 })],
          }),
        ],
      }),
    ],
  });
}

// Table 5: Signature Table
const signatureTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3120, 3120, 3120],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 35, after: 35 },
              children: [run("Student Signature", { bold: true, size: 20, color: PRIMARY_COLOR })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 35, after: 35 },
              children: [run("Supervisor Signature", { bold: true, size: 20, color: PRIMARY_COLOR })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 35, after: 35 },
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
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 180, after: 35 },
              children: [run("Name: Sugamanchi Naveen", { bold: true, size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 35, after: 35 },
              children: [run("Date: 27/10/2026", { size: 19 })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 180, after: 35 },
              children: [run("Name: Soham Das", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 35, after: 35 },
              children: [run("Date: 27/10/2026", { size: 19 })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 180, after: 35 },
              children: [run("Name: Smrutirekha Behera", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 35, after: 35 },
              children: [run("Date: 27/10/2026", { size: 19 })],
            }),
          ],
        }),
      ],
    }),
  ],
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: FONT_FAMILY,
          size: 22,
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
            top: 1440,
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
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "M.Tech Project Outline | FinAI – Advanced AI Based Personal Finance & Investment Analysis Tool",
                  font: FONT_FAMILY,
                  size: 16,
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
              spacing: { before: 100 },
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
        // ==================== PAGE 1 ====================
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: "BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI",
              font: FONT_FAMILY,
              size: 28,
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 180 },
          children: [
            new TextRun({
              text: "WORK INTEGRATED LEARNING PROGRAMMES (WILP) DIVISION",
              font: FONT_FAMILY,
              size: 22,
              bold: true,
              color: MUTED_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 180 },
          children: [
            new TextRun({
              text: "DISSERTATION / PROJECT OUTLINE",
              font: FONT_FAMILY,
              size: 26,
              bold: true,
              color: TEXT_COLOR,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 220 },
          children: [
            new TextRun({
              text: "FinAI – Advanced AI Based Personal Finance & Investment Analysis Tool",
              font: FONT_FAMILY,
              size: 24,
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),

        metaTable,

        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: "Project Outline",
              font: FONT_FAMILY,
              size: 24,
              bold: true,
              color: PRIMARY_COLOR,
            }),
          ],
        }),

        outlineDetailsTable,

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 2 ====================
        sectionHeading("1", "Broad Academic Area of Work"),
        bullet("Artificial Intelligence and Machine Learning for financial analytics, anomaly detection, and sentiment analysis."),
        bullet("Cloud-based full-stack web application development using Python FastAPI, PostgreSQL, and React.js with TypeScript."),
        bullet("Financial modeling, investment valuation (DCF, Graham PEG, P/E multiples), and technical indicator analysis."),
        bullet("Personal financial planning, budget management, savings tracking, and compound interest calculations (SIP, FD, XIRR)."),
        bullet("Data security, role-based access control, and compliant user data management."),

        sectionHeading("2", "Background"),
        bullet("Individuals often rely on fragmented tools such as basic spreadsheets and disconnected mobile apps to track expenses, monitor budgets, and evaluate investments."),
        bullet("Traditional budgeting applications only record historical transactions without providing explainable insights or highlighting spending anomalies."),
        bullet("Investment analysis tools are typically isolated from personal financial data, making it difficult for users to evaluate investment opportunities against their actual savings capacity."),
        bullet("Many modern AI-driven financial platforms produce opaque recommendations without transparent mathematical calculations or verifiable data references."),
        bullet("FinAI is proposed as a unified, cloud-based platform that combines intelligent personal financial management with transparent investment valuation and explainable AI insights."),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 3 ====================
        sectionHeading("3", "Objectives"),
        bullet("Develop a centralized platform to record, categorize, and manage income, expenses, and recurring financial transactions."),
        bullet("Implement configurable monthly budgets with real-time tracking and threshold alert notifications."),
        bullet("Apply statistical anomaly detection algorithms to identify unusual spending spikes and irregular transactions."),
        bullet("Formulate an explainable financial health scoring model based on savings rate, debt ratio, and budget adherence."),
        bullet("Build quantitative equity valuation modules supporting Discounted Cash Flow (DCF), PEG, and market multiple models."),
        bullet("Provide interactive financial planning calculators for Systematic Investment Plans (SIP), Fixed Deposits (FD), and wealth projections."),
        bullet("Deploy a secure, cloud-hosted web application with role-based access control, audit logging, and responsive user dashboards."),

        sectionHeading("4", "Scope of Work"),
        bullet("User Management & Security: Registration, secure login, role-based access control, session management, and disclaimer tracking."),
        bullet("Expense & Budget Module: Multi-category expense tracking, recurring transactions, income logging, and dynamic budget utilization progress."),
        bullet("Analytics & AI Module: Monthly spending trends, category distributions, statistical Z-score anomaly detection, and automated financial insights."),
        bullet("Investment & Valuation Module: Equity metrics, technical indicators (SMA, EMA, RSI, MACD), DCF valuation, and stock score generation."),
        bullet("Financial Planning Module: SIP with step-up projections, Fixed Deposit compound growth, inflation adjustments, and CAGR/XIRR calculators."),
        bullet("Technology Stack: Python FastAPI backend, PostgreSQL/SQLite database, React.js frontend with Tailwind CSS, and Docker deployment."),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 4 ====================
        sectionHeading("5", "Plan of Work"),
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: [
            run(
              "The following is a proposed semester-level plan aligned with institute academic milestones and supervisor reviews:",
              { italics: true, size: 20 }
            ),
          ],
        }),

        planOfWorkTable,

        new Paragraph({ spacing: { before: 160 } }),

        sectionHeading("6", "Literature References"),
        bullet("FastAPI Documentation: High-performance Python web framework for building APIs. https://fastapi.tiangolo.com/"),
        bullet("React.js Documentation: Official documentation for building modern component-based user interfaces. https://react.dev/"),
        bullet("SQLAlchemy Documentation: Comprehensive Python SQL toolkit and Object Relational Mapper. https://docs.sqlalchemy.org/"),
        bullet("Damodaran, A. (2012): 'Investment Valuation: Tools and Techniques for Determining the Value of Any Asset.' 3rd Edition, John Wiley & Sons."),
        bullet("Pedregosa, F., et al. (2011): 'Scikit-learn: Machine Learning in Python.' Journal of Machine Learning Research, 12, 2825-2830."),
        bullet("Docker Documentation: Containerization platform for application packaging and deployment. https://docs.docker.com/"),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 5 ====================
        sectionHeading("7", "Particulars of the Supervisor and Additional Examiner"),

        particularsTable,

        new Paragraph({ spacing: { before: 180 } }),

        sectionHeading("8", "Remarks of the Supervisor"),
        new Paragraph({
          spacing: { before: 60, after: 160 },
          children: [
            run("[For supervisor's comments and approval.]", {
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
  // Also copy to deliverables folder
  fs.writeFileSync("C:\\Users\\Naveen\\Downloads\\FinAI Project-R2\\deliverables\\FinAI_Project_Outline.docx", buffer);
  console.log("Successfully generated cleaned Word document!");
});
