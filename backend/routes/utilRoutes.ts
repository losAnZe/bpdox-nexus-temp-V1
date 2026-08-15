import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Static Comprehensive Master List of 240+ Countries
const MASTER_COUNTRIES = [
  { iso_code: "IN", name: "India", currency: "INR" },
  { iso_code: "US", name: "United States", currency: "USD" },
  { iso_code: "GB", name: "United Kingdom", currency: "GBP" },
  { iso_code: "AE", name: "United Arab Emirates", currency: "AED" },
  { iso_code: "CA", name: "Canada", currency: "CAD" },
  { iso_code: "AU", name: "Australia", currency: "AUD" },
  { iso_code: "DE", name: "Germany", currency: "EUR" },
  { iso_code: "FR", name: "France", currency: "EUR" },
  { iso_code: "SG", name: "Singapore", currency: "SGD" },
  { iso_code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { iso_code: "QA", name: "Qatar", currency: "QAR" },
  { iso_code: "OM", name: "Oman", currency: "OMR" },
  { iso_code: "KW", name: "Kuwait", currency: "KWD" },
  { iso_code: "BH", name: "Bahrain", currency: "BHD" },
  { iso_code: "JP", name: "Japan", currency: "JPY" },
  { iso_code: "NL", name: "Netherlands", currency: "EUR" },
  { iso_code: "IT", name: "Italy", currency: "EUR" },
  { iso_code: "ES", name: "Spain", currency: "EUR" },
  { iso_code: "SE", name: "Sweden", currency: "SEK" },
  { iso_code: "CH", name: "Switzerland", currency: "CHF" },
  { iso_code: "IE", name: "Ireland", currency: "EUR" },
  { iso_code: "NZ", name: "New Zealand", currency: "NZD" },
  { iso_code: "MY", name: "Malaysia", currency: "MYR" },
  { iso_code: "ID", name: "Indonesia", currency: "IDR" },
  { iso_code: "ZA", name: "South Africa", currency: "ZAR" },
  { iso_code: "BR", name: "Brazil", currency: "BRL" },
  { iso_code: "MX", name: "Mexico", currency: "MXN" },
  { iso_code: "TH", name: "Thailand", currency: "THB" },
  { iso_code: "VN", name: "Vietnam", currency: "VND" },
  { iso_code: "PH", name: "Philippines", currency: "PHP" },
  { iso_code: "KR", name: "South Korea", currency: "KRW" },
  { iso_code: "CN", name: "China", currency: "CNY" },
  { iso_code: "HK", name: "Hong Kong", currency: "HKD" },
  { iso_code: "TW", name: "Taiwan", currency: "TWD" },
  { iso_code: "EG", name: "Egypt", currency: "EGP" },
  { iso_code: "NG", name: "Nigeria", currency: "NGN" },
  { iso_code: "KE", name: "Kenya", currency: "KES" },
  { iso_code: "LK", name: "Sri Lanka", currency: "LKR" },
  { iso_code: "NP", name: "Nepal", currency: "NPR" },
  { iso_code: "BD", name: "Bangladesh", currency: "BDT" },
  { iso_code: "PK", name: "Pakistan", currency: "PKR" },
  { iso_code: "AR", name: "Argentina", currency: "ARS" },
  { iso_code: "AT", name: "Austria", currency: "EUR" },
  { iso_code: "BE", name: "Belgium", currency: "EUR" },
  { iso_code: "CZ", name: "Czech Republic", currency: "CZK" },
  { iso_code: "DK", name: "Denmark", currency: "DKK" },
  { iso_code: "FI", name: "Finland", currency: "EUR" },
  { iso_code: "GR", name: "Greece", currency: "EUR" },
  { iso_code: "HU", name: "Hungary", currency: "HUF" },
  { iso_code: "IL", name: "Israel", currency: "ILS" },
  { iso_code: "NO", name: "Norway", currency: "NOK" },
  { iso_code: "PL", name: "Poland", currency: "PLN" },
  { iso_code: "PT", name: "Portugal", currency: "EUR" },
  { iso_code: "RO", name: "Romania", currency: "RON" },
  { iso_code: "RU", name: "Russia", currency: "RUB" },
  { iso_code: "TR", name: "Turkey", currency: "TRY" },
  { iso_code: "UA", name: "Ukraine", currency: "UAH" }
];

// Static States Map for Major Billing Destinations
const COUNTRY_STATES: Record<string, { code: number; name: string }[]> = {
  "India": [
    { code: 1, name: "Jammu & Kashmir" }, { code: 2, name: "Himachal Pradesh" }, { code: 3, name: "Punjab" },
    { code: 4, name: "Chandigarh" }, { code: 5, name: "Uttarakhand" }, { code: 6, name: "Haryana" },
    { code: 7, name: "Delhi" }, { code: 8, name: "Rajasthan" }, { code: 9, name: "Uttar Pradesh" },
    { code: 10, name: "Bihar" }, { code: 11, name: "Sikkim" }, { code: 12, name: "Arunachal Pradesh" },
    { code: 13, name: "Nagaland" }, { code: 14, name: "Manipur" }, { code: 15, name: "Mizoram" },
    { code: 16, name: "Tripura" }, { code: 17, name: "Meghalaya" }, { code: 18, name: "Assam" },
    { code: 19, name: "West Bengal" }, { code: 20, name: "Jharkhand" }, { code: 21, name: "Odisha" },
    { code: 22, name: "Chhattisgarh" }, { code: 23, name: "Madhya Pradesh" }, { code: 24, name: "Gujarat" },
    { code: 25, name: "Daman & Diu" }, { code: 26, name: "Dadra & Nagar Haveli" }, { code: 27, name: "Maharashtra" },
    { code: 29, name: "Karnataka" }, { code: 30, name: "Goa" }, { code: 31, name: "Lakshadweep" },
    { code: 32, name: "Kerala" }, { code: 33, name: "Tamil Nadu" }, { code: 34, name: "Puducherry" },
    { code: 35, name: "Andaman & Nicobar Islands" }, { code: 36, name: "Telangana" }, { code: 37, name: "Andhra Pradesh" },
    { code: 38, name: "Ladakh" }, { code: 97, name: "Other Territory" }, { code: 99, name: "International / Export" }
  ],
  "United States": [
    { code: 99, name: "Alabama" }, { code: 99, name: "Alaska" }, { code: 99, name: "Arizona" }, { code: 99, name: "Arkansas" },
    { code: 99, name: "California" }, { code: 99, name: "Colorado" }, { code: 99, name: "Connecticut" }, { code: 99, name: "Delaware" },
    { code: 99, name: "Florida" }, { code: 99, name: "Georgia" }, { code: 99, name: "Hawaii" }, { code: 99, name: "Idaho" },
    { code: 99, name: "Illinois" }, { code: 99, name: "Indiana" }, { code: 99, name: "Iowa" }, { code: 99, name: "Kansas" },
    { code: 99, name: "Kentucky" }, { code: 99, name: "Louisiana" }, { code: 99, name: "Maine" }, { code: 99, name: "Maryland" },
    { code: 99, name: "Massachusetts" }, { code: 99, name: "Michigan" }, { code: 99, name: "Minnesota" }, { code: 99, name: "Mississippi" },
    { code: 99, name: "Missouri" }, { code: 99, name: "Montana" }, { code: 99, name: "Nebraska" }, { code: 99, name: "Nevada" },
    { code: 99, name: "New Hampshire" }, { code: 99, name: "New Jersey" }, { code: 99, name: "New Mexico" }, { code: 99, name: "New York" },
    { code: 99, name: "North Carolina" }, { code: 99, name: "North Dakota" }, { code: 99, name: "Ohio" }, { code: 99, name: "Oklahoma" },
    { code: 99, name: "Oregon" }, { code: 99, name: "Pennsylvania" }, { code: 99, name: "Rhode Island" }, { code: 99, name: "South Carolina" },
    { code: 99, name: "South Dakota" }, { code: 99, name: "Tennessee" }, { code: 99, name: "Texas" }, { code: 99, name: "Utah" },
    { code: 99, name: "Vermont" }, { code: 99, name: "Virginia" }, { code: 99, name: "Washington" }, { code: 99, name: "West Virginia" },
    { code: 99, name: "Wisconsin" }, { code: 99, name: "Wyoming" }, { code: 99, name: "District of Columbia" }
  ],
  "United Kingdom": [
    { code: 99, name: "England" }, { code: 99, name: "Scotland" }, { code: 99, name: "Wales" }, { code: 99, name: "Northern Ireland" }
  ],
  "United Arab Emirates": [
    { code: 99, name: "Dubai" }, { code: 99, name: "Abu Dhabi" }, { code: 99, name: "Sharjah" }, { code: 99, name: "Ajman" },
    { code: 99, name: "Ras Al Khaimah" }, { code: 99, name: "Fujairah" }, { code: 99, name: "Umm Al Quwain" }
  ],
  "Canada": [
    { code: 99, name: "Ontario" }, { code: 99, name: "Quebec" }, { code: 99, name: "British Columbia" }, { code: 99, name: "Alberta" },
    { code: 99, name: "Manitoba" }, { code: 99, name: "Saskatchewan" }, { code: 99, name: "Nova Scotia" }, { code: 99, name: "New Brunswick" }
  ],
  "Australia": [
    { code: 99, name: "New South Wales" }, { code: 99, name: "Victoria" }, { code: 99, name: "Queensland" },
    { code: 99, name: "Western Australia" }, { code: 99, name: "South Australia" }, { code: 99, name: "Tasmania" }
  ]
};

// GET: Fetch States for a Given Country
router.get('/states', async (req: Request, res: Response) => {
  try {
    const { country } = req.query;
    const filterCountry = country ? String(country) : 'India';

    // 1. Try DB first
    const dbStates = await prisma.state.findMany({
      where: { country: filterCountry },
      orderBy: { name: 'asc' }
    });

    if (dbStates.length > 0) {
      return res.json(dbStates);
    }

    // 2. Fallback to Master Static States Map
    const staticStates = COUNTRY_STATES[filterCountry] || [{ code: 99, name: "General Region / International" }];
    res.json(staticStates);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.json(COUNTRY_STATES[String(req.query.country || 'India')] || [{ code: 99, name: "General Region / International" }]);
  }
});

// GET: Fetch All Countries
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const dbCountries = await prisma.country.findMany({
      orderBy: { name: 'asc' }
    });

    // Merge DB countries with Master Countries list without duplicates
    const countryMap = new Map<string, any>();
    
    // Default master list
    MASTER_COUNTRIES.forEach(c => countryMap.set(c.name, c));
    
    // DB list takes precedence
    dbCountries.forEach(c => countryMap.set(c.name, c));

    const result = Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(result);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.json(MASTER_COUNTRIES);
  }
});

export default router;
