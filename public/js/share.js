(function attachShareModule(window) {
  const app = window.HouseChecker;
  if (!app) return;

  const SHARE_PARAM = 'config';

  function getElements() {
    return {
      shareBtn: document.getElementById('share-link-btn'),
      shareOutput: document.getElementById('share-link-output'),
      shareStatus: document.getElementById('share-link-status'),
      regionSelect: document.getElementById('region'),
      propertyTypeSelect: document.getElementById('property-type'),
      roomCountSelect: document.getElementById('room-count'),
      askingPriceInput: document.getElementById('currency'),
      localAuthorityInput: document.getElementById('local-authority'),
      lastSoldValue: document.getElementById('last-sold-value'),
      lastSoldMeta: document.getElementById('last-sold-meta'),
      lastSoldChip: document.getElementById('last-sold-chip'),
      propertyFloatPanel: document.getElementById('property-float'),
      propertyFloatPrice: document.getElementById('property-float-price'),
      propertyFloatMeta: document.getElementById('property-float-meta')
    };
  }

  function stripTooltipText(labelElement) {
    if (!labelElement) return '';
    if (labelElement.dataset?.label) return labelElement.dataset.label;
    const clone = labelElement.cloneNode(true);
    clone.querySelectorAll('.tool-tip').forEach((tip) => tip.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function getSectionName(checkbox) {
    const group = checkbox.closest('.checkbox-group');
    if (!group) return '';
    if (group.dataset.section) return group.dataset.section;
    const header = group.querySelector('.checkbox-group-header');
    return header ? header.textContent.trim() : '';
  }

  function buildCheckboxKey(checkbox, counters) {
    const labelElement = checkbox.closest('label');
    const sectionName = getSectionName(checkbox) || 'unknown';
    const labelText = stripTooltipText(labelElement) || 'item';
    const keyBase = `${sectionName}__${labelText}`;
    const occurrence = (counters[keyBase] || 0) + 1;
    counters[keyBase] = occurrence;
    return `${keyBase}__${occurrence}`;
  }

  function serializeCheckboxes() {
    const counters = {};
    const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    return Array.from(checkboxes).map((checkbox) => ({
      key: buildCheckboxKey(checkbox, counters),
      checked: checkbox.checked
    }));
  }

  function serializeState() {
    const {
      regionSelect,
      propertyTypeSelect,
      roomCountSelect,
      askingPriceInput,
      localAuthorityInput,
      lastSoldValue,
      lastSoldMeta,
      lastSoldChip,
      propertyFloatPanel,
      propertyFloatPrice,
      propertyFloatMeta
    } = getElements();
    return {
      region: regionSelect?.value || '',
      propertyType: propertyTypeSelect?.value || '',
      roomCount: roomCountSelect?.value || '',
      askingPrice: askingPriceInput?.value || '',
      localAuthority: localAuthorityInput?.value || '',
      lastSold: {
        valueText: lastSoldValue?.textContent || '',
        metaText: lastSoldMeta?.textContent || '',
        chipText: lastSoldChip?.textContent || ''
      },
      propertyFloat: {
        priceText: propertyFloatPrice?.textContent || '',
        metaText: propertyFloatMeta?.textContent || '',
        visible: propertyFloatPanel?.classList.contains('is-visible') || false
      },
      checkboxes: serializeCheckboxes()
    };
  }

  function encodeState(state) {
    const json = JSON.stringify(state);
    return btoa(encodeURIComponent(json));
  }

  function decodeState(raw) {
    return JSON.parse(decodeURIComponent(atob(raw)));
  }

  function buildShareableUrl() {
    const url = new URL(window.location.href);
    const encoded = encodeState(serializeState());
    url.searchParams.set(SHARE_PARAM, encoded);
    return url.toString();
  }

  function setShareStatus(message) {
    const { shareStatus } = getElements();
    if (shareStatus) {
      shareStatus.textContent = message;
    }
  }

  function applyCheckboxes(savedStates) {
    if (!Array.isArray(savedStates)) return;
    const counters = {};
    const stateMap = savedStates.reduce((map, item) => {
      map[item.key] = item.checked;
      return map;
    }, {});

    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((checkbox) => {
      const key = buildCheckboxKey(checkbox, counters);
      if (Object.prototype.hasOwnProperty.call(stateMap, key)) {
        checkbox.checked = !!stateMap[key];
      }
    });
  }

  function applyStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(SHARE_PARAM);
    if (!raw) return;

    try {
      const savedState = decodeState(raw);
      const {
        regionSelect,
        propertyTypeSelect,
        roomCountSelect,
        askingPriceInput,
        localAuthorityInput,
        lastSoldValue,
        lastSoldMeta,
        lastSoldChip,
        propertyFloatPanel,
        propertyFloatPrice,
        propertyFloatMeta
      } = getElements();

      if (regionSelect && savedState.region) {
        regionSelect.value = savedState.region;
        regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (propertyTypeSelect && savedState.propertyType) {
        propertyTypeSelect.value = savedState.propertyType;
        propertyTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (localAuthorityInput && typeof savedState.localAuthority === 'string') {
        localAuthorityInput.value = savedState.localAuthority;
      }

      if (roomCountSelect && savedState.roomCount != null) {
        roomCountSelect.value = savedState.roomCount;
        app.deductions?.updateRoomCount?.(roomCountSelect);
      }

      if (askingPriceInput && savedState.askingPrice) {
        askingPriceInput.value = savedState.askingPrice;
        app.deductions?.formatCurrency?.(askingPriceInput);
      }

      if (savedState.lastSold) {
        if (lastSoldValue && savedState.lastSold.valueText) {
          lastSoldValue.textContent = savedState.lastSold.valueText;
        }
        if (lastSoldMeta && savedState.lastSold.metaText) {
          lastSoldMeta.textContent = savedState.lastSold.metaText;
        }
        if (lastSoldChip && savedState.lastSold.chipText) {
          lastSoldChip.textContent = savedState.lastSold.chipText;
        }
      }

      if (savedState.propertyFloat) {
        if (propertyFloatPrice && savedState.propertyFloat.priceText) {
          propertyFloatPrice.textContent = savedState.propertyFloat.priceText;
        }
        if (propertyFloatMeta && savedState.propertyFloat.metaText) {
          propertyFloatMeta.textContent = savedState.propertyFloat.metaText;
        }
        if (propertyFloatPanel) {
          propertyFloatPanel.classList.toggle('is-visible', !!savedState.propertyFloat.visible);
        }
      }

      applyCheckboxes(savedState.checkboxes);
      app.deductions?.updateTotal?.();
      setShareStatus('Loaded saved setup from link.');
    } catch (error) {
      console.warn('Unable to apply saved config from URL:', error);
      setShareStatus('Could not read the shared link.');
    }
  }

  function handleShareClick() {
    const { shareOutput } = getElements();
    const shareableUrl = buildShareableUrl();
    if (shareOutput) {
      shareOutput.value = shareableUrl;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(shareableUrl)
        .then(() => setShareStatus('Link copied to clipboard.'))
        .catch(() => {
          setShareStatus('Copy blocked. Use the textbox to copy manually.');
          shareOutput?.focus();
          shareOutput?.select();
        });
    } else {
      setShareStatus('Link ready. Copy it from the textbox.');
      shareOutput?.focus();
      shareOutput?.select();
    }
  }

  function init() {
    applyStateFromUrl();
    const { shareBtn } = getElements();
    if (shareBtn) {
      shareBtn.addEventListener('click', handleShareClick);
    }
  }

  app.share = {
    init,
    buildShareableUrl
  };
})(window);
