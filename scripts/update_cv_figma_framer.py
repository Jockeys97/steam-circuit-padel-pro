from pathlib import Path

import fitz


SOURCE = Path(
    "/Users/alessiofantini/Documents/CV/Versione Standard/"
    "Curriculum Vitae Fantini Alessio - backup 2026-08-04.pdf"
)
OUTPUT = Path("/private/tmp/Curriculum Vitae Fantini Alessio.pdf")
FONT_FILE = Path("/private/tmp/anantason-wd62.ttf")
ARIAL_NARROW = Path("/System/Library/Fonts/Supplemental/Arial Narrow.ttf")


def main() -> None:
    document = fitz.open(SOURCE)
    page = document[0]

    font_name, extension, _font_type, font_bytes = document.extract_font(169)
    if extension.lower() != "ttf":
        raise RuntimeError(f"Unexpected embedded font format: {font_name}.{extension}")
    FONT_FILE.write_bytes(font_bytes)

    # Replace only the first Accademia Italiana Fitness bullet. The rectangle
    # stops before the following bullet, so the rest of the layout is untouched.
    page.add_redact_annot(
        fitz.Rect(317.0, 432.5, 585.0, 502.9),
        fill=(1, 1, 1),
    )
    page.apply_redactions()

    # Canva's text bounding boxes overlap slightly: the redaction also touches
    # the final character of the location above. Restore that short line using
    # the original embedded typeface before inserting the replacement bullet.
    page.draw_rect(
        fitz.Rect(290.5, 414.0, 356.0, 440.0),
        color=None,
        fill=(1, 1, 1),
        overlay=True,
    )
    page.insert_text(
        fitz.Point(291.27243, 428.79294),
        "Roma (RM)",
        fontname="AnantasonCV",
        fontfile=str(FONT_FILE),
        fontsize=15.00565,
        color=(55 / 255, 79 / 255, 89 / 255),
        overlay=True,
    )

    lines = [
        "Sviluppo e manutenzione di gestionali web full-",
        "stack con Angular e API PHP/Node; progettazione",
        "UI in Figma e realizzazione del sito aziendale",
        "con Framer",
    ]
    baselines = [453.55225, 470.80878, 488.06528, 505.32178]
    for line, baseline in zip(lines, baselines):
        page.insert_text(
            fitz.Point(318.05212, baseline),
            line,
            fontname="ArialNarrowCV",
            fontfile=str(ARIAL_NARROW),
            fontsize=15.00565,
            color=(55 / 255, 79 / 255, 89 / 255),
            overlay=True,
        )

    document.save(OUTPUT, garbage=4, deflate=True)
    document.close()


if __name__ == "__main__":
    main()
