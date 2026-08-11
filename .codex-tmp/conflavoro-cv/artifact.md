# Template execution contract

- Reference: `/Users/alessiofantini/.codex/skills/alessio-tailored-cv/assets/base-cv.docx`
- SHA-256: `ca5312937dae4eb7c4086ad0f993f8c32c9f4db114c79ec2ecd604d143a8f928`
- Reference render: `base-render/page-1.png`, `base-render/page-2.png`
- Page count: 2. Section count: 1.
- Package: 19 parts; preserve styles, theme, numbering, footer, image, hyperlinks, custom XML and relationships except core metadata/document text updated by the retained builder.

## Page system

- A4 portrait: 8.27 x 11.69 inches.
- Margins: left/right 0.53 in; top 0.45 in; bottom 0.41 in.
- One section, page break before projects. Same footer pattern on both pages.
- Page 1: header, profile, four-row skills block, two professional experiences.
- Page 2: three projects, two additional experiences, education, courses/languages, availability.

## Visual system

- Arial throughout; navy header and primary text, teal accent headings and links, pale gray rules and skills-label fill.
- Header contains name, teal positioning line, contact line, three portfolio links and the retained square profile photo at upper right.
- Section headings are uppercase teal with thin pale-gray rule below.
- Experience/project names use navy bold; metadata uses muted italic gray; bullets use the retained list definition and hanging indent.
- Footer contains positioning plus automatic page number.

## Editable slots and capacity

- Header positioning: one line; contact line: one line.
- Profile: up to 75 words and approximately four rendered lines.
- Skills: exactly four rows; values may wrap to at most two lines.
- Professional experience: two roles; first has four bullets, second has three; keep page 1 only.
- Projects: exactly three, two bullets each and one stack line; retain existing store/demo/source hyperlinks.
- Additional experience: exactly two entries; education: exactly three; courses/languages/availability retained in final block.
- Headline/footer, section titles and core metadata are editable.

## Fidelity gates

- Retained reference SHA remains unchanged.
- Final remains A4, one section and two pages, with projects starting at page 2.
- Header, profile photo, colors, margins, typography, footer, hyperlink relationships and page numbering remain source-derived.
- No overlap, clipping, isolated headings, broken bullets, excessive wrapping or unexplained layout movement.
- Final output is rendered page-by-page and compared with the reference; text changes are expected, geometry or recurring-chrome changes are not.
