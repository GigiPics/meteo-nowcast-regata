PUBBLICAZIONE — AGGIORNAMENTO 2026-10-07
Provider attuale: Vercel, repository GigiPics/meteo-nowcast-regata, branch main.
URL ATTUALE: https://meteo-nowcast-regata.vercel.app/
Il precedente URL chatgpt.site non riceve gli aggiornamenti Vercel.
Dopo ogni previsione definitiva l'agente esegue dalla radice Meteo:
python tools/publish_forecast.py output/<previsione>/forecast_context.json
Il comando sincronizza, invia la previsione e verifica deployment e dati remoti.
La app controlla le nuove revisioni ogni due minuti quando visibile.
GitHub Pages non viene avviato automaticamente. Dettagli: FORECAST-WORKFLOW.md.

NOTE STORICHE — AGGIORNAMENTO 2026-10-02 — v44.26-auto-currwind
Ricerca CurrWindNav automatica su data visibile e centro campo, ogni 2 minuti con app visibile.
Data iniziale: oggi. Nessun valore nascosto sw_measures_date.
Filtro obbligatorio 10 NM, coordinate valide e deduplicazione per id.
Corrente: midLat/midLon o midpoint estremi; vento: lat/lon.
Mappa principale e pulsanti Campo / Previsione / Rilevamenti / Nowcast; dettagli in popup.
I dati storici non alimentano il nowcast attuale. JSON manuale resta disponibile nei dettagli.
Queste regole sostituiscono le precedenti indicazioni di ricerca tramite pulsante.
Stato: aggiornamento locale verificato; pubblicazione non eseguita in questa sessione.

METEO NOWCAST REGATA
Web app privata per nowcasting meteo operativo

URL PUBBLICATO
https://meteo-nowcast-regata.gipicciau.chatgpt.site

CARTELLA LOCALE
C:\Users\gipic\OneDrive\Documenti\Meteo\nowcast-web

SCOPO
La web app serve per usare da computer o smartphone gli aggiornamenti meteo di campo:
- caricamento JSON con rilevamenti o dati CurrWindNav;
- filtro automatico dei punti dentro la race area;
- verifica dei rilevamenti CurrWindNav entro 10 NM dal centro campo;
- caricamento immagini di update meteo;
- generazione di un riepilogo operativo esportabile.

VERSIONE ATTUALE
Questa è una prima versione MVP.
I file caricati vengono elaborati direttamente nel browser e non vengono ancora salvati in un archivio remoto permanente.
Il riepilogo può essere scaricato in formato Markdown e poi archiviato nel progetto Meteo.

USO OPERATIVO
1. Aprire il sito dal telefono o dal computer.
2. Controllare il preset della venue.
   Di default è impostato su:
   ILCA Worlds - Dún Laoghaire
   centro race area: 53.3238 N, 6.1337 W
3. Se necessario modificare il centro race area usando il metodo rapido:
   - selezionare un preset, per esempio Dún Laoghaire o Vilamoura;
   - oppure usare il GPS del telefono;
   - rifinire il punto con i pulsanti Nord/Sud/Est/Ovest;
   - usare il tasto "Fine" per micro-regolazioni più piccole.
4. In alternativa, aprire la mappa solo se serve:
   - la mappa usa OpenStreetMap;
   - viene caricata solo su richiesta per non rallentare il telefono;
   - il marker è trascinabile.
5. È sempre possibile modificare manualmente:
   - latitudine;
   - longitudine;
   - raggio filtro;
   - ora partenza.
6. Incollare o aggiornare la previsione attesa nel campo "Previsione di base".
7. Caricare il file JSON dei rilevamenti.
8. Caricare eventuali immagini di update meteo: PredictWind, radar, cloud, onde, screenshot dal campo.
9. Premere "Leggi JSON CurrWindNav 10 NM".
10. Controllare:
   - punti validi;
   - punti esclusi;
   - duplicati rimossi;
   - record senza coordinate;
   - record fuori 10 NM;
   - intensità media;
   - direzione media;
   - controllo qualità.
11. Scaricare il riepilogo con "Scarica riepilogo".

MAPPA
La mappa è opzionale.
È stata resa secondaria perché su mobile può risultare lenta o poco precisa con connessione debole.
Il metodo consigliato è preset/GPS + micro-regolazioni.
Quando si apre la mappa, il cerchio visualizzato rappresenta il raggio filtro selezionato.
Se la mappa non è disponibile, la app resta utilizzabile con coordinate manuali e pulsanti di regolazione.

FILTRO SPAZIALE
La verifica JSON CurrWindNav usa sempre 10 NM dal centro campo.
Il selettore "raggio visuale" serve solo per visualizzare il cerchio sulla mappa.
I punti oltre 10 NM vengono esclusi dalla verifica, anche se il raggio visuale è diverso.
Questo segue la regola operativa della skill meteo per evitare che dati fuori bacino influenzino la previsione locale.

LETTURA JSON CURRWINDNAV
Il pulsante "Leggi JSON CurrWindNav 10 NM" applica questa procedura:
- legge il JSON completo;
- decodifica anche eventuali oggetti JSON salvati come stringa;
- usa solo record con coordinate geografiche valide;
- per vento usa lat/lon;
- per corrente/deriva usa midLat/midLon quando presenti, altrimenti il punto medio fra lat1/lon1 e lat2/lon2;
- deduplica i record;
- scarta record senza coordinate;
- scarta record oltre 10 NM dal centro campo;
- riporta conteggio grezzo, duplicati, senza coordinate, fuori 10 NM e validi finali.

INTERPRETAZIONE DEI DATI
La web app prova a riconoscere i campi più comuni:
- latitudine: lat, latitude, Lat, Latitude, midLat
- longitudine: lon, lng, longitude, Lon, Lng, Longitude, midLon, midLng
- intensità: speed, windSpeed, vel, velocity, intensity, intensita, magnitude, value
- direzione: dir, direction, windDir, direzione, bearing, from

Se l'intensità media è molto alta per dati di corrente, l'unità viene segnalata come da verificare.
Per i file CurrWindNav già usati nel progetto, valori in m/min vengono convertiti anche in nodi.

LOGO FIV
Il logo FIV è incluso nella testata della pagina.
File locale usato:
C:\Users\gipic\OneDrive\Documenti\Meteo\nowcast-web\dist\assets\fiv-logo.png

FILE PRINCIPALI
Pagina web:
C:\Users\gipic\OneDrive\Documenti\Meteo\nowcast-web\dist\index.html

Configurazione hosting Sites:
C:\Users\gipic\OneDrive\Documenti\Meteo\nowcast-web\.openai\hosting.json

Archivio pubblicazione:
C:\Users\gipic\OneDrive\Documenti\Meteo\nowcast-web\site-archive.tar.gz

PROSSIMI SVILUPPI CONSIGLIATI
1. Archivio remoto permanente per JSON e immagini.
2. Storico per venue, data e manifestazione.
3. Ingest automatico nel logbook/wiki locale.
4. Confronto automatico previsione vs rilevamenti precedenti.
5. Bias suggerito per previsione successiva nello stesso regime.
6. Preset multipli: Dún Laoghaire, Vilamoura e altre venue.

NOTE OPERATIVE
Per report e briefing regata continuare a usare lo stile tecnico compatto:
- scenario per ora regata;
- campo specifico;
- affidabilità;
- interazioni locali;
- segnali di avviso;
- osservazioni pratiche per regatanti.

Aggiornato: 2026-09-22
