(function attachDeductionModule(window) {
  const app = window.HouseChecker;
  if (!app) return;
  const { state } = app;
  const { REGION_WEIGHTS } = app.config;
  const { deductionFormatter, parseCurrencyValue } = app.helpers;

  const STATUS_VISIBILITY_MS = 5000;
  const currencyInput = document.getElementById('currency');
  const totalPointsInput = document.getElementById('totalPoints');
  const regionSelect = document.getElementById('region');
  const offerStatusBox = document.getElementById('offer-status');
  const conditionList = document.getElementById('deduction-list');
  const propertyTypeSelect = document.getElementById('property-type');

  function init() {
    if (currencyInput) {
      currencyInput.value = '';
    }
    refreshDeductionPills();
    setupPillEditing();

    if (propertyTypeSelect) {
      propertyTypeSelect.addEventListener('change', () => {
        if (state.sectionWeights && regionSelect?.value) {
          app.market.loadRegion(regionSelect.value);
        }
      });
    }

    if (regionSelect) {
      regionSelect.addEventListener('change', handleRegionSelection);
      handleRegionSelection();
    }
  }

  function formatCurrency(input) {
    if (!input) return;
    const sanitized = input.value.replace(/[^0-9.]/g, '').replace(/^0+/, '');
    const parsedValue = parseFloat(sanitized);
    input.value = Number.isFinite(parsedValue) ? parsedValue.toLocaleString('en-GB') : '';
    app.market.updateComparisons();
  }

  function setOfferStatus(message, tone = 'info', persist = false) {
    if (!offerStatusBox) return;
    clearTimeout(state.offerStatusTimer);
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
      state.offerStatusTimer = setTimeout(() => {
        setOfferStatus('');
      }, STATUS_VISIBILITY_MS);
    }
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
      return state.sectionWeights ? 'TBC' : 'Select region';
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
      state.sectionWeights = null;
      setOfferStatus('Select the property region to unlock weighting for each checkbox.', 'info', true);
      resetAllCheckboxes();
      if (totalPointsInput) totalPointsInput.value = '';
      refreshDeductionPills();
      state.marketSummary = null;
      app.market.setStatus('Select a region to fetch market data.');
      app.market.updateComparisons();
      return;
    }

    const weights = REGION_WEIGHTS[regionValue];
    if (!weights) {
      state.sectionWeights = null;
      setOfferStatus(`${regionLabel} weights are still being modelled. Please choose another region.`, 'info', true);
      resetAllCheckboxes();
      if (totalPointsInput) totalPointsInput.value = '';
      refreshDeductionPills();
      state.marketSummary = null;
      app.market.setStatus(`${regionLabel} market data is not available yet.`);
      app.market.updateComparisons();
      return;
    }

    state.sectionWeights = weights;
    setOfferStatus(`Weights loaded for ${regionLabel}.`, 'success');
    refreshDeductionPills();
    app.market.loadRegion(regionValue);
    updateTotal();
  }

  function updateTotal() {
    if (!currencyInput || !totalPointsInput) return;

    if (!state.sectionWeights) {
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
      app.market.updateComparisons();
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

    app.market.updateComparisons();
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
      'Damage/Mould/Dew/leakage',
      'Wallpaper removal',
      'Skirting/fixture replacing',
      'Textured Ceiling',
      'Windows require replacing'
    ];

    const row = document.createElement('div');
    row.className = 'rooms-row';
    roomsGrid.appendChild(row);

    for (let i = 0; i < roomCount; i += 1) {
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
      row.appendChild(roomFrame);
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
    return state.customWeights[sectionName]?.[label];
  }

  function setCustomWeight(sectionName, label, value) {
    if (!sectionName || !label) return;
    if (!state.customWeights[sectionName]) state.customWeights[sectionName] = {};
    state.customWeights[sectionName][label] = value;
  }

  function clearCustomWeight(sectionName, label) {
    if (!sectionName || !label || !state.customWeights[sectionName]) return;
    delete state.customWeights[sectionName][label];
    if (!Object.keys(state.customWeights[sectionName]).length) {
      delete state.customWeights[sectionName];
    }
  }

  function getDeductionValue(sectionName, label) {
    if (!sectionName || !label) return null;
    const customValue = getCustomWeight(sectionName, label);
    if (Number.isFinite(customValue)) return customValue;
    if (!state.sectionWeights) return null;
    const bucket = state.sectionWeights[sectionName];
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
    if (!state.sectionWeights) {
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

  app.deductions = {
    init,
    updateTotal,
    updateRoomCount,
    formatCurrency
  };

  window.formatCurrency = formatCurrency;
  window.updateRoomCount = updateRoomCount;
  window.updateTotal = () => updateTotal();
})(window);
