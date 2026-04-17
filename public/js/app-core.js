(function attachAppCore(window) {
  const HouseChecker = (window.HouseChecker = window.HouseChecker || {});

  HouseChecker.state = {
    sectionWeights: null,
    offerStatusTimer: null,
    marketSummary: null,
    customWeights: {},
    hasScrolledPastOffer: false,
    hasScrolledWithinChecklist: false,
    offerScrollThreshold: 0
  };

  const REGION_LOCATIONS_CLIENT = {
    'north-east': 'http://landregistry.data.gov.uk/id/region/north-east',
    'north-west': 'http://landregistry.data.gov.uk/id/region/north-west',
    'east-england': 'http://landregistry.data.gov.uk/id/region/east-of-england',
    'east-midlands': 'http://landregistry.data.gov.uk/id/region/east-midlands',
    london: 'http://landregistry.data.gov.uk/id/region/london',
    'south-east': 'http://landregistry.data.gov.uk/id/region/south-east',
    'south-west': 'http://landregistry.data.gov.uk/id/region/south-west',
    'west-midlands': 'http://landregistry.data.gov.uk/id/region/west-midlands',
    'yorkshire-humber': 'http://landregistry.data.gov.uk/id/region/yorkshire-and-the-humber'
  };

  const BASE_SECTION_WEIGHTS = {
    Garden: {
      'North, East or West facing': 1500,
      'High maintenance garden': 1200,
      'Requires one off professional landscaping': 4400,
      'Size just not quite right': 600,
      'Fencing requires replacing/work': 1200,
      'Rubble/Junk removal required': 1800,
      'No outside electric socket': 450,
      'No Water outlet': 650
    },
    Kitchen: {
      'Full Kitchen refurbishment': 15500,
      'Minor Kitchen refurbishment': 6200,
      'Damaged Walls / Repair Required': 2700,
      'Damp/Mould/Dew': 3200,
      'Rubble/Junk removal required': 1500,
      'Not enough counter space': 2100,
      'Not enough storage': 2100,
      'No Dishwasher': 800,
      'Textured Ceiling': 1300,
      'Wallpaper removal': 950,
      'Windows/Frames require replacing': 4600
    },
    Lounge: {
      'Full Lounge refurbishment': 11200,
      'Minor Lounge refurbishment': 5200,
      'Damaged Walls / Repair Required': 2600,
      'Damp/Mould/Dew': 2700,
      'Repaint required': 1400,
      Damage: 2000,
      'Textured Ceiling': 1200,
      'Wallpaper removal': 900,
      'Windows/Frames require replacing': 3600,
      'Fireplace/Log burner requires cleaning': 700
    },
    Toilet: {
      'Full Toilet refurbishment': 7600,
      'Minor Toilet refurbishment': 3600,
      'Damaged Walls / Repair Required': 1700,
      'Damp/Mould/Dew': 2100,
      'Repaint required': 1100,
      Damage: 1500,
      'Textured Ceiling': 900,
      'Wallpaper removal': 700,
      'No Shower': 2600,
      'Poor/No Ventilation': 1500,
      'Windows/Frames require replacing': 2300
    },
    Loft: {
      'No insulation': 3400,
      'Not boarded for storage': 1600,
      'No access ladder': 900
    },
    'Stairs/Stairwell/Hallway': {
      'Stairs require work': 3200,
      'Damaged Walls / Repair Required': 1700,
      'Damp/Mould/Dew': 1900,
      'Repaint required': 1100,
      'Textured Ceiling': 900,
      'Wallpaper removal': 750,
      'Windows/Frames require replacing': 2600
    },
    'House Exterior': {
      'Facias require replacing': 2300,
      'Damaged Roof / Repair Required': 8200,
      'Damp/Mould/Dew': 3600,
      'Repaint required': 2600,
      'No Driveway': 6400,
      'Driveway too small for required cars': 3600
    },
    'House General': {
      'Boiler outdated/no service history': 4700,
      'Electrics require replacing': 6200,
      'No Central Heating': 8800,
      'Rising Damp Symptoms': 7200,
      'Poor EPC Rating (C or above)': 3200,
      'No Drop Curve for drive': 2000
    },
    Bedrooms: {
      'Size too small': 2100,
      'Requires painting': 900,
      'Walls need work': 1200,
      'Damage/Mould/Dew/leakage': 1600,
      'Wallpaper removal': 850,
      'Skirting/fixture replacing': 750,
      'Textured Ceiling': 700,
      'Windows require replacing': 2500
    }
  };

  const REGION_FACTORS = {
    'north-east': 0.92,
    'north-west': 0.95,
    'yorkshire-humber': 0.97,
    'east-midlands': 1.0,
    'west-midlands': 1.03,
    'east-england': 1.1,
    london: 1.35,
    'south-east': 1.18,
    'south-west': 1.08
  };

  const deductionFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  });

  function scaleWeights(source, factor) {
    const scaled = {};
    Object.entries(source).forEach(([section, entries]) => {
      if (typeof entries !== 'object' || entries === null) {
        scaled[section] = entries;
        return;
      }
      scaled[section] = {};
      Object.entries(entries).forEach(([label, value]) => {
        scaled[section][label] = Math.round(value * factor);
      });
    });
    return scaled;
  }

  const REGION_WEIGHTS = Object.keys(REGION_FACTORS).reduce((acc, regionKey) => {
    acc[regionKey] = scaleWeights(BASE_SECTION_WEIGHTS, REGION_FACTORS[regionKey]);
    return acc;
  }, {});

  HouseChecker.config = {
    REGION_LOCATIONS_CLIENT,
    REGION_FACTORS,
    REGION_WEIGHTS
  };

  HouseChecker.helpers = {
    deductionFormatter,
    parseCurrencyValue(value) {
      const numeric = parseFloat(String(value || '').replace(/,/g, ''));
      return Number.isFinite(numeric) ? numeric : NaN;
    },
    formatCurrencyForDisplay(value) {
      if (!Number.isFinite(value)) return '—';
      return Number(value).toLocaleString('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0
      });
    },
    updateTextContent(targets, value) {
      targets.forEach((element) => {
        if (element) element.textContent = value;
      });
    }
  };

  HouseChecker.utils = {
    scaleWeights
  };
})(window);
