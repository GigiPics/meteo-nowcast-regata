# SailWeather 44.26 — 2 ottobre 2026

Implementazione locale pronta. Non pubblicata: gli strumenti nativi Sites per
lettura/sincronizzazione sorgenti e deploy non sono disponibili in questa sessione.
Prima di pubblicare, riconciliare questi file con le sorgenti remote del Site esistente;
non sovrascrivere eventuali modifiche remote più recenti.

## Comportamento

- Data rilevamenti visibile, inizializzata a oggi a ogni apertura. Il vecchio
  `sw_measures_date` non viene letto. Selezionare una previsione cambia la data
  visibile alla data valida di quella previsione.
- Centro campo esplicito sulla mappa o ripristinato dall'ultima sessione.
  Nessun centro dedotto dai rilevamenti o dal semplice spostamento della mappa.
- Ricerca automatica alla definizione/ripristino/cambio del centro o della data,
  poi ogni 120 secondi con pagina visibile; ripresa al ritorno online/in primo piano.
- Letture dei nodi `venti/YYYY-MM-DD` e `sessioni/YYYY-MM-DD`, senza cache.
  Autenticazione anonima solo se il servizio richiede accesso (401/403);
  token temporanei soltanto in memoria. Nessuna scrittura nei nodi osservativi.
- Coordinate vento lat/lon; corrente midLat/midLon oppure midpoint degli estremi.
  Coordinate mancanti/non finite/fuori dominio escluse, deduplicazione per id
  (impronta solo quando manca), distanza Haversine <=10 NM. Unità originali:
  vento nodi, corrente m/min. Conservati metadati originali dei record.
- Controllo della data esplicita del timestamp, senza convertire a UTC una data
  locale con offset. Il nodo del giorno resta il riferimento quando il timestamp
  non contiene una data esplicita. Record senza orario non diventano misure recenti.
- Conteggi grezzi, duplicati, illeggibili, coordinate mancanti, data diversa,
  fuori raggio e validi nel popup Rilevamenti.
- Le risposte in ritardo non sostituiscono il campo/data successivi. Cambio
  contesto, giorno vuoto ed errori eliminano i punti precedenti.
- JSON manuale disponibile come riserva per una sola data, coerente con quella
  selezionata, con gli stessi filtri. Riprendi automatico torna alla fonte online;
  cambiare data esce dalla modalità file. Boe valide entro raggio conservate.
- Dati storici consultabili sulla mappa, esclusi dal nowcast dei prossimi 60 minuti.
  Previsione ufficiale usata solo se data e centro sono coerenti con il campo.
- Barra compatta Campo / Previsione / Rilevamenti / Nowcast. Dettagli e azioni
  secondarie in dialog nativo con chiusura, Escape e gestione focus.
- Service worker aggiornato: le richieste esterne non entrano nella cache.

## Verifiche

- `node --test nowcast-web/tests/currwind.test.cjs nowcast-web/tests/auto-currwind.test.cjs`
- Lettura reale 26 agosto 2026, centro di verifica 53.294, -6.126:
  5 vento + 13 corrente grezzi; 5 vento + 12 corrente validi, 1 fuori 10 NM.
- Lettura reale 2 ottobre 2026: entrambi i nodi vuoti, esito distinto da errore.
- Browser: scelta del campo avvia la ricerca senza comando; cambio data
  invalida e ricarica; popup con conteggi; blocco nowcast storico; riapertura
  ripristina campo e cerca; nowcast attuale senza osservazioni mostra affidabilità bassa.
- Viewport 390x844: mappa 623 px prima della rimozione dell'ultima riga di istruzioni;
  320x568 e 844x390 senza overflow orizzontale, logo FIV visibile.
- Nessun errore JavaScript osservato durante le prove.

File aggiornati identici anche in `meteo-bridge-app/app/`.
Questa nota sostituisce per la versione 44 le istruzioni precedenti che richiedono
un comando manuale per cercare CurrWindNav.
