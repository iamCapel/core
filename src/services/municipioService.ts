const LOCAL_STORAGE_KEY = 'mopc_municipios_data';
const LOCAL_STORAGE_TIMESTAMP = 'mopc_municipios_last_update';
const LOCAL_STORAGE_USER_MUNICIPIOS = 'mopc_municipios_user_added';
const LOCAL_STORAGE_USER_DISTRITOS = 'mopc_distritos_user_added';

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

interface MunicipiosByProvincia {
  [provincia: string]: {
    municipios: string[];
    distritos?: Record<string, string[]>;
  };
}

export interface MunicipiosData {
  provinces: string[];
  municipalities: MunicipiosByProvincia;
}

// Datos por defecto - estructura básica inicial
const defaultDataStructure: MunicipiosData = {
  provinces: [],
  municipalities: {}
};

const loadFromLocalStorage = (): MunicipiosData | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MunicipiosData;
    return parsed;
  } catch (err) {
    console.warn('Error reading municipios cache', err);
    return null;
  }
};

const saveToLocalStorage = (data: MunicipiosData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(LOCAL_STORAGE_TIMESTAMP, Date.now().toString());
  } catch (err) {
    console.warn('Error saving municipios cache', err);
  }
};

const getLastUpdated = (): number => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TIMESTAMP);
    if (!raw) return 0;
    return Number(raw) || 0;
  } catch {
    return 0;
  }
};

const getUserAddedMunicipios = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_MUNICIPIOS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const getUserAddedDistritos = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_DISTRITOS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveUserAddedMunicipios = (data: Record<string, string[]>) => {
  localStorage.setItem(LOCAL_STORAGE_USER_MUNICIPIOS, JSON.stringify(data));
};

const saveUserAddedDistritos = (data: Record<string, string[]>) => {
  localStorage.setItem(LOCAL_STORAGE_USER_DISTRITOS, JSON.stringify(data));
};

const defaultMunicipiosData = async (): Promise<MunicipiosData> => {
  return defaultDataStructure;
};

const fetchRemoteMunicipiosData = async (): Promise<MunicipiosData> => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/iamCapel/CORE-APK/main/src/data/municipios.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se obtuvo data remota');
    const json = (await response.json()) as MunicipiosData;
    return json;
  } catch (err) {
    console.warn('Error haciendo fetch de municipio remoto:', err);
    return defaultDataStructure;
  }
};

const mergeUserAdditions = (data: MunicipiosData): MunicipiosData => {
  const municipalities = { ...data.municipalities };
  const userMun = getUserAddedMunicipios();
  const userDis = getUserAddedDistritos();

  Object.keys(userMun).forEach(prov => {
    const list = municipalities[prov]?.municipios || [];
    const merged = Array.from(new Set([...list, ...userMun[prov]])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    municipalities[prov] = {
      ...municipalities[prov],
      municipios: merged
    };
  });

  Object.keys(userDis).forEach(mun => {
    let found = false;
    for (const prov of Object.keys(municipalities)) {
      if (municipalities[prov].municipios.includes(mun)) {
        const existingDistrito = municipalities[prov].distritos || {};
        const current = existingDistrito[mun] || [];
        existingDistrito[mun] = Array.from(new Set([...current, ...userDis[mun]])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        municipalities[prov] = {
          ...municipalities[prov],
          distritos: existingDistrito
        };
        found = true;
        break;
      }
    }
    if (!found) {
      // Si municipio agregado no existe, no hacemos nada
    }
  });

  return {
    ...data,
    municipalities
  };
};

const refreshMunicipiosData = async (): Promise<MunicipiosData> => {
  const remote = await fetchRemoteMunicipiosData();
  const merged = mergeUserAdditions(remote);
  saveToLocalStorage(merged);
  return merged;
};

export const getMunicipios = async (): Promise<MunicipiosData> => {
  const cached = loadFromLocalStorage();
  const last = getLastUpdated();
  const now = Date.now();

  if (!cached) {
    const base = await defaultMunicipiosData();
    saveToLocalStorage(base);
    return mergeUserAdditions(base);
  }

  if (now - last >= FIFTEEN_DAYS_MS) {
    refreshMunicipiosData().catch(() => {
      console.warn('Fallo actualización automática de municipios.');
    });
  }

  return mergeUserAdditions(cached);
};

export const addUserMunicipio = (provincia: string, municipio: string) => {
  const normalized = municipio.trim();
  if (!normalized) return;

  const existing = getUserAddedMunicipios();
  const list = existing[provincia] || [];
  if (!list.includes(normalized)) {
    existing[provincia] = [...list, normalized].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    saveUserAddedMunicipios(existing);
  }
};

export const addUserDistrito = (municipio: string, distrito: string) => {
  const normalized = distrito.trim();
  if (!normalized) return;

  const existing = getUserAddedDistritos();
  const list = existing[municipio] || [];
  if (!list.includes(normalized)) {
    existing[municipio] = [...list, normalized].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    saveUserAddedDistritos(existing);
  }
};

export const getRemoteRefreshInterval = () => FIFTEEN_DAYS_MS;
