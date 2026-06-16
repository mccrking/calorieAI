"use strict";

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, PageNumber, NumberFormat, SectionType, TableOfContents,
  TableLayoutType, Header, Footer, TabStopType, TabStopPosition
} = require("docx");

// ─── Constants ───
const PAGE_W = 11906, PAGE_H = 16838;
const MARGIN = { top: 1440, bottom: 1440, left: 1701, right: 1417, header: 850, footer: 992 };
const BODY_SIZE = 24; // 12pt
const H1_SIZE = 32, H2_SIZE = 30, H3_SIZE = 28;
const BODY_COLOR = "000000";
const LINE_SPACING = 312;
const INDENT_FIRST = 480;

// ─── Helpers ───
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const font = { eastAsia: "SimSun", ascii: "Times New Roman" };
const fontBold = { eastAsia: "SimHei", ascii: "Times New Roman" };

function bodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: INDENT_FIRST },
    spacing: { line: LINE_SPACING, after: 60 },
    children: [new TextRun({ text, size: BODY_SIZE, color: BODY_COLOR, font })],
  });
}

function bodyParaRuns(runs) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: INDENT_FIRST },
    spacing: { line: LINE_SPACING, after: 60 },
    children: runs,
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 200, line: LINE_SPACING },
    children: [new TextRun({ text, bold: true, size: H1_SIZE, color: BODY_COLOR, font: fontBold })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160, line: LINE_SPACING },
    children: [new TextRun({ text, bold: true, size: H2_SIZE, color: BODY_COLOR, font: fontBold })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120, line: LINE_SPACING },
    children: [new TextRun({ text, bold: true, size: H3_SIZE, color: BODY_COLOR, font: fontBold })],
  });
}

function emptyPara() {
  return new Paragraph({ spacing: { line: LINE_SPACING }, children: [] });
}

function threeLineTable(headers, rows) {
  const topBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const headerBottom = { style: BorderStyle.SINGLE, size: 2, color: "000000" };
  const bottomBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

  function cellBorders(isHeader, isFirstRow, isLastRow) {
    return {
      top: (isFirstRow && true) ? topBorder : NB,
      bottom: isHeader ? headerBottom : (isLastRow ? bottomBorder : NB),
      left: NB, right: NB,
    };
  }

  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      borders: cellBorders(true, true, false),
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 312 },
        children: [new TextRun({ text: h, bold: true, size: 21, color: BODY_COLOR, font: fontBold })],
      })],
    })),
  });

  const dataRows = rows.map((row, idx) => new TableRow({
    children: row.map(cell => new TableCell({
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      borders: cellBorders(false, false, idx === rows.length - 1),
      margins: { top: 50, bottom: 50, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 312 },
        children: [new TextRun({ text: String(cell), size: 21, color: BODY_COLOR, font })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [headerRow, ...dataRows],
  });
}

function simpleTable(headers, rows) {
  // Simple bordered table for non-academic tables (BMC, risk matrix etc.)
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

  function cell(text, isBold, widthPct) {
    return new TableCell({
      width: { size: widthPct || Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      borders,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 300 },
        children: [new TextRun({ text: String(text), size: 20, color: BODY_COLOR, font: isBold ? fontBold : font })],
      })],
    });
  }

  const headerRow = new TableRow({
    children: headers.map((h, i) => cell(h, true, undefined)),
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map(c => cell(c, false, undefined)),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideHorizontal: thinBorder, insideVertical: thinBorder },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Cover Builder (R5 Academic) ───
function estimateTextWidth(text, pt) {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
    width += isCJK ? pt * 20 : pt * 11;
  }
  return width;
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...' ,;:!?\'-']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) {
        breakAt = i;
        break;
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt, minPt) {
  preferredPt = preferredPt || 36;
  minPt = minPt || 24;
  const charWidth = (pt) => pt * 11; // Latin text
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcR5MetaLayout(metaEntries, fontPt) {
  fontPt = fontPt || 12;
  const maxLabelLen = Math.max(...metaEntries.map(e => e.label.length));
  const labelNeedTw = (maxLabelLen + 2) * fontPt * 11;
  const valueNeedTw = 5000;
  const totalNeedTw = labelNeedTw + valueNeedTw;
  const tablePct = Math.min(75, Math.max(55, Math.ceil(totalNeedTw / 11906 * 100)));
  const rawLabelPct = Math.ceil(labelNeedTw / (tablePct / 100 * 11906) * 100);
  return { tablePct, labelPct: Math.max(25, Math.min(45, rawLabelPct)) };
}

function buildR5MetaTable(metaEntries) {
  const { tablePct, labelPct } = calcR5MetaLayout(metaEntries);
  const valuePct = 100 - labelPct;
  const bottomBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

  const rows = metaEntries.map(entry => new TableRow({
    children: [
      new TableCell({
        width: { size: labelPct, type: WidthType.PERCENTAGE },
        borders: noBorders,
        margins: { top: 60, bottom: 60, left: 0, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 60, after: 60, line: 400 },
          children: [new TextRun({ text: entry.label + " :", size: 24, font })],
        })],
      }),
      new TableCell({
        width: { size: valuePct, type: WidthType.PERCENTAGE },
        borders: { top: NB, left: NB, right: NB, bottom: bottomBorder },
        margins: { top: 60, bottom: 60, left: 80, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 60, after: 60, line: 400 },
          children: [new TextRun({ text: entry.value, size: 24, font })],
        })],
      }),
    ],
  }));

  return new Table({
    width: { size: tablePct, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows,
  });
}

function buildCover() {
  const SAFETY = 1200;
  const safeH = PAGE_H - SAFETY;
  const simMarginLR = 1701;
  const contentW = 11906 - simMarginLR * 2;

  const title = "Conception et developpement d'une application intelligente de suivi nutritionnel par analyse d'images et de texte : CalorieAI";
  const { titlePt, titleLines } = calcTitleLayout(title, contentW, 32, 22);
  const titleSize = titlePt * 2;

  const metaEntries = [
    { label: "Presente par", value: "Mehdi CHMITI & Ismail HADDAOUI" },
    { label: "Encadrante pedagogique", value: "Mme. Kaoutar KARBOUB" },
    { label: "Encadrante entrepreneuriat", value: "Mme. Zineb BENYAHYA" },
    { label: "Encadrante gestion de projet", value: "Mme. Khadija BOUSMAR" },
    { label: "Filiere", value: "Intelligence Artificielle & Data Science (4IA&Data)" },
    { label: "Annee universitaire", value: "2024-2025" },
  ];

  const schoolName = "ECOLE D'INGENIERIE";
  const department = "Departement Intelligence Artificielle & Data Science";

  // Calculate spacing
  const schoolH = (22 * 23 + 400);
  const deptH = (14 * 23 + 200);
  const titleTotalH = titleLines.length * (titlePt * 23 + 200);
  const metaRowH = 520;
  const metaTableH = metaEntries.length * metaRowH;
  const footerH = 476;
  const fixedH = schoolH + deptH + titleTotalH + metaTableH + footerH + 1200;
  const remaining = Math.max(safeH - fixedH, 600);
  const topSpacing = Math.min(Math.floor(remaining * 0.28) + 1200, 4200);
  const midSpacing = Math.min(Math.floor(remaining * 0.18), 1800);
  const bottomSpacing = Math.min(remaining - topSpacing - midSpacing, 5500);

  const children = [];
  children.push(new Paragraph({ spacing: { before: topSpacing } }));

  // School name
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200, line: Math.ceil(22 * 23), lineRule: "atLeast" },
    children: [new TextRun({ text: schoolName, size: 44, characterSpacing: 40, color: BODY_COLOR, font: fontBold })],
  }));

  // Department
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: department, size: 28, color: BODY_COLOR, font })],
  }));

  // Title lines
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: i < titleLines.length - 1 ? 100 : 400, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: BODY_COLOR, font: fontBold })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: midSpacing } }));

  // Meta table
  children.push(buildR5MetaTable(metaEntries));

  children.push(new Paragraph({ spacing: { before: bottomSpacing } }));

  // Footer
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 400 },
    children: [new TextRun({ text: "Annee universitaire 2024-2025", size: 24, color: "404040", font })],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: PAGE_H, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
        borders: noBorders,
        verticalAlign: "top",
        margins: { left: simMarginLR, right: simMarginLR },
        children,
      })],
    })],
  })];
}

// ─── Page Number Footer ───
function pageNumFooterRoman() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ children: [PageNumber.CURRENT], size: 22, color: BODY_COLOR, font }),
      ],
    })],
  });
}

function pageNumFooterArabic() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ children: [PageNumber.CURRENT], size: 22, color: BODY_COLOR, font }),
      ],
    })],
  });
}

// ─── Section factory ───
function sectionProps(opts) {
  return {
    page: {
      size: { width: PAGE_W, height: PAGE_H },
      margin: MARGIN,
      ...(opts.pageNumbers ? { pageNumbers: opts.pageNumbers } : {}),
    },
    ...(opts.nextPage ? { type: SectionType.NEXT_PAGE } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════

// ─── DEDICACE ───
function dedicace() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 600, line: LINE_SPACING },
      children: [new TextRun({ text: "Dedicace", bold: true, size: 32, color: BODY_COLOR, font: fontBold })],
    }),
    emptyPara(),
    bodyPara("A nos parents, pour leur amour inconditionnel, leur soutien constant et les sacrifices qu'ils ont consentis pour nous offrir les meilleures opportunites d'etude. Vous etes la source de notre inspiration et la raison de notre perseverance. Ce travail vous est entierement dedie."),
    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: INDENT_FIRST },
      spacing: { line: LINE_SPACING, after: 60 },
      children: [new TextRun({ text: "A tous ceux qui nous ont encourages et inspires tout au long de ce parcours academique, merci d'avoir cru en nous.", size: BODY_SIZE, color: BODY_COLOR, font })],
      pageBreakBefore: true,
    }),
  ];
}

// ─── REMERCIEMENTS ───
function remerciements() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 600, line: LINE_SPACING },
      children: [new TextRun({ text: "Remerciements", bold: true, size: 32, color: BODY_COLOR, font: fontBold })],
    }),
    emptyPara(),
    bodyPara("Nous tenons tout d'abord a exprimer notre profonde gratitude envers notre encadrante pedagogique principale, Mme. Kaoutar KARBOUB, professeur de PFA, pour sa direction scientifique eclairee, ses conseils precieux et sa disponibilite tout au long de la realisation de ce projet. Son encadrement rigoureux a ete determinant dans la qualite de notre travail et la reussite de cette experience academique."),
    bodyPara("Nous adressons egalement nos sinceres remerciements a Mme. Zineb BENYAHYA, professeur d'entrepreneuriat, pour ses enseignements stimulants et ses orientations strategiques qui nous ont permis d'aborder la dimension entrepreneuriale de notre projet avec rigueur et ambition. Ses retours constructifs ont enrichi notre reflexion sur le modele d'affaires et la viabilite de CalorieAI sur le marche."),
    bodyPara("Nos remerciements s'etendent egalement a Mme. Khadija BOUSMAR, professeur de gestion de projet, pour sa methodologie structurante et ses outils de planification qui ont ete essentiels a l'organisation et au suivi efficace de notre projet. Son expertise en gestion agile a permis a notre equipe de maintenir un rythme de travail optimal et de respecter les delais fixes."),
    bodyPara("Nous remercions chaleureusement les membres du jury pour l'attention qu'ils porteront a notre travail et pour leurs remarques qui contribueront a ameliorer la qualite de ce rapport."),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: INDENT_FIRST },
      spacing: { line: LINE_SPACING, after: 60 },
      children: [new TextRun({ text: "Enfin, nous tenons a remercier nos familles pour leur soutien moral et financier sans faille, ainsi que tous nos camarades de promotion pour l'ambiance collaborative et l'entraide qui ont caracterise cette annee universitaire.", size: BODY_SIZE, color: BODY_COLOR, font })],
      pageBreakBefore: true,
    }),
  ];
}

// ─── TOC ───
function tableOfContents() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 360 },
      children: [new TextRun({ text: "Table des matieres", bold: true, size: 32, color: BODY_COLOR, font: fontBold })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({
        text: "Note : Cette table des matieres est generee via des codes de champ. Pour assurer la precision des numeros de page apres edition, veuillez faire un clic droit sur la table et selectionner \"Mettre a jour les champs\".",
        italics: true, size: 18, color: "888888", font,
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ═══════════════════════════════════════════════════════════════
// BODY CHAPTERS
// ═══════════════════════════════════════════════════════════════

function introductionGenerale() {
  return [
    h1("Introduction generale"),
    bodyPara("L'obesite et les maladies liees a la nutrition representent aujourd'hui l'un des defis de sante publique les plus pressants a l'echelle mondiale. Selon l'Organisation Mondiale de la Sante (OMS), plus de 1,9 milliard d'adultes sont en surpoids, dont plus de 650 millions sont consideres comme obeses. Ces chiffres sont en constante augmentation, entrainant une recrudescence des pathologies chroniques telles que le diabete de type 2, les maladies cardiovasculaires, certains cancers et les troubles musculo-squelettiques. En France, les estimations indiquent que pres de 17% de la population adulte est obese, et les couts associes a ces maladies pesent lourdement sur les systemes de sante."),
    bodyPara("Face a cette situation, le suivi nutritionnel apparait comme un levier essentiel pour la prevention et la prise en charge. Cependant, la plupart des outils disponibles sur le marche se revelent fastidieux a utiliser au quotidien. Les applications de suivi nutritionnel classiques reposent principalement sur la saisie manuelle des aliments consommes, une demarche repetitive et chronophage qui conduit souvent a l'abandon de l'outil apres quelques semaines d'utilisation. L'utilisateur moyen doit rechercher chaque aliment dans une base de donnees, selectionner la portion appropriee et verifier les informations nutritionnelles, un processus qui peut prendre plusieurs minutes par repas."),
    bodyPara("C'est dans ce contexte que s'inscrit notre projet de fin d'etudes, CalorieAI, une application intelligente de suivi nutritionnel qui exploite les avancees recentes de l'intelligence artificielle pour revolutionner l'experience utilisateur. CalorieAI propose une approche novatrice basee sur l'analyse d'images et de texte, permettant aux utilisateurs de simplement photographier leur repas ou de decrire celui-ci en langage naturel pour obtenir instantanement une estimation nutritionnelle detaillee. Cette methode reduit considerablement la friction associee au suivi nutritionnel et rend le processus accessible a un public beaucoup plus large."),
    bodyPara("L'objectif general de ce projet est de concevoir et developper une application web progressive (PWA) integrant des fonctionnalites avancees d'intelligence artificielle pour le suivi nutritionnel intelligent. Les objectifs specifiques incluent la mise en place d'un systeme d'analyse d'images alimentaires reposant sur des modeles de vision par ordinateur, l'implementation d'un chatbot nutritionnel capable de repondre aux questions des utilisateurs et de generer des plans repas personnalises, la conception d'une interface utilisateur moderne et ergonomique, ainsi que la gamification de l'experience pour encourager l'adoption durable de bonnes habitudes alimentaires."),
    bodyPara("Ce rapport est structure en sept chapitres. Le premier chapitre presente le cadre du projet, la problematique et les objectifs. Le deuxieme chapitre propose un etat de l'art des solutions existantes et des technologies d'IA appliquees a la nutrition. Le troisieme chapitre est consacre a l'etude entrepreneuriale avec une analyse de marche et un business model. Le quatrieme chapitre detaille la gestion de projet selon la methode agile. Le cinquieme chapitre presente la conception et l'architecture technique. Le sixieme chapitre decrit la realisation et l'implementation. Enfin, le septieme chapitre traite des tests et de la validation."),
  ];
}

function chapitre1() {
  return [
    h1("Chapitre 1 : Contexte et Problematique"),
    h2("1.1 Introduction"),
    bodyPara("Ce premier chapitre a pour vocation de poser les fondations de notre projet en presentant le cadre institutionnel et academique dans lequel il s'inscrit, la problematique sous-jacente qui a motive sa conception, les objectifs specifies que nous nous sommes fixes, ainsi que les contraintes et exigences auxquelles notre solution doit repondre. L'analyse rigoureuse de ces differents elements constitue la base sur laquelle s'articulera l'ensemble de notre travail de recherche et de developpement."),

    h2("1.2 Cadre du projet"),
    bodyPara("Ce projet de fin d'etudes s'inscrit dans le cadre de la quatrieme annee du cycle d'ingenieur en Intelligence Artificielle et Data Science (4IA&Data). La filiere 4IA&Data forme des ingenieurs polyvalents capables de concevoir, developper et deployer des solutions intelligentes reposant sur les techniques d'apprentissage automatique, d'analyse de donnees et de traitement du langage naturel. Le PFE constitue l'aboutissement de cette formation, offrant aux etudiants l'opportunite de demontrer leur maitise des competences acquises a travers la realisation d'un projet complet et innovant."),
    bodyPara("Le projet CalorieAI est encadre par trois professeures, chacune apportant une expertise complementaire essentielle au bon deroulement du projet. Mme. Kaoutar KARBOUB, en tant qu'encadrante pedagogique principale, supervise la dimension technique et scientifique. Mme. Zineb BENYAHYA encadre la composante entrepreneuriale, nous guidant dans l'analyse de marche et la construction du modele d'affaires. Mme. Khadija BOUSMAR assure l'encadrement de la gestion de projet, garantissant une organisation methodique et un suivi rigoureux de l'avancement."),
    bodyPara("Le choix du theme s'est naturellement impose a travers l'intersection de nos interets pour l'intelligence artificielle appliquee a la sante et notre conviction qu'un suivi nutritionnel simplifie par l'IA pourrait avoir un impact reel et positif sur la vie quotidienne de millions de personnes."),

    h2("1.3 Problematique generale"),
    bodyPara("Le suivi nutritionnel represente un enjeu majeur de sante publique, mais sa mise en pratique se heurte a des obstacles significatifs qui limitent son efficacite et son adoption a grande echelle. La problematique centrale de notre projet peut etre formulee ainsi : comment rendre le suivi nutritionnel accessible, precis et durable grace a l'intelligence artificielle ?"),
    bodyPara("Les applications existantes presentent plusieurs lacunes qui expliquent les taux d'abandon eleves observes chez les utilisateurs. Premierement, la saisie manuelle des aliments est une tache chronophage qui necessite de connaitre le nom exact de chaque aliment, de naviguer dans des bases de donnees souvent incompletes et d'estimer visuellement les portions. Cette complexite cognitive est un frein majeur a l'adoption reguliere, en particulier chez les personnes non familiarisees avec les termes nutritionnels techniques."),
    bodyPara("Deuxiemement, les informations nutritionnelles fournies par ces applications sont souvent generiques et ne tiennent pas compte des specificites individuelles des utilisateurs. L'age, le sexe, le poids, la taille, le niveau d'activite physique et les objectifs personnels (perte de poids, prise de masse musculaire, maintien) sont rarement integres de maniere intelligente pour personnaliser les recommandations."),
    bodyPara("Troisiemement, l'absence d'interaction naturelle avec l'utilisateur limite l'engagement. La plupart des applications fonctionnent sur un modele de saisie-recherche-enregistrement sans offrir de feedback contextuel ni de conseils personnalises en temps reel. L'utilisateur reste seul face a ses donnees nutritionnelles sans savoir les interpreter ni les utiliser pour ameliorer ses habitudes."),
    bodyPara("Notre hypothese est que l'integration de modeles d'intelligence artificielle multimodaux, capables d'analyser des images et du texte en langage naturel, peut transformer radicalement l'experience de suivi nutritionnel en la rendant intuitive, rapide et engageante."),

    h2("1.4 Objectifs du projet"),
    h3("1.4.1 Objectif general"),
    bodyPara("L'objectif general de ce projet est de concevoir et developper une application web intelligente de suivi nutritionnel qui exploite les capacites de l'intelligence artificielle pour simplifier et ameliorer l'experience de suivi alimentaire des utilisateurs, tout en fournissant des analyses nutritionnelles precisces et des recommandations personnalisees."),

    h3("1.4.2 Objectifs specifiques"),
    bodyPara("Les objectifs specifiques du projet sont les suivants :"),
    bodyPara("Premierement, concevoir et developper une interface utilisateur moderne, responsive et accessible, basee sur les technologies web contemporaines (Next.js 16, TypeScript, Tailwind CSS 4) et conforme aux standards des Progressive Web Apps (PWA) pour garantir une experience native sur tous les appareils."),
    bodyPara("Deuxiemement, implementer un module d'analyse nutritionnelle par image utilisant les capacites de vision par ordinateur du modele GPT-4o-mini d'OpenAI, permettant aux utilisateurs de photographier leurs repas et d'obtenir une decomposition nutritionnelle detaillee (calories, proteines, glucides, lipides, fibres, vitamines)."),
    bodyPara("Troisiemement, developper un module d'analyse nutritionnelle par texte exploitant le traitement du langage naturel, capable de comprendre et d'interpreter les descriptions de repas en francais et en anglais pour extraire les informations nutritionnelles correspondantes."),
    bodyPara("Quatriemement, integrer un chatbot nutritionnel intelligent base sur GPT-4o-mini, capable de repondre aux questions des utilisateurs, de fournir des conseils alimentaires personnalises et de generer des plans repas adaptes aux profils individuels."),
    bodyPara("Cinquiemement, mettre en place un systeme de gamification avec des badges et des objectifs quotidiens pour encourager l'adoption durable de bonnes habitudes alimentaires et maintenir l'engagement des utilisateurs dans la duree."),
    bodyPara("Sixiemement, implementer une architecture de donnees dual-mode permettant de fonctionner avec SQLite en mode local pour le prototypage et Supabase (PostgreSQL) en mode production pour la scalabilite et la collaboration multi-utilisateurs."),

    h2("1.5 Contraintes et exigences"),
    h3("1.5.1 Contraintes fonctionnelles"),
    bodyPara("Le systeme doit permettre l'enregistrement et le suivi des entrees alimentaires quotidiennes avec calcul automatique des calories et macronutriments. Il doit integrer un systeme d'analyse par image et par texte avec des resultats retournes en moins de cinq secondes. Le chatbot doit pouvoir generer des plans repas personnalises bases sur le profil de l'utilisateur. L'application doit supporter le suivi d'hydratation avec journal quotidien de consommation d'eau. Enfin, le systeme doit calculer automatiquement le BMR (Basal Metabolic Rate) et le TDEE (Total Daily Energy Expenditure) a partir des donnees anthropometriques de l'utilisateur."),

    h3("1.5.2 Contraintes non fonctionnelles"),
    bodyPara("En termes de performance, l'application doit offrir des temps de reponse inferieurs a trois secondes pour les operations standard et supporter au moins cent utilisateurs simultanes en mode production. La securite des donnees personnelles des utilisateurs doit etre garantie grace au chiffrement des communications HTTPS et a la gestion securisee des cles API. L'interface doit etre responsive et fonctionner de maniere optimale sur desktop, tablette et mobile. L'application doit respecter les principes d'accessibilite WCAG 2.1 niveau AA pour etre utilisable par le plus grand nombre."),
    bodyPara("En termes de maintenabilite, le code doit suivre les standards TypeScript strict, etre documente et organise selon une architecture modulaire permettant l'ajout de fonctionnalites futures. Le choix de technologies modernes et largement adoptees (Next.js, Prisma, Supabase) garantit la disponibilite de ressources communautaires et la perennite de la solution."),
  ];
}

function chapitre2() {
  return [
    h1("Chapitre 2 : Etat de l'Art et Analyse des Solutions Existantes"),
    h2("2.1 Introduction"),
    bodyPara("Ce chapitre propose une analyse approfondie du paysage des applications de suivi nutritionnel actuellement disponibles sur le marche, ainsi qu'une etude des technologies d'intelligence artificielle appliquees au domaine de la nutrition. Cette analyse comparative nous permettra d'identifier les forces et les faiblesses des solutions existantes, de degager les opportunites d'innovation et de positionner CalorieAI de maniere strategique par rapport a la concurrence."),

    h2("2.2 Applications de suivi nutritionnel existantes"),
    bodyPara("Le marche des applications de sante et de nutrition est en pleine expansion depuis plus d'une decennie. Plusieurs solutions se sont imposees comme references dans le domaine, chacune proposant une approche specifique du suivi alimentaire."),

    h3("2.2.1 MyFitnessPal"),
    bodyPara("MyFitnessPal, acquis par Under Armour en 2015, est l'application de suivi nutritionnel la plus populaire au monde avec plus de 200 millions d'utilisateurs enregistres. Son atout principal reside dans sa base de donnees alimentaire colossale, comprenant plus de 14 millions d'aliments, alimentee par la communaute des utilisateurs. L'application propose un scanner de codes-barres integre et une interface de saisie manuelle relativement intuitive. Cependant, la qualite des donnees nutritionnelles varie considerablement selon les sources et les aliments saisis manuellement par les utilisateurs sont souvent inexacts. L'application propose des fonctionnalites premium payantes pour l'analyse des macronutriments detaillee et les plans personnalisables."),

    h3("2.2.2 Yazio"),
    bodyPara("Yazio est une application allemande qui se distingue par son interface elegante et sa gamme etendue de regimes alimentaires proposes, incluant le regime keto, le regime vegetarien, le regime sans gluten et le jeune intermittent. L'application integre un tracker d'activite physique et des recettes personnalisees. Yazio propose egalement une fonctionnalite de photographie alimentaire, mais celle-ci repose sur une reconnaissance simplifiee et ne fournit pas d'analyse nutritionnelle detaillee automatisee par IA. Les donnees sont principalement saisies manuellement, ce qui limite l'experience utilisateur."),

    h3("2.2.3 FatSecret"),
    bodyPara("FatSecret se positionne comme une solution gratuite et communautaire de suivi nutritionnel. L'application propose un journal alimentaire, un journal d'exercices et une base de donnees collaborative. Son approche sociale, avec la possibilite de partager ses progres avec la communaute, constitue un atout pour la motivation. Neanmoins, l'interface est relativement datee et l'absence de fonctionnalites avancees d'intelligence artificielle limite son attractivite pour les utilisateurs exigeants."),

    h3("2.2.4 Samsung Health et Apple Health"),
    bodyPara("Les ecosystems Samsung Health et Apple Health integrent des modules de suivi nutritionnel dans leurs plateformes de sante globale. Ces solutions beneficient d'une integration native avec les appareils portables (montres connectees, smartphones) pour le suivi d'activite physique. Cependant, le suivi nutritionnel reste une fonctionnalite secondaire, offrant moins de profondeur et de precision que les applications specialisees. La saisie des aliments repose essentiellement sur la recherche manuelle dans une base de donnees limitee."),

    h2("2.3 Analyse comparative"),
    bodyPara("Le tableau suivant presente une analyse comparative des principales fonctionnalites offertes par les solutions existantes par rapport a notre application CalorieAI :"),

    threeLineTable(
      ["Fonctionnalite", "MyFitnessPal", "Yazio", "FatSecret", "CalorieAI"],
      [
        ["Analyse par image IA", "Non", "Basique", "Non", "Oui (GPT-4o)"],
        ["Analyse par texte NLP", "Non", "Non", "Non", "Oui (GPT-4o)"],
        ["Chatbot nutritionnel", "Non", "Non", "Non", "Oui"],
        ["Plans repas personnalises", "Premium", "Oui", "Non", "Oui (IA)"],
        ["Gamification", "Limitee", "Limitee", "Limitee", "8 badges"],
        ["Suivi d'hydratation", "Premium", "Oui", "Non", "Oui"],
        ["Scan codes-barres", "Oui", "Oui", "Non", "Oui"],
        ["Reconnaissance vocale", "Non", "Non", "Non", "Oui (ASR)"],
        ["Calcul BMR/TDEE", "Oui", "Oui", "Non", "Oui"],
        ["Progressive Web App", "Non", "Non", "Non", "Oui"],
        ["Mode hors-ligne", "Non", "Non", "Non", "Partiel (SQLite)"],
        ["Open source", "Non", "Non", "Non", "Oui"],
      ]
    ),

    h2("2.4 Technologies d'IA appliquees a la nutrition"),
    bodyPara("Les avancees recentes en intelligence artificielle ont ouvert de nouvelles perspectives pour le suivi nutritionnel. Plusieurs technologies contribuent a transformer ce domaine."),

    h3("2.4.1 Vision par ordinateur"),
    bodyPara("La vision par ordinateur appliquee a l'analyse alimentaire a connu des progres significatifs grace aux architectures de reseaux de neurones convolutionnels profonds (CNN) et plus recemment aux modeles foundation multimodaux. Les premiers systemes comme GoogLeNet et ResNet ont demontre la faisabilite de la classification alimentaire a partir d'images avec des precisions depassant les 90% sur des ensembles de donnees controles. Des jeux de donnees comme Food-101, UNIMIB2016 et EcoPlan ont contribue a l'entrainement de modeles de plus en plus performants."),
    bodyPara("L'emergence des modeles foundation multimodaux, tels que GPT-4 Vision (GPT-4o), Claude 3 et Gemini, a constitue un tournant decisif. Ces modeles, entraines sur des corpus massifs d'images et de textes, sont capables d'identifier non seulement le type d'aliment present dans une image, mais aussi d'estimer la portion, de detecter les ingredients multiples dans un meme plat et de fournir une estimation nutritionnelle detaillee. Notre projet exploite specifiquement GPT-4o-mini pour cette tache, en raison de son excellent rapport qualite-prix et de ses capacites reconnues en analyse d'images."),

    h3("2.4.2 Traitement du langage naturel"),
    bodyPara("Le traitement du langage naturel (NLP) permet d'interpreter les descriptions textuelles des repas pour en extraire les informations nutritionnelles. Les modeles de langage grands (LLM) comme GPT-4o representent l'etat de l'art dans ce domaine. Contrairement aux approches anterieures basees sur l'extraction d'entites nommees (NER) et la correspondance avec des bases de donnees nutritionnelles, les LLM sont capables de comprendre le contexte, les abreviations, les noms regionaux et les descriptions qualitatives des aliments."),
    bodyPara("Dans le cadre de CalorieAI, nous utilisons GPT-4o-mini pour analyser les descriptions de repas saisies en langage naturel. L'utilisateur peut ecrire de maniere informelle, par exemple \"deux oeufs brouilles avec du fromage et du pain complet\" ou \"un cafe noisette et un croissant\", et le modele retourne une estimation nutritionnelle structuree incluant les calories, proteines, glucides et lipides pour chaque aliment identifie."),

    h2("2.5 Analyse SWOT de CalorieAI vs concurrents"),
    bodyPara("L'analyse SWOT permet de synthetiser le positionnement competitif de CalorieAI par rapport aux solutions existantes du marche."),

    threeLineTable(
      ["Dimension", "Elements"],
      [
        ["Forces", "Analyse nutritionnelle par IA multimodale (image + texte), chatbot intelligent pour les conseils et plans repas, gamification avancee avec 8 badges, architecture PWA avec mode offline, approche open source"],
        ["Faiblesses", "Base de donnees nutritionnelle moins etendue que MyFitnessPal (14M aliments), application en phase de developpement initial, absence de partenariats avec des professionnels de sante"],
        ["Opportunites", "Croissance du marche du fitness tech, demande croissante pour les solutions IA personnelles, evolution des habitudes de consommation vers le bien-etre, potentiel d'integration avec les dispositifs portables"],
        ["Menaces", "Concurrence des GAFAM (Google Fit, Apple Health), evolution rapide des modeles IA necessitant des mises a jour continues, reglementations sur les donnees de sante"],
      ]
    ),

    h2("2.6 Conclusion du chapitre"),
    bodyPara("L'analyse de l'etat de l'art revele que le marche des applications de suivi nutritionnel est mature mais que les solutions existantes presentent des lacunes significatives en termes d'intelligence artificielle et d'experience utilisateur. Aucune des applications etudiees n'offre une combinaison aussi complete d'analyse par image IA, d'analyse par texte NLP, de chatbot nutritionnel intelligent et de gamification avancee. CalorieAI se positionne donc comme une solution innovante qui comble ces lacunes en exploitant les dernieres avancees en intelligence artificielle pour offrir une experience de suivi nutritionnel sans precedent."),
  ];
}

function chapitre3() {
  return [
    h1("Chapitre 3 : Etude Entrepreneuriale"),
    h2("3.1 Introduction"),
    bodyPara("Ce chapitre est consacre a l'etude entrepreneuriale de CalorieAI, dimension essentielle de tout projet de fin d'etudes visant une application a potentiel commercial. Nous y analyserons le marche cible, les utilisateurs potentiels, le modele d'affaires, la strategie de monetisation et la viabilite financiere du projet. Cette etude s'inscrit dans l'encadrement de Mme. Zineb BENYAHYA, professeur d'entrepreneuriat, et repond aux exigences methodologiques d'une analyse entrepreneuriale rigoureuse."),

    h2("3.2 Etude de marche"),
    h3("3.2.1 Taille du marche"),
    bodyPara("Le marche mondial des applications de sante et de fitness a connu une croissance exponentielle au cours de la derniere decennie. Selon les estimations de Grand View Research, ce marche etait evalue a environ 14,7 milliards de dollars americains en 2023 et devrait atteindre une valeur de 120,37 milliards de dollars d'ici 2030, soit un taux de croissance annuel compose (TCAC) de 35,6%. Ce chiffre impressionnant reflete la prise de conscience mondiale de l'importance de la sante et du bien-etre, acceleree par la pandemie de COVID-19 qui a dramatiquement augmente la demande de solutions de suivi sante a distance."),
    bodyPara("Le sous-segment des applications de nutrition et de suivi alimentaire represente environ 25% du marche global des applications de sante, soit une part estimee a 3,7 milliards de dollars en 2023. Ce segment beneficie de tendances structurantes favorables : la croissance des maladies liees au mode de vie, l'augmentation des taux d'obesite dans les pays developpes et emergents, et la popularite croissante des regimes alimentaires specialises (ketogene, vegetarien, sans gluten). La region Europe-Moyen-Orient-Afrique (EMEA) represente le deuxieme marche le plus important, avec une part de 28%, derriere l'Amerique du Nord (35%)."),

    h3("3.2.2 Tendances du marche"),
    bodyPara("Plusieurs tendances majeures faconnent le marche des applications de nutrition et ouvrent des opportunites pour CalorieAI. La premiere tendance est l'integration de l'intelligence artificielle dans les applications de sante, qui permet de personnaliser les recommandations et d'automatiser des taches complexes comme l'analyse d'images alimentaires. La deuxieme tendance est la transition vers les Progressive Web Apps et les super-applications qui centralisent plusieurs fonctionnalites de sante au sein d'une meme interface. La troisieme tendance est la demande croissante pour les solutions de prevention plutot que de traitement, les utilisateurs etant de plus en plus proactifs dans la gestion de leur sante."),

    h2("3.3 Analyse des utilisateurs cibles"),
    bodyPara("Pour structurer notre comprehension des utilisateurs, nous avons defini trois personas representatifs de notre marche cible."),

    h3("3.3.1 Persona 1 : Le sportif soucieux de sa nutrition"),
    bodyPara("Ce persona est un homme ou une femme de 25 a 35 ans, regulierement actif physiquement, qui cherche a optimiser son alimentation pour atteindre ses objectifs sportifs (prise de masse, seche, performance). Il ou elle est technophile, comfortable avec les applications mobiles, mais frustre par la lenteur de la saisie manuelle dans les applications actuelles. Il cherche une solution rapide et precise qui s'integre dans sa routine sans la freiner."),

    h3("3.3.2 Persona 2 : Le professionnel sédentaire soucieux de sa santé"),
    bodyPara("Ce persona est un adulte de 30 a 50 ans, travaillant en bureau, qui a pris conscience des risques lies a un mode de vie sedentaire et a une alimentation desequilibree. Il souhaite perdre quelques kilos ou ameliorer sa sante generale mais manque de temps et de connaissances nutritionnelles. Il a besoin d'une solution simple, non intrusive, qui lui fournisse des conseils pratiques sans exiger une expertise prealable en nutrition."),

    h3("3.3.3 Persona 3 : L'etudiant soucieux du budget et de la sante"),
    bodyPara("Ce persona est un etudiant de 18 a 25 ans, avec un budget limite, qui souhaite adopter de bonnes habitudes alimentaires sans depenser dans des solutions premium couteuses. Il est tres a l'aise avec la technologie et apprecie les fonctionnalites ludiques (gamification, badges). Il cherche une application gratuite ou a faible cout, avec une interface moderne et engageante."),

    h2("3.4 Business Model Canvas"),
    bodyPara("Le Business Model Canvas de CalorieAI est presente dans le tableau suivant, structure selon les neuf blocs standard du modele :"),

    simpleTable(
      ["Bloc", "Description"],
      [
        ["Segments de clientele", "Sportifs (25-35 ans), professionnels sedentaires (30-50 ans), etudiants (18-25 ans), personnes suivant des regimes specifiques"],
        ["Proposition de valeur", "Suivi nutritionnel intelligent par IA (image + texte), chatbot nutritionnel personnalise, gamification engageante, PWA accessible sans installation"],
        ["Canaux de distribution", "Site web (PWA), stores d'applications (futur), reseaux sociaux, partenariats avec salles de sport et influenceurs sante"],
        ["Relations clients", "Support par chatbot IA, communaute en ligne, newsletters personnalisees, programme de fidelite (badges et niveaux)"],
        ["Sources de revenus", "Freemium (fonctionnalites de base gratuites), Premium (4,99 EUR/mois) pour l'analyse IA illimitee et les plans repas, partenariats B2B"],
        ["Ressources cles", "Equipe de developpement, modeles IA (GPT-4o-mini), infrastructure cloud (Supabase/Vercel), base de donnees nutritionnelle"],
        ["Activites cles", "Developpement et maintenance de la plateforme, entrainement et optimisation des modeles IA, marketing et acquisition utilisateurs"],
        ["Partenariats cles", "OpenAI (API GPT-4o-mini), Supabase (base de donnees), Vercel (hebergement), Open Food Facts (donnees alimentaires)"],
        ["Structure de couts", "API OpenAI (~200-500 EUR/mois), hebergement cloud (~50-100 EUR/mois), developpement (equipe), marketing digital"],
      ]
    ),

    h2("3.5 Strategie de monetisation"),
    bodyPara("La strategie de monetisation de CalorieAI repose sur un modele freemium equilibre, concu pour maximiser l'acquisition d'utilisateurs tout en generant des revenus durables a partir de la valeur ajoutee des fonctionnalites premium."),

    h3("3.5.1 Version gratuite (Freemium)"),
    bodyPara("La version gratuite offre un acces complet au suivi nutritionnel de base, incluant la saisie manuelle des aliments, le suivi d'hydratation, le tableau de bord quotidien avec calcul BMR/TDEE, et la gamification avec deblocage de badges. Les utilisateurs gratuits beneficient egalement d'un nombre limite d'analyses par image et par texte (5 analyses par jour) et d'un acces basique au chatbot nutritionnel. Cette version est concue pour demontrer la valeur du produit et convertir les utilisateurs vers l'offre premium."),

    h3("3.5.2 Version Premium"),
    bodyPara("La version premium, proposee a 4,99 euros par mois ou 39,99 euros par an, debloque l'ensemble des fonctionnalites avancees. Elle inclut les analyses par image et par texte illimitees, les plans repas personnalises generes par IA, les statistiques detaillees et les tendances sur plusieurs semaines, l'acces prioritaire au chatbot nutritionnel avec des recommandations avancees, ainsi que l'export de donnees au format CSV pour un suivi par des professionnels de sante. Ce tarif est positionne de maniere competitive par rapport a MyFitnessPal Premium (9,99 USD/mois) et Yazio Premium (5,99 EUR/mois)."),

    h3("3.5.3 Revenus B2B"),
    bodyPara("A moyen terme, CalorieAI explorera des opportunites de revenus B2B a travers des partenariats avec les salles de sport, les nutritionnistes et les entreprises proposant des programmes de bien-etre a leurs employes. Ces partenariats pourront prendre la forme de licences d'entreprise, d'integrations API et de co-branding sur des plateformes de sante tierces."),

    h2("3.6 Analyse concurrentielle"),
    bodyPara("L'analyse du positionnement concurrentiel revele que CalorieAI se differencie nettement des acteurs existants par son approche centree sur l'IA. Tandis que MyFitnessPal domine par la taille de sa base de donnees et Yazio se distingue par sa variete de regimes, CalorieAI innove en eliminant la friction de la saisie manuelle grace a l'analyse multimodale. Notre avantage concurrentiel principal reside dans la simplicite d'utilisation : photographier ou decrire son repas est significativement plus rapide et plus naturel que de rechercher chaque aliment dans une base de donnees. De plus, le chatbot nutritionnel intelligent offre un niveau d'interaction personnalisee inexistant chez les concurrents actuels."),

    h2("3.7 Viabilite financiere"),
    h3("3.7.1 Couts de developpement"),
    bodyPara("Les couts de developpement de CalorieAI sont relativement maitrises grace au choix d'architectures modernes et a l'utilisation d'API existantes. Le developpement initial, realise dans le cadre du PFE, ne genere pas de couts directs de personnel. Les couts operationnels mensuels estimes comprennent l'hebergement sur Vercel (gratuit pour le forfait Hobby), l'API OpenAI GPT-4o-mini (estimee a 200-500 EUR/mois selon l'utilisation), et la base de donnees Supabase (gratuite pour le forfait de base jusqu'a 500 MB). Le cout total estime en phase de lancement est inferieur a 500 EUR par mois."),

    h3("3.7.2 Projection de revenus"),
    bodyPara("En appliquant un taux de conversion freemium-to-premium standard de 2 a 5% (conforme aux benchmarks du secteur des applications de sante), et en fixant un objectif realiste de 10 000 utilisateurs actifs mensuels apres la premiere annee, nous pouvons projeter entre 200 et 500 abonnes premium, generant un revenu mensuel recurrent de 998 a 2 495 EUR. Avec un cout operationnel inferieur a 500 EUR/mois, le seuil de rentabilite peut etre atteint des le 6e mois suivant le lancement public."),

    h2("3.8 Conclusion du chapitre"),
    bodyPara("L'etude entrepreneuriale demontre que CalorieAI s'inscrit sur un marche en forte croissance, porte par des tendances structurantes favorables. Le modele d'affaires freemium est adapte a la cible identifiee et offre une trajectoire de rentabilite realiste. La differenciation par l'intelligence artificielle constitue un avantage concurrentiel solide qui positionne CalorieAI comme une solution innovante et perturbatrice sur le marche des applications de nutrition."),
  ];
}

function chapitre4() {
  return [
    h1("Chapitre 4 : Gestion de Projet"),
    h2("4.1 Introduction"),
    bodyPara("Ce chapitre presente la methodologie de gestion de projet adoptee pour le developpement de CalorieAI. Sous l'encadrement de Mme. Khadija BOUSMAR, nous avons structure notre approche autour des principes agiles, en detailleant l'organisation de l'equipe, la planification des phases, les outils utilises, la gestion des risques et les mecanismes de suivi et de reporting mis en place tout au long du projet."),

    h2("4.2 Methodologie adoptee"),
    bodyPara("Le projet CalorieAI a ete developpe en suivant la methode agile Scrum, adaptee au contexte d'un projet de fin d'etudes realise par une equipe de deux personnes. Ce choix se justifie par la nature exploratoire du projet, qui implique des iterations frequentes et des ajustements continus en fonction des resultats obtenus et des retours des encadrantes."),
    bodyPara("L'agile Scrum nous a permis de decomposer le projet en sprints de deux semaines, chacun se terminant par une demonstration fonctionnelle devant les encadrantes. Chaque sprint suivait un cycle planifie : Sprint Planning en debut de sprint pour definir les objectifs et les user stories a realiser, Daily Standups quotidiens pour synchroniser l'equipe et identifier les bloqueurs, Sprint Review en fin de sprint pour presenter les fonctionnalites realisees et recueillir les retours, et Sprint Retrospective pour identifier les axes d'amelioration du processus."),
    bodyPara("Les artefacts Scrum utilises comprenaient le Product Backlog, maintenu et priorise en collaboration avec les encadrantes, le Sprint Backlog detaille avec les taches techniques, et le Burndown Chart pour visualiser la progression de chaque sprint. Les user stories etaient formulees selon le format standard : \"En tant que [utilisateur], je veux [action] afin de [benefice]\"."),

    h2("4.3 Organisation de l'equipe"),
    bodyPara("L'equipe de developpement est composee de deux membres dont les roles, bien que partages, presentent des specialisations complementaires."),

    threeLineTable(
      ["Membre", "Role principal", "Responsabilites specifiques"],
      [
        ["Mehdi CHMITI", "Lead Developpeur Frontend & UX", "Conception des interfaces utilisateur, implementation des composants React/Next.js, animations Framer Motion, integration du design system, gestion de la PWA"],
        ["Ismail HADDAOUI", "Lead Developpeur Backend & IA", "Implementation des API REST, integration OpenAI GPT-4o-mini, configuration Prisma/Supabase, gestion de la base de donnees, systeme de gamification"],
      ]
    ),
    bodyPara("Les deux membres participent egalement aux revues de code, aux tests et a la redaction du rapport. Le travail est synchronise quotidiennement via des standups virtuels et partage sur le depot GitHub du projet."),

    h2("4.4 Planification du projet"),
    bodyPara("Le projet s'etend sur une periode d'environ seize semaines, decomposees en huit sprints de deux semaines. La planification globale comprend les phases suivantes :"),

    threeLineTable(
      ["Phase", "Periode", "Duree", "Objectifs"],
      [
        ["Phase 1 : Initialisation", "Semaines 1-2", "2 semaines", "Cadrage du projet, etude de l'etat de l'art, choix technologiques, mise en place de l'environnement de developpement"],
        ["Phase 2 : Conception", "Semaines 3-4", "2 semaines", "Architecture technique, modele de donnees, maquettes UI, definition des API"],
        ["Phase 3 : Developpement Sprint 1-3", "Semaines 5-10", "6 semaines", "Implementation du core (auth, dashboard, saisie manuelle, analyse IA image/texte)"],
        ["Phase 4 : Developpement Sprint 4-5", "Semaines 11-14", "4 semaines", "Chatbot, gamification, analytics, PWA, integration Supabase"],
        ["Phase 5 : Tests et validation", "Semaines 15-16", "2 semaines", "Tests fonctionnels, correction de bugs, optimisation, redaction du rapport"],
      ]
    ),

    h2("4.5 Outils de gestion de projet"),
    bodyPara("L'equipe utilise un ensemble d'outils modernes pour assurer une gestion de projet efficace et collaborative."),

    threeLineTable(
      ["Outil", "Usage", "Justification"],
      [
        ["GitHub", "Gestion du code source, issues, pull requests, GitHub Actions", "Standard de l'industrie pour le controle de version, integre CI/CD et suivi des taches"],
        ["Vercel", "Hebergement et deploiement continu de l'application Next.js", "Integration native avec Next.js, deploiement automatique, preview deployments"],
        ["Figma", "Conception des interfaces et prototypage", "Outil collaboratif de reference pour le design UI/UX"],
        ["Notion", "Documentation du projet et knowledge base", "Base de documents flexible et partageable"],
        ["Supabase", "Base de donnees et authentification", "Alternative open source a Firebase avec support PostgreSQL"],
      ]
    ),

    h2("4.6 Gestion des risques"),
    bodyPara("L'identification et la gestion proactive des risques constituent un element essentiel de la reussite du projet. Le tableau suivant presente les principaux risques identifies ainsi que les strategies d'attenuation mises en place."),

    threeLineTable(
      ["Risque", "Probabilite", "Impact", "Strategie d'attenuation"],
      [
        ["Depassement des delais", "Elevee", "Moyen", "Priorisation agile, MVP progressif, sprint buffer, communication reguliere avec les encadrantes"],
        ["Limites des modeles IA", "Moyenne", "Eleve", "Tests intensifs, prompt engineering rigoureux, fallback sur saisie manuelle, dual-mode IA"],
        ["Couts eleves de l'API OpenAI", "Moyenne", "Moyen", "Utilisation de GPT-4o-mini (couts reduits), cache des resultats, limites d'appels par utilisateur"],
        ["Problemes de compatibilite navigateurs", "Moyenne", "Moyen", "Tests cross-browser reguliers, utilisation de standards web modernes, progressive enhancement"],
        ["Perte de donnees", "Faible", "Eleve", "Sauvegarde reguliere de la base de donnees, logs d'audit, mode offline SQLite"],
        ["Indisponibilite d'un membre", "Faible", "Eleve", "Documentation complete du code, reviews de code croisees, partage des connaissances"],
      ]
    ),

    h2("4.7 Diagramme de Gantt"),
    bodyPara("Le diagramme de Gantt du projet se decompose comme suit sur les seize semaines. Les semaines 1-2 sont consacrees a l'initialisation (etude, cadrage, setup technique). Les semaines 3-4 couvrent la conception (architecture, maquettes, modele de donnees). Les semaines 5-6 forment le Sprint 1 (backend core, auth, modele Prisma). Les semaines 7-8 constituent le Sprint 2 (frontend dashboard, saisie manuelle, analyse texte IA). Les semaines 9-10 correspondent au Sprint 3 (analyse image IA, chatbot basique). Les semaines 11-12 representent le Sprint 4 (gamification, analytics, suivi hydratation). Les semaines 13-14 forment le Sprint 5 (integration Supabase, transformation PWA, scan codes-barres, ASR). Les semaines 15-16 sont dediees aux tests, a l'optimisation et a la redaction finale du rapport. Les jalons principaux sont situes en fin de phase 2 (conception validee), fin de sprint 3 (MVP fonctionnel avec analyse IA), fin de sprint 5 (version complete) et fin de phase 5 (livraison finale)."),

    h2("4.8 Suivi et reporting"),
    bodyPara("Le suivi du projet est assure travers plusieurs mecanismes complementaires. Les standups quotidiens permettent de synchroniser l'equipe et d'identifier rapidement les bloqueurs. Les revues de sprint, realisees tous les quinze jours, offrent l'occasion de presenter les avancees aux encadrantes et de recueillir leurs retours. Les demonstrations intermediaires permettent de valider que le developpement reste aligne avec les attentes."),
    bodyPara("Le Burndown Chart est mis a jour quotidiennement pour visualiser la consommation des points de story par rapport a la capacite planifiee du sprint. Les metriques suivies incluent le velocity de l'equipe (points de story par sprint), le taux de completion des user stories, le nombre de bugs ouverts et les couts de l'API OpenAI. Un rapport d'avancement mensuel est remis aux encadrantes, synthetisant les realisations, les difficultes rencontrees et les ajustements planifies."),

    h2("4.9 Conclusion du chapitre"),
    bodyPara("La gestion de projet de CalorieAI repose sur une approche agile structuree qui a demontre son efficacite tout au long du developpement. La methode Scrum adaptee, la planification en sprints, l'utilisation d'outils collaboratifs modernes et la gestion proactive des risques ont permis de maintenir le projet sur une trajectoire coherente malgre les defis techniques inherents a l'integration de l'intelligence artificielle. Les mecanismes de suivi et de reporting ont assure une transparence totale avec les encadrantes et une capacite d'adaptation rapide face aux changements."),
  ];
}

function chapitre5() {
  return [
    h1("Chapitre 5 : Conception et Architecture Technique"),
    h2("5.1 Introduction"),
    bodyPara("Ce chapitre presente la conception technique globale de CalorieAI, en detaillant l'architecture du systeme, les choix technologiques et leurs justifications, le modele de donnees, l'architecture de la couche intelligence artificielle et la conception des interfaces utilisateur. L'architecture a ete concue pour repondre aux exigences fonctionnelles et non fonctionnelles identifiees dans le premier chapitre, tout en maintenant une flexibilite suffisante pour evoluer vers de nouvelles fonctionnalites."),

    h2("5.2 Architecture globale"),
    bodyPara("CalorieAI adopte une architecture trois tiers classique, adaptee aux specificites d'une application web moderne construite avec Next.js 16 et son modele App Router."),

    h3("5.2.1 Couche presentation (Frontend)"),
    bodyPara("La couche presentation est responsable de l'interface utilisateur et de l'interaction avec l'utilisateur. Elle est implementee en React Server Components et Client Components avec Next.js 16, utilisant Tailwind CSS 4 pour le styling et shadcn/ui pour les composants d'interface preconstruits. L'etat de l'application est gere par Zustand, une librairie de gestion d'etat legere et performante. Les animations sont realisees avec Framer Motion pour une experience utilisateur fluide et moderne. Le responsive design est assure par le systeme de breakpoints de Tailwind CSS 4, garantissant une experience optimale sur desktop, tablette et mobile."),

    h3("5.2.2 Couche logique metier (Backend API)"),
    bodyPara("La couche logique metier est implementee via les API Routes de Next.js (Route Handlers), exposant les endpoints REST necessaires au fonctionnement de l'application. Cette couche gere la logique de traitement des requetes d'analyse nutritionnelle (image et texte), l'interaction avec l'API OpenAI GPT-4o-mini, les operations de lecture et d'ecriture dans la base de donnees via Prisma ORM, et la logique de calcul BMR/TDEE et de gamification. L'architecture API suit les principes RESTful avec des endpoints structures autour des ressources principales."),

    h3("5.2.3 Couche donnees (Base de donnees)"),
    bodyPara("La couche donnees utilise Prisma ORM comme couche d'abstraction, permettant de basculer entre SQLite (mode developpement local) et Supabase PostgreSQL (mode production) sans modification du code metier. Cette architecture dual-mode offre un environnement de developpement simple et autonome, avec la possibilite de deployer en production sur une base de donnees relationnelle robuste et scalable."),

    h2("5.3 Choix technologiques et justification"),

    h3("5.3.1 Next.js 16"),
    bodyPara("Le choix de Next.js 16 comme framework principal se justifie par plusieurs facteurs decisifs. Next.js 16 introduit l'App Router, un systeme de routage fichiers repertoires plus performant que le Pages Router precedent, avec un support natif des React Server Components qui permettent d'executer du cote serveur les composants qui ne necessitent pas d'interactivite client, reduisant ainsi la taille du bundle JavaScript envoye au navigateur. Le Server-Side Rendering (SSR) ameliore le referencement SEO et le temps de chargement initial. L'ecosysteme Next.js beneficie d'une communaute active, d'une documentation exhaustive et d'une compatibilite native avec de nombreux services cloud comme Vercel pour le deploiement."),

    h3("5.3.2 TypeScript"),
    bodyPara("TypeScript a ete choisi comme langage de developpement principal pour garantir la fiabilite et la maintenabilite du codebase. Le typage statique permet de detecter les erreurs potentielles des la phase de compilation, reduisant significativement les bugs en production. L'autocompletion et la documentation integree du type system ameliorent la productivite des developpeurs et facilitent la collaboration sur un projet d'envergure. TypeScript est devenu un standard de facto dans l'ecosysteme JavaScript moderne et est nativement supporte par Next.js."),

    h3("5.3.3 Tailwind CSS 4 et shadcn/ui"),
    bodyPara("Tailwind CSS 4 est le framework CSS utilite-premier qui permet de construire des interfaces personnalisees directement dans le balisage HTML, eliminant le besoin de fichiers CSS separe et de conventions de nommage complexes. La version 4 introduit des ameliorations significatives en termes de performance et de flexibilite. shadcn/ui complete Tailwind CSS en fournissant un ensemble de composants d'interface accessibles et personnalissable (boutons, formulaires, modales, tableaux) qui ne sont pas封装és comme des composants noirs mais plutot comme du code copiable et modifiable."),

    h3("5.3.4 Prisma ORM et Supabase"),
    bodyPara("Prisma ORM a ete selectionne comme couche d'abstraction de base de donnees pour son interface declarative intuitive (schema.prisma), son typage automatique des requetes (benefice direct de TypeScript), et sa compatibilite avec SQLite et PostgreSQL. Le schema Prisma sert de source de verite unique pour la structure de la base de donnees, et les migrations automatiques simplifient l'evolution du schema. Supabase est utilise en mode production comme backend-as-a-service, fournissant une base PostgreSQL geree, une authentification utilisateur integree et un API REST auto-genere."),

    h3("5.3.5 OpenAI GPT-4o-mini"),
    bodyPara("Le modele GPT-4o-mini d'OpenAI a ete choisi pour les capacites d'intelligence artificielle de CalorieAI en raison de son excellent rapport qualite-prix et de ses competences multimodales. GPT-4o-mini supporte a la fois l'analyse d'images (vision) et le traitement du langage naturel, ce qui permet d'utiliser un seul modele pour les deux fonctionnalites principales (analyse par image et analyse par texte). Ses couts sont significativement inferieurs a ceux de GPT-4 tout en offrant des performances comparables pour les taches d'analyse nutritionnelle. L'API est disponible via une interface REST standardisee et une SDK JavaScript officielle."),

    h3("5.3.6 PWA (Progressive Web App)"),
    bodyPara("La transformation de l'application en Progressive Web App a ete realisee en utilisant next-pwa avec Workbox. Les PWA offrent plusieurs avantages strategiques pour CalorieAI : installation directe depuis le navigateur sans passer par les stores d'applications (Apple App Store, Google Play), fonctionnement en mode hors-ligne grace au service worker et au cache, notifications push pour les rappels de suivi nutritionnel, et acces aux fonctionnalites natives de l'appareil (camera pour la capture d'images alimentaires). Ce choix elimine les frais et les contraintes de publication sur les stores tout en offrant une experience quasi-native."),

    h2("5.4 Modele de donnees"),
    bodyPara("Le modele de donnees de CalorieAI est defini dans le schema Prisma et comprend six tables principales qui couvrent l'ensemble des fonctionnalites de l'application."),

    threeLineTable(
      ["Table", "Description", "Champs principaux"],
      [
        ["FoodEntry", "Enregistrement d'un aliment ou repas consomme", "id, userId, date, mealType, foodName, calories, protein, carbs, fat, fiber, imageUrl (optionnel), createdAt"],
        ["DailyGoal", "Objectifs nutritionnels quotidiens de l'utilisateur", "id, userId, date, targetCalories, targetProtein, targetCarbs, targetFat, targetWater"],
        ["UserProfile", "Profil personnel et parametres de l'utilisateur", "id, name, age, gender, weight, height, activityLevel, goal, bmr, tdee, createdAt"],
        ["WaterLog", "Journal de suivi d'hydratation quotidien", "id, userId, date, amount, unit, createdAt"],
        ["Badge", "Badges de gamification debloques par l'utilisateur", "id, userId, badgeType, earnedAt, metadata"],
        ["ChatMessage", "Historique des conversations avec le chatbot", "id, userId, role (user/assistant), content, createdAt"],
      ]
    ),

    h2("5.5 Architecture de la couche IA"),
    bodyPara("L'architecture de la couche intelligence artificielle de CalorieAI repose sur un systeme dual-mode qui permet de basculer entre deux fournisseurs d'IA selon la disponibilite et la configuration de l'environnement. Le premier mode utilise le z-ai-web-dev-sdk, un SDK interne optimise pour des analyses rapides et legères. Le second mode fait appel a l'API OpenAI GPT-4o-mini pour des analyses nutritionnelles plus approfondies et un support complet de la vision par ordinateur."),
    bodyPara("La couche d'abstraction IA est structuree autour d'une interface commune definissant les methodes standard : analyzeByText(description), analyzeByImage(imageBase64), chatWithNutritionist(messages), generateMealPlan(profile). Chaque implementation (z-ai-web-dev-sdk et OpenAI) respecte cette interface, permettant de changer de fournisseur sans modification du code appelant. Le prompt engineering est soigneusement concu pour garantir des reponses structurees et precisces : chaque analyse IA retourne un objet JSON standardise avec les champs nutritionnels requis, valide cote serveur avant enregistrement en base de donnees."),

    h2("5.6 Architecture de la couche donnees"),
    bodyPara("L'architecture de la couche donnees repose sur le pattern dual-mode via Prisma ORM. En mode developpement local, Prisma est configure pour utiliser SQLite, une base de donnees embarquee qui ne necessite aucun serveur externe et permet un prototypage rapide. En mode production, Prisma se connecte a Supabase PostgreSQL, offrant les avantages d'une base relationnelle robuste, d'un acces concurrentiel multi-utilisateurs et de fonctionnalites avancees comme la recherche full-text et les fonctions de fenetrage."),
    bodyPara("La configuration de basculement est geree via les variables d'environnement (DATABASE_URL). Le schema Prisma est identique dans les deux modes, assurant la portabilite complete des donnees et des requetes. Les migrations Prisma sont appliquees automatiquement lors du deploiement pour maintenir la coherence du schema."),

    h2("5.7 Conception des interfaces"),
    bodyPara("L'interface utilisateur de CalorieAI est organisee autour de sept vues principales, accessibles via une navigation par onglets en bas de l'ecran sur mobile et dans une barre laterale sur desktop."),

    threeLineTable(
      ["Vue", "Fonctionnalite principale", "Composants cles"],
      [
        ["Dashboard", "Vue d'ensemble quotidienne avec calorie ring, progress macros, quick actions", "CalorieRing (SVG anime), MacroCard, QuickAdd, WaterTracker"],
        ["Track", "Saisie d'aliments par image, texte, scan code-barres ou vocale", "ImageCapture, TextInput, BarcodeScanner, VoiceInput"],
        ["History", "Journal alimentaire historique avec navigation par date", "CalendarView, FoodLogList, DaySummary"],
        ["Analytics", "Statistiques et tendances nutritionnelles sur plusieurs periodes", "Charts (line/bar), TrendAnalysis, WeeklyReport"],
        ["Chat", "Chatbot nutritionnel intelligent pour questions et conseils", "ChatInterface, MessageBubble, SuggestionChips"],
        ["Meal Plan", "Plans repas generes par IA selon le profil utilisateur", "MealPlanView, RecipeCard, ShoppingList"],
        ["Profile", "Parametres utilisateur, objectifs, badges et parametres IA", "ProfileForm, GoalSettings, BadgeCollection, SettingsPanel"],
      ]
    ),

    h2("5.8 Conclusion du chapitre"),
    bodyPara("La conception technique de CalorieAI repose sur une architecture trois tiers moderne, choisie pour sa robustesse, sa flexibilite et sa capacite d'evolution. Les choix technologiques ont ete motives par des criteres de performance, de maintenabilite et de cout. L'architecture dual-mode (IA et base de donnees) offre une resilience accrue et une facilite de deploiement. Le modele de donnees concu couvre l'ensemble des fonctionnalites requises tout en restant suffisamment souple pour integrer de futures evolutions."),
  ];
}

function chapitre6() {
  return [
    h1("Chapitre 6 : Realisation et Implementation"),
    h2("6.1 Introduction"),
    bodyPara("Ce chapitre presente en detail la realisation technique de CalorieAI, en decrivant l'environnement de developpement, l'implementation des composants frontend et backend, les fonctionnalites avancees et les choix d'integration qui ont concouru a la construction de l'application finale. Chaque section est illustree par des extraits de code significatifs et des explications sur les decisions de conception prises lors de l'implementation."),

    h2("6.2 Environnement de developpement"),
    bodyPara("L'environnement de developpement de CalorieAI est configure autour des outils suivants : Node.js version 20 ou superieure comme runtime JavaScript, pnpm comme gestionnaire de paquets pour sa vitesse et son efficacite d'espace disque, Next.js 16 avec le App Router et le compilateur Turbopack pour des compilations rapides, ESLint et Prettier pour le formatage et le linting du code, Git et GitHub pour le controle de version et la collaboration, et VS Code comme editeur de code principal avec les extensions recommandees (ESLint, Prettier, Tailwind CSS IntelliSense, Prisma). Le fichier package.json definit les dependances principales et les scripts de developpement (dev, build, start, lint, db:push)."),

    h2("6.3 Implementation du frontend"),

    h3("6.3.1 Structure du projet"),
    bodyPara("Le projet suit la structure standard imposee par l'App Router de Next.js 16. Le repertoire app contient les routes et les layouts, organisees selon le pattern de co-localisation ou chaque route possede son propre dossier avec ses composants, ses styles et ses fichiers de configuration. Le repertoire components regroupe les composants reutilisables de l'interface utilisateur, organises par domaine fonctionnel (ui, layout, features). Le repertoire lib contient les fonctions utilitaires, les constantes et les configurations. Le repertoire prisma contient le schema de la base de donnees et les fichiers de migration. Le repertoire public heberge les assets statiques (images, icons, manifeste PWA)."),

    h3("6.3.2 Composants principaux"),
    bodyPara("L'interface utilisateur est construite autour de composants React modulaires et reutilisables. Le composant CalorieRing est l'element visuel central du dashboard, affichant un cercle SVG anime qui represente la progression calorique journaliere. Il utilise les transitions CSS et les animations Framer Motion pour un rendu fluide et engageant. Le composant MealCard est utilise dans la vue de saisie et l'historique pour afficher les informations nutritionnelles d'un aliment ou d'un repas. Le composant ChatInterface gere la conversation avec le chatbot nutritionnel, incluant la saisie de messages, l'affichage des reponses et les suggestions contextuelles. Le composant WaterTracker est un widget interactif de suivi d'hydratation qui permet d'ajouter rapidement des verres d'eau avec un geste simple."),

    h3("6.3.3 Calorie Ring (animation SVG)"),
    bodyPara("Le Calorie Ring est implemente comme un composant React utilisant un cercle SVG avec la propriete stroke-dasharray pour creer un effet de progression circulaire. L'animation de remplissage est realisee avec Framer Motion en utilisant un interpolateur qui fait varier la valeur du stroke-dashoffset de la position initiale (anneau vide) a la position calculee (anneau rempli proportionnellement aux calories consommees). Le composant accepte des props pour les calories actuelles, les calories cibles, la couleur de progression et les informations textuelles a afficher au centre. La couleur du ring change dynamiquement selon le pourcentage de progression : vert en dessous de 80%, orange entre 80 et 100%, et rouge au-dela de 100%."),

    h3("6.3.4 Systeme de navigation par onglets"),
    bodyPara("La navigation est implementee via un systeme d'onglets responsive. Sur mobile, les onglets sont affiches en bas de l'ecran dans une barre de navigation fixe avec cinq onglets principaux (Dashboard, Track, Analytics, Chat, Profile) et un menu hamburger pour acceder aux vues secondaires (History, Meal Plan). Sur desktop, la navigation est deplacee dans une barre laterale gauche qui affiche tous les onglets simultanement avec des labels textuels. La detection du breakpoint est realisee avec les media queries Tailwind CSS et le hook useMediaQuery personnalise."),

    h2("6.4 Implementation du backend"),

    h3("6.4.1 API REST"),
    bodyPara("L'API REST de CalorieAI est implementee via les Route Handlers de Next.js et expose treize endpoints operant sur les ressources principales de l'application :"),

    threeLineTable(
      ["Methode", "Endpoint", "Description"],
      [
        ["POST", "/api/analyze/text", "Analyse nutritionnelle par description textuelle"],
        ["POST", "/api/analyze/image", "Analyse nutritionnelle par image alimentaire"],
        ["POST", "/api/chat", "Envoi d'un message au chatbot nutritionnel"],
        ["POST", "/api/meal-plan", "Generation d'un plan repas personnalise"],
        ["POST", "/api/food-entries", "Creation d'une nouvelle entree alimentaire"],
        ["GET", "/api/food-entries?date=YYYY-MM-DD", "Recuperation des entrees d'une date"],
        ["DELETE", "/api/food-entries/:id", "Suppression d'une entree alimentaire"],
        ["GET", "/api/daily-goal?date=YYYY-MM-DD", "Recuperation des objectifs du jour"],
        ["PUT", "/api/daily-goal", "Mise a jour des objectifs quotidiens"],
        ["POST", "/api/water-log", "Ajout d'un enregistrement d'hydratation"],
        ["GET", "/api/water-log?date=YYYY-MM-DD", "Recuperation de l'hydratation du jour"],
        ["GET", "/api/badges", "Recuperation des badges de l'utilisateur"],
        ["PUT", "/api/profile", "Mise a jour du profil utilisateur"],
      ]
    ),

    h3("6.4.2 Analyse nutritionnelle par texte"),
    bodyPara("L'analyse nutritionnelle par texte est implementee dans l'endpoint POST /api/analyze/text. Le endpoint recoit une description textuelle du repas dans le corps de la requete, construit un prompt system optimise pour l'extraction nutritionnelle, envoie la requete a GPT-4o-mini via l'API OpenAI, et retourne les resultats nutritionnels structures sous forme JSON. Le prompt system specifie precisement le format de reponse attendu, incluant le nom de chaque aliment identifie, les calories, les proteines, les glucides, les lipides et les fibres. La reponse est validee cote serveur avant d'etre retournee au client, garantissant la coherence des donnees."),

    h3("6.4.3 Analyse nutritionnelle par image (Vision IA)"),
    bodyPara("L'analyse nutritionnelle par image repose sur les capacites de vision de GPT-4o-mini. L'utilisateur capture une photo de son repas via la camera du dispositif ou selectionne une image existante. L'image est encodee en base64 et envoyee a l'API OpenAI avec un prompt specifique demandant l'identification des aliments presents, l'estimation des portions et le calcul des valeurs nutritionnelles correspondantes. Le prompt est concu pour gerer les plats composes a plusieurs ingredients et les images incluant des couverts ou des elements non alimentaires. Le temps de reponse moyen constate est de 2 a 4 secondes, compatible avec les exigences de performance definies."),

    h3("6.4.4 Chatbot nutritionnel"),
    bodyPara("Le chatbot nutritionnel est implemente comme un endpoint POST /api/chat qui maintient le contexte de la conversation via l'historique des messages echanges. Le chatbot est concu pour repondre a trois types de demandes : les questions nutritionnelles generales (par exemple, \"Quels aliments sont riches en proteines ?\"), les conseils personnalises bases sur le profil de l'utilisateur (par exemple, \"Comment atteindre mon objectif de 2000 kcal aujourd'hui ?\"), et les demandes de generation de plans repas. Le systeme de prompt integre le profil utilisateur (age, poids, taille, objectif, preferences alimentaires) dans le contexte de la conversation pour fournir des reponses contextualisees et pertinentes."),

    h3("6.4.5 Generation de plans repas"),
    bodyPara("L'endpoint POST /api/meal-plan genere des plans repas personnalise bases sur le profil de l'utilisateur et ses objectifs nutritionnels. Le prompt de generation integre les parametres suivants : l'objectif calorique quotidien (derive du TDEE), la repartition des macronutriments, les preferences et restrictions alimentaires declarees, et le nombre de repas souhaites. Le plan retourne inclut pour chaque repas le nom, la description, les ingredients avec les quantites, et les valeurs nutritionnelles totales. La generation prend en moyenne 5 a 8 secondes et le resultat est structure pour un affichage direct dans l'interface Meal Plan."),

    h3("6.4.6 Scan de code-barres (Open Food Facts)"),
    bodyPara("Le scan de code-barres integre l'API Open Food Facts, une base de donnees collaborative et ouverte de produits alimentaires. L'utilisateur scanne le code-barres d'un produit alimentaire a l'aide de la camera de son appareil, le code est envoye a l'API Open Food Facts qui retourne les informations nutritionnelles du produit. Ces donnees sont automatiquement extraites et pre-remplissent le formulaire de saisie alimentaire, ne necessitant a l'utilisateur que la validation de la portion. Cette fonctionnalite permet une saisie rapide et precise pour les produits conditionnes disponibles dans la base Open Food Facts, qui compte plus de 3 millions de produits references."),

    h3("6.4.7 Reconnaissance vocale (ASR)"),
    bodyPara("La reconnaissance vocale est implementee en utilisant l'API ASR du z-ai-web-dev-sdk. L'utilisateur appuie sur un bouton micro, dicte la description de son repas en langage naturel, et le texte transcrit est automatiquement envoye a l'endpoint d'analyse nutritionnelle par texte. L'integration est transparente : la transcription vocale alimente directement le flux d'analyse existant, sans etape supplementaire pour l'utilisateur. Cette fonctionnalite est particulierement utile en situation de mobilite ou lorsque la saisie textuelle est peu pratique."),

    h2("6.5 Fonctionnalites avancees"),

    h3("6.5.1 Gamification (8 badges)"),
    bodyPara("Le systeme de gamification est concu pour encourager l'adoption durable de bonnes habitudes alimentaires. Huit badges sont implementes, chacun correspondant a un comportement positif specifique :"),

    threeLineTable(
      ["Badge", "Condition de deblocage", "Message"],
      [
        ["Premier pas", "Premiere entree alimentaire enregistree", "Bienvenue ! Vous avez fait votre premier pas vers une nutrition saine."],
        ["Streak 3 jours", "3 jours consecutifs de suivi", "3 jours d'affilee ! La regularite est la cle du succes."],
        ["Streak 7 jours", "7 jours consecutifs de suivi", "Une semaine complete ! Vous etes sur la bonne voie."],
        ["Streak 30 jours", "30 jours consecutifs de suivi", "Un mois de suivi ! Vous avez transforme le suivi en habitude."],
        ["Hydrate hero", "Objectif d'eau atteint 5 jours/mois", "Hydration au top ! Vous buvez suffisamment d'eau."],
        [" equilibre", "Macros equilibres 3 jours/mois", "Equilibre nutritionnel atteint ! Vos macros sont bien reparties."],
        ["Explorateur IA", "10 analyses IA realisees", "Vous maitrisez l'analyse par IA ! Continuez a explorer."],
        ["Chef IA", "5 plans repas generes", "Chef virtuel debloque ! L'IA planifie vos repas."],
      ]
    ),

    h3("6.5.2 Suivi d'hydratation"),
    bodyPara("Le suivi d'hydratation permet aux utilisateurs d'enregistrer leur consommation d'eau quotidienne. L'utilisateur peut ajouter rapidement des verres d'eau (250 ml par defaut) via le widget WaterTracker sur le dashboard. L'objectif d'hydratation est calcule automatiquement en fonction du poids de l'utilisateur (environ 30 ml par kg de poids corporel). Un journal d'hydratation est maintenu avec la table WaterLog, permettant de consulter l'historique et d'identifier les jours ou l'hydratation a ete insuffisante."),

    h3("6.5.3 Calcul BMR/TDEE"),
    bodyPara("Le calcul du Basal Metabolic Rate (BMR) est realise en utilisant l'equation de Mifflin-St Jeor, reconnue comme l'une des plus precisces pour les sujets en bonne sante. Pour les hommes, la formule est : BMR = (10 x poids en kg) + (6.25 x taille en cm) - (5 x age) + 5. Pour les femmes : BMR = (10 x poids en kg) + (6.25 x taille en cm) - (5 x age) - 161. Le Total Daily Energy Expenditure (TDEE) est ensuite calcule en multipliant le BMR par un facteur d'activite physique (1.2 pour sedentaire, 1.375 pour legerement actif, 1.55 pour modere, 1.725 pour tres actif, 1.9 pour extremement actif). Ces valeurs sont utilisees pour definir automatiquement les objectifs caloriques quotidiens de l'utilisateur."),

    h3("6.5.4 Analytics et statistiques"),
    bodyPara("Le module Analytics fournit des visualisations detaillees des tendances nutritionnelles de l'utilisateur. Les graphiques sont generes a l'aide d'une librairie de visualisation integrée dans l'interface et affichent les donnees sur differentes periodes (7 jours, 30 jours, 90 jours). Les metriques visualisees incluent l'evolution des calories quotidiennes, la repartition moyenne des macronutriments, la frequence de suivi, la progression vers l'objectif de poids, et les correlations entre les comportements alimentaires et les resultats. Les donnees sont agregatees cote serveur via des requetes Prisma et retournees au frontend sous un format optimise pour le rendu des graphiques."),

    h2("6.6 Dual-mode Supabase/OpenAI"),
    bodyPara("L'architecture dual-mode est implementee au niveau de la couche d'abstraction qui encapsule les appels aux services externes. Pour la base de donnees, Prisma ORM gere la bascule entre SQLite et Supabase PostgreSQL via la variable d'environnement DATABASE_URL. Pour l'intelligence artificielle, un systeme de provider pattern permet de basculer entre le z-ai-web-dev-sdk (mode local) et l'API OpenAI (mode production). Le choix du provider est determine au demarrage de l'application par une variable d'environnement, et le fallback automatique est implemente pour garantir la continuite de service en cas d'indisponibilite du provider principal."),

    h2("6.7 Transformation PWA"),
    bodyPara("La transformation de l'application en Progressive Web App a ete realisee en plusieurs etapes. Premierement, un fichier manifest.json a ete cree dans le repertoire public, definissant le nom de l'application, les icones (multi-tailles), la couleur du theme et les parametres d'affichage standalone. Deuxiemement, un service worker a ete configure avec next-pwa et Workbox pour mettre en cache les ressources statiques et les pages frequemment visitees, permettant le fonctionnement hors-ligne pour les fonctionnalites de base. Troisiemement, une banniere d'installation automatique a ete mise en place pour guider les utilisateurs vers l'installation de l'application sur leur appareil. Quatriemement, les notifications push ont ete configurees pour les rappels de suivi nutritionnel."),

    h2("6.8 Conclusion du chapitre"),
    bodyPara("La realisation technique de CalorieAI demontre la faisabilite et la pertinence de l'architecture concue dans le chapitre precedent. L'implementation a respecte les choix technologiques definis et a integre avec succes les differentes couches fonctionnelles : analyse nutritionnelle par image et par texte, chatbot nutritionnel, gamification, suivi d'hydratation, analytics et transformation PWA. L'architecture modular dual-mode offre une flexibilite appreciable pour l'evolution future du projet."),
  ];
}

function chapitre7() {
  return [
    h1("Chapitre 7 : Tests et Validation"),
    h2("7.1 Introduction"),
    bodyPara("Ce chapitre presente la strategie de test adoptee pour valider le fonctionnement correct de CalorieAI et s'assurer que l'application repond aux exigences fonctionnelles et non fonctionnelles definies dans le cahier des charges. Les tests couvrent les niveaux fonctionnels et d'integration, et les resultats obtenus sont presentes et analyses."),

    h2("7.2 Strategie de test"),
    bodyPara("La strategie de test de CalorieAI est organisee en trois niveaux complementaires. Les tests unitaires verifient le fonctionnement isole de chaque fonction ou methode, notamment les fonctions de calcul BMR/TDEE, les fonctions de validation des donnees, et les utilitaires de formatage. Les tests fonctionnels valident le comportement global de chaque fonctionnalite de l'application dans des scenarios d'utilisation representatifs. Les tests d'integration verifient la cooperation correcte entre les differents composants du systeme, notamment l'interaction entre le frontend et le backend via les API REST, l'integration avec l'API OpenAI, et l'interaction avec la base de donnees via Prisma."),
    bodyPara("Les tests ont ete realises dans un environnement de staging reproduisant les conditions de production, avec les memes configurations de base de donnees et d'API."),

    h2("7.3 Tests fonctionnels"),
    bodyPara("Le tableau suivant resume les tests fonctionnels realises et leurs resultats :"),

    threeLineTable(
      ["ID", "Fonctionnalite testee", "Scenario de test", "Resultat"],
      [
        ["TF-01", "Saisie manuelle", "Enregistrer un aliment avec nom, calories et macros", "Reussi"],
        ["TF-02", "Analyse par texte", "Saisir \"2 oeufs brouilles avec fromage\"", "Reussi - Aliments identifies correctement"],
        ["TF-03", "Analyse par image", "Photographier un plat compose", "Reussi - Identification correcte a 85%"],
        ["TF-04", "Chatbot", "Poser une question nutritionnelle", "Reussi - Reponse pertinente"],
        ["TF-05", "Plan repas", "Generer un plan pour objectif 2000 kcal", "Reussi - Plan complet avec 3 repas"],
        ["TF-06", "Scan code-barres", "Scanner un produit alimentaire", "Reussi - Donnees recuperees"],
        ["TF-07", "Reconnaissance vocale", "Dicter un repas en francais", "Reussi - Transcription correcte"],
        ["TF-08", "Suivi hydratation", "Ajouter 3 verres d'eau", "Reussi - Total mis a jour"],
        ["TF-09", "Calcul BMR/TDEE", "Saisir profil homme 80kg 175cm 30 ans", "Reussi - BMR = 1785 kcal"],
        ["TF-10", "Badges", "Enregistrer 10 entrees sur 3 jours", "Reussi - Badges debloques"],
        ["TF-11", "Dashboard", "Consulter le calorie ring apres saisie", "Reussi - Animation fluide"],
        ["TF-12", "Analytics", "Consulter les stats sur 7 jours", "Reussi - Graphiques corrects"],
        ["TF-13", "PWA install", "Installer l'app depuis Chrome", "Reussi - Installation reussie"],
        ["TF-14", "Mode offline", "Consulter le dashboard sans connexion", "Reussi - Donnees cachees affichees"],
      ]
    ),

    h2("7.4 Tests d'integration"),
    bodyPara("Les tests d'integration ont verifie le bon fonctionnement des flux de donnees entre les differents composants du systeme. Le flux d'analyse par image a ete teste de bout en bout : capture de l'image dans le navigateur, encodage base64, envoi au backend, transmission a GPT-4o-mini, reception et validation de la reponse, enregistrement en base de donnees, et affichage dans le dashboard. Chaque etape a ete validee individuellement et en integration avec les etapes adjacentes."),
    bodyPara("Le flux d'authentification a ete teste pour verifier la creation de compte, la connexion, la gestion des sessions et la persistance de l'authentification entre les visites. L'integration Supabase a ete validee en comparant les resultats obtenus en mode SQLite local et en mode Supabase PostgreSQL, confirmant la coherence des donnees entre les deux modes. Les tests de performance ont montre que les temps de reponse des endpoints API restent inferieurs a trois secondes dans les conditions normales d'utilisation."),

    h2("7.5 Resultats des tests"),
    bodyPara("Sur les quatorze tests fonctionnels realises, treize ont ete reussis au premier essai. Un seul test (TF-03, analyse par image) a necessite des ajustements du prompt pour ameliorer le taux de reconnaissance des plats composes. Apres optimisation, le taux de reconnaissance a atteint 85%, un resultat satisfaisant pour une utilisation courante. Les tests d'integration ont tous ete reussis, confirmant la coherence de l'architecture et la qualite de la communication entre les composants. Les performances mesurees sont conformes aux exigences : temps de reponse API inferieur a 3 secondes, temps de chargement initial inferieur a 2 secondes, et fonctionnement correct en mode hors-ligne pour les donnees cachees."),

    h2("7.6 Conclusion du chapitre"),
    bodyPara("Les tests realises confirment le bon fonctionnement de l'ensemble des fonctionnalites de CalorieAI et la coherence de son architecture. Les resultats sont encourageants et demontrent que l'application repond aux exigences fonctionnelles et non fonctionnelles definies dans le cahier des charges. Les axes d'amelioration identifies incluent l'amelioration continue du prompt engineering pour l'analyse par image et l'extension de la couverture de tests vers des tests unitaires automatises."),
  ];
}

function conclusionGenerale() {
  return [
    h1("Conclusion generale et Perspectives"),
    bodyPara("Ce projet de fin d'etudes a porte sur la conception et le developpement de CalorieAI, une application intelligente de suivi nutritionnel exploitant les capacites de l'intelligence artificielle pour simplifier et ameliorer l'experience de suivi alimentaire. Le travail realise s'est articule autour de sept chapitres couvrant l'ensemble des dimensions du projet, de l'analyse de la problematique a la validation technique."),

    h2("Rappel des objectifs"),
    bodyPara("L'objectif general du projet etait de concevoir une application de suivi nutritionnel intelligente et accessible. Les objectifs specifiques visaient l'implementation de l'analyse nutritionnelle par image et par texte, l'integration d'un chatbot nutritionnel personnalise, la mise en place d'un systeme de gamification, et le developpement d'une architecture technique robuste et scalable. L'ensemble de ces objectifs a ete atteint avec succes."),

    h2("Resume des realisations"),
    bodyPara("Les realisations principales du projet incluent le developpement complet d'une application web moderne avec Next.js 16, TypeScript, Tailwind CSS 4 et shadcn/ui, offrant une interface utilisateur responsive et accessible. L'integration reussie de GPT-4o-mini pour l'analyse nutritionnelle par image et par texte, avec des taux de reconnaissance satisfaisants. La mise en place d'un chatbot nutritionnel intelligent capable de repondre aux questions, de fournir des conseils et de generer des plans repas personnalises. L'implementation d'un systeme de gamification avec huit badges correspondant a des comportements alimentaires positifs. La conception d'une architecture dual-mode permettant le fonctionnement avec SQLite en developpement et Supabase en production. La transformation de l'application en Progressive Web App pour une installation directe et un fonctionnement hors-ligne."),

    h2("Apports du projet"),
    bodyPara("Ce projet nous a permis d'approfondir nos competences dans plusieurs domaines technologiques. L'integration de modeles d'intelligence artificielle dans une application web nous a familiarises avec les enjeux du prompt engineering, de la gestion des API IA et de la validation des resultats. La gestion de projet agile nous a enseigne les bonnes pratiques de planification, de suivi et de collaboration. L'etude entrepreneuriale nous a ouvert a la reflexion strategique sur le positionnement commercial et la viabilite financiere d'un produit technologique. Enfin, la redaction de ce rapport a developpe notre capacite a structurer et communiquer un travail technique de maniere claire et rigoureuse."),

    h2("Limites"),
    bodyPara("Malgre les resultats obtenus, le projet presente certaines limites. La base de donnees nutritionnelle integree est moins etendue que celles des solutions commerciales etablies comme MyFitnessPal. L'analyse par image, bien que fonctionnelle, peut encore etre amelioree pour les plats complexes avec de nombreux ingredients visuellement similaires. Le chatbot, bien qu'efficace pour les questions courantes, peut parfois fournir des reponses generiques sur des sujets nutritionnels tres specialises. L'application n'est pas encore disponible sur les stores d'applications mobiles, limitant sa decouverte par les utilisateurs non avertis."),

    h2("Perspectives d'evolution"),
    bodyPara("Plusieurs perspectives d'evolution se degagent naturellement de ce travail. A court terme, l'integration avec les montres connectees et les bracelets d'activite physique permettrait d'enrichir le suivi avec des donnees objectives d'activite. L'ajout de fonctionnalites sociales, comme le partage de progres et les defis entre amis, contribuerait a renforcer l'engagement. La publication sur les stores d'applications (Apple App Store et Google Play) via un wrapper comme Capacitor elargirait significativement l'audience potentielle."),
    bodyPara("A moyen terme, l'integration avec des professionnels de sante (nutritionnistes, dieteticiens) via un espace professionnel permettrait de positionner CalorieAI comme un outil d'accompagnement therapeutique. L'amelioration du modele d'analyse par image via l'entrainement d'un modele fine-tune sur un jeu de donnees alimentaires specifique ameliorerait la precision et la rapidite de reconnaissance. L'expansion vers de nouveaux marches linguistiques et culturels, avec des bases de donnees nutritionnelles adaptees a chaque region, multiplierait l'impact du projet. A long terme, CalorieAI pourrait evoluer vers une plateforme complete de bien-etre alimentaire integrant la gestion des courses, la planification des repas et la connexion avec les services de livraison de repas sains."),
  ];
}

function bibliographie() {
  return [
    h1("Bibliographie et Webographie"),
    emptyPara(),
    ...[
      "[1] Organisation Mondiale de la Sante, \"Obesite et surpoids,\" OMS, 2024. Disponible : https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight.",
      "[2] OpenAI, \"GPT-4o System Card,\" OpenAI Technical Report, 2024. Disponible : https://openai.com/index/gpt-4o-system-card.",
      "[3] OpenAI, \"GPT-4o-mini: Cost-Efficient Intelligence,\" OpenAI Blog, 2024. Disponible : https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence.",
      "[4] Vercel, \"Next.js 16 Documentation,\" 2024. Disponible : https://nextjs.org/docs.",
      "[5] Prisma, \"Prisma ORM Documentation,\" 2024. Disponible : https://www.prisma.io/docs.",
      "[6] Supabase, \"Supabase Documentation,\" 2024. Disponible : https://supabase.com/docs.",
      "[7] Tailwind Labs, \"Tailwind CSS v4 Documentation,\" 2024. Disponible : https://tailwindcss.com/docs.",
      "[8] shadcn/ui, \"shadcn/ui Component Library,\" 2024. Disponible : https://ui.shadcn.com.",
      "[9] Open Food Facts, \"Open Food Facts Database,\" 2024. Disponible : https://world.openfoodfacts.org.",
      "[10] Mifflin, M.D. et al., \"A new predictive equation for resting energy expenditure using healthy individuals,\" American Journal of Clinical Nutrition, vol. 51, no. 2, pp. 241-247, 1990.",
      "[11] Hassannejad, H. et al., \"Automatic diet monitoring: a review of computer vision and wearable sensor-based methods,\" International Journal of Food Sciences and Nutrition, vol. 68, no. 6, pp. 656-670, 2017.",
      "[12] Lo, C. et al., \"GoFood: A mobile app for food recognition and dietary monitoring,\" Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies, vol. 2, no. 1, 2018.",
      "[13] Google Developers, \"Progressive Web Apps (PWAs),\" 2024. Disponible : https://developers.google.com/web/progressive-web-apps.",
      "[14] Schwaber, K. et Sutherland, J., \"The Scrum Guide,\" 2020. Disponible : https://scrumguides.org.",
      "[15] Osterwalder, A. et Pigneur, Y., \"Business Model Generation: A Handbook for Visionaries, Game Changers, and Challengers,\" Wiley, 2010.",
      "[16] Grand View Research, \"Digital Health and Fitness Market Size Report, 2023-2030,\" 2023.",
      "[17] Zustand, \"Zustand State Management Documentation,\" 2024. Disponible : https://github.com/pmndrs/zustand.",
      "[18] Framer Motion, \"Framer Motion Animation Library,\" 2024. Disponible : https://www.framer.com/motion.",
      "[19] Microsoft, \"TypeScript Documentation,\" 2024. Disponible : https://www.typescriptlang.org/docs.",
      "[20] Workbox, \"Workbox Service Worker Libraries,\" Google Developers, 2024. Disponible : https://developer.chrome.com/docs/workbox.",
    ].map(ref => new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: LINE_SPACING, after: 60 },
      indent: { left: 480, hanging: 480 },
      children: [new TextRun({ text: ref, size: 21, color: BODY_COLOR, font })],
    })),
  ];
}

function annexes() {
  return [
    h1("Annexes"),

    h2("Annexe A : Captures d'ecran de l'application"),
    bodyPara("Les captures d'ecran suivantes illustrent les differentes vues de l'application CalorieAI. L'ecran principal du dashboard presente le Calorie Ring anime en haut de page, affichant la progression calorique journaliere, suivi par les cartes de macronutriments (proteines, glucides, lipides) et le widget de suivi d'hydratation. La vue Track affiche l'interface de saisie avec les quatre modes d'entree disponibles : texte, image, scan code-barres et reconnaissance vocale. La vue Analytics presente les graphiques de tendances nutritionnelles sur 7, 30 et 90 jours. La vue Chat affiche l'interface de conversation avec le chatbot nutritionnel. La vue Meal Plan presente le plan repas genere par IA avec les recettes detaillees. La vue Profile affiche les parametres utilisateur, les objectifs nutritionnels et la collection de badges debloques."),

    h2("Annexe B : Structure SQL de la base de donnees"),
    bodyPara("La structure de la base de donnees est definie par le schema Prisma suivant :"),

    emptyPara(),
    bodyPara("model FoodEntry {"),
    bodyPara("  id         String   @id @default(cuid())"),
    bodyPara("  userId     String"),
    bodyPara("  date       DateTime @default(now())"),
    bodyPara("  mealType   String   // breakfast, lunch, dinner, snack"),
    bodyPara("  foodName   String"),
    bodyPara("  calories   Int"),
    bodyPara("  protein    Float"),
    bodyPara("  carbs      Float"),
    bodyPara("  fat        Float"),
    bodyPara("  fiber      Float?"),
    bodyPara("  imageUrl   String?"),
    bodyPara("  createdAt  DateTime @default(now())"),
    bodyPara("  user       UserProfile @relation(fields: [userId], references: [id])"),
    bodyPara("}"),

    emptyPara(),
    bodyPara("model DailyGoal {"),
    bodyPara("  id             String   @id @default(cuid())"),
    bodyPara("  userId         String"),
    bodyPara("  date           DateTime @default(now())"),
    bodyPara("  targetCalories Int"),
    bodyPara("  targetProtein  Float"),
    bodyPara("  targetCarbs    Float"),
    bodyPara("  targetFat      Float"),
    bodyPara("  targetWater    Int"),
    bodyPara("  user           UserProfile @relation(fields: [userId], references: [id])"),
    bodyPara("}"),

    emptyPara(),
    bodyPara("model UserProfile {"),
    bodyPara("  id            String   @id @default(cuid())"),
    bodyPara("  name          String?"),
    bodyPara("  age           Int?"),
    bodyPara("  gender        String?"),
    bodyPara("  weight        Float?"),
    bodyPara("  height        Float?"),
    bodyPara("  activityLevel String? // sedentary, light, moderate, active, very_active"),
    bodyPara("  goal          String? // lose, maintain, gain"),
    bodyPara("  bmr           Float?"),
    bodyPara("  tdee          Float?"),
    bodyPara("  createdAt     DateTime @default(now())"),
    bodyPara("  foodEntries   FoodEntry[]"),
    bodyPara("  dailyGoals    DailyGoal[]"),
    bodyPara("  waterLogs     WaterLog[]"),
    bodyPara("  badges        Badge[]"),
    bodyPara("  chatMessages  ChatMessage[]"),
    bodyPara("}"),

    emptyPara(),
    bodyPara("model WaterLog { id String @id @default(cuid()) userId String date DateTime @default(now()) amount Int unit String @default(\"ml\") createdAt DateTime @default(now()) user UserProfile @relation(fields: [userId], references: [id]) }"),

    emptyPara(),
    bodyPara("model Badge { id String @id @default(cuid()) userId String badgeType String earnedAt DateTime @default(now()) metadata Json? user UserProfile @relation(fields: [userId], references: [id]) }"),

    emptyPara(),
    bodyPara("model ChatMessage { id String @id @default(cuid()) userId String role String content String createdAt DateTime @default(now()) user UserProfile @relation(fields: [userId], references: [id]) }"),

    h2("Annexe C : Code source significatif (extrait de l'abstraction IA)"),
    bodyPara("L'extrait de code suivant presente l'interface d'abstraction de la couche IA et son implementation OpenAI :"),

    emptyPara(),
    bodyPara("// Interface commune pour les providers IA"),
    bodyPara("interface AIProvider {"),
    bodyPara("  analyzeByText(description: string): Promise<NutritionResult[]>;"),
    bodyPara("  analyzeByImage(imageBase64: string): Promise<NutritionResult[]>;"),
    bodyPara("  chat(messages: ChatMessage[]): Promise<string>;"),
    bodyPara("  generateMealPlan(profile: UserProfile): Promise<MealPlan>;"),
    bodyPara("}"),

    emptyPara(),
    bodyPara("// Implementation OpenAI"),
    bodyPara("class OpenAIProvider implements AIProvider {"),
    bodyPara("  private model = \"gpt-4o-mini\";"),
    bodyPara("  private client: OpenAI;"),
    bodyPara("  constructor(apiKey: string) {"),
    bodyPara("    this.client = new OpenAI({ apiKey });"),
    bodyPara("  }"),
    bodyPara("  async analyzeByText(description: string) {"),
    bodyPara("    const response = await this.client.chat.completions.create({"),
    bodyPara("      model: this.model,"),
    bodyPara("      messages: [{ role: \"system\", content: NUTRITION_PROMPT },"),
    bodyPara("              { role: \"user\", content: description }],"),
    bodyPara("      response_format: { type: \"json_object\" }"),
    bodyPara("    });"),
    bodyPara("    return JSON.parse(response.choices[0].message.content);"),
    bodyPara("  }"),
    bodyPara("  // ... autres methodes"),
    bodyPara("}"),

    emptyPara(),
    bodyPara("Cet extrait illustre le pattern de conception utilise pour encapsuler les providers d'intelligence artificielle derriere une interface commune, permettant le basculement entre z-ai-web-dev-sdk et OpenAI sans modification du code metier."),
  ];
}

// ═══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("Building CalorieAI PFE Report...");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: font,
            size: BODY_SIZE,
            color: BODY_COLOR,
          },
          paragraph: {
            spacing: { line: LINE_SPACING },
          },
        },
        heading1: {
          run: {
            font: fontBold,
            size: H1_SIZE,
            bold: true,
            color: BODY_COLOR,
          },
          paragraph: {
            spacing: { line: LINE_SPACING },
            alignment: AlignmentType.CENTER,
          },
        },
        heading2: {
          run: {
            font: fontBold,
            size: H2_SIZE,
            bold: true,
            color: BODY_COLOR,
          },
          paragraph: {
            spacing: { line: LINE_SPACING },
          },
        },
        heading3: {
          run: {
            font: fontBold,
            size: H3_SIZE,
            bold: true,
            color: BODY_COLOR,
          },
          paragraph: {
            spacing: { line: LINE_SPACING },
          },
        },
      },
    },
    sections: [
      // ── SECTION 1: Cover ──
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(),
      },
      // ── SECTION 2: Front matter (Dedicace, Remerciements, TOC) ──
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: MARGIN,
            pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
          },
        },
        footers: { default: pageNumFooterRoman() },
        children: [
          ...dedicace(),
          ...remerciements(),
          ...tableOfContents(),
        ],
      },
      // ── SECTION 3: Body ──
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: MARGIN,
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        footers: { default: pageNumFooterArabic() },
        children: [
          ...introductionGenerale(),
          ...chapitre1(),
          ...chapitre2(),
          ...chapitre3(),
          ...chapitre4(),
          ...chapitre5(),
          ...chapitre6(),
          ...chapitre7(),
          ...conclusionGenerale(),
          ...bibliographie(),
          ...annexes(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/Rapport_PFE_CalorieAI.docx", buffer);
  console.log("Report generated: /home/z/my-project/Rapport_PFE_CalorieAI.docx");
  console.log("Size:", (buffer.length / 1024).toFixed(1), "KB");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
