# Schema JSON per `build_cv.py`

Tutti i campi sono obbligatori. Gli array devono mantenere esattamente le dimensioni indicate perché il modello ha una struttura fissa.

```json
{
  "document_title": "Curriculum Vitae Fantini Alessio - Target Role",
  "document_subject": "Candidatura Company - Target Role",
  "keywords": "keyword 1, keyword 2, keyword 3",
  "headline": "TARGET ROLE",
  "contact_line": "Roma | Disponibile full remote | +39 366 266 4944 | alessiofant@gmail.com",
  "section_titles": {
    "profile": "PROFILO",
    "skills": "COMPETENZE CHIAVE",
    "experience": "ESPERIENZA PROFESSIONALE",
    "projects": "PROGETTI SELEZIONATI",
    "additional": "ESPERIENZE PRECEDENTI",
    "education": "FORMAZIONE",
    "training": "CERTIFICAZIONI E LINGUE"
  },
  "profile": "Massimo 75 parole.",
  "skills": [
    {"label": "Area 1", "value": "Competenze supportate"},
    {"label": "Area 2", "value": "Competenze supportate"},
    {"label": "Area 3", "value": "Competenze supportate"},
    {"label": "Area 4", "value": "Competenze supportate"}
  ],
  "experiences": [
    {"title": "Titolo reale", "company": "Azienda", "dates": "Date", "location": "Sede", "bullets": ["...", "...", "...", "..."]},
    {"title": "Titolo reale", "company": "Azienda", "dates": "Date", "location": "Sede", "bullets": ["...", "...", "..."]}
  ],
  "projects": [
    {"name": "Green Active Mobile App", "descriptor": "...", "bullets": ["...", "..."], "stack": "..."},
    {"name": "SIGNAL", "descriptor": "...", "bullets": ["...", "..."], "stack": "..."},
    {"name": "Steam Circuit Padel Pro", "descriptor": "...", "bullets": ["...", "..."], "stack": "..."}
  ],
  "additional_experience": [
    {"header": "Digital Marketing Assistant | Rational Tomato | Ago 2023 - Dic 2023 | Lisbona", "bullet": "..."},
    {"header": "Social Media Intern | Casa Rossa | Set 2022 - Dic 2022 | Roma", "bullet": ""}
  ],
  "education": [
    {"title": "...", "meta": "..."},
    {"title": "...", "meta": "..."},
    {"title": "...", "meta": "..."}
  ],
  "training_label": "Formazione tecnica: ",
  "training": "...",
  "languages_label": "Lingue: ",
  "languages": "...",
  "availability": "Disponibilità: ...",
  "footer_label": "Alessio Fantini | Target positioning | "
}
```

Il secondo elemento di `additional_experience` può avere `bullet` vuoto; il builder rimuove il bullet segnaposto dal modello.
