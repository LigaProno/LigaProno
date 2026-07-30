/* eslint-disable react/no-unescaped-entities -- pagină de conținut cu ghilimele/apostrofuri în text */
import Link from "next/link";
import type { ReactNode } from "react";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Politica de confidențialitate");

// Adresa de contact pentru solicitări privind datele. Asigură-te că această
// cutie poștală există (sau schimb-o cu adresa preferată).
const CONTACT_EMAIL = "contact@ligaprono.ro";
// Data ultimei actualizări a politicii.
const LAST_UPDATED = "30 iulie 2026";
const LAST_UPDATED_EN = "30 July 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
      <div className="flex flex-col gap-2.5 text-sm sm:text-[15px] leading-relaxed text-white/70">
        {children}
      </div>
    </section>
  );
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[#67E8F9] hover:underline">
      {CONTACT_EMAIL}
    </a>
  );
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocaleFromCookies();
  const ro = locale === "ro";

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: "#0A0B1E" }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors w-fit">
            ← {ro ? "Înapoi la Liga Prono" : "Back to Liga Prono"}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {ro ? "Politica de confidențialitate" : "Privacy Policy"}
          </h1>
          <p className="text-xs text-white/40">
            {ro ? `Ultima actualizare: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED_EN}`}
          </p>
        </header>

        {ro ? (
          <>
            <Section title="1. Cine suntem">
              <p>
                Liga Prono („noi", „platforma") este o platformă gratuită de pronosticuri sportive,
                disponibilă la <strong>www.ligaprono.ro</strong>. Prezenta politică explică ce date
                personale colectăm, cum le folosim și ce drepturi ai asupra lor, în conformitate cu
                Regulamentul General privind Protecția Datelor (GDPR – Regulamentul UE 2016/679).
              </p>
              <p>
                Pentru orice întrebare legată de datele tale, ne poți contacta la <Mail />.
              </p>
            </Section>

            <Section title="2. Ce date colectăm">
              <p>Colectăm doar datele necesare funcționării platformei:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Date de cont</strong>: nume, prenume, adresă de e-mail și, opțional, imaginea
                  de profil — furnizate la înregistrare sau prin autentificarea cu Google. Contul este
                  gestionat prin furnizorul nostru de autentificare, Clerk.
                </li>
                <li>
                  <strong>Activitatea în platformă</strong>: turneele la care participi, pronosticurile
                  pe care le introduci, punctajele și preferințele de premii.
                </li>
                <li>
                  <strong>Date tehnice</strong>: adresa IP, tipul de dispozitiv și browser, colectate
                  automat pentru securitate și funcționarea corectă a site-ului.
                </li>
              </ul>
            </Section>

            <Section title="3. Cookie-uri și tehnologii similare">
              <p>Folosim următoarele categorii de cookie-uri:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Strict necesare (autentificare)</strong>: setate de Clerk pentru a te menține
                  conectat. Fără ele platforma nu funcționează, de aceea nu necesită consimțământ.
                </li>
                <li>
                  <strong>Funcționale (preferință de limbă)</strong>: reținem limba aleasă (română sau
                  engleză) pentru a-ți afișa interfața corect.
                </li>
                <li>
                  <strong>Publicitate</strong>: dacă afișăm reclame, partenerii de publicitate (vezi
                  secțiunea 5) pot seta cookie-uri pentru a difuza anunțuri relevante și a măsura
                  performanța acestora. Aceste cookie-uri se activează doar cu consimțământul tău,
                  solicitat printr-un banner la prima vizită.
                </li>
              </ul>
              <p>
                Îți poți gestiona sau retrage consimțământul oricând din bannerul de cookie-uri sau din
                setările browserului. Blocarea cookie-urilor de publicitate nu afectează accesul la
                platformă.
              </p>
            </Section>

            <Section title="4. Cum folosim datele">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>pentru a crea și administra contul tău;</li>
                <li>pentru a calcula punctajele și clasamentele turneelor;</li>
                <li>pentru a-ți trimite notificări legate de turnee (dacă ai activat e-mailurile);</li>
                <li>pentru securitate, prevenirea fraudei și îmbunătățirea platformei;</li>
                <li>pentru a afișa publicitate (dacă este cazul), pe baza consimțământului tău.</li>
              </ul>
              <p>
                Temeiul legal este executarea contractului (furnizarea serviciului), interesul nostru
                legitim (securitate, îmbunătățiri) și consimțământul tău (pentru publicitate și
                e-mailuri de marketing).
              </p>
            </Section>

            <Section title="5. Servicii terțe și publicitate">
              <p>
                Ne bazăm pe furnizori terți care pot prelucra date în numele nostru sau ca operatori
                independenți:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li><strong>Clerk</strong> – autentificare și gestionarea conturilor;</li>
                <li><strong>Vercel</strong> – găzduirea platformei;</li>
                <li><strong>MongoDB Atlas</strong> – stocarea datelor;</li>
                <li><strong>Football-Data.org</strong> – date despre meciuri și competiții;</li>
                <li><strong>Google</strong> – servicii de infrastructură și, dacă activăm publicitatea, <strong>Google AdSense</strong>.</li>
              </ul>
              <p>
                <strong>Publicitate Google:</strong> furnizorii terți, inclusiv Google, folosesc
                cookie-uri pentru a difuza anunțuri pe baza vizitelor tale anterioare pe acest site sau
                pe alte site-uri. Google folosește cookie-uri de publicitate pentru a difuza anunțuri pe
                internet. Poți dezactiva publicitatea personalizată accesând{" "}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#67E8F9] hover:underline">Setările Google pentru anunțuri</a>{" "}
                sau{" "}
                <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[#67E8F9] hover:underline">www.aboutads.info</a>.
              </p>
            </Section>

            <Section title="6. Cât timp păstrăm datele">
              <p>
                Păstrăm datele contului cât timp contul este activ. Poți solicita ștergerea contului
                oricând, scriindu-ne la <Mail />. După ștergere, eliminăm datele personale, cu excepția
                celor pe care legea ne obligă să le păstrăm.
              </p>
            </Section>

            <Section title="7. Drepturile tale (GDPR)">
              <p>Ai dreptul la:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>acces la datele tale și o copie a acestora;</li>
                <li>rectificarea datelor incorecte;</li>
                <li>ștergerea datelor („dreptul de a fi uitat");</li>
                <li>restricționarea sau opoziția la prelucrare;</li>
                <li>portabilitatea datelor;</li>
                <li>retragerea consimțământului în orice moment;</li>
                <li>depunerea unei plângeri la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).</li>
              </ul>
              <p>Pentru exercitarea acestor drepturi, scrie-ne la <Mail />.</p>
            </Section>

            <Section title="8. Vârsta minimă">
              <p>
                Platforma se adresează persoanelor de peste 18 ani. Nu colectăm cu bună știință date de
                la minori. Jocul responsabil este important — pronosticurile de pe Liga Prono sunt un
                joc gratuit, fără mize în bani.
              </p>
            </Section>

            <Section title="9. Modificări ale politicii">
              <p>
                Putem actualiza această politică periodic. Vom afișa data ultimei actualizări în partea
                de sus a paginii. Te încurajăm să o revizuiești din când în când.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>Pentru orice întrebare privind confidențialitatea, ne poți contacta la <Mail />.</p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. Who we are">
              <p>
                Liga Prono ("we", "the platform") is a free sports-prediction platform available at{" "}
                <strong>www.ligaprono.ro</strong>. This policy explains what personal data we collect,
                how we use it, and your rights, in line with the General Data Protection Regulation
                (GDPR – EU Regulation 2016/679).
              </p>
              <p>For any question about your data, contact us at <Mail />.</p>
            </Section>

            <Section title="2. Data we collect">
              <p>We only collect the data needed to run the platform:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Account data</strong>: first name, last name, email address and, optionally, a
                  profile picture — provided at sign-up or via Google sign-in. Accounts are managed by
                  our authentication provider, Clerk.
                </li>
                <li>
                  <strong>Platform activity</strong>: the tournaments you join, the predictions you
                  submit, your scores and prize preferences.
                </li>
                <li>
                  <strong>Technical data</strong>: IP address, device and browser type, collected
                  automatically for security and correct operation of the site.
                </li>
              </ul>
            </Section>

            <Section title="3. Cookies and similar technologies">
              <p>We use the following categories of cookies:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Strictly necessary (authentication)</strong>: set by Clerk to keep you signed
                  in. The platform can't work without them, so they don't require consent.
                </li>
                <li>
                  <strong>Functional (language preference)</strong>: we remember your chosen language
                  (Romanian or English) to display the interface correctly.
                </li>
                <li>
                  <strong>Advertising</strong>: if we show ads, our advertising partners (see section 5)
                  may set cookies to serve relevant ads and measure their performance. These cookies are
                  only activated with your consent, requested via a banner on your first visit.
                </li>
              </ul>
              <p>
                You can manage or withdraw consent anytime from the cookie banner or your browser
                settings. Blocking advertising cookies does not affect access to the platform.
              </p>
            </Section>

            <Section title="4. How we use data">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>to create and manage your account;</li>
                <li>to compute tournament scores and standings;</li>
                <li>to send you tournament notifications (if you enabled emails);</li>
                <li>for security, fraud prevention and improving the platform;</li>
                <li>to show advertising (where applicable), based on your consent.</li>
              </ul>
              <p>
                The legal bases are performance of a contract (providing the service), our legitimate
                interest (security, improvements) and your consent (for advertising and marketing
                emails).
              </p>
            </Section>

            <Section title="5. Third-party services and advertising">
              <p>
                We rely on third-party providers that may process data on our behalf or as independent
                controllers:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li><strong>Clerk</strong> – authentication and account management;</li>
                <li><strong>Vercel</strong> – platform hosting;</li>
                <li><strong>MongoDB Atlas</strong> – data storage;</li>
                <li><strong>Football-Data.org</strong> – match and competition data;</li>
                <li><strong>Google</strong> – infrastructure services and, if we enable ads, <strong>Google AdSense</strong>.</li>
              </ul>
              <p>
                <strong>Google advertising:</strong> third-party vendors, including Google, use cookies
                to serve ads based on your prior visits to this or other websites. Google's use of
                advertising cookies enables it to serve ads across the internet. You can opt out of
                personalized advertising by visiting{" "}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#67E8F9] hover:underline">Google Ads Settings</a>{" "}
                or{" "}
                <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[#67E8F9] hover:underline">www.aboutads.info</a>.
              </p>
            </Section>

            <Section title="6. How long we keep data">
              <p>
                We keep account data for as long as your account is active. You can request account
                deletion anytime by writing to <Mail />. After deletion, we remove your personal data,
                except where the law requires us to retain it.
              </p>
            </Section>

            <Section title="7. Your rights (GDPR)">
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>access your data and receive a copy of it;</li>
                <li>rectify inaccurate data;</li>
                <li>erase your data ("right to be forgotten");</li>
                <li>restrict or object to processing;</li>
                <li>data portability;</li>
                <li>withdraw consent at any time;</li>
                <li>lodge a complaint with your data-protection authority (in Romania, ANSPDCP).</li>
              </ul>
              <p>To exercise these rights, write to us at <Mail />.</p>
            </Section>

            <Section title="8. Minimum age">
              <p>
                The platform is intended for people over 18. We do not knowingly collect data from
                minors. Responsible play matters — predictions on Liga Prono are a free game, with no
                money stakes.
              </p>
            </Section>

            <Section title="9. Changes to this policy">
              <p>
                We may update this policy from time to time. We'll show the last-updated date at the top
                of the page. We encourage you to review it occasionally.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>For any privacy question, contact us at <Mail />.</p>
            </Section>
          </>
        )}

        <footer className="pt-4 border-t border-white/10">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Liga Prono</p>
        </footer>
      </div>
    </main>
  );
}
