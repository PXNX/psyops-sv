#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";

// Hardcoded file paths
const SVG_INPUT = "worldmap3.svg";
const REGIONS_JSON = "regions.json";
const SVG_OUTPUT = "worldmap3-numbered.svg";

// Comprehensive mapping for region names
const nameMapping: { [key: string]: string } = {
	// Exact matches with underscores
	"Ile de France": "Ile_de_France",
	"Midi Pyrenees": "Midi_Pyrenees",
	"Centre-Sud": "Centre_Sud",
	"Pas de Calais": "Nord_Pas_de_Calais",
	"Northern Hungary": "Northern_Hungary",
	"Weser-Ems": "Weser_Ems",
	"Schleswig-Holstein": "Holstein",
	"Western Slovakia": "Western_Slovakia",
	"Eastern Slovakia": "Eastern_Slovakia",
	"North Transylvania": "North_Transylvania",
	"Northern Ireland": "Northern_Ireland",
	"Scottish Highlands": "Scottish_Highlands",
	"East Anglia": "East_Anglia",
	"Greater London Area": "Greater_London_Area",
	"West Midlands": "West_Midlands",
	"East Midlands": "East_Midlands",
	"Emilia Romagna": "Emilia_Romagna",
	"Aegean Islands": "Aegean_Islands",
	"French Somaliland": "French_Somaliland",
	"British Somaliland": "British_Somaliland",
	"Pitcairn Island": "Pitcairn_Island",
	"Libyan Desert": "Libyan_Desert",
	"Southern Ontario": "Southern_Ontario",
	"Mexico City": "Mexico_City",
	"Mato Grosso": "Mato_Grosso",
	"North Island": "North_Island",
	"New South Wales": "New_South_Wales",
	"Southern Indochina": "Southern_Indochina",
	"Spanish Africa": "Spanish_Africa",
	"Portuguese Guinea": "Portuguese_Guinea",
	"Equatorial Guinea": "Equatorial_Guinea",
	"Falkland Islands": "Falkland_Islands",
	"La Paz": "La_Paz",
	"Leeward Islands": "Leeward_Islands",
	"French Guiana": "French_Guiana",
	"El Salvador": "El_Salvador",
	"Costa Rica": "Costa_Rica",
	"Dominican Republic": "Dominican_Republic",
	"French India": "French_India",
	"Hong Kong": "Hong_Kong",
	"Tannu Tuva": "Tannu_Tuva",
	"Faroe Islands": "Faroe_Islands",
	"New England": "New_England",
	"New York": "New_York",
	"New Jersey": "New_Jersey",
	"North Carolina": "North_Carolina",
	"South Carolina": "South_Carolina",
	"New Mexico": "New_Mexico",
	"North Dakota": "North_Dakota",
	"South Dakota": "South_Dakota",
	"Kyzyl Orda": "Kyzyl_Orda",
	"East Bengal": "East_Bengal",
	"West Bengal": "West_Bengal",
	"Arunachal Pradesh": "Arunachal_Pradesh",
	"El Agheila": "El_Agheila",
	"Eastern Desert": "Eastern_Desert",
	"Nova Scotia": "Nova_Scotia",
	"New Brunswick": "New_Brunswick",
	"Saint Lawrence": "Saint_Lawrence",
	"British Columbia": "British_Columbia",
	"Baja California": "Baja_California",
	"Santa Cruz": "Santa_Cruz",
	"La Libertad": "La_Libertad",
	"Rio de Janeiro": "Rio_de_Janeiro",
	"Santa Catarina": "Santa_Catarina",
	"Chaco Austral": "Chaco_Austral",
	"Algerian Desert": "Algerian_Desert",
	"Southern Sahara": "Southern_Sahara",
	"South Australia": "South_Australia",
	"Northern Territory": "Northern_Territory",
	"Western Australia": "Western_Australia",
	"South Sakhalin": "South_Sakhalin",
	"Western Desert": "Western_Desert",
	"Kuril Islands": "Kuril_Islands",
	"Northern Urals": "Northern_Urals",
	"Alma-Ata": "Alma_Ata",
	"Ust Urt": "Ust_Urt",
	"East Hebei": "East_Hebei",
	"Central islands": "Central_Islands",
	"Johnston Atoll": "Johnston_Atoll",
	"Midway Island": "Midway_Island",
	"Wake Island": "Wake_Island",
	"Marshall Islands": "Marshall_Islands",
	"Solomon Islands": "Solomon_Islands",
	"New Caledonia": "New_Caledonia",
	"Gilbert Islands": "Gilbert_Islands",
	"Phoenix Island": "Phoenix_Island",
	"Ellice Islands": "Ellice_Islands",
	"Iwo Jima": "Iwo_Jima",
	"Marcus Island": "Marcus_Island",
	"Galapagos Islands": "Galapagos_Islands",
	"Attu Island": "Attu_Island",
	"Abu Dhabi": "Abu_Dhabi",
	"Equatorial Africa": "Equatorial_Africa",
	"Southern Slovakia": "Southern_Slovakia",
	"Lesser Sunda Islands": "Lesser_Sunda_Islands",
	"The Moluccas": "The_Moluccas",
	"West Papua": "West_Papua",
	"Central Australia": "Central_Australia",
	"Al Hajara": "Al_Hajara",
	"Rub al Khali": "Rub_al_Khali",
	"Deir-az-Zur": "Deir_az_Zur",
	"Northern Ontario": "Northern_Ontario",
	"Caroline Islands": "Caroline_Islands",
	"Puerto Rico": "Puerto_Rico",
	"British Guyana": "British_Guyana",
	"Chaco Boreal": "Chaco_Boreal",
	"Northern Bahamas": "Northern_Bahamas",
	"Windward Islands": "Windward_Islands",
	"Southern Bahamas": "Southern_Bahamas",
	"French Caribbean": "French_Caribbean",
	"Rio de Oro": "Rio_de_Oro",
	"Sierra Leone": "Sierra_Leone",
	"Saint Helena": "Saint_Helena",
	"Sao Tome": "Sao_Tome",
	"Comoro Islands": "Comoro_Islands",
	"Diego Garcia": "Diego_Garcia",
	"Christmas Island": "Christmas_Island",
	"Cocos Islands": "Cocos_Islands",
	"South Georgia": "South_Georgia",
	"Portuguese Timor": "Portuguese_Timor",
	"South Island": "South_Island",
	"Northern Malay": "Northern_Malay",
	"Line Islands": "Line_Islands",
	"Central Macedonia": "Central_Macedonia",
	"Aru Islands": "Aru_Islands",
	"Haida Gwaii": "Haida_Gwaii",
	"Vancouver Island": "Vancouver_Island",
	"North Sakhalin": "North_Sakhalin",

	// Translations
	Tuscany: "Toscana",
	"Balearic Islands": "Islas_Baleares",
	"Canary islands": "Islas_Canarias",
	Piedmont: "Piemonte",
	Lombardy: "Lombardia",
	Sicily: "Sicilia",
	Sardinia: "Sardegna",
	Latium: "Lazio",
	Catalonia: "Cataluña",
	Navarre: "Navarra",
	Leon: "León",
	Andalusia: "Sevilla",
	Aragon: "Eastern_Aragón",
	"La Mancha": "Ciudad_Real",
	Castille: "Valladolid",
	Corsica: "Corsica",

	// Polish
	Krakow: "Kraków",
	Stanislawow: "Stanisławów",
	Lwow: "Lwów",
	Wolyn: "Wołyn",
	Nowogrodek: "Nowogródek",
	Bialystok: "Białystok",
	Plock: "Płock",

	// Nordic/Germanic
	Jutland: "Jylland",
	Alsace: "Alsace_Lorraine",
	Lorraine: "Alsace_Lorraine",
	"South Tyrol": "Alto_Adige",
	"Lower Austria": "Niederösterreich",
	"Upper Austria": "Oberösterreich",
	Pommern: "Hinterpommern",
	Ostpreussen: "Ermland_Masuren",
	Sudetenland: "North_Sudetenland",
	"Eastern Sudetenland": "South_Sudetenland",
	Zaolzie: "Tešínsko",
	"Carpathian Ruthenia": "Podkarpatská_Rus",
	Ostlandet: "Oslofjord",
	Trondelag: "Trøndelag",
	"Nord-Norge": "Nordland",
	Norrland: "Norrbotten",
	Svealand: "Södermanland",
	Scania: "Skåne",
	Aland: "Aland_Islands",
	Savo: "Kuopio",
	Pohjanmaa: "Vaasa",
	"Eastern Switzerland": "Eastern_Swiss_Alps",

	// Balkans
	"Northern England": "Northumberland",
	Alföld: "Tiszántúl",
	Transdanubia: "North_Transdanubia",
	Thessaly: "Peloponnese",
	Vojvodina: "Backa",
	Memel: "Klaipeda",
	Siauliai: "Kaunas",

	// Soviet/Russian
	Barnaul: "Altai_Krai",
	Chernihiv: "Chernigov",
	Khmelnytskyi: "Proskuriv",
	Kiev: "Kyiv",
	Grozny: "Chechnya_Ingushetia",
	"Caucasus Mountains": "North_Ossetia",
	Stravropol: "Stavropol",
	Elista: "Kalmykia",
	Kuibyshev: "Kuybyshev",
	Gorki: "Gorky",
	Cheboksary: "Chuvashia",
	Izhevsk: "Udmurtia",
	Engels: "Engels_Marxstadt",
	Uralsk: "Uralsk", // FIXED: It's actually "Uralsk" not "Ural'sk"
	"Ulan Ude": "Buryatia",
	Kustanay: "Kostanay",
	Urgench: "Khiva",

	// Americas
	Provence: "Bouches_du_Rhone",
	Cornwall: "Gloucestershire",
	Pampas: "Buenos_Aires",
	"Rio Grande": "Rio_Grande_do_Norte",
	"Sao Paulo": "São_Paulo",
	"Rio Grande Sul": "Rio_Grande_do_Sul",
	Para: "Pará",
	Maranhao: "Maranhão",
	Goias: "Goiás",
	Iguacu: "Punta_Porá",
	Tucuman: "Tucumán",
	Mesopotamia: "Región_Mesopotámica",
	Patagonia: "Santa_Cruz_AR",
	"British Mexico": "British_Honduras",
	Panama: "Panamá",

	// Middle East
	"Marsa Matruh": "Matrouh",
	Tibriz: "East_Azerbaijan",
	Madurai: "Southern_Madras",
	Madras: "Madras_States",
	Punjab: "East_Punjab",
	Baluchistan: "North_Baluchistan",
	Gurev: "Guryev",
	Hejaz: "Madinah",

	// Asia
	"Northwestern Canada": "Northwest_Territories",
	"Northern Canada": "Nunavut",
	"Northwest Siberia": "Yamalia",
	"South Korea": "Chungcheong-Jeolla",
	"North Korea": "Pyongan-Hwanghae",
	Kyushu: "Minami_Kyūshū",
	Chugoku: "Chugoku", // FIXED: It exists as "Chugoku" in SVG
	Tohoku: "Minami_Tohoku",
	"North Borneo": "Sabah",
	Tibet: "Chamdo", // FIXED: Changed from Xikang to Chamdo
	Mongolia: "Ulaanbaatar",
	"South Chahar": "Chahar",
	Samar: "Eastern_Visayas",
	Mindanao: "Davao",
	Cebu: "Central_Islands",
	"Northeast Siberia": "Chukotka",
	"Gorno-Altaysk": "Oyrot_Region",
	Kemerovo: "Kemerovo", // FIXED: It exists as "Kemerovo"
	Shaanxi: "Shaanxi", // FIXED: It exists as "Shaanxi"

	// Africa
	Ethiopia: "Shewa",
	Burma: "Mandalay",
	Yemen: "North_Yemen",
	Aden: "Province_of_Aden",
	"French West Africa": "Mauritania",
	"Central Congo": "Coquilhatville",
	Angola: "Luanda",
	Mozambique: "Lourenço_Marques",
	Kenya: "Nairobi",
	Sudan: "Khartoum",
	Nigeria: "Lagos",
	"South West Africa": "Karas", // FIXED: Should be Karas

	// Misc
	Switzerland: "Swiss_Plateau",
	Luxemburg: "Luxembourg",
	Slovenia: "Ljubljana",
	Uruguay: "Montevideo",
	"Panama Canal": "Panamá_Canal",
	Quebec: "Ouest_du_Quebec",
	"Northeastern Canada": "Labrador",
	Jabalpur: "Central_Provinces",
	Indore: "Central_India",
	Lucknow: "United_Provinces",
	Quetta: "Kalat",
	Xikang: "Chamdo",
	Beijing: "Beiping",
	Liaotung: "Dalian",
	Curacao: "Curaçao",
	Gabes: "Gabès",
	Lappland: "Lappi", // FIXED: Should be Lappi
	"St Pierre and Miquelon": "Saint_Pierre_and_Miquelon",
	"Dali Bai": "Dali",
	Kunlun: "Kunlun_Shan",
	"Silesian Voivodeship": "Katowice",
	"Cape Verde": "Cabo_Verde",

	// Turkey - these exist as-is
	Adana: "Adana",
	Erzurum: "Erzurum"
};

// Read files
const svgContent = readFileSync(SVG_INPUT, "utf-8");
const regions = JSON.parse(readFileSync(REGIONS_JSON, "utf-8"));

// Create reverse mapping: SVG ID -> number
const reverseMapping: { [key: string]: string } = {};
let matchedCount = 0;
let unmatchedList: string[] = [];
let skippedNumeric = 0;

for (const [key, value] of Object.entries(regions)) {
	const regionName = value as string;
	const match = key.match(/region-(\d+)/);

	if (!match) continue;

	const regionNumber = match[1];

	// Skip if the SVG already has this number as an ID
	if (svgContent.includes(`id="${regionNumber}"`)) {
		skippedNumeric++;
		continue;
	}

	const svgId = nameMapping[regionName] || regionName;

	// Check if ID exists in SVG
	if (svgContent.includes(`id="${svgId}"`)) {
		reverseMapping[svgId] = regionNumber;
		matchedCount++;
	} else {
		unmatchedList.push(`${key}: "${regionName}" → tried: "${svgId}"`);
	}
}

// Replace IDs in SVG
let modifiedSvg = svgContent;
for (const [svgId, regionNumber] of Object.entries(reverseMapping)) {
	const idRegex = new RegExp(`id="${svgId}"`, "g");
	modifiedSvg = modifiedSvg.replace(idRegex, `id="${regionNumber}"`);
}

// Write output
writeFileSync(SVG_OUTPUT, modifiedSvg, "utf-8");

console.log(`\n✅ Matched and replaced: ${matchedCount} regions`);
console.log(`⏭️  Skipped (already numeric): ${skippedNumeric}`);
console.log(`⚠️  Unmatched: ${unmatchedList.length} regions`);

if (unmatchedList.length > 0) {
	console.log(`\nUnmatched regions:`);
	unmatchedList.forEach((line) => console.log(`  ${line}`));
}

console.log(`\n📄 Output: ${SVG_OUTPUT}`);
