# TaskFlow 2.0 — účty a bezpečná migrace

Aktuální Beta 1 stále ukládá data do localStorage. Tento dokument pouze připravuje přechod, nic automaticky nemigruje.

## Supabase
1. Auth Email provider a Confirm email: zapnout.
2. Authentication > URL Configuration: Site URL a Redirect URL nastav na https://wht4pzdyv7-afk.github.io/TaskFlow-1.0/ .
3. V SQL Editoru spusť `supabase/verify-security.sql` a ověř, že tabulka public.user_data má rowsecurity=true, existují čtyři vlastní policies (SELECT, INSERT, UPDATE, DELETE) s auth.uid() = user_id a anon nemá přístup.
4. Otestuj se dvěma oddělenými testovacími účty, zda účet B nesmí načíst ani měnit záznam účtu A. Samotný SQL audit toto neprokazuje.

## Implementační plán
- Na přihlašovací obrazovce nabídnout e-mail+heslo, ověřovací e-mail, reset hesla a odhlášení. Apple Sign In přidat po konfiguraci Apple Developer.
- Frontend použíje Supabase Project URL a **publishable/anon key** (nikdy service_role nebo secret key). Klíče jsou veřejné, izolaci dat vynucuje RLS.
- Nechat původní localStorage beze změny, dokud se uživatel nepřihlásí a explicitně nepotvrdí převod. Nabídnout export JSON zálohy.
- Před importem ověřit zda účet už má cloudová data; nikdy je automaticky nepřepsat. Ukládat per-user do public.user_data.
- Při každé změně zajistit spolehlivou synchronizaci a viditelné stavy ukládání/chyb; nekopírovat data mezi účty.
- Prověřit funkce kalendář, Daily Recap / Day Ahead / Lock It In, XP, streak a Focus po přihlášení i po obnovení stránky.

**Nevkládat hesla, service_role klíče ani Apple private keys do GitHubu.**
