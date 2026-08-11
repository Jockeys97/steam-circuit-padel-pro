# Template contract - Standard CV refresh

## Reference

- Retained reference: `/Users/alessiofantini/.codex/skills/alessio-tailored-cv/assets/base-cv.docx`
- SHA-256: `ca5312937dae4eb7c4086ad0f993f8c32c9f4db114c79ec2ecd604d143a8f928`
- Render evidence: `template-reference-render/page-1.png`, `template-reference-render/page-2.png`
- Style evidence: `template-style-evidence.json`
- Page count: 2. Section count: 1.

## Page system

- A4 portrait: 8.27 x 11.69 in.
- Margins: left 0.53 in, right 0.53 in, top 0.45 in, bottom 0.41 in.
- One section, no columns, no different first page, one footer with a PAGE field.
- Explicit page break before selected projects; page 1 contains header/profile/skills/experience, page 2 contains projects/additional experience/education/training.

## Visual system

- Arial throughout. Dark navy header and primary text; teal accent for headline, section headings, labels and hyperlinks.
- Header: full-width navy band, name and headline left, square profile image right; contact line and three links below the headline.
- Section headings: teal uppercase, thin light rule below.
- Skills: four-row two-column component with pale label cells and unbordered value cells.
- Experience and projects: bold navy title line, muted date/descriptor, compact real bullets.
- Footer: centered muted label plus PAGE field.

## Editable slot map

- `word/document.xml`: headline, contact line, all section labels, profile paragraph, four skill labels/values, two experience records and bullets, three project records, two additional-experience records, three education records, training/languages/availability.
- `docProps/core.xml`: title, subject, author and keywords.
- `word/footer1.xml`: footer positioning label only; preserve PAGE field structure.
- Existing hyperlink relationships: preserve LinkedIn, GitHub, Portfolio, Green Active stores, SIGNAL demo/source, and Padel demo/source.
- Existing image relationship `word/media/image1.png`: preserve unchanged.

## Slot capacities

- Profile: up to 75 words preferred, hard builder limit 80 words.
- Skills: exactly four rows; each value should wrap to no more than two lines in the retained geometry.
- Experience: exactly two records; first has four bullets, second has three.
- Projects: exactly three records; each has two bullets and one stack line.
- Additional experience: exactly two records, with optional empty second bullet.
- Education: exactly three records.

## Package preservation

- Preserve-only: `[Content_Types].xml`, package relationships, app properties, styles, stylesWithEffects, settings except normal Word save effects, webSettings, fontTable, theme, customXml, numbering, image, thumbnail and hyperlink relationships.
- Editable through the approved builder: `word/document.xml`, `word/footer1.xml`, `docProps/core.xml` and relationship-backed display text already exposed by the template.

## Fidelity gates

- Retained reference remains byte-for-byte unchanged at its recorded SHA-256.
- Final remains A4, two pages, one section, with the explicit page break before projects.
- Header, photo, palette, margins, typography, footer and working hyperlinks remain source-derived.
- No clipping, overlap, unexpected third page, orphaned heading, split experience record or broken hyperlink.
- Final metadata must identify Alessio Fantini and contain no legacy Canva title or another person's name.
