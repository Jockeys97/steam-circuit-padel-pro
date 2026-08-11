---
name: alessio-tailored-cv
description: Crea e aggiorna curriculum vitae DOCX/PDF personalizzati per Alessio Fantini a partire da un annuncio o da un'azienda specifica. Usa questa skill quando l'utente chiede un CV per una posizione, vuole massimizzare il superamento ATS e i colloqui, desidera mantenere la grafica del suo CV preferito oppure richiede una cartella di candidatura con file chiamati "Curriculum Vitae Fantini Alessio".
---

# CV personalizzati di Alessio

Produrre CV mirati e credibili, mantenendo la grafica del modello incluso e privilegiando l'accesso ai colloqui senza inventare competenze.

## Procedura obbligatoria

1. Leggere integralmente [references/profile.md](references/profile.md).
2. Leggere [references/tailoring-rules.md](references/tailoring-rules.md) e classificare i requisiti dell'annuncio come dimostrati, trasferibili o assenti.
3. Individuare automaticamente azienda, ruolo, lingua, sede/modalità e parole chiave. Chiedere chiarimenti solo se ruolo o azienda non sono ricavabili.
4. Leggere [references/spec-schema.md](references/spec-schema.md) e creare un JSON temporaneo conforme.
5. Usare `scripts/build_cv.py` con `assets/base-cv.docx`. Non ricreare il design da zero e non usare Canva salvo richiesta esplicita.
6. Renderizzare il DOCX con la skill `documents` e `render_docx.py --emit_pdf`.
7. Ispezionare visivamente tutte le pagine al 100%. Correggere sovrapposizioni, tagli, righe isolate, densità eccessiva o sezioni spezzate, quindi renderizzare di nuovo.
8. Salvare entrambi i file in:
   `/Users/alessiofantini/Documents/CV/<Ruolo> - <Azienda>/`
9. Usare sempre questi nomi, senza suffissi:
   - `Curriculum Vitae Fantini Alessio.docx`
   - `Curriculum Vitae Fantini Alessio.pdf`

## Vincoli grafici

- Conservare palette blu/verde, testata con foto, font Arial, formato A4 e gerarchia del modello.
- Conservare due pagine salvo richiesta diversa.
- Pagina 1: testata, profilo, quattro aree di competenza, esperienza professionale.
- Pagina 2: progetti, esperienze precedenti, formazione, corsi e lingue.
- Conservare il salto pagina prima dei progetti: è una preferenza esplicita dell'utente.
- Non cambiare foto, colori, margini o struttura senza autorizzazione.
- Tenere il profilo entro 75 parole, le competenze entro due righe per riga e i bullet entro 28 parole quando possibile.

## Regole di veridicità

- Usare il titolo della vacancy solo nella headline, mai come titolo retroattivo delle esperienze.
- Non dichiarare 3+ anni di sviluppo software, laurea informatica, amministrazione IAM, esperienza professionale Azure/AWS/GCP, Kubernetes o padronanza avanzata di Python.
- Python, cloud, CI/CD, RAG e vector DB possono apparire come uso pratico o familiarità solo quando utili all'annuncio.
- Non presentare Zero to Mastery come impiego: è formazione tecnica.
- Non nascondere l'uso dello sviluppo assistito da AI se viene chiesto direttamente; valorizzare ownership, architettura, integrazione, verifica e capacità di consegna.
- Non inserire metriche inventate. Se mancano numeri, descrivere risultati verificabili come applicazioni pubblicate, numero di fasi automatizzate o output prodotti.

## Selezione dei progetti

- Includere normalmente Green Active Mobile App, SIGNAL e Steam Circuit Padel Pro.
- Dare priorità a Green Active e SIGNAL per ruoli AI, integrazione, full-stack, API o automazione.
- Sostituire Padel con Smart Shopping solo per ruoli fortemente n8n/automation e solo se l'utente lo approva; usare esclusivamente descrizioni e immagini sanificate.
- Non pubblicare repository, endpoint o workflow aziendali riservati.

## Esecuzione

Usare il runtime Python del workspace:

```bash
python scripts/build_cv.py --spec /percorso/spec.json --out /percorso/Curriculum\ Vitae\ Fantini\ Alessio.docx
```

Il builder deve fallire se il JSON è incompleto o se il modello non corrisponde. Non aggirare la validazione modificando direttamente il file finale.

## Consegna

Consegnare il PDF come file principale e il DOCX come versione modificabile. Riassumere in una frase le principali personalizzazioni e segnalare, solo se utile, i requisiti dell'annuncio lasciati volutamente fuori perché non dimostrati.
