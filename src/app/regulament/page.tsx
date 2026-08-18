/* eslint-disable react/no-unescaped-entities -- pagină de conținut cu ghilimele/apostrofuri în text */
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";
import { CONTEST_PARTNERS, INSTAGRAM_URL } from "@/lib/social-links";

export const metadata = pageTitle("Regulament concursuri");

const CONTACT_EMAIL = "support.ligaprono@gmail.com";
const LAST_UPDATED = "18 august 2026";
const LAST_UPDATED_EN = "18 August 2026";

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

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#D4AF37] hover:text-[#E8C878] hover:underline"
    >
      {children}
    </a>
  );
}

function PartnerList() {
  return (
    <>
      {CONTEST_PARTNERS.map((partner, index) => (
        <span key={partner.name}>
          {index > 0 ? ", " : null}
          <ExtLink href={partner.instagramUrl}>{partner.name}</ExtLink>
        </span>
      ))}
    </>
  );
}

export default async function ContestRulesPage() {
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
            {ro ? "Regulament concursuri" : "Contest rules"}
          </h1>
          <p className="text-xs text-white/40">
            {ro ? `Ultima actualizare: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED_EN}`}
          </p>
        </header>

        {ro ? (
          <>
            <Section title="1. Organizator și obiect">
              <p>
                Acest regulament se aplică turneelor publice organizate pe Liga Prono
                (www.ligaprono.ro), inclusiv celor cu premii acordate de Liga Prono sau de parteneri.
                Turneele private (cu invitație) nu sunt concursuri cu premii, exceptând cazul în care
                organizatorul turneului decide altfel în afara platformei.
              </p>
              <p>
                Participarea este gratuită. Liga Prono nu este o casă de pariuri: nu există mize
                bănești și nu se pot câștiga bani prin pronosticuri.
              </p>
            </Section>

            <Section title="2. Eligibilitate">
              <p>Pentru a participa și a putea primi premii trebuie să:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Ai cel puțin 18 ani și un cont Liga Prono valid.</li>
                <li>Fii înscris în turneul public respectiv.</li>
                <li>Respecți <Link href="/termeni-si-conditii" className="font-medium text-[#67E8F9] hover:underline">Termenii și condițiile</Link>.</li>
                <li>Nu folosești conturi multiple și să nu încerci să manipulezi clasamentul.</li>
              </ul>
            </Section>

            <Section title="3. Urmărire Instagram — condiție pentru premii">
              <p>
                La turneele publice cu premii, ești eligibil pentru premii doar dacă urmărești pe
                Instagram, <strong className="text-white/85">înainte de startul etapei</strong>, atât
                contul Liga Prono, cât și conturile partenerilor oficiali.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  Liga Prono: <ExtLink href={INSTAGRAM_URL}>@liga.prono</ExtLink>
                </li>
                <li>
                  Parteneri actuali: <PartnerList />
                </li>
              </ul>
              <p>
                Lista partenerilor poate fi actualizată. Condiția se verifică la acordarea premiilor;
                urmărirea după startul etapei nu conferă eligibilitate pentru etapa respectivă.
              </p>
            </Section>

            <Section title="4. Pronosticuri">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  Pentru fiecare meci poți pronostica rezultatul la pauză, rezultatul final și scorul
                  exact (după 90 de minute).
                </li>
                <li>
                  Pronosticul se blochează automat în momentul fluierului de start al meciului.
                  După kick-off nu mai poate fi modificat.
                </li>
                <li>
                  Punctajul ține cont de cote: un pronostic corect pe un rezultat mai puțin probabil
                  valorează mai multe puncte.
                </li>
                <li>
                  Clasamentul turneului este dat de totalul punctelor acumulate pe meciurile din
                  perioada turneului.
                </li>
              </ul>
            </Section>

            <Section title="5. Premii">
              <p>
                Premiile (de exemplu tricouri sau alte produse ale partenerilor) sunt anunțate pe
                pagina turneului. Numărul de premii și conținutul lor pot varia de la un turneu la
                altul.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  Poți ordona premiile după preferință; la final, atribuirea se face în ordinea
                  clasamentului, ținând cont de preferințele rămase disponibile.
                </li>
                <li>
                  Câștigătorii trebuie să furnizeze date de contact și de livrare corecte, la cerere.
                </li>
                <li>
                  Ne rezervăm dreptul de a descalifica participanții care nu respectă acest
                  regulament, nu îndeplinesc condiția de urmărire Instagram sau încalcă termenii
                  platformei.
                </li>
              </ul>
            </Section>

            <Section title="6. Modificări">
              <p>
                Putem actualiza acest regulament. Data ultimei versiuni apare în partea de sus a
                paginii. Continuarea participării după actualizare înseamnă acceptarea noilor reguli.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                Întrebări despre concursuri și premii: <Mail />.
              </p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. Organizer and scope">
              <p>
                These rules apply to public tournaments on Liga Prono (www.ligaprono.ro), including
                those with prizes from Liga Prono or partners. Private (invite-only) tournaments are
                not prize contests unless the tournament host decides otherwise outside the platform.
              </p>
              <p>
                Entry is free. Liga Prono is not a betting operator: there are no money stakes and
                you cannot win cash through predictions.
              </p>
            </Section>

            <Section title="2. Eligibility">
              <p>To take part and receive prizes you must:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Be at least 18 and have a valid Liga Prono account.</li>
                <li>Be entered in the relevant public tournament.</li>
                <li>
                  Comply with the{" "}
                  <Link href="/termeni-si-conditii" className="font-medium text-[#67E8F9] hover:underline">
                    Terms and conditions
                  </Link>
                  .
                </li>
                <li>Not use multiple accounts or try to manipulate the leaderboard.</li>
              </ul>
            </Section>

            <Section title="3. Instagram follow — prize condition">
              <p>
                In public tournaments with prizes, you are eligible for prizes only if you follow on
                Instagram, <strong className="text-white/85">before the matchday starts</strong>, both
                the Liga Prono account and the official partner accounts.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  Liga Prono: <ExtLink href={INSTAGRAM_URL}>@liga.prono</ExtLink>
                </li>
                <li>
                  Current partners: <PartnerList />
                </li>
              </ul>
              <p>
                The partner list may change. The condition is checked when prizes are awarded;
                following after the matchday has started does not make you eligible for that round.
              </p>
            </Section>

            <Section title="4. Predictions">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  For each match you can predict half-time result, full-time result and exact score
                  (after 90 minutes).
                </li>
                <li>
                  Predictions lock automatically at kick-off. They cannot be changed afterwards.
                </li>
                <li>
                  Scoring uses odds: a correct pick on a less likely outcome is worth more points.
                </li>
                <li>
                  The tournament ranking is the total points earned on matches in the tournament
                  period.
                </li>
              </ul>
            </Section>

            <Section title="5. Prizes">
              <p>
                Prizes (for example shirts or other partner products) are listed on the tournament
                page. The number and contents of prizes may differ between tournaments.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  You can rank prizes by preference; at the end, awards follow the leaderboard,
                  using remaining preferred prizes where possible.
                </li>
                <li>Winners must provide valid contact and delivery details on request.</li>
                <li>
                  We may disqualify participants who break these rules, do not meet the Instagram
                  follow condition, or violate the platform terms.
                </li>
              </ul>
            </Section>

            <Section title="6. Changes">
              <p>
                We may update these rules. The latest version date is shown at the top of this page.
                Continuing to take part after an update means you accept the new rules.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                Questions about contests and prizes: <Mail />.
              </p>
            </Section>
          </>
        )}
      </div>
      <SiteFooter variant="public" />
    </main>
  );
}
