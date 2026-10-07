# Previsioni definitive nella app

Una previsione viene sincronizzata dopo la verifica del briefing, non durante la scrittura di una bozza. Il comando `tools/sync_forecast.py` dalla radice Meteo richiede il JSON `forecast_context.v1` e i report collegati. Aggiorna dati, indice, revisione e copie dei report sia in `meteo-bridge-app/app` sia in `nowcast-web/dist`.

Provider attuale: Vercel, collegato al repository `GigiPics/meteo-nowcast-regata`, branch di produzione `main`. Il push avvia il deployment attraverso l'integrazione Git esistente. GitHub Pages non viene avviato automaticamente. `.openai/hosting.json` è un riferimento storico del precedente Site.

URL di produzione: https://meteo-nowcast-regata.vercel.app/ . Le URL dei singoli deployment possono richiedere login: il controllo della revisione usa il dominio di produzione, dopo lo stato Vercel riuscito per il commit inviato.

Le istruzioni permanenti sono in `AGENTS.md` nella radice Meteo. A ogni previsione definitiva o correzione eseguire `python tools/publish_forecast.py output/<previsione>/forecast_context.json`. Il comando sincronizza, crea un commit con i soli dati/report della previsione, invia a GitHub e verifica il deployment Vercel dello stesso commit e la revisione remota. Non include modifiche estranee o già preparate dall'utente nell'indice Git. Solo dopo le verifiche registra `published`.

`auto-forecast.js` controlla l'indice ogni due minuti con app visibile, al ritorno in primo piano e al ritorno della rete. Cerca data e centro entro 10 NM; conserva una scelta manuale e riceve le revisioni dello stesso forecast. In assenza di rete mantiene l'ultimo dato valido. Il nowcast continua a verificare separatamente data e distanza prima di usare la baseline.

Il flusso è parte del lavoro dell'agente dopo ogni previsione definitiva. Non è un servizio in background che sorveglia file arbitrari: un salvataggio esterno non esegue automaticamente la pubblicazione.

Ogni sincronizzazione registra una richiesta in `output/forecast_publication_queue.json`. Ripetere la sincronizzazione della stessa revisione non duplica la richiesta; una correzione sostituisce la revisione da pubblicare. In caso di blocco conserva lo stato per un nuovo tentativo. `staged_not_published` e `pushed_pending_verification` non certificano disponibilità online.

Il passaggio a Vercel sostituisce il precedente flusso Sites.
