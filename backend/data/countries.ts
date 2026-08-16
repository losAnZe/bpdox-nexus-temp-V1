// Master dataset of 250+ countries from dr5hn/countries-states-cities-database
export interface CountryData {
  iso_code: string;
  iso3?: string;
  name: string;
  currency: string;
  phone_code: string;
}

export const MASTER_COUNTRIES: CountryData[] = [
  {
    "iso_code": "AF",
    "iso3": "AFG",
    "name": "Afghanistan",
    "currency": "AFN",
    "phone_code": "+93"
  },
  {
    "iso_code": "AX",
    "iso3": "ALA",
    "name": "Aland Islands",
    "currency": "EUR",
    "phone_code": "+358"
  },
  {
    "iso_code": "AL",
    "iso3": "ALB",
    "name": "Albania",
    "currency": "ALL",
    "phone_code": "+355"
  },
  {
    "iso_code": "DZ",
    "iso3": "DZA",
    "name": "Algeria",
    "currency": "DZD",
    "phone_code": "+213"
  },
  {
    "iso_code": "AS",
    "iso3": "ASM",
    "name": "American Samoa",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "AD",
    "iso3": "AND",
    "name": "Andorra",
    "currency": "EUR",
    "phone_code": "+376"
  },
  {
    "iso_code": "AO",
    "iso3": "AGO",
    "name": "Angola",
    "currency": "AOA",
    "phone_code": "+244"
  },
  {
    "iso_code": "AI",
    "iso3": "AIA",
    "name": "Anguilla",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "AQ",
    "iso3": "ATA",
    "name": "Antarctica",
    "currency": "AAD",
    "phone_code": "+672"
  },
  {
    "iso_code": "AG",
    "iso3": "ATG",
    "name": "Antigua and Barbuda",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "AR",
    "iso3": "ARG",
    "name": "Argentina",
    "currency": "ARS",
    "phone_code": "+54"
  },
  {
    "iso_code": "AM",
    "iso3": "ARM",
    "name": "Armenia",
    "currency": "AMD",
    "phone_code": "+374"
  },
  {
    "iso_code": "AW",
    "iso3": "ABW",
    "name": "Aruba",
    "currency": "AWG",
    "phone_code": "+297"
  },
  {
    "iso_code": "AU",
    "iso3": "AUS",
    "name": "Australia",
    "currency": "AUD",
    "phone_code": "+61"
  },
  {
    "iso_code": "AT",
    "iso3": "AUT",
    "name": "Austria",
    "currency": "EUR",
    "phone_code": "+43"
  },
  {
    "iso_code": "AZ",
    "iso3": "AZE",
    "name": "Azerbaijan",
    "currency": "AZN",
    "phone_code": "+994"
  },
  {
    "iso_code": "BH",
    "iso3": "BHR",
    "name": "Bahrain",
    "currency": "BHD",
    "phone_code": "+973"
  },
  {
    "iso_code": "BD",
    "iso3": "BGD",
    "name": "Bangladesh",
    "currency": "BDT",
    "phone_code": "+880"
  },
  {
    "iso_code": "BB",
    "iso3": "BRB",
    "name": "Barbados",
    "currency": "BBD",
    "phone_code": "+1"
  },
  {
    "iso_code": "BY",
    "iso3": "BLR",
    "name": "Belarus",
    "currency": "BYN",
    "phone_code": "+375"
  },
  {
    "iso_code": "BE",
    "iso3": "BEL",
    "name": "Belgium",
    "currency": "EUR",
    "phone_code": "+32"
  },
  {
    "iso_code": "BZ",
    "iso3": "BLZ",
    "name": "Belize",
    "currency": "BZD",
    "phone_code": "+501"
  },
  {
    "iso_code": "BJ",
    "iso3": "BEN",
    "name": "Benin",
    "currency": "XOF",
    "phone_code": "+229"
  },
  {
    "iso_code": "BM",
    "iso3": "BMU",
    "name": "Bermuda",
    "currency": "BMD",
    "phone_code": "+1"
  },
  {
    "iso_code": "BT",
    "iso3": "BTN",
    "name": "Bhutan",
    "currency": "BTN",
    "phone_code": "+975"
  },
  {
    "iso_code": "BO",
    "iso3": "BOL",
    "name": "Bolivia",
    "currency": "BOB",
    "phone_code": "+591"
  },
  {
    "iso_code": "BQ",
    "iso3": "BES",
    "name": "Bonaire, Sint Eustatius and Saba",
    "currency": "USD",
    "phone_code": "+599"
  },
  {
    "iso_code": "BA",
    "iso3": "BIH",
    "name": "Bosnia and Herzegovina",
    "currency": "BAM",
    "phone_code": "+387"
  },
  {
    "iso_code": "BW",
    "iso3": "BWA",
    "name": "Botswana",
    "currency": "BWP",
    "phone_code": "+267"
  },
  {
    "iso_code": "BV",
    "iso3": "BVT",
    "name": "Bouvet Island",
    "currency": "NOK",
    "phone_code": "+0055"
  },
  {
    "iso_code": "BR",
    "iso3": "BRA",
    "name": "Brazil",
    "currency": "BRL",
    "phone_code": "+55"
  },
  {
    "iso_code": "IO",
    "iso3": "IOT",
    "name": "British Indian Ocean Territory",
    "currency": "USD",
    "phone_code": "+246"
  },
  {
    "iso_code": "BN",
    "iso3": "BRN",
    "name": "Brunei",
    "currency": "BND",
    "phone_code": "+673"
  },
  {
    "iso_code": "BG",
    "iso3": "BGR",
    "name": "Bulgaria",
    "currency": "EUR",
    "phone_code": "+359"
  },
  {
    "iso_code": "BF",
    "iso3": "BFA",
    "name": "Burkina Faso",
    "currency": "XOF",
    "phone_code": "+226"
  },
  {
    "iso_code": "BI",
    "iso3": "BDI",
    "name": "Burundi",
    "currency": "BIF",
    "phone_code": "+257"
  },
  {
    "iso_code": "KH",
    "iso3": "KHM",
    "name": "Cambodia",
    "currency": "KHR",
    "phone_code": "+855"
  },
  {
    "iso_code": "CM",
    "iso3": "CMR",
    "name": "Cameroon",
    "currency": "XAF",
    "phone_code": "+237"
  },
  {
    "iso_code": "CA",
    "iso3": "CAN",
    "name": "Canada",
    "currency": "CAD",
    "phone_code": "+1"
  },
  {
    "iso_code": "CV",
    "iso3": "CPV",
    "name": "Cape Verde",
    "currency": "CVE",
    "phone_code": "+238"
  },
  {
    "iso_code": "KY",
    "iso3": "CYM",
    "name": "Cayman Islands",
    "currency": "KYD",
    "phone_code": "+1"
  },
  {
    "iso_code": "CF",
    "iso3": "CAF",
    "name": "Central African Republic",
    "currency": "XAF",
    "phone_code": "+236"
  },
  {
    "iso_code": "TD",
    "iso3": "TCD",
    "name": "Chad",
    "currency": "XAF",
    "phone_code": "+235"
  },
  {
    "iso_code": "CL",
    "iso3": "CHL",
    "name": "Chile",
    "currency": "CLP",
    "phone_code": "+56"
  },
  {
    "iso_code": "CN",
    "iso3": "CHN",
    "name": "China",
    "currency": "CNY",
    "phone_code": "+86"
  },
  {
    "iso_code": "CX",
    "iso3": "CXR",
    "name": "Christmas Island",
    "currency": "AUD",
    "phone_code": "+61"
  },
  {
    "iso_code": "CC",
    "iso3": "CCK",
    "name": "Cocos (Keeling) Islands",
    "currency": "AUD",
    "phone_code": "+61"
  },
  {
    "iso_code": "CO",
    "iso3": "COL",
    "name": "Colombia",
    "currency": "COP",
    "phone_code": "+57"
  },
  {
    "iso_code": "KM",
    "iso3": "COM",
    "name": "Comoros",
    "currency": "KMF",
    "phone_code": "+269"
  },
  {
    "iso_code": "CG",
    "iso3": "COG",
    "name": "Congo",
    "currency": "CDF",
    "phone_code": "+242"
  },
  {
    "iso_code": "CK",
    "iso3": "COK",
    "name": "Cook Islands",
    "currency": "NZD",
    "phone_code": "+682"
  },
  {
    "iso_code": "CR",
    "iso3": "CRI",
    "name": "Costa Rica",
    "currency": "CRC",
    "phone_code": "+506"
  },
  {
    "iso_code": "HR",
    "iso3": "HRV",
    "name": "Croatia",
    "currency": "EUR",
    "phone_code": "+385"
  },
  {
    "iso_code": "CU",
    "iso3": "CUB",
    "name": "Cuba",
    "currency": "CUP",
    "phone_code": "+53"
  },
  {
    "iso_code": "CW",
    "iso3": "CUW",
    "name": "Curaçao",
    "currency": "ANG",
    "phone_code": "+599"
  },
  {
    "iso_code": "CY",
    "iso3": "CYP",
    "name": "Cyprus",
    "currency": "EUR",
    "phone_code": "+357"
  },
  {
    "iso_code": "CZ",
    "iso3": "CZE",
    "name": "Czech Republic",
    "currency": "CZK",
    "phone_code": "+420"
  },
  {
    "iso_code": "CD",
    "iso3": "COD",
    "name": "Democratic Republic of the Congo",
    "currency": "CDF",
    "phone_code": "+243"
  },
  {
    "iso_code": "DK",
    "iso3": "DNK",
    "name": "Denmark",
    "currency": "DKK",
    "phone_code": "+45"
  },
  {
    "iso_code": "DJ",
    "iso3": "DJI",
    "name": "Djibouti",
    "currency": "DJF",
    "phone_code": "+253"
  },
  {
    "iso_code": "DM",
    "iso3": "DMA",
    "name": "Dominica",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "DO",
    "iso3": "DOM",
    "name": "Dominican Republic",
    "currency": "DOP",
    "phone_code": "+1"
  },
  {
    "iso_code": "EC",
    "iso3": "ECU",
    "name": "Ecuador",
    "currency": "USD",
    "phone_code": "+593"
  },
  {
    "iso_code": "EG",
    "iso3": "EGY",
    "name": "Egypt",
    "currency": "EGP",
    "phone_code": "+20"
  },
  {
    "iso_code": "SV",
    "iso3": "SLV",
    "name": "El Salvador",
    "currency": "USD",
    "phone_code": "+503"
  },
  {
    "iso_code": "GQ",
    "iso3": "GNQ",
    "name": "Equatorial Guinea",
    "currency": "XAF",
    "phone_code": "+240"
  },
  {
    "iso_code": "ER",
    "iso3": "ERI",
    "name": "Eritrea",
    "currency": "ERN",
    "phone_code": "+291"
  },
  {
    "iso_code": "EE",
    "iso3": "EST",
    "name": "Estonia",
    "currency": "EUR",
    "phone_code": "+372"
  },
  {
    "iso_code": "SZ",
    "iso3": "SWZ",
    "name": "Eswatini",
    "currency": "SZL",
    "phone_code": "+268"
  },
  {
    "iso_code": "ET",
    "iso3": "ETH",
    "name": "Ethiopia",
    "currency": "ETB",
    "phone_code": "+251"
  },
  {
    "iso_code": "FK",
    "iso3": "FLK",
    "name": "Falkland Islands",
    "currency": "FKP",
    "phone_code": "+500"
  },
  {
    "iso_code": "FO",
    "iso3": "FRO",
    "name": "Faroe Islands",
    "currency": "DKK",
    "phone_code": "+298"
  },
  {
    "iso_code": "FJ",
    "iso3": "FJI",
    "name": "Fiji Islands",
    "currency": "FJD",
    "phone_code": "+679"
  },
  {
    "iso_code": "FI",
    "iso3": "FIN",
    "name": "Finland",
    "currency": "EUR",
    "phone_code": "+358"
  },
  {
    "iso_code": "FR",
    "iso3": "FRA",
    "name": "France",
    "currency": "EUR",
    "phone_code": "+33"
  },
  {
    "iso_code": "GF",
    "iso3": "GUF",
    "name": "French Guiana",
    "currency": "EUR",
    "phone_code": "+594"
  },
  {
    "iso_code": "PF",
    "iso3": "PYF",
    "name": "French Polynesia",
    "currency": "XPF",
    "phone_code": "+689"
  },
  {
    "iso_code": "TF",
    "iso3": "ATF",
    "name": "French Southern Territories",
    "currency": "EUR",
    "phone_code": "+262"
  },
  {
    "iso_code": "GA",
    "iso3": "GAB",
    "name": "Gabon",
    "currency": "XAF",
    "phone_code": "+241"
  },
  {
    "iso_code": "GE",
    "iso3": "GEO",
    "name": "Georgia",
    "currency": "GEL",
    "phone_code": "+995"
  },
  {
    "iso_code": "DE",
    "iso3": "DEU",
    "name": "Germany",
    "currency": "EUR",
    "phone_code": "+49"
  },
  {
    "iso_code": "GH",
    "iso3": "GHA",
    "name": "Ghana",
    "currency": "GHS",
    "phone_code": "+233"
  },
  {
    "iso_code": "GI",
    "iso3": "GIB",
    "name": "Gibraltar",
    "currency": "GIP",
    "phone_code": "+350"
  },
  {
    "iso_code": "GR",
    "iso3": "GRC",
    "name": "Greece",
    "currency": "EUR",
    "phone_code": "+30"
  },
  {
    "iso_code": "GL",
    "iso3": "GRL",
    "name": "Greenland",
    "currency": "DKK",
    "phone_code": "+299"
  },
  {
    "iso_code": "GD",
    "iso3": "GRD",
    "name": "Grenada",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "GP",
    "iso3": "GLP",
    "name": "Guadeloupe",
    "currency": "EUR",
    "phone_code": "+590"
  },
  {
    "iso_code": "GU",
    "iso3": "GUM",
    "name": "Guam",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "GT",
    "iso3": "GTM",
    "name": "Guatemala",
    "currency": "GTQ",
    "phone_code": "+502"
  },
  {
    "iso_code": "GG",
    "iso3": "GGY",
    "name": "Guernsey",
    "currency": "GBP",
    "phone_code": "+44"
  },
  {
    "iso_code": "GN",
    "iso3": "GIN",
    "name": "Guinea",
    "currency": "GNF",
    "phone_code": "+224"
  },
  {
    "iso_code": "GW",
    "iso3": "GNB",
    "name": "Guinea-Bissau",
    "currency": "XOF",
    "phone_code": "+245"
  },
  {
    "iso_code": "GY",
    "iso3": "GUY",
    "name": "Guyana",
    "currency": "GYD",
    "phone_code": "+592"
  },
  {
    "iso_code": "HT",
    "iso3": "HTI",
    "name": "Haiti",
    "currency": "HTG",
    "phone_code": "+509"
  },
  {
    "iso_code": "HM",
    "iso3": "HMD",
    "name": "Heard Island and McDonald Islands",
    "currency": "AUD",
    "phone_code": "+672"
  },
  {
    "iso_code": "HN",
    "iso3": "HND",
    "name": "Honduras",
    "currency": "HNL",
    "phone_code": "+504"
  },
  {
    "iso_code": "HK",
    "iso3": "HKG",
    "name": "Hong Kong S.A.R.",
    "currency": "HKD",
    "phone_code": "+852"
  },
  {
    "iso_code": "HU",
    "iso3": "HUN",
    "name": "Hungary",
    "currency": "HUF",
    "phone_code": "+36"
  },
  {
    "iso_code": "IS",
    "iso3": "ISL",
    "name": "Iceland",
    "currency": "ISK",
    "phone_code": "+354"
  },
  {
    "iso_code": "IN",
    "iso3": "IND",
    "name": "India",
    "currency": "INR",
    "phone_code": "+91"
  },
  {
    "iso_code": "ID",
    "iso3": "IDN",
    "name": "Indonesia",
    "currency": "IDR",
    "phone_code": "+62"
  },
  {
    "iso_code": "IR",
    "iso3": "IRN",
    "name": "Iran",
    "currency": "IRR",
    "phone_code": "+98"
  },
  {
    "iso_code": "IQ",
    "iso3": "IRQ",
    "name": "Iraq",
    "currency": "IQD",
    "phone_code": "+964"
  },
  {
    "iso_code": "IE",
    "iso3": "IRL",
    "name": "Ireland",
    "currency": "EUR",
    "phone_code": "+353"
  },
  {
    "iso_code": "IL",
    "iso3": "ISR",
    "name": "Israel",
    "currency": "ILS",
    "phone_code": "+972"
  },
  {
    "iso_code": "IT",
    "iso3": "ITA",
    "name": "Italy",
    "currency": "EUR",
    "phone_code": "+39"
  },
  {
    "iso_code": "CI",
    "iso3": "CIV",
    "name": "Ivory Coast",
    "currency": "XOF",
    "phone_code": "+225"
  },
  {
    "iso_code": "JM",
    "iso3": "JAM",
    "name": "Jamaica",
    "currency": "JMD",
    "phone_code": "+1"
  },
  {
    "iso_code": "JP",
    "iso3": "JPN",
    "name": "Japan",
    "currency": "JPY",
    "phone_code": "+81"
  },
  {
    "iso_code": "JE",
    "iso3": "JEY",
    "name": "Jersey",
    "currency": "GBP",
    "phone_code": "+44"
  },
  {
    "iso_code": "JO",
    "iso3": "JOR",
    "name": "Jordan",
    "currency": "JOD",
    "phone_code": "+962"
  },
  {
    "iso_code": "KZ",
    "iso3": "KAZ",
    "name": "Kazakhstan",
    "currency": "KZT",
    "phone_code": "+7"
  },
  {
    "iso_code": "KE",
    "iso3": "KEN",
    "name": "Kenya",
    "currency": "KES",
    "phone_code": "+254"
  },
  {
    "iso_code": "KI",
    "iso3": "KIR",
    "name": "Kiribati",
    "currency": "AUD",
    "phone_code": "+686"
  },
  {
    "iso_code": "XK",
    "iso3": "XKX",
    "name": "Kosovo",
    "currency": "EUR",
    "phone_code": "+383"
  },
  {
    "iso_code": "KW",
    "iso3": "KWT",
    "name": "Kuwait",
    "currency": "KWD",
    "phone_code": "+965"
  },
  {
    "iso_code": "KG",
    "iso3": "KGZ",
    "name": "Kyrgyzstan",
    "currency": "KGS",
    "phone_code": "+996"
  },
  {
    "iso_code": "LA",
    "iso3": "LAO",
    "name": "Laos",
    "currency": "LAK",
    "phone_code": "+856"
  },
  {
    "iso_code": "LV",
    "iso3": "LVA",
    "name": "Latvia",
    "currency": "EUR",
    "phone_code": "+371"
  },
  {
    "iso_code": "LB",
    "iso3": "LBN",
    "name": "Lebanon",
    "currency": "LBP",
    "phone_code": "+961"
  },
  {
    "iso_code": "LS",
    "iso3": "LSO",
    "name": "Lesotho",
    "currency": "LSL",
    "phone_code": "+266"
  },
  {
    "iso_code": "LR",
    "iso3": "LBR",
    "name": "Liberia",
    "currency": "LRD",
    "phone_code": "+231"
  },
  {
    "iso_code": "LY",
    "iso3": "LBY",
    "name": "Libya",
    "currency": "LYD",
    "phone_code": "+218"
  },
  {
    "iso_code": "LI",
    "iso3": "LIE",
    "name": "Liechtenstein",
    "currency": "CHF",
    "phone_code": "+423"
  },
  {
    "iso_code": "LT",
    "iso3": "LTU",
    "name": "Lithuania",
    "currency": "EUR",
    "phone_code": "+370"
  },
  {
    "iso_code": "LU",
    "iso3": "LUX",
    "name": "Luxembourg",
    "currency": "EUR",
    "phone_code": "+352"
  },
  {
    "iso_code": "MO",
    "iso3": "MAC",
    "name": "Macau S.A.R.",
    "currency": "MOP",
    "phone_code": "+853"
  },
  {
    "iso_code": "MG",
    "iso3": "MDG",
    "name": "Madagascar",
    "currency": "MGA",
    "phone_code": "+261"
  },
  {
    "iso_code": "MW",
    "iso3": "MWI",
    "name": "Malawi",
    "currency": "MWK",
    "phone_code": "+265"
  },
  {
    "iso_code": "MY",
    "iso3": "MYS",
    "name": "Malaysia",
    "currency": "MYR",
    "phone_code": "+60"
  },
  {
    "iso_code": "MV",
    "iso3": "MDV",
    "name": "Maldives",
    "currency": "MVR",
    "phone_code": "+960"
  },
  {
    "iso_code": "ML",
    "iso3": "MLI",
    "name": "Mali",
    "currency": "XOF",
    "phone_code": "+223"
  },
  {
    "iso_code": "MT",
    "iso3": "MLT",
    "name": "Malta",
    "currency": "EUR",
    "phone_code": "+356"
  },
  {
    "iso_code": "IM",
    "iso3": "IMN",
    "name": "Man (Isle of)",
    "currency": "GBP",
    "phone_code": "+44"
  },
  {
    "iso_code": "MH",
    "iso3": "MHL",
    "name": "Marshall Islands",
    "currency": "USD",
    "phone_code": "+692"
  },
  {
    "iso_code": "MQ",
    "iso3": "MTQ",
    "name": "Martinique",
    "currency": "EUR",
    "phone_code": "+596"
  },
  {
    "iso_code": "MR",
    "iso3": "MRT",
    "name": "Mauritania",
    "currency": "MRU",
    "phone_code": "+222"
  },
  {
    "iso_code": "MU",
    "iso3": "MUS",
    "name": "Mauritius",
    "currency": "MUR",
    "phone_code": "+230"
  },
  {
    "iso_code": "YT",
    "iso3": "MYT",
    "name": "Mayotte",
    "currency": "EUR",
    "phone_code": "+262"
  },
  {
    "iso_code": "MX",
    "iso3": "MEX",
    "name": "Mexico",
    "currency": "MXN",
    "phone_code": "+52"
  },
  {
    "iso_code": "FM",
    "iso3": "FSM",
    "name": "Micronesia",
    "currency": "USD",
    "phone_code": "+691"
  },
  {
    "iso_code": "MD",
    "iso3": "MDA",
    "name": "Moldova",
    "currency": "MDL",
    "phone_code": "+373"
  },
  {
    "iso_code": "MC",
    "iso3": "MCO",
    "name": "Monaco",
    "currency": "EUR",
    "phone_code": "+377"
  },
  {
    "iso_code": "MN",
    "iso3": "MNG",
    "name": "Mongolia",
    "currency": "MNT",
    "phone_code": "+976"
  },
  {
    "iso_code": "ME",
    "iso3": "MNE",
    "name": "Montenegro",
    "currency": "EUR",
    "phone_code": "+382"
  },
  {
    "iso_code": "MS",
    "iso3": "MSR",
    "name": "Montserrat",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "MA",
    "iso3": "MAR",
    "name": "Morocco",
    "currency": "MAD",
    "phone_code": "+212"
  },
  {
    "iso_code": "MZ",
    "iso3": "MOZ",
    "name": "Mozambique",
    "currency": "MZN",
    "phone_code": "+258"
  },
  {
    "iso_code": "MM",
    "iso3": "MMR",
    "name": "Myanmar",
    "currency": "MMK",
    "phone_code": "+95"
  },
  {
    "iso_code": "NA",
    "iso3": "NAM",
    "name": "Namibia",
    "currency": "NAD",
    "phone_code": "+264"
  },
  {
    "iso_code": "NR",
    "iso3": "NRU",
    "name": "Nauru",
    "currency": "AUD",
    "phone_code": "+674"
  },
  {
    "iso_code": "NP",
    "iso3": "NPL",
    "name": "Nepal",
    "currency": "NPR",
    "phone_code": "+977"
  },
  {
    "iso_code": "NL",
    "iso3": "NLD",
    "name": "Netherlands",
    "currency": "EUR",
    "phone_code": "+31"
  },
  {
    "iso_code": "NC",
    "iso3": "NCL",
    "name": "New Caledonia",
    "currency": "XPF",
    "phone_code": "+687"
  },
  {
    "iso_code": "NZ",
    "iso3": "NZL",
    "name": "New Zealand",
    "currency": "NZD",
    "phone_code": "+64"
  },
  {
    "iso_code": "NI",
    "iso3": "NIC",
    "name": "Nicaragua",
    "currency": "NIO",
    "phone_code": "+505"
  },
  {
    "iso_code": "NE",
    "iso3": "NER",
    "name": "Niger",
    "currency": "XOF",
    "phone_code": "+227"
  },
  {
    "iso_code": "NG",
    "iso3": "NGA",
    "name": "Nigeria",
    "currency": "NGN",
    "phone_code": "+234"
  },
  {
    "iso_code": "NU",
    "iso3": "NIU",
    "name": "Niue",
    "currency": "NZD",
    "phone_code": "+683"
  },
  {
    "iso_code": "NF",
    "iso3": "NFK",
    "name": "Norfolk Island",
    "currency": "AUD",
    "phone_code": "+672"
  },
  {
    "iso_code": "KP",
    "iso3": "PRK",
    "name": "North Korea",
    "currency": "KPW",
    "phone_code": "+850"
  },
  {
    "iso_code": "MK",
    "iso3": "MKD",
    "name": "North Macedonia",
    "currency": "MKD",
    "phone_code": "+389"
  },
  {
    "iso_code": "MP",
    "iso3": "MNP",
    "name": "Northern Mariana Islands",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "NO",
    "iso3": "NOR",
    "name": "Norway",
    "currency": "NOK",
    "phone_code": "+47"
  },
  {
    "iso_code": "OM",
    "iso3": "OMN",
    "name": "Oman",
    "currency": "OMR",
    "phone_code": "+968"
  },
  {
    "iso_code": "PK",
    "iso3": "PAK",
    "name": "Pakistan",
    "currency": "PKR",
    "phone_code": "+92"
  },
  {
    "iso_code": "PW",
    "iso3": "PLW",
    "name": "Palau",
    "currency": "USD",
    "phone_code": "+680"
  },
  {
    "iso_code": "PS",
    "iso3": "PSE",
    "name": "Palestinian Territory Occupied",
    "currency": "ILS",
    "phone_code": "+970"
  },
  {
    "iso_code": "PA",
    "iso3": "PAN",
    "name": "Panama",
    "currency": "PAB",
    "phone_code": "+507"
  },
  {
    "iso_code": "PG",
    "iso3": "PNG",
    "name": "Papua New Guinea",
    "currency": "PGK",
    "phone_code": "+675"
  },
  {
    "iso_code": "PY",
    "iso3": "PRY",
    "name": "Paraguay",
    "currency": "PYG",
    "phone_code": "+595"
  },
  {
    "iso_code": "PE",
    "iso3": "PER",
    "name": "Peru",
    "currency": "PEN",
    "phone_code": "+51"
  },
  {
    "iso_code": "PH",
    "iso3": "PHL",
    "name": "Philippines",
    "currency": "PHP",
    "phone_code": "+63"
  },
  {
    "iso_code": "PN",
    "iso3": "PCN",
    "name": "Pitcairn Island",
    "currency": "NZD",
    "phone_code": "+870"
  },
  {
    "iso_code": "PL",
    "iso3": "POL",
    "name": "Poland",
    "currency": "PLN",
    "phone_code": "+48"
  },
  {
    "iso_code": "PT",
    "iso3": "PRT",
    "name": "Portugal",
    "currency": "EUR",
    "phone_code": "+351"
  },
  {
    "iso_code": "PR",
    "iso3": "PRI",
    "name": "Puerto Rico",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "QA",
    "iso3": "QAT",
    "name": "Qatar",
    "currency": "QAR",
    "phone_code": "+974"
  },
  {
    "iso_code": "RE",
    "iso3": "REU",
    "name": "Reunion",
    "currency": "EUR",
    "phone_code": "+262"
  },
  {
    "iso_code": "RO",
    "iso3": "ROU",
    "name": "Romania",
    "currency": "RON",
    "phone_code": "+40"
  },
  {
    "iso_code": "RU",
    "iso3": "RUS",
    "name": "Russia",
    "currency": "RUB",
    "phone_code": "+7"
  },
  {
    "iso_code": "RW",
    "iso3": "RWA",
    "name": "Rwanda",
    "currency": "RWF",
    "phone_code": "+250"
  },
  {
    "iso_code": "SH",
    "iso3": "SHN",
    "name": "Saint Helena",
    "currency": "SHP",
    "phone_code": "+290"
  },
  {
    "iso_code": "KN",
    "iso3": "KNA",
    "name": "Saint Kitts and Nevis",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "LC",
    "iso3": "LCA",
    "name": "Saint Lucia",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "PM",
    "iso3": "SPM",
    "name": "Saint Pierre and Miquelon",
    "currency": "EUR",
    "phone_code": "+508"
  },
  {
    "iso_code": "VC",
    "iso3": "VCT",
    "name": "Saint Vincent and the Grenadines",
    "currency": "XCD",
    "phone_code": "+1"
  },
  {
    "iso_code": "BL",
    "iso3": "BLM",
    "name": "Saint-Barthelemy",
    "currency": "EUR",
    "phone_code": "+590"
  },
  {
    "iso_code": "MF",
    "iso3": "MAF",
    "name": "Saint-Martin (French part)",
    "currency": "EUR",
    "phone_code": "+590"
  },
  {
    "iso_code": "WS",
    "iso3": "WSM",
    "name": "Samoa",
    "currency": "WST",
    "phone_code": "+685"
  },
  {
    "iso_code": "SM",
    "iso3": "SMR",
    "name": "San Marino",
    "currency": "EUR",
    "phone_code": "+378"
  },
  {
    "iso_code": "ST",
    "iso3": "STP",
    "name": "Sao Tome and Principe",
    "currency": "STN",
    "phone_code": "+239"
  },
  {
    "iso_code": "SA",
    "iso3": "SAU",
    "name": "Saudi Arabia",
    "currency": "SAR",
    "phone_code": "+966"
  },
  {
    "iso_code": "SN",
    "iso3": "SEN",
    "name": "Senegal",
    "currency": "XOF",
    "phone_code": "+221"
  },
  {
    "iso_code": "RS",
    "iso3": "SRB",
    "name": "Serbia",
    "currency": "RSD",
    "phone_code": "+381"
  },
  {
    "iso_code": "SC",
    "iso3": "SYC",
    "name": "Seychelles",
    "currency": "SCR",
    "phone_code": "+248"
  },
  {
    "iso_code": "SL",
    "iso3": "SLE",
    "name": "Sierra Leone",
    "currency": "SLL",
    "phone_code": "+232"
  },
  {
    "iso_code": "SG",
    "iso3": "SGP",
    "name": "Singapore",
    "currency": "SGD",
    "phone_code": "+65"
  },
  {
    "iso_code": "SX",
    "iso3": "SXM",
    "name": "Sint Maarten (Dutch part)",
    "currency": "ANG",
    "phone_code": "+1721"
  },
  {
    "iso_code": "SK",
    "iso3": "SVK",
    "name": "Slovakia",
    "currency": "EUR",
    "phone_code": "+421"
  },
  {
    "iso_code": "SI",
    "iso3": "SVN",
    "name": "Slovenia",
    "currency": "EUR",
    "phone_code": "+386"
  },
  {
    "iso_code": "SB",
    "iso3": "SLB",
    "name": "Solomon Islands",
    "currency": "SBD",
    "phone_code": "+677"
  },
  {
    "iso_code": "SO",
    "iso3": "SOM",
    "name": "Somalia",
    "currency": "SOS",
    "phone_code": "+252"
  },
  {
    "iso_code": "ZA",
    "iso3": "ZAF",
    "name": "South Africa",
    "currency": "ZAR",
    "phone_code": "+27"
  },
  {
    "iso_code": "GS",
    "iso3": "SGS",
    "name": "South Georgia",
    "currency": "GBP",
    "phone_code": "+500"
  },
  {
    "iso_code": "KR",
    "iso3": "KOR",
    "name": "South Korea",
    "currency": "KRW",
    "phone_code": "+82"
  },
  {
    "iso_code": "SS",
    "iso3": "SSD",
    "name": "South Sudan",
    "currency": "SSP",
    "phone_code": "+211"
  },
  {
    "iso_code": "ES",
    "iso3": "ESP",
    "name": "Spain",
    "currency": "EUR",
    "phone_code": "+34"
  },
  {
    "iso_code": "LK",
    "iso3": "LKA",
    "name": "Sri Lanka",
    "currency": "LKR",
    "phone_code": "+94"
  },
  {
    "iso_code": "SD",
    "iso3": "SDN",
    "name": "Sudan",
    "currency": "SDG",
    "phone_code": "+249"
  },
  {
    "iso_code": "SR",
    "iso3": "SUR",
    "name": "Suriname",
    "currency": "SRD",
    "phone_code": "+597"
  },
  {
    "iso_code": "SJ",
    "iso3": "SJM",
    "name": "Svalbard and Jan Mayen Islands",
    "currency": "NOK",
    "phone_code": "+47"
  },
  {
    "iso_code": "SE",
    "iso3": "SWE",
    "name": "Sweden",
    "currency": "SEK",
    "phone_code": "+46"
  },
  {
    "iso_code": "CH",
    "iso3": "CHE",
    "name": "Switzerland",
    "currency": "CHF",
    "phone_code": "+41"
  },
  {
    "iso_code": "SY",
    "iso3": "SYR",
    "name": "Syria",
    "currency": "SYP",
    "phone_code": "+963"
  },
  {
    "iso_code": "TW",
    "iso3": "TWN",
    "name": "Taiwan",
    "currency": "TWD",
    "phone_code": "+886"
  },
  {
    "iso_code": "TJ",
    "iso3": "TJK",
    "name": "Tajikistan",
    "currency": "TJS",
    "phone_code": "+992"
  },
  {
    "iso_code": "TZ",
    "iso3": "TZA",
    "name": "Tanzania",
    "currency": "TZS",
    "phone_code": "+255"
  },
  {
    "iso_code": "TH",
    "iso3": "THA",
    "name": "Thailand",
    "currency": "THB",
    "phone_code": "+66"
  },
  {
    "iso_code": "BS",
    "iso3": "BHS",
    "name": "The Bahamas",
    "currency": "BSD",
    "phone_code": "+1"
  },
  {
    "iso_code": "GM",
    "iso3": "GMB",
    "name": "The Gambia",
    "currency": "GMD",
    "phone_code": "+220"
  },
  {
    "iso_code": "TL",
    "iso3": "TLS",
    "name": "Timor-Leste",
    "currency": "USD",
    "phone_code": "+670"
  },
  {
    "iso_code": "TG",
    "iso3": "TGO",
    "name": "Togo",
    "currency": "XOF",
    "phone_code": "+228"
  },
  {
    "iso_code": "TK",
    "iso3": "TKL",
    "name": "Tokelau",
    "currency": "NZD",
    "phone_code": "+690"
  },
  {
    "iso_code": "TO",
    "iso3": "TON",
    "name": "Tonga",
    "currency": "TOP",
    "phone_code": "+676"
  },
  {
    "iso_code": "TT",
    "iso3": "TTO",
    "name": "Trinidad and Tobago",
    "currency": "TTD",
    "phone_code": "+1"
  },
  {
    "iso_code": "TN",
    "iso3": "TUN",
    "name": "Tunisia",
    "currency": "TND",
    "phone_code": "+216"
  },
  {
    "iso_code": "TR",
    "iso3": "TUR",
    "name": "Turkey",
    "currency": "TRY",
    "phone_code": "+90"
  },
  {
    "iso_code": "TM",
    "iso3": "TKM",
    "name": "Turkmenistan",
    "currency": "TMT",
    "phone_code": "+993"
  },
  {
    "iso_code": "TC",
    "iso3": "TCA",
    "name": "Turks and Caicos Islands",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "TV",
    "iso3": "TUV",
    "name": "Tuvalu",
    "currency": "AUD",
    "phone_code": "+688"
  },
  {
    "iso_code": "UG",
    "iso3": "UGA",
    "name": "Uganda",
    "currency": "UGX",
    "phone_code": "+256"
  },
  {
    "iso_code": "UA",
    "iso3": "UKR",
    "name": "Ukraine",
    "currency": "UAH",
    "phone_code": "+380"
  },
  {
    "iso_code": "AE",
    "iso3": "ARE",
    "name": "United Arab Emirates",
    "currency": "AED",
    "phone_code": "+971"
  },
  {
    "iso_code": "GB",
    "iso3": "GBR",
    "name": "United Kingdom",
    "currency": "GBP",
    "phone_code": "+44"
  },
  {
    "iso_code": "US",
    "iso3": "USA",
    "name": "United States",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "UM",
    "iso3": "UMI",
    "name": "United States Minor Outlying Islands",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "UY",
    "iso3": "URY",
    "name": "Uruguay",
    "currency": "UYU",
    "phone_code": "+598"
  },
  {
    "iso_code": "UZ",
    "iso3": "UZB",
    "name": "Uzbekistan",
    "currency": "UZS",
    "phone_code": "+998"
  },
  {
    "iso_code": "VU",
    "iso3": "VUT",
    "name": "Vanuatu",
    "currency": "VUV",
    "phone_code": "+678"
  },
  {
    "iso_code": "VA",
    "iso3": "VAT",
    "name": "Vatican City State (Holy See)",
    "currency": "EUR",
    "phone_code": "+379"
  },
  {
    "iso_code": "VE",
    "iso3": "VEN",
    "name": "Venezuela",
    "currency": "VES",
    "phone_code": "+58"
  },
  {
    "iso_code": "VN",
    "iso3": "VNM",
    "name": "Vietnam",
    "currency": "VND",
    "phone_code": "+84"
  },
  {
    "iso_code": "VG",
    "iso3": "VGB",
    "name": "Virgin Islands (British)",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "VI",
    "iso3": "VIR",
    "name": "Virgin Islands (US)",
    "currency": "USD",
    "phone_code": "+1"
  },
  {
    "iso_code": "WF",
    "iso3": "WLF",
    "name": "Wallis and Futuna Islands",
    "currency": "XPF",
    "phone_code": "+681"
  },
  {
    "iso_code": "EH",
    "iso3": "ESH",
    "name": "Western Sahara",
    "currency": "MAD",
    "phone_code": "+212"
  },
  {
    "iso_code": "YE",
    "iso3": "YEM",
    "name": "Yemen",
    "currency": "YER",
    "phone_code": "+967"
  },
  {
    "iso_code": "ZM",
    "iso3": "ZMB",
    "name": "Zambia",
    "currency": "ZMW",
    "phone_code": "+260"
  },
  {
    "iso_code": "ZW",
    "iso3": "ZWE",
    "name": "Zimbabwe",
    "currency": "ZWL",
    "phone_code": "+263"
  }
];
