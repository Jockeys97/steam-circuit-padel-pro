from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


OUTPUT = "output/pdf/Lettera_presentazione_Alessio_Fantini_Capgemini.pdf"


def build_pdf():
    document = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=2.15 * cm,
        leftMargin=2.15 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
    )

    styles = getSampleStyleSheet()
    name = ParagraphStyle(
        "Name",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=19,
        textColor=colors.HexColor("#1B3556"),
        spaceAfter=2,
    )
    contact = ParagraphStyle(
        "Contact",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=12,
        textColor=colors.HexColor("#536273"),
        spaceAfter=16,
    )
    subject = ParagraphStyle(
        "Subject",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#1B3556"),
        spaceAfter=16,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.4,
        leading=14.3,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#1D2731"),
        spaceAfter=10,
    )
    closing = ParagraphStyle(
        "Closing",
        parent=body,
        spaceBefore=3,
        spaceAfter=0,
    )

    paragraphs = [
        "Gentile team di Capgemini Engineering,",
        "mi chiamo Alessio Fantini e mi candido per la posizione di Agentic AI Engineer perché è una delle poche offerte in cui ho ritrovato in modo così chiaro il motivo per cui mi sono avvicinato allo sviluppo: non usare l'AI solo per produrre codice più velocemente, ma usarla per rendere più intelligenti e concreti i sistemi, i processi e il lavoro delle persone.",
        "Nel mio percorso ho costruito applicazioni, gestionali e automazioni partendo quasi sempre da un problema reale da risolvere. Lavorando su progetti full stack e su workflow AI ho imparato a collegare front-end, API, database, servizi esterni e logiche operative; ma soprattutto ho capito quanto valore possa creare un sistema quando non si limita a rispondere, ma sa orchestrare dati, strumenti e passaggi diversi in modo affidabile.",
        "L'esperienza con n8n, webhook, API REST, JavaScript/TypeScript, React, Angular, Node.js e database SQL mi ha portato naturalmente verso l'AI agentica. Nei progetti che ho sviluppato, come SIGNAL e le applicazioni gestionali e di automazione presenti nel mio portfolio, ho sperimentato come un LLM possa diventare parte di un flusso reale: analizzare informazioni, suggerire azioni, supportare decisioni e interagire con altri servizi. Uso ogni giorno strumenti come Claude Code, Codex e AI-assisted development non come una scorciatoia, ma come un modo per ragionare più velocemente, verificare ipotesi e costruire con maggiore continuità.",
        "Non provengo dal classico percorso di un Senior Software Engineer specializzato in sistemi embedded o industriali. Porto però una curiosità molto concreta, un approccio da builder e la capacità di entrare in problemi nuovi senza bloccarmi davanti alla complessità. Mi interessa particolarmente crescere al fianco di architetti, sviluppatori e domain expert, perché credo che l'AI agentica diventi davvero utile proprio quando incontra competenze di dominio profonde e processi reali.",
        "L'idea di contribuire a piattaforme e framework che aiutino a progettare, testare e validare software complesso, e che possano avere impatto su settori come industria, automotive, life sciences o aerospace, mi entusiasma molto. È una sfida ambiziosa, ma è esattamente il tipo di ambiente in cui sento di poter dare energia, capacità di apprendimento e una forte voglia di costruire.",
        "Vivo a Roma e sono disponibile per la modalità ibrida prevista. Mi farebbe molto piacere potermi presentare e raccontarvi più concretamente i progetti su cui ho lavorato e il mio modo di affrontare la tecnologia.",
    ]

    story = [
        Paragraph("Alessio Fantini", name),
        Paragraph("Roma, Italia &nbsp;|&nbsp; linkedin.com/in/alessio-fantini-3a40a6220 &nbsp;|&nbsp; github.com/jockeys97", contact),
        Paragraph("Candidatura - Agentic AI Engineer, AI-Native Software Engineering", subject),
    ]
    story.extend(Paragraph(text, body) for text in paragraphs)
    story.extend([
        Spacer(1, 3),
        Paragraph("Un cordiale saluto,<br/><b>Alessio Fantini</b>", closing),
    ])
    document.build(story)


if __name__ == "__main__":
    build_pdf()
