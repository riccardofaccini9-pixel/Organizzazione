# CleanSchedule — Calendario Mansioni & Pulizie

Sito statico (HTML/CSS/JS puro, nessuna dipendenza) per la gestione del calendario settimanale di mansioni e pulizie di una casa condivisa.

## Come usarlo

Apri `index.html` in un browser, oppure pubblicalo con GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

Tutti i dati (persone, mansioni, calendario generato) sono salvati in `localStorage` del browser: non c'è backend.

## Account di accesso predefinito

- Email: `ADMIN@gmail.com`
- Password: `ADMIN`

Da questo account admin puoi aggiungere altre persone (cadetti) e mansioni dalle schede dedicate.

## Struttura

- `index.html` — markup delle pagine (login, visualizzazione calendario, generazione, mansioni, persone)
- `app.js` — stato applicativo, autenticazione, algoritmo di generazione del calendario, rendering
- `style.css` — stile
- `test_scheduler.js` — script standalone per testare l'algoritmo di generazione fuori dal browser

## Funzionalità principali

- **Login** con due ruoli: `admin` (permessi completi) e `cadetto` (sola visualizzazione).
- **Visualizzazione Calendario**: lettura contatori, pulizia casa (con eccezioni per assenze parziali), calendario settimanale giovedì→mercoledì, controllo serale, turni lavanderia, spiegazione mansioni. Gli admin possono sbloccare la modifica diretta tramite l'icona del lucchetto.
- **Generazione Calendario** (solo admin): wizard per selezionare le persone assenti e i giorni specifici di assenza, poi genera automaticamente un calendario bilanciato (rispettando la regola "nessuna ripetizione in lavanderia prima di 2 giorni o 4 turni").
- **Gestione Mansioni** (solo admin per le modifiche): nome, numero minimo persone, priorità (default 999 se non numerica), mansione collegata.
- **Gestione Persone** (solo admin per le modifiche): nome, email, password, ruolo.
