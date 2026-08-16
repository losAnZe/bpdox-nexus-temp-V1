import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MASTER_COUNTRIES } from '../data/countries';
import { COUNTRY_STATES } from '../data/states';

const router = Router();
const prisma = new PrismaClient();

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
    MASTER_COUNTRIES.forEach((c: any) => countryMap.set(c.name, c));
    
    // DB list takes precedence
    dbCountries.forEach((c: any) => countryMap.set(c.name, c));

    const result = Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(result);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.json(MASTER_COUNTRIES);
  }
});

export default router;
