/* eslint-disable react/no-unescaped-entities -- pagină de conținut cu ghilimele/apostrofuri în text */
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Termeni și condiții");

const CONTACT_EMAIL = "support.ligaprono@gmail.com";
const LAST_UPDATED = "15 august 2026";
const LAST_UPDATED_EN = "15 August 2026";

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

export default async function TermsAndConditionsPage() {
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
            {ro ? "Termeni și condiții" : "Terms and Conditions"}
          </h1>
          <p className="text-xs text-white/40">
            {ro ? `Ultima actualizare: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED_EN}`}
          </p>
        </header>

        {ro ? (
          <>
            <Section title="1. Descrierea serviciului">
              <p>
                Liga Prono este o platformă gratuită de pronosticuri sportive disponibilă la{" "}
                <strong>www.ligaprono.ro</strong>. Serviciul permite utilizatorilor să facă predicții
                pentru meciuri de fotbal, să participe la turnee și să concureze în clasamente.
              </p>
              <p>
                Platforma este oferită „așa cum este" și nu implică pariuri reale sau tranzacții
                financiare. Punctajele și clasamentele sunt exclusiv în scop de divertisment.
              </p>
            </Section>

            <Section title="2. Crearea contului și eligibilitate">
              <p>
                Pentru a utiliza Liga Prono, trebuie să îți creezi un cont folosind o adresă de email
                validă sau autentificarea cu Google.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Trebuie să ai cel puțin 18 ani pentru a utiliza platforma.</li>
                <li>Ești responsabil pentru păstrarea confidențialității datelor de autentificare.</li>
                <li>Informațiile furnizate trebuie să fie corecte și actualizate.</li>
              </ul>
            </Section>

            <Section title="3. Reguli de utilizare">
              <p>Te angajezi să:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Folosești platforma în mod onest și sportiv.</li>
                <li>Nu creezi conturi multiple pentru a manipula clasamentele.</li>
                <li>Nu folosești software sau scripturi automate.</li>
                <li>Respecți ceilalți utilizatori și nu postezi conținut ofensator.</li>
                <li>Nu încerci să exploatezi vulnerabilități ale platformei.</li>
              </ul>
            </Section>

            <Section title="4. Comunicări prin email">
              <p>
                Prin acceptarea acestor termeni și bifarea opțiunii de abonare la newsletter, ești de
                acord să primești:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Emailuri tranzacționale</strong>: notificări despre turnee, rezultate și
                  activitatea contului tău (trimise indiferent de preferința de marketing).
                </li>
                <li>
                  <strong>Emailuri de marketing</strong>: noutăți, promoții și informații despre
                  funcționalități noi (doar dacă ai optat pentru abonare).
                </li>
              </ul>
              <p>
                Te poți dezabona de la emailurile de marketing oricând din setările profilului sau
                folosind link-ul de dezabonare din orice email.
              </p>
            </Section>

            <Section title="5. Premii și concursuri">
              <p>
                Turneele publice pot avea premii acordate de Liga Prono sau parteneri. Eligibilitatea
                pentru premii este condiționată de:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Respectarea regulamentului turneului.</li>
                <li>Furnizarea unor date de contact valide pentru livrare.</li>
                <li>Absența oricărei încălcări a acestor termeni.</li>
              </ul>
              <p>
                Ne rezervăm dreptul de a descalifica utilizatorii care încalcă regulile sau care
                manipulează rezultatele.
              </p>
            </Section>

            <Section title="6. Proprietate intelectuală">
              <p>
                Conținutul platformei (logo, design, texte, cod) este proprietatea Liga Prono și este
                protejat de legile privind drepturile de autor. Nu ai dreptul să copiezi, reproduci
                sau distribui acest conținut fără acordul nostru scris.
              </p>
            </Section>

            <Section title="7. Limitarea răspunderii">
              <p>
                Liga Prono nu garantează funcționarea neîntreruptă a platformei și nu este responsabilă
                pentru:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Pierderi cauzate de întreruperi ale serviciului.</li>
                <li>Erori în datele despre meciuri furnizate de terți.</li>
                <li>Decizii luate pe baza informațiilor de pe platformă.</li>
              </ul>
            </Section>

            <Section title="8. Suspendarea și închiderea contului">
              <p>
                Ne rezervăm dreptul de a suspenda sau închide contul tău în caz de încălcare a acestor
                termeni, fără notificare prealabilă. Poți solicita ștergerea contului oricând scriind
                la <Mail />.
              </p>
            </Section>

            <Section title="9. Modificări ale termenilor">
              <p>
                Putem actualiza acești termeni periodic. Vom afișa data ultimei actualizări în partea
                de sus a paginii și, pentru modificări semnificative, te vom notifica prin email.
                Continuarea utilizării platformei după modificări constituie acceptarea noilor termeni.
              </p>
            </Section>

            <Section title="10. Legea aplicabilă">
              <p>
                Acești termeni sunt guvernați de legislația din România. Orice litigiu va fi soluționat
                de instanțele competente din București.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>Pentru întrebări despre acești termeni, ne poți contacta la <Mail />.</p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. Service description">
              <p>
                Liga Prono is a free sports-prediction platform available at{" "}
                <strong>www.ligaprono.ro</strong>. The service allows users to make predictions for
                football matches, participate in tournaments and compete in rankings.
              </p>
              <p>
                The platform is provided "as is" and does not involve real betting or financial
                transactions. Scores and rankings are for entertainment purposes only.
              </p>
            </Section>

            <Section title="2. Account creation and eligibility">
              <p>
                To use Liga Prono, you must create an account using a valid email address or Google
                sign-in.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>You must be at least 18 years old to use the platform.</li>
                <li>You are responsible for keeping your login credentials confidential.</li>
                <li>Information provided must be accurate and up to date.</li>
              </ul>
            </Section>

            <Section title="3. Usage rules">
              <p>You agree to:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Use the platform honestly and fairly.</li>
                <li>Not create multiple accounts to manipulate rankings.</li>
                <li>Not use automated software or scripts.</li>
                <li>Respect other users and not post offensive content.</li>
                <li>Not attempt to exploit platform vulnerabilities.</li>
              </ul>
            </Section>

            <Section title="4. Email communications">
              <p>
                By accepting these terms and opting in to the newsletter, you agree to receive:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Transactional emails</strong>: notifications about tournaments, results and
                  your account activity (sent regardless of marketing preference).
                </li>
                <li>
                  <strong>Marketing emails</strong>: news, promotions and information about new
                  features (only if you opted in).
                </li>
              </ul>
              <p>
                You can unsubscribe from marketing emails anytime from your profile settings or using
                the unsubscribe link in any email.
              </p>
            </Section>

            <Section title="5. Prizes and contests">
              <p>
                Public tournaments may have prizes awarded by Liga Prono or partners. Eligibility for
                prizes is conditional on:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Compliance with tournament rules.</li>
                <li>Providing valid contact details for delivery.</li>
                <li>No violation of these terms.</li>
              </ul>
              <p>
                We reserve the right to disqualify users who break the rules or manipulate results.
              </p>
            </Section>

            <Section title="6. Intellectual property">
              <p>
                Platform content (logo, design, texts, code) is owned by Liga Prono and protected by
                copyright laws. You may not copy, reproduce or distribute this content without our
                written consent.
              </p>
            </Section>

            <Section title="7. Limitation of liability">
              <p>
                Liga Prono does not guarantee uninterrupted platform operation and is not responsible
                for:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Losses caused by service interruptions.</li>
                <li>Errors in match data provided by third parties.</li>
                <li>Decisions made based on platform information.</li>
              </ul>
            </Section>

            <Section title="8. Account suspension and closure">
              <p>
                We reserve the right to suspend or close your account in case of violation of these
                terms, without prior notice. You can request account deletion anytime by writing to{" "}
                <Mail />.
              </p>
            </Section>

            <Section title="9. Changes to terms">
              <p>
                We may update these terms periodically. We will display the last-updated date at the
                top of the page and, for significant changes, notify you by email. Continued use of
                the platform after changes constitutes acceptance of the new terms.
              </p>
            </Section>

            <Section title="10. Applicable law">
              <p>
                These terms are governed by Romanian law. Any dispute will be resolved by the
                competent courts in Bucharest.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>For questions about these terms, contact us at <Mail />.</p>
            </Section>
          </>
        )}
      </div>
      <SiteFooter variant="public" />
    </main>
  );
}
