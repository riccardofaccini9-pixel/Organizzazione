# CleanSchedule — Calendario Mansioni & Pulizie

App per la gestione del calendario settimanale di mansioni e pulizie di una
casa condivisa. Frontend statico (HTML/CSS/JS puro) + backend Flask con
storage su SQLite, pensata per essere ospitata su **PythonAnywhere**.

## Sviluppo locale

```bash
pip install -r requirements.txt
python server.py
```

Apri `http://127.0.0.1:5000`. Al primo avvio viene creato automaticamente
`app.db` (SQLite) con i dati di default (utente `ADMIN`, alcuni cadetti,
mansioni e zone di pulizia di esempio).

## Migrazione dei dati esistenti da Firestore

Se hai già dati reali salvati nel vecchio backend Firestore, migrali una
volta sola prima di usare il nuovo backend in produzione:

1. Apri `migration/export_firestore_data.html` nel browser (finché il
   progetto Firebase esiste ancora): scarica `firestore-export.json` con
   tutti i dati (persone, mansioni, zone, calendario).
2. Esegui:
   ```bash
   python migration/import_firestore_data.py firestore-export.json
   ```
   per importare quei dati in `app.db`.
3. Puoi ora eliminare `migration/export_firestore_data.html`, il progetto
   Firebase e `firestore-export.json` (contiene le password in chiaro:
   non va versionato né lasciato in giro — è già escluso da `.gitignore`).

## Deploy su PythonAnywhere

Serve un account PythonAnywhere (anche il piano gratuito va bene). In tutti
i comandi sostituisci `<username>` con il tuo username PythonAnywhere.

### 1. Carica il codice

Apri **Consoles → Bash** (dalla dashboard di PythonAnywhere) e clona il
repo:

```bash
git clone https://github.com/riccardofaccini9-pixel/Organizzazione.git cleaning-calendar
cd cleaning-calendar
```

Se il repo è privato, git chiederà username/password: usa un
[Personal Access Token](https://github.com/settings/tokens) di GitHub al
posto della password.

### 2. Crea il virtualenv e installa le dipendenze

Sempre nella stessa console Bash:

```bash
mkvirtualenv --python=/usr/bin/python3.10 cleaning-calendar-env
pip install -r requirements.txt
```

(`mkvirtualenv` attiva automaticamente il virtualenv appena creato; se
`/usr/bin/python3.10` non esiste su quel piano, esegui `ls /usr/bin/python3*`
per vedere le versioni disponibili e usa quella più recente.)

### 3. (Solo se hai dati reali da migrare) importa i dati

Carica `firestore-export.json` nella cartella `cleaning-calendar` (scheda
**Files**, drag&drop, oppure `scp`/`git`), poi:

```bash
python migration/import_firestore_data.py firestore-export.json
```

### 4. Crea la Web App

Vai nella scheda **Web** → **Add a new web app**:
- dominio: quello gratuito proposto (`<username>.pythonanywhere.com`) va
  benissimo;
- tipo di configurazione: **Manual configuration** (NON scegliere "Flask",
  che genera uno scaffold diverso dal nostro `server.py`);
- versione Python: la stessa usata per il virtualenv (es. 3.10).

### 5. Configura la Web App

Nella pagina di configurazione appena creata, compila questi campi:

- **Source code**: `/home/<username>/cleaning-calendar`
- **Working directory**: `/home/<username>/cleaning-calendar`
- **Virtualenv**: `/home/<username>/.virtualenvs/cleaning-calendar-env`
- **WSGI configuration file**: clicca sul link del file (es.
  `/var/www/<username>_pythonanywhere_com_wsgi.py`), cancella tutto il
  contenuto generato automaticamente e sostituiscilo con:
  ```python
  import sys
  path = '/home/<username>/cleaning-calendar'
  if path not in sys.path:
      sys.path.append(path)
  from server import app as application
  ```
  Salva il file.

(Facoltativo, solo per performance: nella sezione **Static files** della
stessa pagina puoi aggiungere un mapping URL `/images/` →
`/home/<username>/cleaning-calendar/images/` così quelle richieste non
passano da Flask. Non è necessario per far funzionare l'app: `server.py`
serve già tutti i file statici da solo.)

### 6. Avvia

Torna in cima alla pagina **Web** e premi il pulsante verde **Reload
<username>.pythonanywhere.com**. Poi apri
`https://<username>.pythonanywhere.com` nel browser.

### Aggiornamenti futuri

Dopo aver modificato il codice (in locale o direttamente su GitHub):

```bash
cd ~/cleaning-calendar
git pull
```

poi torna nella scheda **Web** e premi di nuovo **Reload**.

`app.db` viene creato/aggiornato automaticamente nella cartella del
progetto (se hai già eseguito l'import dei dati reali prima del deploy,
carica anche `app.db` insieme al resto del codice).

## Account di accesso predefinito

- Email: `ADMIN@gmail.com`
- Password: `ADMIN`

Da questo account admin puoi aggiungere altre persone (cadetti) e mansioni
dalle schede dedicate.

## Struttura

- `index.html` — markup delle pagine (login, visualizzazione calendario,
  generazione, mansioni, persone)
- `app.js` — stato applicativo, autenticazione, algoritmo di generazione
  del calendario, rendering, sincronizzazione con il backend (polling ogni
  5 secondi)
- `style.css` — stile
- `test_scheduler.js` — script standalone per testare l'algoritmo di
  generazione fuori dal browser
- `server.py` — backend Flask: serve il frontend e la API REST
  (`GET /api/state`, `PUT /api/state/<key>`)
- `db.py` — storage SQLite (sostituisce la vecchia collezione Firestore
  `appState`) e dati di default
- `requirements.txt` — dipendenze Python
- `migration/` — strumenti una tantum per esportare i dati dal vecchio
  Firestore e importarli nel nuovo database

## Funzionalità principali

- **Login** con due ruoli: `admin` (permessi completi) e `cadetto` (sola
  visualizzazione).
- **Visualizzazione Calendario**: lettura contatori, pulizia casa (con
  eccezioni per assenze parziali), calendario settimanale
  giovedì→mercoledì, controllo serale, turni lavanderia. Gli admin possono
  sbloccare la modifica diretta tramite l'icona del lucchetto.
- **Generazione Calendario** (solo admin): wizard per selezionare le
  persone assenti e i giorni specifici di assenza, poi genera
  automaticamente un calendario bilanciato (rispettando la regola "nessuna
  ripetizione in lavanderia prima di 2 giorni o 4 turni").
- **Gestione Mansioni** (solo admin per le modifiche): nome, numero minimo
  persone, priorità (default 999 se non numerica), mansione collegata.
- **Gestione Persone** (solo admin per le modifiche): nome, email,
  password, ruolo.
