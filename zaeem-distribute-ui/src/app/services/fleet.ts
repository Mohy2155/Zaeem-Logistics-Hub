import type { Machinery } from './company';

// Machine catalogue and fleet sizes live client-side until the API exposes them.
export const MACHINERY_CATALOG: Machinery[] = [
  { id: 101, name: 'Excavator X3000', category: 'Heavy Duty', dailyRate: 450 },
  { id: 102, name: 'Caterpillar Loader', category: 'Construction', dailyRate: 320 },
  { id: 103, name: 'Tower Crane T1', category: 'Cranes', dailyRate: 850 },
  { id: 104, name: 'Bulldozer D9', category: 'Earthmoving', dailyRate: 550 },
  { id: 105, name: 'Asphalt Paver', category: 'Roadwork', dailyRate: 400 },
];

/** Units owned per machine model. */
export const FLEET_INVENTORY: Readonly<Record<string, number>> = {
  'Excavator X3000': 5,
  'Caterpillar Loader': 5,
  'Tower Crane T1': 2,
  'Bulldozer D9': 4,
  'Asphalt Paver': 3,
};
