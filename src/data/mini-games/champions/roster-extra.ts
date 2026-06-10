import { champ } from "./helpers";

/**
 * Jucători suplimentari din loturile câștigătoare — extind pool-ul pentru bingo și campion.
 */
export const CHAMPION_ROSTER_EXTRA = [
  // —— 2022 Argentina ——
  champ("romero", "Cristian Romero", "AR", "DEF", [2022], "Cristian_Romero_2022.jpg", {
    ro: "Fundaș central titular în apărarea Argentinei din 2022.",
    en: "Starting centre-back in Argentina's 2022 defence.",
  }),
  champ("tagliafico", "Nicolás Tagliafico", "AR", "DEF", [2022], "Nicolás_Tagliafico_2018.jpg", {
    ro: "Fundas stânga în lotul campion din Qatar.",
    en: "Left-back in the Qatar champion squad.",
  }),
  champ("acuna", "Marcos Acuña", "AR", "DEF", [2022], "Marcos_Acuña_2018.jpg", {
    ro: "Fundas stânga versatil la CM 2022.",
    en: "Versatile left-back at the 2022 World Cup.",
  }),

  // —— 2018 France ——
  champ("matuidi", "Blaise Matuidi", "FR", "MID", [2018], "Blaise_Matuidi_2018.jpg", {
    ro: "Mijlocașul energic al Franței la CM 2018.",
    en: "France's energetic midfielder at the 2018 World Cup.",
  }),
  champ("dembele", "Ousmane Dembélé", "FR", "FWD", [2018], "Ousmane_Dembélé_2018.jpg", {
    ro: "Extremă rapidă în lotul campion din Rusia.",
    en: "Pacy winger in the Russia champion squad.",
  }),
  champ("kimpembe", "Presnel Kimpembe", "FR", "DEF", [2018], "Presnel_Kimpembe_2018.jpg", {
    ro: "Fundaș central în rotația defensivei franceze.",
    en: "Centre-back in France's defensive rotation.",
  }),
  champ("thuram_lilian", "Lilian Thuram", "FR", "DEF", [1998], "Lilian_Thuram_1998.jpg", {
    ro: "A marcat ambele goluri în semifinala cu Croația (1998).",
    en: "Scored both goals in the semi-final against Croatia (1998).",
  }),
  champ("blanc", "Laurent Blanc", "FR", "DEF", [1998], "Laurent_Blanc_1998.jpg", {
    ro: "Fundaș central în apărarea Franței campioane.",
    en: "Centre-back in champion France's defence.",
  }),

  // —— 2014 Germany ——
  champ("howedes", "Benedikt Höwedes", "DE", "DEF", [2014], "Benedikt_Höwedes_2014.jpg", {
    ro: "Fundas dreapta titular la CM 2014.",
    en: "Starting right-back at the 2014 World Cup.",
  }),
  champ("mustafi", "Shkodran Mustafi", "DE", "DEF", [2014], "Shkodran_Mustafi_2014.jpg", {
    ro: "Fundaș tânăr în lotul campion din Brazilia.",
    en: "Young defender in the Brazil champion squad.",
  }),
  champ("schurrle", "André Schürrle", "DE", "FWD", [2014], "André_Schürrle_2014.jpg", {
    ro: "A dat pasa de gol lui Götze în finala din 2014.",
    en: "Assisted Götze's winning goal in the 2014 final.",
  }),

  // —— 2010 Spain ——
  champ("fabregas", "Cesc Fàbregas", "ES", "MID", [2010], "Cesc_Fàbregas_2010.jpg", {
    ro: "A intrat din bancă și a dat pasa decisivă lui Iniesta în finală.",
    en: "Came off the bench to assist Iniesta's winner in the final.",
  }),
  champ("silva_david", "David Silva", "ES", "MID", [2010], "David_Silva_2010.jpg", {
    ro: "Mijlocaș creativ în campania Spaniei din 2010.",
    en: "Creative midfielder in Spain's 2010 campaign.",
  }),
  champ("capdevila", "Joan Capdevila", "ES", "DEF", [2010], "Joan_Capdevila_2010.jpg", {
    ro: "Fundas stânga titular în finala cu Olanda.",
    en: "Starting left-back in the final against the Netherlands.",
  }),
  champ("puyol", "Carles Puyol", "ES", "DEF", [2010], "Carles_Puyol_2010.jpg", {
    ro: "Liderul defensivei Spaniei în drumul spre primul titlu mondial.",
    en: "Defensive leader for Spain on the road to their first world title.",
  }),

  // —— 2006 Italy ——
  champ("materazzi", "Marco Materazzi", "IT", "DEF", [2006], "Marco_Materazzi_2006.jpg", {
    ro: "A marcat egalarea în finala cu Franța (1–1).",
    en: "Scored the equaliser in the final against France (1–1).",
  }),
  champ("camoranesi", "Mauro Camoranesi", "IT", "MID", [2006], "Mauro_Camoranesi_2006.jpg", {
    ro: "Extremă dreapta în echipa campioană din Germania.",
    en: "Right winger in the champion team in Germany.",
  }),
  champ("barzagli", "Andrea Barzagli", "IT", "DEF", [2006], "Andrea_Barzagli_2006.jpg", {
    ro: "Fundaș central în lotul Italiei campioane.",
    en: "Centre-back in Italy's champion squad.",
  }),
  champ("peruzzi", "Angelo Peruzzi", "IT", "GK", [2006], "Angelo_Peruzzi_2006.jpg", {
    ro: "Portar de rezervă al Italiei la CM 2006.",
    en: "Italy's backup goalkeeper at the 2006 World Cup.",
  }),

  // —— 2002 Brazil ——
  champ("juninho_paulista", "Juninho Paulista", "BR", "MID", [2002], "Juninho_Paulista_2002.jpg", {
    ro: "Mijlocaș ofensiv în echipa Braziliei din 2002.",
    en: "Attacking midfielder in Brazil's 2002 team.",
  }),
  champ("edmilson", "Edmílson", "BR", "DEF", [2002], "Edmílson_2002.jpg", {
    ro: "Fundaș central în apărarea Braziliei campioane.",
    en: "Centre-back in champion Brazil's defence.",
  }),
  champ("denilson", "Denílson", "BR", "MID", [2002], "Denílson_2002.jpg", {
    ro: "Extremă driblingar în lotul din 2002.",
    en: "Dribbling winger in the 2002 squad.",
  }),

  // —— 1994 Brazil ——
  champ("mazinho", "Mazinho", "BR", "MID", [1994], "Mazinho_1994.jpg", {
    ro: "Mijlocaș ofensiv în echipa Braziliei din SUA '94.",
    en: "Attacking midfielder in Brazil's 1994 USA team.",
  }),
  champ("jorginho", "Jorginho", "BR", "DEF", [1994], "Jorginho_1994.jpg", {
    ro: "Fundas dreapta titular la CM 1994.",
    en: "Starting right-back at the 1994 World Cup.",
  }),
  champ("aldo", "Aldo", "BR", "DEF", [1994], "Aldo_Bobadilla_1994.jpg", {
    ro: "Fundaș în lotul Braziliei campioane din 1994.",
    en: "Defender in Brazil's 1994 champion squad.",
  }),

  // —— 1990 Germany ——
  champ("voller", "Rudi Völler", "DE", "FWD", [1990], "Rudi_Völler_1990.jpg", {
    ro: "Atacant prolific în finala cu Argentina.",
    en: "Prolific striker in the final against Argentina.",
  }),
  champ("hassler", "Thomas Häßler", "DE", "MID", [1990], "Thomas_Häßler_1990.jpg", {
    ro: "Mijlocaș creativ al Germaniei de Vest în 1990.",
    en: "Creative midfielder for West Germany in 1990.",
  }),
  champ("reuter", "Stefan Reuter", "DE", "DEF", [1990], "Stefan_Reuter_1990.jpg", {
    ro: "Fundas dreapta în echipa campioană din Italia '90.",
    en: "Right-back in the 1990 champion team.",
  }),

  // —— 1986 Argentina ——
  champ("brown", "José Luis Brown", "AR", "DEF", [1986], "José_Luis_Brown_1986.jpg", {
    ro: "A marcat primul gol al Argentinei în finala din 1986.",
    en: "Scored Argentina's opening goal in the 1986 final.",
  }),
  champ("batista", "Sergio Batista", "AR", "MID", [1986], "Sergio_Batista_1986.jpg", {
    ro: "Mijlocaș defensiv în echipa lui Maradona.",
    en: "Defensive midfielder in Maradona's team.",
  }),

  // —— 1982 Italy ——
  champ("antognoni", "Giancarlo Antognoni", "IT", "MID", [1982], "Giancarlo_Antognoni_1982.jpg", {
    ro: "Mijlocaș elegant în campania Italiei din 1982.",
    en: "Elegant midfielder in Italy's 1982 campaign.",
  }),
  champ("conti", "Bruno Conti", "IT", "MID", [1982], "Bruno_Conti_1982.jpg", {
    ro: "Extremă rapidă în echipa campioană din Spania '82.",
    en: "Pacy winger in the 1982 champion team.",
  }),

  // —— 1974 West Germany ——
  champ("vogts", "Hans-Georg Vogts", "DE", "DEF", [1974], "Hans-Georg_Vogts_1974.jpg", {
    ro: "Marcatorul legendar al lui Johan Cruyff în finală.",
    en: "Legendary marker of Johan Cruyff in the final.",
  }),
  champ("overath", "Wolfgang Overath", "DE", "MID", [1974], "Wolfgang_Overath_1974.jpg", {
    ro: "Mijlocaș veteran al Germaniei de Vest în 1974.",
    en: "Veteran midfielder for West Germany in 1974.",
  }),

  // —— 1970 Brazil ——
  champ("felix", "Félix", "BR", "GK", [1970], "Félix_(footballer)_1970.jpg", {
    ro: "Portarul titular al Braziliei la CM 1970.",
    en: "Starting goalkeeper for Brazil at the 1970 World Cup.",
  }),
  champ("everaldo", "Everaldo", "BR", "DEF", [1970], "Everaldo_1970.jpg", {
    ro: "Fundas dreapta în echipa considerată cea mai bună din istorie.",
    en: "Right-back in the team considered the greatest ever.",
  }),
  champ("brito", "Brito", "BR", "DEF", [1970], "Brito_(footballer)_1970.jpg", {
    ro: "Fundaș central în apărarea Braziliei din 1970.",
    en: "Centre-back in Brazil's 1970 defence.",
  }),

  // —— 1966 England ——
  champ("cohen", "George Cohen", "EN", "DEF", [1966], "George_Cohen_1966.jpg", {
    ro: "Fundas dreapta în echipa Angliei campioane.",
    en: "Right-back in champion England's team.",
  }),
  champ("stiles", "Nobby Stiles", "EN", "MID", [1966], "Nobby_Stiles_1966.jpg", {
    ro: "Mijlocaș defensiv, marcatorul lui Eusébio în semifinală.",
    en: "Defensive midfielder who marked Eusébio in the semi-final.",
  }),
  champ("hunt", "Roger Hunt", "EN", "FWD", [1966], "Roger_Hunt_1966.jpg", {
    ro: "Atacant prolific al Angliei la CM 1966.",
    en: "Prolific striker for England at the 1966 World Cup.",
  }),

  // —— 1958 Brazil ——
  champ("zagallo", "Mário Zagallo", "BR", "FWD", [1958, 1962], "Mário_Zagallo_1958.jpg", {
    ro: "Primul om cu 4 titluri mondiale (2 ca jucător, 2 ca antrenor).",
    en: "First person with four world titles (two as player, two as coach).",
  }),
  champ("bellini", "Hilderaldo Bellini", "BR", "DEF", [1958], "Hilderaldo_Bellini_1958.jpg", {
    ro: "Căpitanul Braziliei la primul titlu mondial din 1958.",
    en: "Brazil captain at their first world title in 1958.",
  }),
  champ("gilmar", "Gilmar", "BR", "GK", [1958, 1962], "Gilmar_1958.jpg", {
    ro: "Portarul Braziliei la titlurile din 1958 și 1962.",
    en: "Brazil's goalkeeper at the 1958 and 1962 titles.",
  }),

  // —— 1954 West Germany ——
  champ("rahn", "Helmut Rahn", "DE", "FWD", [1954], "Helmut_Rahn_1954.jpg", {
    ro: "A marcat golul victoriei în finala cu Ungaria (3–2).",
    en: "Scored the winning goal in the final against Hungary (3–2).",
  }),

  // —— 1930 Uruguay ——
  champ("scarone", "Héctor Scarone", "UY", "FWD", [1930], "Héctor_Scarone.jpg", {
    ro: "Legenda Uruguayului la prima Cupă Mondială.",
    en: "Uruguay legend at the first World Cup.",
  }),
];
