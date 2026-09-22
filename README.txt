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
- confronto rapido con la previsione di base;
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
9. Premere "Aggiorna nowcast".
10. Controllare:
   - punti validi;
   - punti esclusi;
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
Il filtro standard è 10 NM dal centro campo.
I punti oltre il raggio selezionato vengono esclusi dal confronto.
Questo segue la regola operativa impostata per evitare che dati fuori bacino influenzino la previsione locale.

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
