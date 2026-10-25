# TaskFlow 2.2 — Journey (testovací verze)

Otevřít: https://wht4pzdyv7-afk.github.io/TaskFlow-1.0/taskflow-2.2/

TaskFlow 2.1, Beta 2 a databázová tabulka user_data zůstávají nedotčené.

## Novinky
- V Přehledu je karta My Journey, v menu je nová sekce Journey.
- Jedna 90denní cesta obsahuje více uživatelských oblastí, každá má cíl, motivaci, barvu a návyky.
- Návyk má vlastní opakování po dnech, nepovinný čas, XP a volitelný cíl minut ve Focus Mode.
- Denní dokončování, mapa 90 dní, reflexe a milníky 30/60/90.
- V Next Day / Day Ahead je výběr zítřejších závazků. Po Lock It In jsou propojené s TaskFlow úkoly.
- Ve Focus Mode lze vybrat konkrétní časový návyk Journey a odpracované minuty se přiřadí k němu.

## Ukládání a bezpečnost
Journey je samostatně uložená pro každé ID přihlášeného uživatele pod klíčem localStorage "taskflow_journey_22_<uid>". **Před aktivací nové databázové tabulky funguje pouze v konkrétním prohlížeči na tomto zařízení. Není synchronizována mezi zařízeními.**

Pro bezpečnou cloudovou synchronizaci spusť SQL soubor supabase-journey.sql ve svém existujícím Supabase projektu přes SQL Editor → New query → Run. RLS zaručuje přístup pouze vlastníkovi řádku. Aplikace po dalším načtení automaticky rozpozná tabulku a pro daný účet ukládá Journey zvlášť v public.journey_data. Nedojde tak k přepsání Journey starší verzí TaskFlow 2.1, která používá public.user_data.

Před testováním je vhodné použít export TaskFlow účtu a uvnitř Journey tlačítko Export Journey. V cloudu se obsah Journey při více současně otevřených zařízeních synchronizuje na principu posledního zápisu; úpravy v tutéž chvíli mohou být přepsány, proto je potřeba zkusit celý tok na jednom zařízení.

## Zatím známá omezení
- Nejde o přesnou digitální kopii placeného deníku třetí strany, ale o vlastní systém inspirovaný 90denním plánováním.
- Při prvním použití musí být uživatel přihlášen k již nakonfigurovanému Supabase účtu.
- Registrace nového účtu přímo z URL verze 2.2 může vyžadovat doplnění URL /taskflow-2.2/ mezi Supabase Auth redirect allowlist.
- Synchronizace Journey vyžaduje SQL migraci výše.
- PWA z GitHub Pages je závislá na dostupnosti Supabase; neproběhl interaktivní iPad / Safari end-to-end test.
- Přesuny/deletování Journey úkolů v původní verzi 2.1 nemusí měnit vlastní historii Journey.
