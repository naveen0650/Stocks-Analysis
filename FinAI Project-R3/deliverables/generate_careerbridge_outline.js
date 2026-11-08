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
  ImageRun,
  VerticalAlign,
} = require("docx");

const OUT_PATH = "C:\\Users\\Naveen\\Downloads\\CareerBridge_Project_Outline.docx";

const FONT_FAMILY = "Times New Roman";
const PRIMARY_COLOR = "003366";
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
    size: options.size || 22,
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
        size: 24,
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
    createMetaRow("Student Name", "MEGHANA V", true),
    createMetaRow("BITS ID", "2022WB86105", true),
    createMetaRow("Degree Program", "M.Tech in Computing Systems & Infrastructure (WIMS)", true),
    createMetaRow("Research Area", "Web Technologies", true),
    createMetaRow("Project carried out at", "Wipro Limited, Bangalore", false),
    createMetaRow("Supervisor", "Chatla Shiva Shankar", false),
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
    createOutlineRow("Student ID No.", "2022WB86105"),
    createOutlineRow("Name of Student", "MEGHANA V"),
    createOutlineRow("Student Email Address", "2022wb86105@wilp.bits-pilani.ac.in"),
    createOutlineRow("Student's Employing Organization & Location", "Wipro Limited, Bangalore"),
    createOutlineRow("Supervisor's Name", "Chatla Shiva Shankar"),
    createOutlineRow(
      "Supervisor's Organization & Location",
      "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301"
    ),
    createOutlineRow("Supervisor's Email Address", "chatla.shankar@wipro.com"),
    createOutlineRow("Additional Examiner's Name", "Smrutirekha Behera"),
    createOutlineRow(
      "Additional Examiner's Organization & Location",
      "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301"
    ),
    createOutlineRow("Additional Examiner's Email Address", "smrutirekha.behera@wipro.com"),
    createOutlineRow("Project Title", "CareerBridge - Mentorship & Vacancy Suggest Portal", true),
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

// Table 3: Plan of Work Table
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
      "Phase 1 – Requirements & System Design",
      "Analyze mentorship and hiring workflows, finalize system architecture, design relational database schemas, and establish authentication and role-based access control.",
      "Approved project outline, system requirements specification, and database schema design."
    ),
    createPlanRow(
      "Phase 2 – Core Portal & Scheduling Development",
      "Develop responsive frontend interfaces, user profiles (mentee, mentor, recruiter), vacancy publishing modules, and interactive calendar-based session booking.",
      "Functional web portal with authentication, profile management, and appointment scheduling."
    ),
    createPlanRow(
      "Phase 3 – Matching & Recommendation Engine",
      "Implement skill-based matching algorithms and content-based recommendation models connecting mentees with suitable mentors and tailored job openings.",
      "Integrated recommendation engine with vacancy and mentor suggestion workflows."
    ),
    createPlanRow(
      "Phase 4 – Communication & Cloud Deployment",
      "Build real-time notification systems, session feedback mechanisms, administrative governance dashboards, and containerized cloud deployment.",
      "Full-stack deployed web application with admin controls, feedback loops, and monitoring."
    ),
    createPlanRow(
      "Phase 5 – Testing, Evaluation & Dissertation",
      "Conduct functional, usability, and recommendation performance testing. Prepare final dissertation report, presentation slides, and viva demonstration.",
      "Final dissertation thesis report, review presentation deck, and project demonstration."
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

// Table 4: Section 7 - Particulars of Supervisor & Additional Examiner
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
    createParticularRow("Name", "Chatla Shiva Shankar", "Smrutirekha Behera"),
    createParticularRow(
      "Qualification",
      "Bachelor of Technology (B.Tech) in Computer Science and Engineering (CSE)",
      "Master of Technology (M.Tech) in Software Engineering"
    ),
    createParticularRow(
      "Designation",
      "Project Engineer at Wipro with 5 years Experience",
      "Technical Consultant at Wipro with 12 years of IT experience"
    ),
    createParticularRow(
      "Employing organization and location",
      "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301",
      "Wipro Limited, Survey No. 124 & Part of 132/P, SEZ Gopanapally, Osman Nagar, Gopanapally, Hyderabad, Telangana 501301"
    ),
    createParticularRow("Phone number", "+91 6305687572", "+91 8885489246"),
    createParticularRow("Email address", "chatla.shankar@wipro.com", "smrutirekha.behera@wipro.com"),
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
            spacing: { before: 40, after: 40 },
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
            spacing: { before: 40, after: 40, line: 240 },
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
            spacing: { before: 40, after: 40, line: 240 },
            children: [run(examVal, { size: 19 })],
          }),
        ],
      }),
    ],
  });
}

// Table 5: Section 8 - Signature Table with actual signature images
const sigSupervisorBuf = fs.readFileSync("C:\\Users\\Naveen\\Downloads\\sig_shiva_shankar.png");
const sigExaminerBuf = fs.readFileSync("C:\\Users\\Naveen\\Downloads\\sig_examiner.png");

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
              spacing: { before: 40, after: 40 },
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
              spacing: { before: 40, after: 40 },
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
          margins: cellMargins,
          width: { size: 3120, type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              spacing: { before: 180, after: 20 },
              children: [run("Name: MEGHANA V", { bold: true, size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 0, after: 40 },
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
              alignment: AlignmentType.CENTER,
              spacing: { before: 50, after: 30 },
              children: [
                new ImageRun({
                  data: sigSupervisorBuf,
                  transformation: { width: 145, height: 55 },
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 20 },
              children: [run("Name: Chatla Shiva Shankar", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 0, after: 40 },
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
              alignment: AlignmentType.CENTER,
              spacing: { before: 50, after: 30 },
              children: [
                new ImageRun({
                  data: sigExaminerBuf,
                  transformation: { width: 155, height: 55 },
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 20 },
              children: [run("Name: Smrutirekha Behera", { size: 19 })],
            }),
            new Paragraph({
              spacing: { before: 0, after: 40 },
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
                  text: "M.Tech Project Outline | CareerBridge - Mentorship & Vacancy Suggest Portal",
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
              text: "CareerBridge - Mentorship & Vacancy Suggest Portal",
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
        bullet("Web Technologies and modern full-stack web application architecture for centralized career development."),
        bullet("Machine learning and algorithmic recommendation systems for skill-based mentor matching and job vacancy suggestions."),
        bullet("Interactive scheduling, calendar booking, and real-time appointment management workflows."),
        bullet("Relational database engineering and RESTful API integration for user profiles, vacancies, and mentorship tracking."),
        bullet("Digital transformation of manual career counseling and placement processes through secure, cloud-hosted platforms."),

        sectionHeading("2", "Background"),
        bullet("Students and early-career professionals often face significant hurdles in identifying the right career trajectory and finding verified industry mentors."),
        bullet("Traditional job portals focus primarily on static resume submissions without offering direct interactive guidance or skill-gap advisory."),
        bullet("Mentorship coordination is frequently managed through informal, scattered channels like LinkedIn messages or email, leading to unorganized schedules and poor follow-ups."),
        bullet("Job seekers struggle to identify relevant job openings aligned with their specific strengths, acquired certifications, and career aspirations."),
        bullet("CareerBridge is proposed as an intelligent, unified web portal that bridges the gap between aspirants, experienced mentors, and hiring recruiters through personalized guidance and vacancy recommendations."),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 3 ====================
        sectionHeading("3", "Objectives"),
        bullet("Develop a centralized, multi-role web platform supporting mentees, mentors, and corporate recruiters."),
        bullet("Enable mentors to configure their domain expertise, availability slots, and structured guidance offerings."),
        bullet("Provide calendar-based booking workflows for scheduling 1-on-1 mentorship and career advisory sessions."),
        bullet("Implement an algorithmic recommendation engine that suggests relevant job vacancies based on user skills, experience level, and preferences."),
        bullet("Facilitate mentor-mentee matching based on shared technical domains, industry goals, and learning objectives."),
        bullet("Build recruiter dashboards for posting vacancies, filtering qualified candidates, and tracking applications."),
        bullet("Deploy a responsive, cloud-accessible web application ensuring data privacy, role-based security, and seamless user interaction."),

        sectionHeading("4", "Scope of Work"),
        bullet("User Management: Role-based registration and authentication for mentees, industry mentors, and recruiting organizations."),
        bullet("Mentorship Module: Mentor profile discovery, domain-based filtering, availability slot management, session booking, and feedback ratings."),
        bullet("Vacancy Management: Recruiter job postings, skill tagging, candidate application tracking, and vacancy status updates."),
        bullet("Recommendation Engine: Content-based and collaborative filtering to recommend personalized job vacancies and suitable mentors to aspirants."),
        bullet("Communication & Feedback: Automated session notifications, email reminders, and post-session review mechanisms."),
        bullet("Technology Scope: Frontend development using React.js/HTML5/CSS3; backend REST APIs built with Node.js/Express.js or Python FastAPI; relational database storage; cloud deployment."),

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
        bullet("React Documentation: 'Quick Start', component-based user-interface development, state, events and rendering. https://react.dev/"),
        bullet("Node.js & Express Documentation: Official documentation for building backend RESTful services and APIs. https://expressjs.com/ and https://nodejs.org/"),
        bullet("Aggarwal, C. C. (2016): 'Recommender Systems: The Textbook.' Springer International Publishing, covering content-based and collaborative filtering techniques."),
        bullet("PostgreSQL Documentation: Official relational database architecture and query optimization guide. https://www.postgresql.org/docs/"),
        bullet("REST API Architectural Principles: Fielding, R. T. (2000). 'Architectural Styles and the Design of Network-based Software Architectures.' Doctoral dissertation, UC Irvine."),
        bullet("Tailwind CSS Documentation: Modern utility-first CSS framework for responsive web user interfaces. https://tailwindcss.com/docs"),

        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PAGE 5 ====================
        sectionHeading("7", "Particulars of the Supervisor and Additional Examiner"),

        particularsTable,

        new Paragraph({ spacing: { before: 160 } }),

        sectionHeading("8", "Remarks of the Supervisor"),
        new Paragraph({
          spacing: { before: 40, after: 120 },
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
  console.log("Successfully generated CareerBridge Word document!");
});
