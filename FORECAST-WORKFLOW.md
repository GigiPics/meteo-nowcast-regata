# Previsioni definitive nella app

Una previsione viene sincronizzata dopo la verifica del briefing, non durante la scrittura di una bozza. Il comando `tools/sync_forecast.py` dalla radice Meteo richiede il JSON `forecast_context.v1` e i report collegati. Aggiorna dati, indice, revisione e copie dei report sia in `meteo-bridge-app/app` sia in `nowcast-web/dist`.

Lo stato `staged_not_published` indica che i file sono pronti localmente. Per renderli disponibili nell'app online è obbligatorio completare il workflow Sites sul progetto esistente indicato in `.openai/hosting.json`, preservando audience e checkout verificato. Non usare il workflow GitHub Pages come sostituto del Site.

Le istruzioni permanenti sono in `AGENTS.md` nella radice Meteo. A ogni previsione definitiva o correzione: validazione, sincronizzazione, pubblicazione Sites, verifica stato deployment. Se gli strumenti Sites mancano, dichiarare la pubblicazione bloccata senza indicare la previsione come online.

`auto-forecast.js` controlla l'indice ogni due minuti con app visibile, al ritorno in primo piano e al ritorno della rete. Cerca data e centro entro 10 NM; conserva una scelta manuale e riceve le revisioni dello stesso forecast. In assenza di rete mantiene l'ultimo dato valido. Il nowcast continua a verificare separatamente data e distanza prima di usare la baseline.

Il flusso è parte del lavoro dell'agente dopo ogni previsione definitiva. Non è un servizio in background che sorveglia file arbitrari: un salvataggio esterno non esegue automaticamente la pubblicazione.

Stato iniziale 6 ottobre 2026: sincronizzazione e controlli locali completati; pubblicazione Sites non eseguita per indisponibilità dei relativi strumenti nella sessione.
