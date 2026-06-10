import type { TriviaQuestion } from "@/lib/mini-games/types";

/**
 * Întrebări verificate din istoria Cupei Mondiale FIFA (până la CM 2022).
 * Surse: FIFA.com, Guinness World Records, Wikipedia (rezultate oficiale).
 */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // —— Câștigătoare ——
  {
    id: "wc_2022_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat Cupa Mondială din 2022?",
      en: "Who won the 2022 FIFA World Cup?",
    },
    options: {
      ro: ["Franța", "Argentina", "Croația", "Brazilia"],
      en: ["France", "Argentina", "Croatia", "Brazil"],
    },
    correctIndex: 1,
    story: {
      ro: "Argentina a câștigat CM 2022 în Qatar, după finala 3–3 cu Franța, decisă 4–2 la penalty-uri. A fost al treilea titlu mondial al Argentinei, după 1978 și 1986.",
      en: "Argentina won the 2022 World Cup in Qatar after a 3–3 final against France, decided 4–2 on penalties. It was Argentina's third world title, after 1978 and 1986.",
    },
  },
  {
    id: "wc_2018_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat Cupa Mondială din 2018?",
      en: "Who won the 2018 FIFA World Cup?",
    },
    options: {
      ro: ["Croația", "Franța", "Belgia", "Germania"],
      en: ["Croatia", "France", "Belgium", "Germany"],
    },
    correctIndex: 1,
    story: {
      ro: "Franța a câștigat CM 2018 în Rusia, învingând Croația cu 4–2 în finală pe stadionul Lujniki din Moscova. Kylian Mbappé a marcat în finală la 19 ani.",
      en: "France won the 2018 World Cup in Russia, beating Croatia 4–2 in the final at Moscow's Luzhniki Stadium. Kylian Mbappé scored in the final at age 19.",
    },
  },
  {
    id: "wc_2014_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 2014, găzduită în Brazilia?",
      en: "Who won the 2014 World Cup, hosted in Brazil?",
    },
    options: {
      ro: ["Brazilia", "Argentina", "Germania", "Olanda"],
      en: ["Brazil", "Argentina", "Germany", "Netherlands"],
    },
    correctIndex: 2,
    story: {
      ro: "Germania a câștigat CM 2014 cu 1–0 în finală cu Argentina, golul lui Mario Götze în minutul 113. Gazda Brazilia a pierdut în semifinală cu 7–1 în fața Germaniei.",
      en: "Germany won the 2014 World Cup 1–0 against Argentina, with Mario Götze's goal in the 113th minute. Hosts Brazil lost 7–1 to Germany in the semi-final.",
    },
  },
  {
    id: "wc_2010_winner",
    category: "winners",
    question: {
      ro: "Cine a ridicat trofeul la CM 2010 din Africa de Sud?",
      en: "Who lifted the trophy at the 2010 World Cup in South Africa?",
    },
    options: {
      ro: ["Olanda", "Germania", "Spania", "Uruguay"],
      en: ["Netherlands", "Germany", "Spain", "Uruguay"],
    },
    correctIndex: 2,
    story: {
      ro: "Spania a câștigat primul său titlu mondial în 2010, 1–0 cu Olanda în finală, gol Andrés Iniesta în minutul 116. A fost primul CM câștigat de o națiune europeană în afara Europei.",
      en: "Spain won their first World Cup in 2010, beating the Netherlands 1–0 in the final with Andrés Iniesta's goal in the 116th minute.",
    },
  },
  {
    id: "wc_2006_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 2006 din Germania?",
      en: "Who won the 2006 World Cup in Germany?",
    },
    options: {
      ro: ["Franța", "Italia", "Germania", "Portugalia"],
      en: ["France", "Italy", "Germany", "Portugal"],
    },
    correctIndex: 1,
    story: {
      ro: "Italia a câștigat CM 2006, 1–1 cu Franța în finală, decisă 5–3 la penalty-uri. Finala a rămas memorabilă și pentru eliminarea lui Zinedine Zidane în minutul 110.",
      en: "Italy won the 2006 World Cup, drawing 1–1 with France in the final and winning 5–3 on penalties. Zinedine Zidane was sent off in the 110th minute.",
    },
  },
  {
    id: "wc_2002_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 2002, organizată în Japonia și Coreea de Sud?",
      en: "Who won the 2002 World Cup, co-hosted by Japan and South Korea?",
    },
    options: {
      ro: ["Germania", "Brazilia", "Turcia", "Coreea de Sud"],
      en: ["Germany", "Brazil", "Turkey", "South Korea"],
    },
    correctIndex: 1,
    story: {
      ro: "Brazilia a câștigat al cincilea titlu mondial în 2002, 2–0 în finală cu Germania, ambele goluri marcate de Ronaldo. A fost ultimul CM cu 32 de echipe înainte de extinderea la 48 în 2026.",
      en: "Brazil won their fifth World Cup in 2002, beating Germany 2–0 in the final with both goals from Ronaldo.",
    },
  },
  {
    id: "wc_1998_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1998, găzduită de Franța?",
      en: "Who won the 1998 World Cup, hosted by France?",
    },
    options: {
      ro: ["Brazilia", "Franța", "Croația", "Italia"],
      en: ["Brazil", "France", "Croatia", "Italy"],
    },
    correctIndex: 1,
    story: {
      ro: "Franța a câștigat primul titlu mondial pe teren propriu, 3–0 cu Brazilia în finală. Zinedine Zidane a marcat două goluri cu capul în prima repriză.",
      en: "France won their first World Cup on home soil, beating Brazil 3–0 in the final. Zinedine Zidane scored two headers in the first half.",
    },
  },

  // —— Momente memorabile ——
  {
    id: "hand_of_god_year",
    category: "moments",
    question: {
      ro: "În ce an a marcat Diego Maradona golul „Mâna lui Dumnezeu” la CM?",
      en: "In which year did Diego Maradona score the 'Hand of God' goal at the World Cup?",
    },
    options: {
      ro: ["1982", "1986", "1990", "1994"],
      en: ["1982", "1986", "1990", "1994"],
    },
    correctIndex: 1,
    story: {
      ro: "La CM 1986, în sfertul cu Anglia de la Ciudad de México, Maradona a marcat cu mâna (min. 51), apoi a înscris „Golul secolului” (min. 55). Argentina a câștigat acel turneu.",
      en: "At the 1986 World Cup quarter-final against England in Mexico City, Maradona scored with his hand (51st min), then added the 'Goal of the Century' (55th min). Argentina won that tournament.",
    },
  },
  {
    id: "germany_brazil_2014",
    category: "moments",
    question: {
      ro: "Care a fost scorul semifinalei Germania – Brazilia de la CM 2014?",
      en: "What was the score in the 2014 Germany vs Brazil semi-final?",
    },
    options: {
      ro: ["4–0", "5–1", "7–1", "6–2"],
      en: ["4–0", "5–1", "7–1", "6–2"],
    },
    correctIndex: 2,
    story: {
      ro: "Germania a învins Brazilia gazdă cu 7–1 pe Mineirão (Belo Horizonte). Brazilia a jucat fără Neymar (accidentat) și căpitanul Thiago Silva (suspendat).",
      en: "Germany beat host Brazil 7–1 at the Mineirão (Belo Horizonte). Brazil were without Neymar (injured) and captain Thiago Silva (suspended).",
    },
  },
  {
    id: "zidane_headbutt_year",
    category: "moments",
    question: {
      ro: "În ce an a fost eliminat Zinedine Zidane în finala CM pentru un cap în pieptul lui Materazzi?",
      en: "In which year was Zinedine Zidane sent off in a World Cup final for a headbutt on Materazzi?",
    },
    options: {
      ro: ["1998", "2002", "2006", "2010"],
      en: ["1998", "2002", "2006", "2010"],
    },
    correctIndex: 2,
    story: {
      ro: "În finala CM 2006 de la Berlin, scorul era 1–1 când Zidane a lovit cu capul pe Marco Materazzi în minutul 110. Franța a pierdut la penalty-uri, 3–5.",
      en: "In the 2006 World Cup final in Berlin, with the score at 1–1, Zidane headbutted Marco Materazzi in the 110th minute. France lost on penalties, 3–5.",
    },
  },
  {
    id: "maracanazo_1950",
    category: "moments",
    question: {
      ro: "La CM 1950, cine a învins Brazilia în meciul decisiv de pe Maracanã?",
      en: "At the 1950 World Cup, who beat Brazil in the decisive match at the Maracanã?",
    },
    options: {
      ro: ["Uruguay", "Spania", "Suedia", "Anglia"],
      en: ["Uruguay", "Spain", "Sweden", "England"],
    },
    correctIndex: 0,
    story: {
      ro: "Uruguay a câștigat 2–1 pe Maracanã, în fața a circa 200.000 de spectatori. Alcides Ghiggia a marcat golul decisiv în minutul 79 — un șoc numit „Maracanaço”.",
      en: "Uruguay won 2–1 at the Maracanã before roughly 200,000 fans. Alcides Ghiggia scored the winner in the 79th minute — a shock known as the 'Maracanaço'.",
    },
  },
  {
    id: "hurst_1966_final",
    category: "moments",
    question: {
      ro: "Cine a marcat hat-trick în finala CM 1966?",
      en: "Who scored a hat-trick in the 1966 World Cup final?",
    },
    options: {
      ro: ["Pelé", "Geoff Hurst", "Franz Beckenbauer", "Eusébio"],
      en: ["Pelé", "Geoff Hurst", "Franz Beckenbauer", "Eusébio"],
    },
    correctIndex: 1,
    story: {
      ro: "Geoff Hurst a marcat trei goluri în finala Anglia – Germania de Vest (4–2 după prelungiri), singurul hat-trick într-o finală de CM timp de 56 de ani, până la Mbappé în 2022.",
      en: "Geoff Hurst scored three goals in England's 4–2 extra-time win over West Germany — the only World Cup final hat-trick for 56 years, until Mbappé in 2022.",
    },
  },
  {
    id: "first_wc_year",
    category: "moments",
    question: {
      ro: "În ce an a avut loc prima Cupă Mondială FIFA?",
      en: "In which year was the first FIFA World Cup held?",
    },
    options: {
      ro: ["1928", "1930", "1934", "1950"],
      en: ["1928", "1930", "1934", "1950"],
    },
    correctIndex: 1,
    story: {
      ro: "Prima CM a fost în 1930 în Uruguay, cu 13 echipe. Uruguay a câștigat finala cu 4–2 în fața Argentinei pe stadionul Centenario din Montevideo.",
      en: "The first World Cup was held in 1930 in Uruguay with 13 teams. Uruguay beat Argentina 4–2 in the final at the Centenario stadium in Montevideo.",
    },
  },

  // —— Fun facts ——
  {
    id: "most_wc_titles",
    category: "fun_facts",
    question: {
      ro: "Care națiune are cele mai multe titluri mondiale (până în 2022)?",
      en: "Which nation has won the most World Cups (through 2022)?",
    },
    options: {
      ro: ["Germania", "Italia", "Brazilia", "Argentina"],
      en: ["Germany", "Italy", "Brazil", "Argentina"],
    },
    correctIndex: 2,
    story: {
      ro: "Brazilia are 5 titluri (1958, 1962, 1970, 1994, 2002) și este singura națiune prezentă la toate edițiile CM disputate până acum.",
      en: "Brazil have won five World Cups (1958, 1962, 1970, 1994, 2002) and are the only nation to have played in every World Cup edition held so far.",
    },
  },
  {
    id: "wc_cancelled_years",
    category: "fun_facts",
    question: {
      ro: "Din cauza celui de-Al Doilea Război Mondial, CM nu s-a disputat în…",
      en: "Due to World War II, the World Cup was not held in…",
    },
    options: {
      ro: ["1938 și 1942", "1942 și 1946", "1946 și 1950", "1950 și 1954"],
      en: ["1938 and 1942", "1942 and 1946", "1946 and 1950", "1950 and 1954"],
    },
    correctIndex: 1,
    story: {
      ro: "Edițiile din 1942 (programată în Germania) și 1946 au fost anulate. Competiția a reluat în 1950 în Brazilia, câștigată de Uruguay.",
      en: "The 1942 (scheduled for Germany) and 1946 editions were cancelled. The competition resumed in 1950 in Brazil, won by Uruguay.",
    },
  },
  {
    id: "wc_2026_teams",
    category: "fun_facts",
    question: {
      ro: "Câte echipe naționale participă la CM 2026?",
      en: "How many national teams compete at the 2026 World Cup?",
    },
    options: {
      ro: ["32", "40", "48", "56"],
      en: ["32", "40", "48", "56"],
    },
    correctIndex: 2,
    story: {
      ro: "CM 2026 din SUA, Canada și Mexic va avea 48 de echipe — prima ediție extinsă de la formatul cu 32 (folosit din 1998 până în 2022).",
      en: "The 2026 World Cup in the USA, Canada and Mexico will feature 48 teams — the first expanded edition since the 32-team format used from 1998 to 2022.",
    },
  },
  {
    id: "golden_boot_2018",
    category: "fun_facts",
    question: {
      ro: "Cine a câștigat Gheata de Aur la CM 2018?",
      en: "Who won the Golden Boot at the 2018 World Cup?",
    },
    options: {
      ro: ["Kylian Mbappé", "Harry Kane", "Romelu Lukaku", "Cristiano Ronaldo"],
      en: ["Kylian Mbappé", "Harry Kane", "Romelu Lukaku", "Cristiano Ronaldo"],
    },
    correctIndex: 1,
    story: {
      ro: "Harry Kane a terminat turneul cu 6 goluri și a primit Gheata de Aur. Mbappé și Antoine Griezmann au avut câte 4 goluri fiecare.",
      en: "Harry Kane finished the tournament with six goals and won the Golden Boot. Mbappé and Antoine Griezmann each scored four.",
    },
  },
  {
    id: "qatar_2022_timing",
    category: "fun_facts",
    question: {
      ro: "CM 2022 din Qatar a fost prima ediție disputată…",
      en: "The 2022 World Cup in Qatar was the first edition held…",
    },
    options: {
      ro: [
        "În Asia",
        "În iarnă (nov.–dec.)",
        "Cu VAR la fiecare meci",
        "Cu 48 de echipe",
      ],
      en: [
        "In Asia",
        "In winter (Nov–Dec)",
        "With VAR at every match",
        "With 48 teams",
      ],
    },
    correctIndex: 1,
    story: {
      ro: "CM 2022 s-a jucat în noiembrie–decembrie din cauza căldurii din Qatar. A fost prima CM în afara lunilor obișnuite mai–iulie din emisfera nordică.",
      en: "The 2022 World Cup was played in November–December due to Qatar's heat. It was the first World Cup outside the usual May–July window in the northern hemisphere.",
    },
  },
  {
    id: "italy_wc_titles",
    category: "fun_facts",
    question: {
      ro: "Câte titluri mondiale are Italia (până în 2022)?",
      en: "How many World Cups has Italy won (through 2022)?",
    },
    options: {
      ro: ["2", "3", "4", "5"],
      en: ["2", "3", "4", "5"],
    },
    correctIndex: 2,
    story: {
      ro: "Italia are 4 titluri mondiale: 1934, 1938, 1982 și 2006. După Brazilia (5) și la egalitate cu Germania (4).",
      en: "Italy have won four World Cups: 1934, 1938, 1982 and 2006. They trail Brazil (5) and are level with Germany (4).",
    },
  },
  {
    id: "wc_32_teams_era",
    category: "fun_facts",
    question: {
      ro: "De la ce ediție CM au participat 32 de echipe (până la schimbarea din 2026)?",
      en: "From which World Cup edition did 32 teams take part (until the 2026 expansion)?",
    },
    options: {
      ro: ["1990", "1994", "1998", "2002"],
      en: ["1990", "1994", "1998", "2002"],
    },
    correctIndex: 2,
    story: {
      ro: "Formatul cu 32 de echipe a debutat la CM 1998 din Franța și a rămas neschimbat până la CM 2022 din Qatar.",
      en: "The 32-team format debuted at the 1998 World Cup in France and remained unchanged through the 2022 World Cup in Qatar.",
    },
  },

  // —— Recorduri ——
  {
    id: "most_goals_wc_career",
    category: "records",
    question: {
      ro: "Cine deține recordul de goluri la CM pe parcursul carierei?",
      en: "Who holds the record for most goals at World Cups across a career?",
    },
    options: {
      ro: ["Ronaldo Nazário", "Miroslav Klose", "Pelé", "Gerd Müller"],
      en: ["Ronaldo Nazário", "Miroslav Klose", "Pelé", "Gerd Müller"],
    },
    correctIndex: 1,
    story: {
      ro: "Miroslav Klose a marcat 16 goluri la CM (2002–2014), depășind recordul de 15 al lui Ronaldo Nazário, stabilit la aceeași ediție 2002.",
      en: "Miroslav Klose scored 16 World Cup goals (2002–2014), breaking Ronaldo Nazário's record of 15, set at the same 2002 tournament.",
    },
  },
  {
    id: "fontaine_single_tournament",
    category: "records",
    question: {
      ro: "Cine deține recordul de goluri într-un singur turneu de CM?",
      en: "Who holds the record for most goals in a single World Cup tournament?",
    },
    options: {
      ro: ["Just Fontaine", "Gerd Müller", "Ronaldo Nazário", "Miroslav Klose"],
      en: ["Just Fontaine", "Gerd Müller", "Ronaldo Nazário", "Miroslav Klose"],
    },
    correctIndex: 0,
    story: {
      ro: "Just Fontaine (Franța) a marcat 13 goluri la CM 1958 în Suedia — record neegalat. Franța a terminat pe locul 3 în acel turneu.",
      en: "Just Fontaine (France) scored 13 goals at the 1958 World Cup in Sweden — an unbeaten record. France finished third that year.",
    },
  },
  {
    id: "youngest_wc_winner",
    category: "records",
    question: {
      ro: "Cine este cel mai tânăr jucător care a câștigat o Cupă Mondială?",
      en: "Who is the youngest player to have won a FIFA World Cup?",
    },
    options: {
      ro: ["Kylian Mbappé", "Pelé", "Michael Owen", "Ronaldinho"],
      en: ["Kylian Mbappé", "Pelé", "Michael Owen", "Ronaldinho"],
    },
    correctIndex: 1,
    story: {
      ro: "Pelé avea 17 ani și 249 de zile când Brazilia a câștigat CM 1958 în Suedia. A marcat de două ori în semifinala cu Franța și o dată în finala cu Suedia.",
      en: "Pelé was 17 years and 249 days old when Brazil won the 1958 World Cup in Sweden. He scored twice against France in the semi-final and once in the final against Sweden.",
    },
  },
  {
    id: "host_winners_count",
    category: "records",
    question: {
      ro: "Câte națiuni au câștigat CM pe teren propriu (până în 2022)?",
      en: "How many nations have won the World Cup on home soil (through 2022)?",
    },
    options: {
      ro: ["4", "6", "8", "10"],
      en: ["4", "6", "8", "10"],
    },
    correctIndex: 1,
    story: {
      ro: "Șase gazde au câștigat titlul acasă: Uruguay (1930), Italia (1934), Anglia (1966), Germania de Vest (1974), Argentina (1978) și Franța (1998). Brazilia și Spania au fost gazde, dar nu au câștigat pe teren propriu.",
      en: "Six hosts have won on home soil: Uruguay (1930), Italy (1934), England (1966), West Germany (1974), Argentina (1978) and France (1998). Brazil and Spain have hosted but never won at home.",
    },
  },
  {
    id: "fastest_wc_hat_trick",
    category: "records",
    question: {
      ro: "Cine a marcat cel mai rapid hat-trick din istoria CM?",
      en: "Who scored the fastest hat-trick in World Cup history?",
    },
    options: {
      ro: ["Geoff Hurst", "László Kiss", "Miroslav Klose", "Erling Haaland"],
      en: ["Geoff Hurst", "László Kiss", "Miroslav Klose", "Erling Haaland"],
    },
    correctIndex: 1,
    story: {
      ro: "László Kiss (Ungaria) a marcat 3 goluri în 7 minute la CM 1982, într-un 10–1 cu El Salvador. Este și singurul rezervă cu hat-trick la un CM (Guinness World Records / FIFA).",
      en: "László Kiss (Hungary) scored three goals in seven minutes at the 1982 World Cup in a 10–1 win over El Salvador. He is also the only substitute to score a World Cup hat-trick (Guinness World Records / FIFA).",
    },
  },
  {
    id: "hungary_biggest_win",
    category: "records",
    question: {
      ro: "Care este cea mai clară victorie din istoria CM?",
      en: "What is the biggest winning margin in World Cup history?",
    },
    options: {
      ro: ["Germania 7–1 Brazilia (2014)", "Ungaria 10–1 El Salvador (1982)", "Suedia 8–0 Cuba (1938)", "Iugoslavia 9–0 Zair (1974)"],
      en: ["Germany 7–1 Brazil (2014)", "Hungary 10–1 El Salvador (1982)", "Sweden 8–0 Cuba (1938)", "Yugoslavia 9–0 Zaire (1974)"],
    },
    correctIndex: 1,
    story: {
      ro: "Ungaria a învins El Salvador cu 10–1 la CM 1982 — diferență de 9 goluri, record absolut. Același meci a inclus hat-trick-ul record de 7 minute al lui László Kiss.",
      en: "Hungary beat El Salvador 10–1 at the 1982 World Cup — a nine-goal margin that remains the record. The same match included László Kiss's seven-minute hat-trick.",
    },
  },
  {
    id: "pele_three_titles",
    category: "records",
    question: {
      ro: "Câte Cupe Mondiale a câștigat Pelé ca jucător?",
      en: "How many World Cups did Pelé win as a player?",
    },
    options: {
      ro: ["2", "3", "4", "5"],
      en: ["2", "3", "4", "5"],
    },
    correctIndex: 1,
    story: {
      ro: "Pelé a câștigat CM în 1958, 1962 și 1970 — singurul jucător cu trei titluri mondiale. După al treilea titlu al Braziliei (1970), trofeul Jules Rimet a rămas definitiv la brazilieni.",
      en: "Pelé won the World Cup in 1958, 1962 and 1970 — the only player with three world titles. After Brazil's third win (1970), the Jules Rimet trophy was kept permanently by Brazil.",
    },
  },

  {
    id: "wc_1994_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1994 din SUA?",
      en: "Who won the 1994 World Cup in the USA?",
    },
    options: {
      ro: ["Italia", "Brazilia", "Suedia", "Bulgaria"],
      en: ["Italy", "Brazil", "Sweden", "Bulgaria"],
    },
    correctIndex: 1,
    story: {
      ro: "Brazilia a câștigat CM 1994, 0–0 cu Italia în finală, decisă 3–2 la penalty-uri pe Rose Bowl. A fost al patrulea titlu mondial al Braziliei.",
      en: "Brazil won the 1994 World Cup, drawing 0–0 with Italy in the final and winning 3–2 on penalties at the Rose Bowl. It was Brazil's fourth world title.",
    },
  },
  {
    id: "wc_1990_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1990 din Italia?",
      en: "Who won the 1990 World Cup in Italy?",
    },
    options: {
      ro: ["Argentina", "Germania de Vest", "Italia", "Anglia"],
      en: ["Argentina", "West Germany", "Italy", "England"],
    },
    correctIndex: 1,
    story: {
      ro: "Germania de Vest a câștigat CM 1990, 1–0 cu Argentina în finală, gol Brehme din penalty în minutul 85. A fost ultimul titlu al Germaniei de Vest înainte de reunificare.",
      en: "West Germany won the 1990 World Cup, beating Argentina 1–0 in the final with Brehme's 85th-minute penalty. It was West Germany's last title before reunification.",
    },
  },
  {
    id: "wc_1986_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1986 din Mexic?",
      en: "Who won the 1986 World Cup in Mexico?",
    },
    options: {
      ro: ["Germania de Vest", "Argentina", "Franța", "Brazilia"],
      en: ["West Germany", "Argentina", "France", "Brazil"],
    },
    correctIndex: 1,
    story: {
      ro: "Argentina a câștigat CM 1986, 3–2 cu Germania de Vest în finală de pe Azteca. Diego Maradona a fost starul turneului, cu „Mâna lui Dumnezeu” și „Golul secolului” împotriva Angliei.",
      en: "Argentina won the 1986 World Cup, beating West Germany 3–2 in the final at the Azteca. Diego Maradona was the star, with the 'Hand of God' and 'Goal of the Century' against England.",
    },
  },
  {
    id: "wc_1982_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1982 din Spania?",
      en: "Who won the 1982 World Cup in Spain?",
    },
    options: {
      ro: ["Germania de Vest", "Italia", "Brazilia", "Franța"],
      en: ["West Germany", "Italy", "Brazil", "France"],
    },
    correctIndex: 1,
    story: {
      ro: "Italia a câștigat CM 1982, 3–1 cu Germania de Vest în finală. Paolo Rossi a fost golgheterul turneului (6 goluri), după un hat-trick memorabil cu Brazilia în optimi.",
      en: "Italy won the 1982 World Cup, beating West Germany 3–1 in the final. Paolo Rossi was the tournament's top scorer (six goals), after a memorable hat-trick against Brazil in the second round.",
    },
  },
  {
    id: "wc_1978_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1978 din Argentina?",
      en: "Who won the 1978 World Cup in Argentina?",
    },
    options: {
      ro: ["Olanda", "Argentina", "Brazilia", "Italia"],
      en: ["Netherlands", "Argentina", "Brazil", "Italy"],
    },
    correctIndex: 1,
    story: {
      ro: "Argentina a câștigat primul titlu mondial acasă, 3–1 după prelungiri cu Olanda. Mario Kempes a marcat de două ori în finală și a fost golgheterul turneului.",
      en: "Argentina won their first World Cup at home, beating the Netherlands 3–1 after extra time. Mario Kempes scored twice in the final and was the tournament's top scorer.",
    },
  },
  {
    id: "wc_1970_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1970 din Mexic?",
      en: "Who won the 1970 World Cup in Mexico?",
    },
    options: {
      ro: ["Italia", "Brazilia", "Germania de Vest", "Uruguay"],
      en: ["Italy", "Brazil", "West Germany", "Uruguay"],
    },
    correctIndex: 1,
    story: {
      ro: "Brazilia a câștigat CM 1970 cu 4–1 în finală cu Italia, considerată una dintre cele mai bune echipe din istorie. Pelé a ridicat trofeul Jules Rimet pentru a treia oară.",
      en: "Brazil won the 1970 World Cup 4–1 against Italy, with a team widely regarded as one of the greatest ever. Pelé lifted the Jules Rimet trophy for the third time.",
    },
  },
  {
    id: "golden_boot_2022",
    category: "fun_facts",
    question: {
      ro: "Cine a câștigat Gheata de Aur la CM 2022?",
      en: "Who won the Golden Boot at the 2022 World Cup?",
    },
    options: {
      ro: ["Lionel Messi", "Kylian Mbappé", "Olivier Giroud", "Harry Kane"],
      en: ["Lionel Messi", "Kylian Mbappé", "Olivier Giroud", "Harry Kane"],
    },
    correctIndex: 1,
    story: {
      ro: "Kylian Mbappé a terminat CM 2022 cu 8 goluri, inclusiv un hat-trick în finală cu Argentina. Messi a câștigat Balonul de Aur al turneului, nu Gheata de Aur.",
      en: "Kylian Mbappé finished the 2022 World Cup with eight goals, including a hat-trick in the final against Argentina. Messi won the Golden Ball, not the Golden Boot.",
    },
  },
  {
    id: "mbappe_2022_final_hattrick",
    category: "moments",
    question: {
      ro: "Cine a marcat hat-trick în finala CM 2022?",
      en: "Who scored a hat-trick in the 2022 World Cup final?",
    },
    options: {
      ro: ["Lionel Messi", "Kylian Mbappé", "Ángel Di María", "Olivier Giroud"],
      en: ["Lionel Messi", "Kylian Mbappé", "Ángel Di María", "Olivier Giroud"],
    },
    correctIndex: 1,
    story: {
      ro: "Mbappé a marcat 3 goluri în finala din 2022 — al doilea hat-trick din istoria finalelor CM, după Geoff Hurst în 1966. Argentina a câștigat totuși la penalty-uri.",
      en: "Mbappé scored three goals in the 2022 final — the second hat-trick in a World Cup final after Geoff Hurst in 1966. Argentina still won on penalties.",
    },
  },
  {
    id: "croatia_2018_final",
    category: "moments",
    question: {
      ro: "CM 2018 a fost prima finală de Cupă Mondială pentru…",
      en: "The 2018 World Cup was the first World Cup final for…",
    },
    options: {
      ro: ["Belgia", "Croația", "Suedia", "Danemarca"],
      en: ["Belgium", "Croatia", "Sweden", "Denmark"],
    },
    correctIndex: 1,
    story: {
      ro: "Croația a ajuns în prima finală de CM în 2018, după 3 meciuri consecutive câștigate la prelungiri sau penalty-uri. A pierdut 4–2 cu Franța, dar Luka Modrić a câștigat Balonul de Aur.",
      en: "Croatia reached their first World Cup final in 2018, after winning three straight knockout games in extra time or penalties. They lost 4–2 to France, but Luka Modrić won the Golden Ball.",
    },
  },
  {
    id: "first_wc_africa",
    category: "fun_facts",
    question: {
      ro: "Prima Cupă Mondială disputată în Africa a fost în…",
      en: "The first World Cup held in Africa was in…",
    },
    options: {
      ro: ["2006", "2010", "2014", "2022"],
      en: ["2006", "2010", "2014", "2022"],
    },
    correctIndex: 1,
    story: {
      ro: "CM 2010 din Africa de Sud a fost prima ediție pe continentul african. Spania a câștigat titlul, iar vuvuzelas au devenit simbolul sonor al turneului.",
      en: "The 2010 World Cup in South Africa was the first edition on the African continent. Spain won the title, and vuvuzelas became the tournament's sonic symbol.",
    },
  },
  {
    id: "first_wc_asia",
    category: "fun_facts",
    question: {
      ro: "Prima Cupă Mondială co-organizată în Asia a fost în…",
      en: "The first World Cup co-hosted in Asia was in…",
    },
    options: {
      ro: ["1994", "2002", "2018", "2022"],
      en: ["1994", "2002", "2018", "2022"],
    },
    correctIndex: 1,
    story: {
      ro: "CM 2002 a fost prima organizată în Asia, de Japonia și Coreea de Sud. Brazilia a câștigat al cincilea titlu, iar Coreea de Sud a surprins ajungând în semifinale.",
      en: "The 2002 World Cup was the first held in Asia, co-hosted by Japan and South Korea. Brazil won their fifth title, and South Korea reached the semi-finals in a major upset.",
    },
  },
  {
    id: "germany_wc_titles",
    category: "fun_facts",
    question: {
      ro: "Câte titluri mondiale are Germania (inclusiv Germania de Vest, până în 2022)?",
      en: "How many World Cups has Germany won (including West Germany, through 2022)?",
    },
    options: {
      ro: ["3", "4", "5", "6"],
      en: ["3", "4", "5", "6"],
    },
    correctIndex: 1,
    story: {
      ro: "Germania are 4 titluri: 1954 (Germania de Vest), 1974 (Germania de Vest), 1990 (Germania de Vest) și 2014 (Germania reunificată).",
      en: "Germany have won four World Cups: 1954 (West Germany), 1974 (West Germany), 1990 (West Germany) and 2014 (unified Germany).",
    },
  },
  {
    id: "argentina_titles_after_2022",
    category: "fun_facts",
    question: {
      ro: "Câte titluri mondiale are Argentina după CM 2022?",
      en: "How many World Cups has Argentina won after the 2022 tournament?",
    },
    options: {
      ro: ["2", "3", "4", "5"],
      en: ["2", "3", "4", "5"],
    },
    correctIndex: 1,
    story: {
      ro: "Argentina are 3 titluri mondiale: 1978, 1986 și 2022. A treia victorie a venit la 36 de ani după ultimul titlu al lui Maradona.",
      en: "Argentina have won three World Cups: 1978, 1986 and 2022. The third title came 36 years after Maradona's last triumph.",
    },
  },
  {
    id: "uruguay_wc_titles",
    category: "fun_facts",
    question: {
      ro: "Câte Cupe Mondiale a câștigat Uruguay?",
      en: "How many World Cups has Uruguay won?",
    },
    options: {
      ro: ["1", "2", "3", "4"],
      en: ["1", "2", "3", "4"],
    },
    correctIndex: 1,
    story: {
      ro: "Uruguay are 2 titluri: 1930 (prima ediție, pe teren propriu) și 1950 (Maracanaço în Brazilia). Este una dintre cele mai mici națiuni campioane mondiale.",
      en: "Uruguay have won two World Cups: 1930 (the inaugural edition, at home) and 1950 (the Maracanaço in Brazil). They remain one of the smallest nations to win the trophy.",
    },
  },
  {
    id: "europe_win_americas",
    category: "records",
    question: {
      ro: "Care este singura națiune europeană care a câștigat CM în Americas (până în 2022)?",
      en: "Which is the only European nation to have won a World Cup in the Americas (through 2022)?",
    },
    options: {
      ro: ["Spania", "Italia", "Germania", "Franța"],
      en: ["Spain", "Italy", "Germany", "France"],
    },
    correctIndex: 2,
    story: {
      ro: "Germania a câștigat CM 2014 în Brazilia — singurul titlu european câștigat pe continentul american. Spania a câștigat în Africa (2010), Franța în Asia (2022) și Europa.",
      en: "Germany won the 2014 World Cup in Brazil — the only European title won in the Americas. Spain won in Africa (2010), France in Asia (2022), and several in Europe.",
    },
  },
  {
    id: "brazil_never_home_title",
    category: "records",
    question: {
      ro: "De câte ori a câștigat Brazilia CM pe teren propriu?",
      en: "How many times has Brazil won the World Cup on home soil?",
    },
    options: {
      ro: ["0", "1", "2", "3"],
      en: ["0", "1", "2", "3"],
    },
    correctIndex: 0,
    story: {
      ro: "Brazilia a fost gazdă în 1950 și 2014, dar nu a câștigat niciuna dintre ediții acasă. În 1950 a pierdut finala decisivă cu Uruguay (Maracanaço); în 2014 a ieșit în semifinale după 7–1 cu Germania.",
      en: "Brazil hosted in 1950 and 2014 but never won on home soil. In 1950 they lost the decisive match to Uruguay (Maracanaço); in 2014 they exited in the semi-finals after the 7–1 defeat to Germany.",
    },
  },
  {
    id: "kahn_2002_golden_ball",
    category: "records",
    question: {
      ro: "Cine a câștigat Balonul de Aur la CM 2002?",
      en: "Who won the Golden Ball at the 2002 World Cup?",
    },
    options: {
      ro: ["Ronaldo Nazário", "Oliver Kahn", "Ronaldinho", "Rivaldo"],
      en: ["Ronaldo Nazário", "Oliver Kahn", "Ronaldinho", "Rivaldo"],
    },
    correctIndex: 1,
    story: {
      ro: "Oliver Kahn (Germania) a câștigat Balonul de Aur în 2002 — singurul portar desemnat cel mai bun jucător al unui CM. Germania a pierdut finala 0–2 cu Brazilia.",
      en: "Oliver Kahn (Germany) won the 2002 Golden Ball — the only goalkeeper named best player of a World Cup. Germany lost the final 2–0 to Brazil.",
    },
  },
  {
    id: "var_first_wc",
    category: "fun_facts",
    question: {
      ro: "VAR a fost folosit la Cupa Mondială pentru prima dată la…",
      en: "VAR was used at the World Cup for the first time at…",
    },
    options: {
      ro: ["CM 2014", "CM 2018", "CM 2022", "CM 2006"],
      en: ["2014 World Cup", "2018 World Cup", "2022 World Cup", "2006 World Cup"],
    },
    correctIndex: 1,
    story: {
      ro: "VAR (Video Assistant Referee) a debutat la CM 2018 din Rusia. A fost folosit pentru penalty-uri, ofsaid și verificări de roșu, schimbând modul în care se arbitrează turneele mari.",
      en: "VAR (Video Assistant Referee) made its World Cup debut at Russia 2018. It was used for penalties, offside and red-card reviews, changing how major tournaments are officiated.",
    },
  },
  {
    id: "wc_1954_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1954 din Elveția?",
      en: "Who won the 1954 World Cup in Switzerland?",
    },
    options: {
      ro: ["Ungaria", "Germania de Vest", "Austria", "Uruguay"],
      en: ["Hungary", "West Germany", "Austria", "Uruguay"],
    },
    correctIndex: 1,
    story: {
      ro: "Germania de Vest a câștigat CM 1954, 3–2 cu Ungaria în finală — „Miracolul de la Berna”. Ungaria venise cu 32 de meciuri consecutive fără înfrângere.",
      en: "West Germany won the 1954 World Cup, beating Hungary 3–2 in the final — the 'Miracle of Bern'. Hungary had arrived on a 32-match unbeaten run.",
    },
  },
  {
    id: "wc_1962_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1962 din Chile?",
      en: "Who won the 1962 World Cup in Chile?",
    },
    options: {
      ro: ["Chile", "Brazilia", "Cehoslovacia", "Iugoslavia"],
      en: ["Chile", "Brazil", "Czechoslovakia", "Yugoslavia"],
    },
    correctIndex: 1,
    story: {
      ro: "Brazilia a câștigat CM 1962, 3–1 cu Cehoslovacia în finală. Pelé s-a accidentat în grupă, iar Garrincha a preluat conducerea echipei.",
      en: "Brazil won the 1962 World Cup, beating Czechoslovakia 3–1 in the final. Pelé was injured in the group stage, and Garrincha stepped up to lead the team.",
    },
  },
  {
    id: "wc_1938_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1938 din Franța?",
      en: "Who won the 1938 World Cup in France?",
    },
    options: {
      ro: ["Franța", "Italia", "Brazilia", "Ungaria"],
      en: ["France", "Italy", "Brazil", "Hungary"],
    },
    correctIndex: 1,
    story: {
      ro: "Italia a apărat titlul câștigat în 1934, învingând Ungaria cu 4–2 în finală. A fost ultimul CM înainte de întreruperea din 1942–1946 din cauza războiului.",
      en: "Italy defended the title they won in 1934, beating Hungary 4–2 in the final. It was the last World Cup before the 1942–1946 hiatus due to war.",
    },
  },
  {
    id: "wc_1934_winner",
    category: "winners",
    question: {
      ro: "Cine a câștigat CM 1934 din Italia?",
      en: "Who won the 1934 World Cup in Italy?",
    },
    options: {
      ro: ["Italia", "Cehoslovacia", "Germania", "Austria"],
      en: ["Italy", "Czechoslovakia", "Germany", "Austria"],
    },
    correctIndex: 0,
    story: {
      ro: "Italia a câștigat CM 1934 acasă, 2–1 după prelungiri cu Cehoslovacia în finală. A fost a doua ediție CM și prima cu fază eliminatorie directă (fără grupe).",
      en: "Italy won the 1934 World Cup at home, beating Czechoslovakia 2–1 after extra time in the final. It was the second World Cup and the first with a straight knockout format (no groups).",
    },
  },
  {
    id: "england_only_wc_year",
    category: "winners",
    question: {
      ro: "În ce an a câștigat Anglia singura sa Cupă Mondială?",
      en: "In which year did England win their only World Cup?",
    },
    options: {
      ro: ["1962", "1966", "1970", "1982"],
      en: ["1962", "1966", "1970", "1982"],
    },
    correctIndex: 1,
    story: {
      ro: "Anglia a câștigat CM 1966 pe Wembley, 4–2 după prelungiri cu Germania de Vest. Geoff Hurst a marcat hat-trick în finală — singurul până la Mbappé în 2022.",
      en: "England won the 1966 World Cup at Wembley, beating West Germany 4–2 after extra time. Geoff Hurst scored a hat-trick in the final — the only one until Mbappé in 2022.",
    },
  },
];
