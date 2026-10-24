# TaskFlow 2.1

Nová verze postavená na původní `beta2/`; původní verze zůstává v repozitáři beze změny.

**Spustit aplikaci (GitHub Pages):** https://wht4pzdyv7-afk.github.io/TaskFlow-1.0/taskflow-2.1/

## Co je nového
- Uvítání jménem, plynulé animace a volitelné jemné zvuky.
- Hlavní obrazovka s hodinovým týdenním rozvrhem, řádkem celodenních událostí, indikátorem aktuálního času a tlačítkem **This Week**.
- Barevné události, přesouvání a změna délky po 15 minutách, zachovaný měsíční Smart Calendar, týdenní a dvoutýdenní opakování.
- Úkoly: filtrování, hledání, úpravy a mazání s potvrzením.
- XP úkolů připravených den předem: 5 / 15 / 30; úkolů vytvořených v den splnění: 2 / 10 / 20.
- Večerní **Next Day**: Daily Recap → Day Ahead → Lock It In; volitelný čas úkolu, přesunutí nebo zrušení nesplněných úkolů a plánovací streak.
- Focus Mode: minutový kruhový průběh, Pause/Resume, Finish, animované shrnutí a původní pravidla focus XP.
- Statistiky XP, Focus Mode a kalendář plánovacího streaku.
- Poznámky s rozbalováním a připnutím; existující úpravy a mazání.
- Motivy Klidný / Vesmír / Moderní, vlastní hlavní barva, pozadí, průhlednost karet a přepínače zvuků a animací.

**Podúkoly nejsou zahrnuté** na základě rozhodnutí při plánování.

## Struktura
- `index.html`: výchozí obrazovka a stávající logika.
- `auth.js`: přihlášení a cloudová synchronizace.
- `personalize.js`, `personalize.css`: původní personalizace, navigace, poznámky.
- `upgrade.js`, `upgrade.css`: nové funkce a vzhled verze 2.1.
- `manifest.webmanifest`: samostatná instalační identita verze 2.1.

Aplikace používá stejné uživatelské cloudové úložiště jako Beta 2, takže před většími změnami uživatelských dat je vhodné použít nabídku **Export**. Soubory byly ověřeny syntakticky; interaktivní test po přihlášení je potřeba provést v prohlížeči.
