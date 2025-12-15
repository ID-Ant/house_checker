let sectionWeights = null;
let offerStatusTimer;

const STATUS_VISIBILITY_MS = 5000;
const currencyInput = document.getElementById('currency');
const totalPointsInput = document.getElementById('totalPoints');
const regionSelect = document.getElementById('region');
const offerStatusBox = document.getElementById('offer-status');
const conditionList = document.getElementById('deduction-list');
const customWeights = {};

const deductionFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

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
    'Damp/Mold/Dew': 3200,
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
    'Damp/Mold/Dew': 2700,
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
    'Damp/Mold/Dew': 2100,
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
    'Damp/Mold/Dew': 1900,
    'Repaint required': 1100,
    'Textured Ceiling': 900,
    'Wallpaper removal': 750,
    'Windows/Frames require replacing': 2600
  },
  'House Exterior': {
    'Facias require replacing': 2300,
    'Damaged Roof / Repair Required': 8200,
    'Damp/Mold/Dew': 3600,
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
    'Damage/Mold/Dew/leakage': 1600,
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
  'london': 1.35,
  'south-east': 1.18,
  'south-west': 1.08
};

const REGION_WEIGHTS = Object.keys(REGION_FACTORS).reduce((acc, regionKey) => {
  acc[regionKey] = scaleWeights(BASE_SECTION_WEIGHTS, REGION_FACTORS[regionKey]);
  return acc;
}, {});

function formatCurrency(input) {
  if (!input) return;
  const sanitized = input.value.replace(/[^0-9.]/g, '').replace(/^0+/, '');
  const parsedValue = parseFloat(sanitized);
  input.value = Number.isFinite(parsedValue) ? parsedValue.toLocaleString('en-GB') : '';
}

document.addEventListener('DOMContentLoaded', () => {
  if (currencyInput) {
    currencyInput.value = '';
  }
  refreshDeductionPills();
  setupPillEditing();
});

function setOfferStatus(message, tone = 'info', persist = false) {
  if (!offerStatusBox) return;
  clearTimeout(offerStatusTimer);
  if (!message) {
    offerStatusBox.textContent = '';
    offerStatusBox.classList.add('is-hidden');
    offerStatusBox.classList.remove('alert--info', 'alert--success', 'alert--error');
    offerStatusBox.classList.add('alert--muted');
    return;
  }

  offerStatusBox.textContent = message;
  offerStatusBox.classList.remove('is-hidden', 'alert--muted', 'alert--info', 'alert--success', 'alert--error');
  offerStatusBox.classList.add(tone === 'muted' ? 'alert--muted' : `alert--${tone}`);

  if (!persist) {
    offerStatusTimer = setTimeout(() => {
      setOfferStatus('');
    }, STATUS_VISIBILITY_MS);
  }
}

function parseCurrencyValue(value) {
  const numeric = parseFloat(String(value || '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : NaN;
}

function resetAllCheckboxes() {
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((box) => {
    box.checked = false;
  });
}

function setCurrencyErrorState(hasError) {
  if (!currencyInput) return;
  const wrapper = currencyInput.closest('.currency-input');
  if (!wrapper) return;
  wrapper.classList.toggle('has-error', hasError);
  if (hasError) {
    currencyInput.setAttribute('aria-invalid', 'true');
  } else {
    currencyInput.removeAttribute('aria-invalid');
  }
}

function extractLabelText(labelElement) {
  if (!labelElement) return '';
  if (labelElement.dataset?.label) {
    return labelElement.dataset.label;
  }
  const clone = labelElement.cloneNode(true);
  clone.querySelectorAll('.tool-tip').forEach((tip) => tip.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function getOrCreateDeductionPill(labelElement) {
  let pill = labelElement.querySelector('.deduction-pill');
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'deduction-pill';
    pill.textContent = formatDeductionText(null);
    labelElement.appendChild(pill);
  }
  pill.tabIndex = 0;
  pill.setAttribute('role', 'textbox');
  const labelText = extractLabelText(labelElement);
  pill.setAttribute('aria-label', `Adjust deduction for ${labelText || 'item'}`);
  pill.setAttribute('title', 'Click to edit deduction');
  return pill;
}

function formatDeductionText(value) {
  if (value == null) {
    return sectionWeights ? 'TBC' : 'Select region';
  }
  if (!Number.isFinite(value) || value <= 0) return 'TBC';
  return `- ${deductionFormatter.format(value)}`;
}

function refreshDeductionPills() {
  const labels = document.querySelectorAll('.checkbox-group label');
  labels.forEach((label) => {
    const pill = getOrCreateDeductionPill(label);
    const labelText = extractLabelText(label);
    const sectionName = getSectionNameFromLabel(label);
    const customValue = getCustomWeight(sectionName, labelText);
    const deduction = getDeductionValue(sectionName, labelText);
    pill.textContent = formatDeductionText(deduction);
    pill.classList.toggle('is-custom', Number.isFinite(customValue));
  });
}

function resolveCheckboxValue(checkbox) {
  if (!checkbox) return 0;
  const labelElement = checkbox.closest('label');
  const label = extractLabelText(labelElement);
  const sectionName = getSectionNameFromLabel(labelElement);
  const value = getDeductionValue(sectionName, label);
  return Number.isFinite(value) ? value : 0;
}

function handleRegionSelection() {
  if (!regionSelect) return;
  const regionValue = regionSelect.value;
  const regionLabel = regionSelect.options[regionSelect.selectedIndex]?.text || '';

  if (!regionValue) {
    sectionWeights = null;
    setOfferStatus('Select the property region to unlock weighting for each checkbox.', 'info', true);
    resetAllCheckboxes();
    if (totalPointsInput) totalPointsInput.value = '';
    refreshDeductionPills();
    return;
  }

  const weights = REGION_WEIGHTS[regionValue];
  if (!weights) {
    sectionWeights = null;
    setOfferStatus(`${regionLabel} weights are still being modelled. Please choose another region.`, 'info', true);
    resetAllCheckboxes();
    if (totalPointsInput) totalPointsInput.value = '';
    refreshDeductionPills();
    return;
  }

  sectionWeights = weights;
  setOfferStatus(`Weights loaded for ${regionLabel}.`, 'success');
  refreshDeductionPills();
  updateTotal();
}

function updateTotal() {
  if (!currencyInput || !totalPointsInput) return;

  if (!sectionWeights) {
    resetAllCheckboxes();
    setOfferStatus('Choose a supported region before ticking the work required.', 'error');
    return;
  }

  const askingPrice = parseCurrencyValue(currencyInput.value);
  const checkedItems = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked'));

  if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
    setCurrencyErrorState(true);
    setOfferStatus('Enter the asking price to calculate a counter-offer.', 'error');
    resetAllCheckboxes();
    totalPointsInput.value = '';
    return;
  }

  setCurrencyErrorState(false);

  if (!checkedItems.length) {
    totalPointsInput.value = askingPrice.toLocaleString('en-GB');
    setOfferStatus('No deductions selected yet.', 'info');
    return;
  }

  let total = askingPrice;
  const missingLabels = new Set();

  checkedItems.forEach((checkbox) => {
    const deduction = resolveCheckboxValue(checkbox);
    if (!deduction) {
      missingLabels.add(extractLabelText(checkbox.parentElement));
    }
    total -= deduction;
  });

  totalPointsInput.value = Math.max(total, 0).toLocaleString('en-GB');

  if (missingLabels.size) {
    setOfferStatus(
      `Some selections still need weights: ${Array.from(missingLabels).join(', ')}. They were not deducted.`,
      'info',
      true
    );
  } else {
    setOfferStatus('Offer updated with the selected works.', 'success');
  }
}

function updateRoomCount(select) {
  const roomCount = parseInt(select.value, 10) || 0;
  const roomsGrid = document.getElementById('rooms-grid');
  if (!roomsGrid) return;

  const currentRoomCount = roomsGrid.querySelectorAll('.room-frame').length;
  if (currentRoomCount && roomCount !== currentRoomCount) {
    const confirmMessage = 'Are you sure you want to change the room count? Existing selections will be cleared.';
    if (!window.confirm(confirmMessage)) {
      select.value = currentRoomCount.toString();
      return;
    }
  }

  updateRoomDisplay(roomCount);
  updateTotal();
}

function updateRoomDisplay(roomCount) {
  const roomsGrid = document.getElementById('rooms-grid');
  if (!roomsGrid) return;
  roomsGrid.innerHTML = '';

  if (roomCount <= 0) {
    return;
  }

  const pointLabels = [
    'Size too small',
    'Requires painting',
    'Walls need work',
    'Damage/Mold/Dew/leakage',
    'Wallpaper removal',
    'Skirting/fixture replacing',
    'Textured Ceiling',
    'Windows require replacing'
  ];

  const createRow = () => {
    const row = document.createElement('div');
    row.className = 'rooms-row';
    roomsGrid.appendChild(row);
    return row;
  };

  let activeRow = createRow();

  for (let i = 0; i < roomCount; i += 1) {
    if (roomCount > 3 && i === 3) {
      activeRow = createRow();
    }

    const roomFrame = document.createElement('div');
    roomFrame.className = 'room-frame';

    const roomLabel = document.createElement('div');
    roomLabel.className = 'room-label';
    roomLabel.textContent = `Room ${i + 1}`;
    roomFrame.appendChild(roomLabel);

    const roomCheckboxGroup = document.createElement('div');
    roomCheckboxGroup.className = 'checkbox-row';

    pointLabels.forEach((labelText) => {
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.dataset.label = labelText;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => updateTotal());
      checkboxWrapper.appendChild(checkbox);

      const textSpan = document.createElement('span');
      textSpan.className = 'label-text';
      textSpan.textContent = labelText;
      checkboxWrapper.appendChild(textSpan);

      const pill = document.createElement('span');
      pill.className = 'deduction-pill';
      pill.textContent = formatDeductionText(null);
      checkboxWrapper.appendChild(pill);

      roomCheckboxGroup.appendChild(checkboxWrapper);
    });

    roomFrame.appendChild(roomCheckboxGroup);
    activeRow.appendChild(roomFrame);
  }

  refreshDeductionPills();
}

function getSectionNameFromLabel(labelElement) {
  if (!labelElement) return '';
  const group = labelElement.closest('.checkbox-group');
  if (!group) return '';
  if (group.dataset.section) return group.dataset.section;
  const header = group.querySelector('.checkbox-group-header');
  return header ? header.textContent.trim() : '';
}

function getCustomWeight(sectionName, label) {
  if (!sectionName || !label) return undefined;
  return customWeights[sectionName]?.[label];
}

function setCustomWeight(sectionName, label, value) {
  if (!sectionName || !label) return;
  if (!customWeights[sectionName]) customWeights[sectionName] = {};
  customWeights[sectionName][label] = value;
}

function clearCustomWeight(sectionName, label) {
  if (!sectionName || !label || !customWeights[sectionName]) return;
  delete customWeights[sectionName][label];
  if (!Object.keys(customWeights[sectionName]).length) {
    delete customWeights[sectionName];
  }
}

function getDeductionValue(sectionName, label) {
  if (!sectionName || !label) return null;
  const customValue = getCustomWeight(sectionName, label);
  if (Number.isFinite(customValue)) return customValue;
  if (!sectionWeights) return null;
  const bucket = sectionWeights[sectionName];
  if (!bucket) return null;
  const baseValue = bucket[label];
  return Number.isFinite(baseValue) ? baseValue : null;
}

function parseDeductionInput(value) {
  const sanitized = String(value).trim();
  if (!sanitized) return NaN;
  const numeric = Number(sanitized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? Math.abs(numeric) : NaN;
}

function setupPillEditing() {
  if (!conditionList) return;

  conditionList.addEventListener('click', (event) => {
    const pill = event.target.closest('.deduction-pill');
    if (pill) {
      startPillEditing(pill);
    }
  });

  conditionList.addEventListener('keydown', (event) => {
    const pill = event.target.closest('.deduction-pill');
    if (!pill || !pill.classList.contains('is-editing')) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      finishPillEditing(pill);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishPillEditing(pill, true);
    }
  });

  conditionList.addEventListener(
    'blur',
    (event) => {
      const pill = event.target.closest('.deduction-pill');
      if (pill) {
        finishPillEditing(pill);
      }
    },
    true
  );
}

function startPillEditing(pill) {
  if (!sectionWeights) {
    setOfferStatus('Select a region before editing deductions.', 'error');
    return;
  }
  if (pill.classList.contains('is-editing')) return;
  const label = pill.closest('label');
  if (!label) return;
  pill.dataset.original = pill.textContent;
  pill.classList.add('is-editing');
  pill.contentEditable = 'true';

  const checkbox = label.querySelector('input[type="checkbox"]');
  const currentValue = resolveCheckboxValue(checkbox);
  pill.textContent = Number.isFinite(currentValue) && currentValue > 0 ? String(currentValue) : '';

  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(pill);
    selection.removeAllRanges();
    selection.addRange(range);
  }, 0);

  pill.focus();
}

function finishPillEditing(pill, cancel = false) {
  if (!pill.classList.contains('is-editing')) return;
  const label = pill.closest('label');
  const labelText = extractLabelText(label);
  const sectionName = getSectionNameFromLabel(label);

  pill.contentEditable = 'false';
  pill.classList.remove('is-editing');

  if (!cancel) {
    const parsedValue = parseDeductionInput(pill.textContent);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      setCustomWeight(sectionName, labelText, parsedValue);
    } else {
      clearCustomWeight(sectionName, labelText);
    }
  }

  delete pill.dataset.original;
  refreshDeductionPills();
  updateTotal();
}

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

if (regionSelect) {
  regionSelect.addEventListener('change', handleRegionSelection);
  handleRegionSelection();
}
