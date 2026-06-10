import { champ } from "./helpers";

/**
 * Campioni mondiali din loturile câștigătoare (1930–2022).
 * Imagini: Wikimedia Commons (Special:FilePath).
 */
export const CHAMPION_ROSTER = [
  // —— 2022 Argentina ——
  champ("messi", "Lionel Messi", "AR", "FWD", [2022], "Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg", {
    ro: "A câștigat primul său CM în 2022, marcând de două ori în finala cu Franța.",
    en: "Won his first World Cup in 2022, scoring twice in the final against France.",
  }),
  champ("di_maria", "Ángel Di María", "AR", "MID", [2022], "Ángel_Di_María_2018.jpg", {
    ro: "A marcat golul de 2–0 în finala din 2022 cu Franța.",
    en: "Scored Argentina's second goal in the 2022 final against France.",
  }),
  champ("martinez_emi", "Emiliano Martínez", "AR", "GK", [2022], "Emiliano_Martínez_2022.jpg", {
    ro: "Eroul penalty-urilor în semifinala cu Olanda și în finala cu Franța.",
    en: "Penalty shoot-out hero against the Netherlands and France.",
  }),
  champ("alvarez", "Julián Álvarez", "AR", "FWD", [2022], "Julián_Álvarez_2022.jpg", {
    ro: "A marcat 4 goluri la CM 2022, inclusiv în semifinala cu Croația.",
    en: "Scored four goals at the 2022 World Cup, including in the semi-final against Croatia.",
  }),
  champ("mac_allister", "Alexis Mac Allister", "AR", "MID", [2022], "Alexis_Mac_Allister_2023.jpg", {
    ro: "Mijlocaș-cheie al Argentinei în drumul spre titlul din Qatar.",
    en: "Key midfielder for Argentina on the road to the Qatar title.",
  }),
  champ("fernandez", "Enzo Fernández", "AR", "MID", [2022], "Enzo_Fernández_2022.jpg", {
    ro: "A câștigat titlul la 21 de ani și a devenit o piesă centrală la Chelsea.",
    en: "Won the title at 21 and became a central figure at Chelsea.",
  }),
  champ("otamendi", "Nicolás Otamendi", "AR", "DEF", [2022], "Nicolás_Otamendi_2018.jpg", {
    ro: "Fundaș veteran al defensivei argentiniene la CM 2022.",
    en: "Veteran centre-back in Argentina's 2022 defence.",
  }),
  champ("de_paul", "Rodrigo De Paul", "AR", "MID", [2022], "Rodrigo_De_Paul_2018.jpg", {
    ro: "Motorul mijlocului Argentinei în campania din 2022.",
    en: "The engine of Argentina's midfield in the 2022 campaign.",
  }),
  champ("molina", "Nahuel Molina", "AR", "DEF", [2022], "Nahuel_Molina_2022.jpg", {
    ro: "Fundas dreapta titular în finala câștigătoare din 2022.",
    en: "Starting right-back in the 2022 winning final.",
  }),
  champ("dybala", "Paulo Dybala", "AR", "FWD", [2022], "Paulo_Dybala_2018.jpg", {
    ro: "A transformat penalty-ul decisiv în shootout-ul din finală.",
    en: "Converted a decisive penalty in the final shoot-out.",
  }),

  // —— 2018 France ——
  champ("mbappe", "Kylian Mbappé", "FR", "FWD", [2018], "Kylian_Mbappé,_2018-07-15_001_(cropped).jpg", {
    ro: "A marcat în finala din 2018 și a făcut hat-trick în finala pierdută din 2022.",
    en: "Scored in the 2018 final and bagged a hat-trick in the 2022 final defeat.",
  }),
  champ("griezmann", "Antoine Griezmann", "FR", "FWD", [2018], "Antoine_Griezmann_2018.jpg", {
    ro: "Cel mai bun pasator al Franței la CM 2018.",
    en: "France's top assist provider at the 2018 World Cup.",
  }),
  champ("lloris", "Hugo Lloris", "FR", "GK", [2018], "Hugo_Lloris_2018.jpg", {
    ro: "Căpitanul Franței care a ridicat trofeul la Moscova.",
    en: "France captain who lifted the trophy in Moscow.",
  }),
  champ("pogba", "Paul Pogba", "FR", "MID", [2018], "Paul_Pogba_2018.jpg", {
    ro: "A marcat în finala de 4–2 cu Croația.",
    en: "Scored in the 4–2 final win over Croatia.",
  }),
  champ("kante", "N'Golo Kanté", "FR", "MID", [2018], "N'Golo_Kanté_2018.jpg", {
    ro: "A dominat recuperările în mijlocul terenului pentru Franța.",
    en: "Dominated midfield recoveries for France.",
  }),
  champ("varane", "Raphaël Varane", "FR", "DEF", [2018], "Raphaël_Varane_2018.jpg", {
    ro: "Fundaș central titular în apărarea campioanei mondiale.",
    en: "Starting centre-back in the world champions' defence.",
  }),
  champ("giroud", "Olivier Giroud", "FR", "FWD", [2018], "Olivier_Giroud_2018.jpg", {
    ro: "Atacantul referință al Franței la CM 2018.",
    en: "France's reference striker at the 2018 World Cup.",
  }),
  champ("umtiti", "Samuel Umtiti", "FR", "DEF", [2018], "Samuel_Umtiti_2018.jpg", {
    ro: "A marcat singurul gol în semifinala cu Belgia.",
    en: "Scored the only goal in the semi-final against Belgium.",
  }),
  champ("pavard", "Benjamin Pavard", "FR", "DEF", [2018], "Benjamin_Pavard_2018.jpg", {
    ro: "Autorul golului spectacular cu foarfeca în optimi.",
    en: "Scored the spectacular scissors-kick goal in the round of 16.",
  }),
  champ("hernandez", "Lucas Hernández", "FR", "DEF", [2018], "Lucas_Hernández_2018.jpg", {
    ro: "Fundas stânga în echipa campioană din 2018.",
    en: "Left-back in the 2018 champion squad.",
  }),

  // —— 2014 Germany ——
  champ("gotze", "Mario Götze", "DE", "MID", [2014], "Mario_Götze,_2014-07-13_001.jpg", {
    ro: "A marcat golul victoriei în prelungirile finalei cu Argentina.",
    en: "Scored the winning goal in extra time against Argentina.",
  }),
  champ("neuer", "Manuel Neuer", "DE", "GK", [2014], "Manuel_Neuer,_2014-07-13_001.jpg", {
    ro: "Portar-sweeper revoluționar la CM 2014.",
    en: "Revolutionary sweeper-keeper at the 2014 World Cup.",
  }),
  champ("muller", "Thomas Müller", "DE", "FWD", [2014], "Thomas_Müller_2014.jpg", {
    ro: "A câștigat titlul mondial pe teren brazilian în 2014.",
    en: "Won the world title on Brazilian soil in 2014.",
  }),
  champ("klose", "Miroslav Klose", "DE", "FWD", [2014], "Miroslav_Klose_2014.jpg", {
    ro: "Golgheterul all-time al CM-urilor (16 goluri); campion în 2014.",
    en: "All-time World Cup top scorer (16 goals); champion in 2014.",
  }),
  champ("lahm", "Philipp Lahm", "DE", "DEF", [2014], "Philipp_Lahm_2014.jpg", {
    ro: "Căpitanul Germaniei la triumful din 2014.",
    en: "Germany captain at the 2014 triumph.",
  }),
  champ("schweinsteiger", "Bastian Schweinsteiger", "DE", "MID", [2014], "Bastian_Schweinsteiger_2014.jpg", {
    ro: "Liderul experienței în mijlocul terenului german.",
    en: "Experienced leader in Germany's midfield.",
  }),
  champ("kroos", "Toni Kroos", "DE", "MID", [2014], "Toni_Kroos_2014.jpg", {
    ro: "A dominat posesia în drumul spre titlul mondial.",
    en: "Dominated possession on the road to the world title.",
  }),
  champ("hummels", "Mats Hummels", "DE", "DEF", [2014], "Mats_Hummels_2014.jpg", {
    ro: "Fundaș central în apărarea campioanei mondiale.",
    en: "Centre-back in the world champions' defence.",
  }),
  champ("boateng", "Jérôme Boateng", "DE", "DEF", [2014], "Jérôme_Boateng_2014.jpg", {
    ro: "Titular în centrul apărării Germaniei la CM 2014.",
    en: "Starter at the heart of Germany's 2014 defence.",
  }),
  champ("ozil", "Mesut Özil", "DE", "MID", [2014], "Mesut_Özil_2014.jpg", {
    ro: "Mijlocaș ofensiv cheie în campania Germaniei din 2014.",
    en: "Key attacking midfielder in Germany's 2014 campaign.",
  }),

  // —— 2010 Spain ——
  champ("iniesta", "Andrés Iniesta", "ES", "MID", [2010], "Andrés_Iniesta_2010.jpg", {
    ro: "Golul victoriei în minutul 116 al finalei cu Olanda.",
    en: "Scored the winner in the 116th minute against the Netherlands.",
  }),
  champ("casillas", "Iker Casillas", "ES", "GK", [2010], "Iker_Casillas_2010.jpg", {
    ro: "Căpitanul Spaniei la primul titlu mondial al țării.",
    en: "Spain captain at the country's first world title.",
  }),
  champ("xavi", "Xavi Hernández", "ES", "MID", [2010], "Xavi_2010.jpg", {
    ro: "Orchestratorul tiki-taka la CM 2010.",
    en: "Orchestrator of tiki-taka at the 2010 World Cup.",
  }),
  champ("pique", "Gerard Piqué", "ES", "DEF", [2010], "Gerard_Piqué_2010.jpg", {
    ro: "Stâlpul defensivei Spaniei în Africa de Sud.",
    en: "Pillar of Spain's defence in South Africa.",
  }),
  champ("villa", "David Villa", "ES", "FWD", [2010], "David_Villa_2010.jpg", {
    ro: "Golgheterul Spaniei la CM 2010 (5 goluri).",
    en: "Spain's top scorer at the 2010 World Cup (five goals).",
  }),
  champ("torres", "Fernando Torres", "ES", "FWD", [2010], "Fernando_Torres_2010.jpg", {
    ro: "A intrat din bancă în finala CM 2010; Iniesta a decis meciul.",
    en: "Came off the bench in the 2010 final; Iniesta decided the match.",
  }),
  champ("ramos", "Sergio Ramos", "ES", "DEF", [2010], "Sergio_Ramos_2010.jpg", {
    ro: "Fundaș versatil în lotul campion mondial.",
    en: "Versatile defender in the world champion squad.",
  }),
  champ("busquets", "Sergio Busquets", "ES", "MID", [2010], "Sergio_Busquets_2010.jpg", {
    ro: "Pivotal defensiv al Spaniei la CM 2010.",
    en: "Spain's defensive pivot at the 2010 World Cup.",
  }),
  champ("alonso", "Xabi Alonso", "ES", "MID", [2010], "Xabi_Alonso_2010.jpg", {
    ro: "Mijlocașul care a controlat ritmul Spaniei.",
    en: "Midfielder who controlled Spain's tempo.",
  }),
  champ("pedro", "Pedro Rodríguez", "ES", "FWD", [2010], "Pedro_Rodríguez_2010.jpg", {
    ro: "Extremă rapidă în lotul Spaniei campioane.",
    en: "Pacy winger in Spain's champion squad.",
  }),

  // —— 2006 Italy ——
  champ("buffon", "Gianluigi Buffon", "IT", "GK", [2006], "Gianluigi_Buffon_2006.jpg", {
    ro: "Căpitanul Italiei la CM 2006 câștigat la penalty-uri.",
    en: "Italy captain at the 2006 penalty shoot-out triumph.",
  }),
  champ("cannavaro", "Fabio Cannavaro", "IT", "DEF", [2006], "Fabio_Cannavaro_2006.jpg", {
    ro: "Balonul de Aur 2006 după un turneu impecabil.",
    en: "2006 Ballon d'Or after an impeccable tournament.",
  }),
  champ("pirlo", "Andrea Pirlo", "IT", "MID", [2006], "Andrea_Pirlo_2006.jpg", {
    ro: "A transformat penalty decisiv în finala cu Franța.",
    en: "Converted a decisive penalty in the final against France.",
  }),
  champ("toni", "Luca Toni", "IT", "FWD", [2006], "Luca_Toni_2006.jpg", {
    ro: "Golgheterul Italiei la CM 2006.",
    en: "Italy's top scorer at the 2006 World Cup.",
  }),
  champ("grosso", "Fabio Grosso", "IT", "DEF", [2006], "Fabio_Grosso_2006.jpg", {
    ro: "A marcat penalty-ul decisiv în finala cu Franța.",
    en: "Scored the decisive penalty in the final against France.",
  }),
  champ("del_piero", "Alessandro Del Piero", "IT", "FWD", [2006], "Alessandro_Del_Piero_2006.jpg", {
    ro: "Veteranul care a adus experiență în atacul Italiei.",
    en: "Veteran who brought experience to Italy's attack.",
  }),
  champ("totti", "Francesco Totti", "IT", "FWD", [2006], "Francesco_Totti_2006.jpg", {
    ro: "Mijlocaș ofensiv legendar în lotul campion.",
    en: "Legendary playmaker in the champion squad.",
  }),
  champ("gattuso", "Gennaro Gattuso", "IT", "MID", [2006], "Gennaro_Gattuso_2006.jpg", {
    ro: "Mijlocaș defensiv feroce la CM 2006.",
    en: "Ferocious defensive midfielder at the 2006 World Cup.",
  }),
  champ("nesta", "Alessandro Nesta", "IT", "DEF", [2006], "Alessandro_Nesta_2006.jpg", {
    ro: "Fundaș elegant în apărarea Italiei.",
    en: "Elegant defender in Italy's back line.",
  }),
  champ("zambrotta", "Gianluca Zambrotta", "IT", "DEF", [2006], "Gianluca_Zambrotta_2006.jpg", {
    ro: "Fundas polivalent pe flancuri la CM 2006.",
    en: "Versatile full-back at the 2006 World Cup.",
  }),

  // —— 2002 Brazil ——
  champ("ronaldo_nazario", "Ronaldo Nazário", "BR", "FWD", [1994, 2002], "Ronaldo_2002.jpg", {
    ro: "2 goluri în finala din 2002; golgheterul turneului.",
    en: "Two goals in the 2002 final; tournament top scorer.",
  }),
  champ("ronaldinho", "Ronaldinho", "BR", "MID", [2002], "Ronaldinho_2002.jpg", {
    ro: "Golul cu lob peste Seaman în optimi cu Anglia.",
    en: "Scored the lob over Seaman against England in the round of 16.",
  }),
  champ("rivaldo", "Rivaldo", "BR", "MID", [2002], "Rivaldo_2002.jpg", {
    ro: "Parte din trio-ul BBC al Braziliei.",
    en: "Part of Brazil's BBC attacking trio.",
  }),
  champ("cafu", "Cafu", "BR", "DEF", [1994, 2002], "Cafu_2002.jpg", {
    ro: "Căpitanul Braziliei la CM 2002; 3 finale consecutive.",
    en: "Brazil captain at the 2002 World Cup; three consecutive finals.",
  }),
  champ("roberto_carlos", "Roberto Carlos", "BR", "DEF", [2002], "Roberto_Carlos_2002.jpg", {
    ro: "Fundas stânga cu șutul legendar la CM 2002.",
    en: "Left-back famous for his thunderous strike at the 2002 World Cup.",
  }),
  champ("lucio", "Lúcio", "BR", "DEF", [2002], "Lúcio_2002.jpg", {
    ro: "Fundaș central titular în apărarea Braziliei.",
    en: "Starting centre-back in Brazil's defence.",
  }),
  champ("marcos", "Marcos", "BR", "GK", [2002], "Marcos_2002.jpg", {
    ro: "Portarul titular al Braziliei campioane.",
    en: "Starting goalkeeper for champion Brazil.",
  }),
  champ("kleberson", "Kléberson", "BR", "MID", [2002], "Kléberson_2002.jpg", {
    ro: "Mijlocaș tânăr în echipa câștigătoare din 2002.",
    en: "Young midfielder in the 2002 winning team.",
  }),
  champ("gilberto_silva", "Gilberto Silva", "BR", "MID", [2002], "Gilberto_Silva_2002.jpg", {
    ro: "„The Invisible Wall” — ancora mijlocului Braziliei.",
    en: "'The Invisible Wall' — anchor of Brazil's midfield.",
  }),

  // —— 1998 France ——
  champ("zidane", "Zinedine Zidane", "FR", "MID", [1998], "Zinedine_Zidane_1998.jpg", {
    ro: "Două goluri cu capul în finala 3–0 cu Brazilia.",
    en: "Two headers in the 3–0 final win over Brazil.",
  }),
  champ("henry", "Thierry Henry", "FR", "FWD", [1998], "Thierry_Henry_1998.jpg", {
    ro: "Tânăr atacant în primul titlu mondial al Franței.",
    en: "Young striker in France's first world title.",
  }),
  champ("deschamps", "Didier Deschamps", "FR", "MID", [1998], "Didier_Deschamps_1998.jpg", {
    ro: "Căpitanul Franței la CM 1998.",
    en: "France captain at the 1998 World Cup.",
  }),
  champ("barthez", "Fabien Barthez", "FR", "GK", [1998], "Fabien_Barthez_1998.jpg", {
    ro: "Portarul cu coafura distinctivă al Franței campioane.",
    en: "Distinctive goalkeeper of champion France.",
  }),
  champ("desailly", "Marcel Desailly", "FR", "DEF", [1998], "Marcel_Desailly_1998.jpg", {
    ro: "Fundaș central dominant în apărarea Franței.",
    en: "Dominant centre-back in France's defence.",
  }),
  champ("petit", "Emmanuel Petit", "FR", "MID", [1998], "Emmanuel_Petit_1998.jpg", {
    ro: "A marcat ultimul gol în finala cu Brazilia (3–0).",
    en: "Scored the last goal in the 3–0 final against Brazil.",
  }),
  champ("trezeguet", "David Trezeguet", "FR", "FWD", [1998], "David_Trezeguet_1998.jpg", {
    ro: "Atacant prolific în lotul Franței din 1998.",
    en: "Prolific striker in France's 1998 squad.",
  }),
  champ("lizarazu", "Bixente Lizarazu", "FR", "DEF", [1998], "Bixente_Lizarazu_1998.jpg", {
    ro: "Fundas stânga ofensiv la CM 1998.",
    en: "Attacking left-back at the 1998 World Cup.",
  }),

  // —— 1994 Brazil ——
  champ("romario", "Romário", "BR", "FWD", [1994], "Romário_1994.jpg", {
    ro: "Golgheterul Braziliei la CM 1994 (5 goluri).",
    en: "Brazil's top scorer at the 1994 World Cup (five goals).",
  }),
  champ("bebeto", "Bebeto", "BR", "FWD", [1994], "Bebeto_1994.jpg", {
    ro: "Partenerul lui Romário în atacul Braziliei.",
    en: "Romário's strike partner in Brazil's attack.",
  }),
  champ("dunga", "Dunga", "BR", "MID", [1994], "Dunga_1994.jpg", {
    ro: "Căpitanul Braziliei la titlul din SUA '94.",
    en: "Brazil captain at the 1994 USA triumph.",
  }),
  champ("taffarel", "Cláudio Taffarel", "BR", "GK", [1994], "Cláudio_Taffarel_1994.jpg", {
    ro: "Portarul care a apărat penalty-urile din finală.",
    en: "Goalkeeper who saved penalties in the final shoot-out.",
  }),
  champ("branco", "Branco", "BR", "DEF", [1994], "Branco_1994.jpg", {
    ro: "A transformat penalty-ul decisiv în finala cu Italia.",
    en: "Converted the decisive penalty in the final against Italy.",
  }),
  champ("mauro_silva", "Mauro Silva", "BR", "MID", [1994], "Mauro_Silva_1994.jpg", {
    ro: "Mijlocaș defensiv în echipa campioană din 1994.",
    en: "Defensive midfielder in the 1994 champion team.",
  }),

  // —— 1990 West Germany ——
  champ("matthaus", "Lothar Matthäus", "DE", "MID", [1990], "Lothar_Matthäus_1990.jpg", {
    ro: "Căpitanul Germaniei de Vest la CM 1990.",
    en: "West Germany captain at the 1990 World Cup.",
  }),
  champ("klinsmann", "Jürgen Klinsmann", "DE", "FWD", [1990], "Jürgen_Klinsmann_1990.jpg", {
    ro: "Atacantul german din finala cu Argentina.",
    en: "German striker in the final against Argentina.",
  }),
  champ("brehme", "Andreas Brehme", "DE", "DEF", [1990], "Andreas_Brehme_1990.jpg", {
    ro: "A transformat penalty-ul victoriei în finală (85').",
    en: "Converted the winning penalty in the final (85th minute).",
  }),
  champ("kohler", "Jürgen Kohler", "DE", "DEF", [1990], "Jürgen_Kohler_1990.jpg", {
    ro: "Fundaș central în apărarea campioanei.",
    en: "Centre-back in the champions' defence.",
  }),
  champ("illgner", "Bodo Illgner", "DE", "GK", [1990], "Bodo_Illgner_1990.jpg", {
    ro: "Portarul titular al Germaniei de Vest în 1990.",
    en: "West Germany's starting goalkeeper in 1990.",
  }),

  // —— 1986 Argentina ——
  champ("maradona", "Diego Maradona", "AR", "MID", [1986], "Diego_Maradona_1986.jpg", {
    ro: "Eroul CM 1986 — „Mâna lui Dumnezeu” și „Golul secolului”.",
    en: "1986 hero — the 'Hand of God' and 'Goal of the Century'.",
  }),
  champ("valdano", "Jorge Valdano", "AR", "FWD", [1986], "Jorge_Valdano_1986.jpg", {
    ro: "Atacant în echipa lui Maradona din 1986.",
    en: "Striker in Maradona's 1986 team.",
  }),
  champ("ruggeri", "Oscar Ruggeri", "AR", "DEF", [1986], "Oscar_Ruggeri_1986.jpg", {
    ro: "Fundaș central în apărarea Argentinei.",
    en: "Centre-back in Argentina's defence.",
  }),
  champ("pumpido", "Nery Pumpido", "AR", "GK", [1986], "Nery_Pumpido_1986.jpg", {
    ro: "Portarul titular al Argentinei campioane.",
    en: "Starting goalkeeper for champion Argentina.",
  }),
  champ("burruchaga", "Jorge Burruchaga", "AR", "MID", [1986], "Jorge_Burruchaga_1986.jpg", {
    ro: "A marcat golul victoriei în finala cu Germania de Vest.",
    en: "Scored the winning goal in the final against West Germany.",
  }),

  // —— 1982 Italy ——
  champ("rossi", "Paolo Rossi", "IT", "FWD", [1982], "Paolo_Rossi_1982.jpg", {
    ro: "Hat-trick cu Brazilia; golgheterul CM 1982.",
    en: "Hat-trick against Brazil; 1982 World Cup top scorer.",
  }),
  champ("tardelli", "Marco Tardelli", "IT", "MID", [1982], "Marco_Tardelli_1982.jpg", {
    ro: "Celebrarea sa după golul din finală e iconică.",
    en: "His celebration after scoring in the final is iconic.",
  }),
  champ("zoff", "Dino Zoff", "IT", "GK", [1982], "Dino_Zoff_1982.jpg", {
    ro: "La 40 de ani, cel mai în vârstă câștigător de CM ca jucător.",
    en: "At 40, the oldest World Cup winner as a player.",
  }),
  champ("scirea", "Gaetano Scirea", "IT", "DEF", [1982], "Gaetano_Scirea_1982.jpg", {
    ro: "Căpitanul Italiei la CM 1982.",
    en: "Italy captain at the 1982 World Cup.",
  }),
  champ("cabrini", "Antonio Cabrini", "IT", "DEF", [1982], "Antonio_Cabrini_1982.jpg", {
    ro: "Fundas stânga în echipa campioană din Spania '82.",
    en: "Left-back in the 1982 champion team.",
  }),

  // —— 1978 Argentina ——
  champ("kempes", "Mario Kempes", "AR", "FWD", [1978], "Mario_Kempes_1978.jpg", {
    ro: "Golgheterul și eroul finalei pe teren propriu.",
    en: "Top scorer and hero of the home final.",
  }),
  champ("passarella", "Daniel Passarella", "AR", "DEF", [1978], "Daniel_Passarella_1978.jpg", {
    ro: "Căpitanul Argentinei la primul titlu mondial.",
    en: "Argentina captain at their first world title.",
  }),
  champ("fillol", "Ubaldo Fillol", "AR", "GK", [1978], "Ubaldo_Fillol_1978.jpg", {
    ro: "Portarul Argentinei la CM 1978.",
    en: "Argentina's goalkeeper at the 1978 World Cup.",
  }),
  champ("ardiles", "Osvaldo Ardiles", "AR", "MID", [1978], "Osvaldo_Ardiles_1978.jpg", {
    ro: "Mijlocaș creativ în echipa campioană din 1978.",
    en: "Creative midfielder in the 1978 champion team.",
  }),

  // —— 1974 West Germany ——
  champ("beckenbauer", "Franz Beckenbauer", "DE", "DEF", [1974], "Franz_Beckenbauer_1974.jpg", {
    ro: "„Kaiser” — campion ca jucător (1974) și antrenor (1990).",
    en: "'Kaiser' — won as player (1974) and coach (1990).",
  }),
  champ("maier", "Sepp Maier", "DE", "GK", [1974], "Sepp_Maier_1974.jpg", {
    ro: "Portarul legendar al Germaniei de Vest.",
    en: "West Germany's legendary goalkeeper.",
  }),
  champ("breitner", "Paul Breitner", "DE", "MID", [1974], "Paul_Breitner_1974.jpg", {
    ro: "A marcat din penalty în finala cu Olanda.",
    en: "Scored from the penalty spot in the final against the Netherlands.",
  }),
  champ("muller_gerd", "Gerd Müller", "DE", "FWD", [1974], "Gerd_Müller_1974.jpg", {
    ro: "Golgheter legendar; campion mondial în 1974.",
    en: "Legendary goalscorer; world champion in 1974.",
  }),

  // —— 1970 Brazil ——
  champ("pele", "Pelé", "BR", "FWD", [1958, 1962, 1970], "Pelé_1970.jpg", {
    ro: "Singurul jucător cu 3 titluri mondiale.",
    en: "The only player with three World Cup titles.",
  }),
  champ("jairzinho", "Jairzinho", "BR", "FWD", [1970], "Jairzinho_1970.jpg", {
    ro: "A marcat în fiecare meci al Braziliei la CM 1970.",
    en: "Scored in every match of Brazil's 1970 World Cup.",
  }),
  champ("carlos_alberto", "Carlos Alberto", "BR", "DEF", [1970], "Carlos_Alberto_1970.jpg", {
    ro: "Căpitanul Braziliei; autorul golului iconic din finală.",
    en: "Brazil captain; scored the iconic goal in the final.",
  }),
  champ("tostao", "Tostão", "BR", "FWD", [1970], "Tostão_1970.jpg", {
    ro: "Atacant inteligent în echipa Braziliei din 1970.",
    en: "Intelligent forward in Brazil's 1970 team.",
  }),
  champ("rivellino", "Rivelino", "BR", "MID", [1970], "Rivelino_1970.jpg", {
    ro: "Mijlocaș cu șutul caracteristic la CM 1970.",
    en: "Midfielder with a trademark shot at the 1970 World Cup.",
  }),

  // —— 1966 England ——
  champ("hurst", "Geoff Hurst", "EN", "FWD", [1966], "Geoff_Hurst_1966.jpg", {
    ro: "Hat-trick în finala cu Germania de Vest — unic 56 de ani.",
    en: "Hat-trick in the final against West Germany — unique for 56 years.",
  }),
  champ("moore", "Bobby Moore", "EN", "DEF", [1966], "Bobby_Moore_1966.jpg", {
    ro: "Căpitanul Angliei la singurul titlu mondial.",
    en: "England captain at their only world title.",
  }),
  champ("banks", "Gordon Banks", "EN", "GK", [1966], "Gordon_Banks_1966.jpg", {
    ro: "Portarul Angliei; celebru pentru paradă la Șenin.",
    en: "England's goalkeeper; famous for the save from Pelé.",
  }),
  champ("charlton_bobby", "Bobby Charlton", "EN", "MID", [1966], "Bobby_Charlton_1966.jpg", {
    ro: "Mijlocaș legendar al Angliei campioane.",
    en: "Legendary midfielder of champion England.",
  }),
  champ("peters", "Martin Peters", "EN", "MID", [1966], "Martin_Peters_1966.jpg", {
    ro: "A marcat al doilea gol al Angliei în finala din 1966.",
    en: "Scored England's second goal in the 1966 final.",
  }),

  // —— 1962 / 1958 Brazil ——
  champ("garrincha", "Garrincha", "BR", "FWD", [1958, 1962], "Garrincha_1962.jpg", {
    ro: "Starul Braziliei la CM 1962, când Pelé s-a accidentat.",
    en: "Brazil's star at the 1962 World Cup when Pelé was injured.",
  }),
  champ("vava", "Vavá", "BR", "FWD", [1958, 1962], "Vavá_1962.jpg", {
    ro: "A marcat în ambele finale câștigate (1958 și 1962).",
    en: "Scored in both finals he won (1958 and 1962).",
  }),
  champ("didi", "Didi", "BR", "MID", [1958, 1962], "Didi_1958.jpg", {
    ro: "Mijlocașul genial al Braziliei din anii '50–'60.",
    en: "Brazil's brilliant midfielder of the 1950s–60s.",
  }),
  champ("nilton_santos", "Nilton Santos", "BR", "DEF", [1958, 1962], "Nilton_Santos_1958.jpg", {
    ro: "Pionier al fundașului ofensiv modern.",
    en: "Pioneer of the modern attacking full-back.",
  }),

  // —— 1954 West Germany ——
  champ("fritz_walter", "Fritz Walter", "DE", "MID", [1954], "Fritz_Walter_1954.jpg", {
    ro: "Căpitanul Germaniei la „Miracolul de la Berna”.",
    en: "Germany captain at the 'Miracle of Bern'.",
  }),
  champ("morlock", "Max Morlock", "DE", "FWD", [1954], "Max_Morlock_1954.jpg", {
    ro: "A deschis scorul în finala cu Ungaria (1954).",
    en: "Opened the scoring in the 1954 final against Hungary.",
  }),

  // —— 1950 Uruguay ——
  champ("ghiggia", "Alcides Ghiggia", "UY", "FWD", [1950], "Alcides_Ghiggia.jpg", {
    ro: "A marcat golul din „Maracanaço” (2–1 cu Brazilia).",
    en: "Scored the goal in the 'Maracanaço' (2–1 vs Brazil).",
  }),
  champ("schiaffino", "Juan Alberto Schiaffino", "UY", "FWD", [1950], "Juan_Alberto_Schiaffino.jpg", {
    ro: "Starul Uruguayului la CM 1950.",
    en: "Uruguay's star at the 1950 World Cup.",
  }),
  champ("maspoli", "Roque Máspoli", "UY", "GK", [1950], "Roque_Máspoli.jpg", {
    ro: "Portarul și căpitanul Uruguayului campion.",
    en: "Goalkeeper and captain of champion Uruguay.",
  }),

  // —— 1938 / 1934 Italy ——
  champ("meazza", "Giuseppe Meazza", "IT", "FWD", [1938], "Giuseppe_Meazza.jpg", {
    ro: "Legenda Italiei; campion mondial în 1938.",
    en: "Italy legend; world champion in 1938.",
  }),
  champ("piola", "Silvio Piola", "IT", "FWD", [1938], "Silvio_Piola.jpg", {
    ro: "Golgheter prolific al Italiei interbelice.",
    en: "Prolific Italy striker of the interwar era.",
  }),
  champ("schiavio", "Angelo Schiavio", "IT", "FWD", [1934], "Angelo_Schiavio.jpg", {
    ro: "A marcat golul victoriei în finala CM 1934.",
    en: "Scored the winning goal in the 1934 World Cup final.",
  }),

  // —— 1930 Uruguay ——
  champ("nasazzi", "José Nasazzi", "UY", "DEF", [1930], "José_Nasazzi.jpg", {
    ro: "Căpitanul Uruguayului la prima Cupă Mondială.",
    en: "Uruguay captain at the first World Cup.",
  }),
  champ("castro", "Héctor Castro", "UY", "FWD", [1930], "Héctor_Castro.jpg", {
    ro: "A marcat în finala primei Cupe Mondiale (1930).",
    en: "Scored in the final of the first World Cup (1930).",
  }),
];
