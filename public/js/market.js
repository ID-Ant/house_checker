(function attachMarketModule(window) {
  const app = window.HouseChecker;
  if (!app) return;
  const { state } = app;
  const { REGION_LOCATIONS_CLIENT } = app.config;
  const { parseCurrencyValue, formatCurrencyForDisplay, updateTextContent } = app.helpers;

  const UK_POSTCODE_REGEX =
    /^((GIR)\s?0AA|((([A-PR-UWYZ][0-9][0-9]?)|(([A-PR-UWYZ][A-HK-Y][0-9][0-9]?)|(([A-PR-UWYZ][0-9][A-HJKPS-UW])|([A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY]))))\s?[0-9][ABD-HJLNP-UW-Z]{2}))$/i;
  const FOOTER_REVEAL_DISTANCE = 120;

  const REGION_KEYWORDS_MAP = {
    'county durham': 'north-east',
    durham: 'north-east',
    'tyne and wear': 'north-east',
    'northumberland': 'north-east',
    'tees valley': 'north-east',
    'cumbria': 'north-west',
    'lancashire': 'north-west',
    'greater manchester': 'north-west',
    'manchester': 'north-west',
    'merseyside': 'north-west',
    'cheshire': 'north-west',
    'west yorkshire': 'yorkshire-humber',
    'south yorkshire': 'yorkshire-humber',
    'north yorkshire': 'yorkshire-humber',
    'east riding': 'yorkshire-humber',
    'humberside': 'yorkshire-humber',
    'lincolnshire': 'east-midlands',
    'nottinghamshire': 'east-midlands',
    'derbyshire': 'east-midlands',
    'leicestershire': 'east-midlands',
    'rutland': 'east-midlands',
    'northamptonshire': 'east-midlands',
    'west midlands': 'west-midlands',
    'birmingham': 'west-midlands',
    'warwickshire': 'west-midlands',
    'worcestershire': 'west-midlands',
    'staffordshire': 'west-midlands',
    'shropshire': 'west-midlands',
    'herefordshire': 'west-midlands',
    'gloucestershire': 'south-west',
    'bristol': 'south-west',
    'somerset': 'south-west',
    'wiltshire': 'south-west',
    'devon': 'south-west',
    'cornwall': 'south-west',
    'dorset': 'south-west',
    'isles of scilly': 'south-west',
    'oxfordshire': 'south-east',
    'buckinghamshire': 'south-east',
    'berkshire': 'south-east',
    'surrey': 'south-east',
    'kent': 'south-east',
    'east sussex': 'south-east',
    'west sussex': 'south-east',
    'hampshire': 'south-east',
    'isle of wight': 'south-east',
    'bedfordshire': 'east-england',
    'hertfordshire': 'east-england',
    'cambridgeshire': 'east-england',
    'norfolk': 'east-england',
    'suffolk': 'east-england',
    'essex': 'east-england',
    'greater london': 'london',
    london: 'london'
  };

  const POSTCODE_REGION_MAP = {
    B: 'west-midlands',
    BB: 'north-west',
    BD: 'yorkshire-humber',
    BH: 'south-west',
    BL: 'north-west',
    BN: 'south-east',
    BR: 'london',
    CA: 'north-west',
    CB: 'east-england',
    CF: 'west-midlands',
    CH: 'north-west',
    CM: 'east-england',
    CO: 'east-england',
    CR: 'london',
    CT: 'south-east',
    CV: 'west-midlands',
    CW: 'north-west',
    DA: 'south-east',
    DD: 'north-east',
    DE: 'east-midlands',
    DH: 'north-east',
    DL: 'north-east',
    DN: 'yorkshire-humber',
    DT: 'south-west',
    DY: 'west-midlands',
    E: 'london',
    EC: 'london',
    EN: 'east-england',
    EX: 'south-west',
    FY: 'north-west',
    G: 'north-west',
    GL: 'south-west',
    GU: 'south-east',
    HA: 'london',
    HD: 'yorkshire-humber',
    HG: 'yorkshire-humber',
    HP: 'south-east',
    HR: 'west-midlands',
    HU: 'yorkshire-humber',
    HX: 'yorkshire-humber',
    IG: 'london',
    IP: 'east-england',
    L: 'north-west',
    LA: 'north-west',
    LE: 'east-midlands',
    LN: 'east-midlands',
    LS: 'yorkshire-humber',
    LU: 'east-england',
    M: 'north-west',
    ME: 'south-east',
    MK: 'south-east',
    N: 'london',
    NE: 'north-east',
    NG: 'east-midlands',
    NN: 'east-midlands',
    NP: 'west-midlands',
    NR: 'east-england',
    NW: 'london',
    OL: 'north-west',
    OX: 'south-east',
    PE: 'east-england',
    PL: 'south-west',
    PO: 'south-east',
    PR: 'north-west',
    RG: 'south-east',
    RH: 'south-east',
    RM: 'london',
    S: 'yorkshire-humber',
    SA: 'west-midlands',
    SE: 'london',
    SG: 'east-england',
    SK: 'north-west',
    SL: 'south-east',
    SM: 'london',
    SN: 'south-west',
    SO: 'south-east',
    SP: 'south-east',
    SR: 'north-east',
    SS: 'east-england',
    ST: 'west-midlands',
    SW: 'london',
    SY: 'west-midlands',
    TA: 'south-west',
    TF: 'west-midlands',
    TN: 'south-east',
    TQ: 'south-west',
    TR: 'south-west',
    TS: 'north-east',
    TW: 'london',
    UB: 'london',
    WA: 'north-west',
    WC: 'london',
    WD: 'east-england',
    WF: 'yorkshire-humber',
    WN: 'north-west',
    WR: 'west-midlands',
    WS: 'west-midlands',
    WV: 'west-midlands',
    YO: 'yorkshire-humber'
  };

  const PROPERTY_TYPE_MAP = {
    detached: 'detached',
    'semi-detached': 'semi-detached',
    semidetached: 'semi-detached',
    terraced: 'terraced',
    'flat/maisonette': 'flat',
    flat: 'flat',
    maisonette: 'flat',
    bungalow: 'detached',
    'park home': 'all'
  };

  let lastFocusedBeforeModal = null;
  let isLandRegistryModalOpen = false;
  let propertyFloatHasData = false;
  let landRegistryRequestController = null;

  const dom = {
    currencyInput: null,
    totalPointsInput: null,
    regionSelect: null,
    localAuthorityInput: null,
    propertyTypeSelect: null,
    conditionList: null,
    offerPanel: null,
    offerStickyShell: null,
    offerStickyFields: null,
    siteFooter: null,
    marketStatusBox: null,
    marketMetricsBox: null,
    metricLatestEls: [],
    metricChangeEls: [],
    metricVsAskingEls: [],
    metricAskingMetaEls: [],
    metricVsCounterEls: [],
    metricCounterMetaEls: [],
    metricAskingCards: [],
    metricCounterCards: [],
    metricAskingChips: [],
    metricCounterChips: [],
    lastSoldCard: null,
    lastSoldValue: null,
    lastSoldMeta: null,
    lastSoldChip: null,
    marketFloatPanel: null,
    propertyFloatPanel: null,
    propertyFloatPrice: null,
    propertyFloatMeta: null,
    postcodeInput: null,
    postcodeError: null,
    addressSubmitButton: null,
    addressBuildingInput: null,
    addressStreetInput: null,
    addressBuildingError: null,
    addressStreetError: null,
    landRegistryModal: null,
    landRegistryCloseButton: null,
    landRegistryModalStatus: null,
    landRegistryResults: null,
    landRegistryAddressLine: null,
    landRegistryAddressMeta: null,
    landRegistryHistoryBody: null
  };

  function collectTargets(...ids) {
    return ids.map((id) => document.getElementById(id)).filter(Boolean);
  }

  function init() {
    dom.currencyInput = document.getElementById('currency');
    dom.totalPointsInput = document.getElementById('totalPoints');
    dom.regionSelect = document.getElementById('region');
    dom.localAuthorityInput = document.getElementById('local-authority');
    dom.propertyTypeSelect = document.getElementById('property-type');
    dom.conditionList = document.getElementById('deduction-list');
    dom.offerPanel = document.querySelector('.panel--offer');
    dom.offerStickyShell = document.querySelector('.offer-sticky-shell');
    dom.offerStickyFields = document.querySelector('.offer-sticky-fields');
    dom.siteFooter = document.querySelector('.site-footer');
    dom.marketStatusBox = document.getElementById('market-status');
    dom.marketMetricsBox = document.getElementById('market-metrics');
    dom.metricLatestEls = collectTargets('market-latest', 'market-latest-floating');
    dom.metricChangeEls = collectTargets('market-change', 'market-change-floating');
    dom.metricVsAskingEls = collectTargets('market-vs-asking', 'market-vs-asking-floating');
    dom.metricAskingMetaEls = collectTargets('market-asking-meta', 'market-asking-meta-floating');
    dom.metricVsCounterEls = collectTargets('market-vs-counter', 'market-vs-counter-floating');
    dom.metricCounterMetaEls = collectTargets('market-counter-meta', 'market-counter-meta-floating');
    dom.metricAskingCards = collectTargets('market-asking-card', 'market-asking-card-floating');
    dom.metricCounterCards = collectTargets('market-counter-card', 'market-counter-card-floating');
    dom.metricAskingChips = collectTargets('market-asking-chip', 'market-asking-chip-floating');
    dom.metricCounterChips = collectTargets('market-counter-chip', 'market-counter-chip-floating');
    dom.lastSoldCard = document.getElementById('last-sold-card');
    dom.lastSoldValue = document.getElementById('last-sold-value');
    dom.lastSoldMeta = document.getElementById('last-sold-meta');
    dom.lastSoldChip = document.getElementById('last-sold-chip');
    dom.marketFloatPanel = document.getElementById('market-float');
    dom.propertyFloatPanel = document.getElementById('property-float');
    dom.propertyFloatPrice = document.getElementById('property-float-price');
    dom.propertyFloatMeta = document.getElementById('property-float-meta');
    dom.postcodeInput = document.getElementById('address-postcode');
    dom.postcodeError = document.getElementById('address-postcode-error');
    dom.addressSubmitButton = document.querySelector('.market-address-submit');
    dom.addressBuildingInput = document.getElementById('address-building');
    dom.addressStreetInput = document.getElementById('address-street');
    dom.addressBuildingError = document.getElementById('address-building-error');
    dom.addressStreetError = document.getElementById('address-street-error');
    dom.landRegistryModal = document.getElementById('land-registry-modal');
    dom.landRegistryCloseButton = document.getElementById('land-registry-close');
    dom.landRegistryModalStatus = document.getElementById('land-registry-modal-status');
    dom.landRegistryResults = document.getElementById('land-registry-results');
    dom.landRegistryAddressLine = document.getElementById('land-registry-address-line');
    dom.landRegistryAddressMeta = document.getElementById('land-registry-address-meta');
    dom.landRegistryHistoryBody = document.getElementById('land-registry-history-body');

    setupPostcodeValidation();
    setupLandRegistryModal();
    setupFloatingObservers();
  }

  function setStatus(message, isError = false) {
    if (!dom.marketStatusBox || !dom.marketMetricsBox) return;
    dom.marketStatusBox.textContent = message;
    dom.marketStatusBox.classList.toggle('is-error', Boolean(isError));
    dom.marketMetricsBox.classList.add('is-hidden');
  }

  async function loadRegion(regionValue) {
    if (!REGION_LOCATIONS_CLIENT[regionValue]) {
      state.marketSummary = null;
      setStatus('Select the region of the property.');
      updateComparisons();
      return;
    }
    try {
      setStatus('Loading market data…');
      state.marketSummary = null;
      const searchParams = new URLSearchParams({
        location: REGION_LOCATIONS_CLIENT[regionValue],
        type: dom.propertyTypeSelect?.value || 'all'
      });
      const response = await fetch(`/api/market?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load market data');
      }
      const payload = await response.json();
      state.marketSummary = payload.summary || null;
      if (!state.marketSummary) {
        setStatus('No market summary available for this region.');
        return;
      }
      renderSummary();
      updateComparisons();
    } catch (error) {
      console.error(error);
      setStatus('Could not load market data. Please try again later.', true);
    }
  }

  function renderSummary() {
    if (!state.marketSummary || !dom.marketMetricsBox || !dom.marketStatusBox) return;
    dom.marketStatusBox.textContent = '';
    dom.marketMetricsBox.classList.remove('is-hidden');
    updateTextContent(dom.metricLatestEls, formatCurrencyForDisplay(state.marketSummary.latestPrice));
    const changeLabel =
      state.marketSummary.changePercent != null
        ? `${state.marketSummary.changePercent > 0 ? '+' : ''}${state.marketSummary.changePercent.toFixed(1)}% vs last period`
        : '—';
    updateTextContent(dom.metricChangeEls, changeLabel);
  }

  function updateComparisons() {
    if (!state.marketSummary || !dom.marketMetricsBox || dom.marketMetricsBox.classList.contains('is-hidden')) {
      syncFloatVisibility();
      return;
    }
    const baseline = state.marketSummary.latestPrice || state.marketSummary.averagePrice;
    const askingPrice = parseCurrencyValue(dom.currencyInput?.value);
    const counterOffer = parseCurrencyValue(dom.totalPointsInput?.value);

    if (Number.isFinite(askingPrice)) {
      const { label, meta, status } = formatComparison(askingPrice, baseline);
      updateTextContent(dom.metricVsAskingEls, label);
      updateTextContent(dom.metricAskingMetaEls, meta);
      applyComparisonVisual(dom.metricAskingCards, dom.metricAskingChips, status);
    } else {
      updateTextContent(dom.metricVsAskingEls, '—');
      updateTextContent(dom.metricAskingMetaEls, 'Enter an asking price');
      applyComparisonVisual(dom.metricAskingCards, dom.metricAskingChips, 'neutral', {
        hasData: false,
        emptyLabel: 'Awaiting asking price'
      });
    }

    if (Number.isFinite(counterOffer)) {
      const { label, meta, status } = formatComparison(counterOffer, baseline);
      updateTextContent(dom.metricVsCounterEls, label);
      updateTextContent(dom.metricCounterMetaEls, meta);
      applyComparisonVisual(dom.metricCounterCards, dom.metricCounterChips, status);
    } else {
      updateTextContent(dom.metricVsCounterEls, '—');
      updateTextContent(dom.metricCounterMetaEls, 'Select works to calculate a counter offer');
      applyComparisonVisual(dom.metricCounterCards, dom.metricCounterChips, 'neutral', {
        hasData: false,
        emptyLabel: 'Awaiting counter offer'
      });
    }

    syncFloatVisibility();
  }

  function formatComparison(value, baseline) {
    if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) {
      return { label: '—', meta: 'No comparison available', status: 'neutral' };
    }
    const diff = value - baseline;
    const percent = (diff / baseline) * 100;
    const absValue = Math.abs(diff);
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
    const label = `${sign}${formatCurrencyForDisplay(absValue)}`;
    let meta = 'Matches the regional average';
    let status = 'equal';
    if (diff > 0) {
      status = 'above';
      meta = `Above average by ${Math.abs(percent).toFixed(1)}%`;
    } else if (diff < 0) {
      status = 'below';
      meta = `Below average by ${Math.abs(percent).toFixed(1)}%`;
    }
    return { label, meta, status };
  }

  function applyComparisonVisual(cardElements, chipElements, status = 'neutral', options = {}) {
    const { hasData = true, emptyLabel = 'Awaiting data' } = options;
    const cards = Array.isArray(cardElements) ? cardElements : cardElements ? [cardElements] : [];
    const chips = Array.isArray(chipElements) ? chipElements : chipElements ? [chipElements] : [];
    const stateClass = status === 'above' ? 'is-up' : status === 'below' ? 'is-down' : 'is-neutral';
    cards.forEach((card) => {
      card.classList.remove('is-up', 'is-down', 'is-neutral');
      card.classList.add(stateClass);
    });

    chips.forEach((chip) => chip.classList.remove('metric-chip--up', 'metric-chip--down', 'metric-chip--neutral'));

    let chipClass = 'metric-chip--neutral';
    let chipText = '—';
    let ariaLabel = emptyLabel;

    if (hasData) {
      if (status === 'above') {
        chipClass = 'metric-chip--up';
        chipText = '▲ Above avg';
        ariaLabel = 'Above the regional average';
      } else if (status === 'below') {
        chipClass = 'metric-chip--down';
        chipText = '▼ Below avg';
        ariaLabel = 'Below the regional average';
      } else if (status === 'equal') {
        chipClass = 'metric-chip--neutral';
        chipText = '◎ Matches avg';
        ariaLabel = 'Matches the regional average';
      } else {
        chipText = '—';
        ariaLabel = 'Awaiting comparison';
      }
    }

    chips.forEach((chip) => {
      chip.classList.add(chipClass);
      chip.textContent = chipText;
      chip.setAttribute('aria-label', ariaLabel);
    });
  }

  function syncFloatVisibility() {
    const shouldShow = state.hasScrolledPastOffer || state.hasScrolledWithinChecklist;

    if (dom.marketFloatPanel) {
      if (shouldShow) {
        dom.marketFloatPanel.classList.add('is-visible');
      } else {
        dom.marketFloatPanel.classList.remove('is-visible');
      }
    }

    if (dom.propertyFloatPanel) {
      if (shouldShow && propertyFloatHasData) {
        dom.propertyFloatPanel.classList.add('is-visible');
      } else {
        dom.propertyFloatPanel.classList.remove('is-visible');
      }
    }
  }

  function setupFloatingObservers() {
    if (!dom.offerPanel) return;
    const handleResize = () => {
      refreshOfferScrollThreshold();
      updateOfferScrollState();
      updateFooterVisibility();
    };
    refreshOfferScrollThreshold();
    updateOfferScrollState();
    updateFooterVisibility();
    window.addEventListener('scroll', updateOfferScrollState, { passive: true });
    window.addEventListener('resize', handleResize);

    if (dom.conditionList) {
      dom.conditionList.addEventListener('scroll', updateChecklistScrollState, { passive: true });
      updateChecklistScrollState();
    }
  }

  function setupPostcodeValidation() {
    if (dom.postcodeInput) {
      dom.postcodeInput.addEventListener('input', clearPostcodeError);
      dom.postcodeInput.addEventListener('blur', () => validatePostcodeField(true));
    }
    if (dom.addressBuildingInput) {
      dom.addressBuildingInput.addEventListener('input', () =>
        clearFieldError(dom.addressBuildingInput, dom.addressBuildingError)
      );
    }
    if (dom.addressStreetInput) {
      dom.addressStreetInput.addEventListener('input', () =>
        clearFieldError(dom.addressStreetInput, dom.addressStreetError)
      );
    }
    if (dom.addressSubmitButton) {
      dom.addressSubmitButton.addEventListener('click', (event) => {
        event.preventDefault();
        const validation = validateAddressForm();
        if (!validation.isValid) {
          validation.invalidField?.focus();
          return;
        }
        openLandRegistryModal(validation.values.postcode, {
          building: validation.values.paon,
          street: validation.values.street
        });
        loadLandRegistryTransactions(validation.values);
      });
    }
  }

  function setupLandRegistryModal() {
    if (!dom.landRegistryModal) return;
    const dismissTriggers = dom.landRegistryModal.querySelectorAll('[data-modal-dismiss]');
    dismissTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => closeLandRegistryModal());
    });
  }

  function validatePostcodeField(showFeedback = false) {
    if (!dom.postcodeInput) return { isValid: false, postcode: '' };
    const raw = dom.postcodeInput.value || '';
    const trimmed = raw.trim();
    if (!trimmed) {
      if (showFeedback) {
        showPostcodeError('Enter the postcode.');
      } else {
        clearPostcodeError();
      }
      return { isValid: false, postcode: '' };
    }
    const formatted = formatPostcode(trimmed);
    if (UK_POSTCODE_REGEX.test(formatted)) {
      dom.postcodeInput.value = formatted;
      clearPostcodeError();
      return { isValid: true, postcode: formatted };
    }
    if (showFeedback) {
      showPostcodeError('Enter a valid UK postcode (e.g. SW1A 1AA).');
    }
    return { isValid: false, postcode: formatted };
  }

  function formatPostcode(value) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  }

  function showPostcodeError(message) {
    showFieldError(dom.postcodeInput, dom.postcodeError, message);
  }

  function clearPostcodeError() {
    clearFieldError(dom.postcodeInput, dom.postcodeError);
  }

  function openLandRegistryModal(postcode, context = {}) {
    if (!dom.landRegistryModal) return;
    dom.landRegistryResults?.classList.add('is-hidden');
    const summaryParts = [context.building, context.street, postcode].filter(Boolean);
    setLandRegistryStatus(
      summaryParts.length ? `Searching Land Registry for ${summaryParts.join(', ')}…` : 'Searching Land Registry…'
    );
    dom.landRegistryModal.classList.add('is-visible');
    dom.landRegistryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    lastFocusedBeforeModal = document.activeElement;
    isLandRegistryModalOpen = true;
    const focusTarget =
      dom.landRegistryModal.querySelector('[data-modal-initial]') || dom.landRegistryCloseButton || dom.landRegistryModal;
    focusTarget?.focus();
    window.addEventListener('keydown', handleModalKeydown);
  }

  function closeLandRegistryModal() {
    if (!dom.landRegistryModal || !isLandRegistryModalOpen) return;
    dom.landRegistryModal.classList.remove('is-visible');
    dom.landRegistryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    isLandRegistryModalOpen = false;
    window.removeEventListener('keydown', handleModalKeydown);
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
    setLandRegistryStatus('');
    dom.landRegistryResults?.classList.add('is-hidden');
    if (landRegistryRequestController) {
      landRegistryRequestController.abort();
      landRegistryRequestController = null;
    }
  }

  function handleModalKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      closeLandRegistryModal();
    }
  }

  function refreshOfferScrollThreshold() {
    if (!dom.offerPanel) {
      state.offerScrollThreshold = Number.POSITIVE_INFINITY;
      state.offerStickyThreshold = Number.POSITIVE_INFINITY;
      return;
    }
    state.offerStickyThreshold = computeElementPageOffset(dom.offerStickyShell || dom.offerPanel);
    state.offerScrollThreshold = computeElementPageOffset(dom.offerPanel) + dom.offerPanel.offsetHeight;
    refreshOfferStickyLayout();
  }

  function computeElementPageOffset(element) {
    let offset = 0;
    let node = element;
    while (node) {
      offset += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return offset;
  }

  function updateOfferScrollState() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    state.hasScrolledPastOffer = scrollTop > state.offerScrollThreshold;
    syncOfferStickyFields(scrollTop);
    syncFloatVisibility();
    updateFooterVisibility(scrollTop);
  }

  function refreshOfferStickyLayout() {
    if (!dom.offerStickyShell || !dom.offerStickyFields) return;
    dom.offerStickyShell.style.minHeight = `${dom.offerStickyFields.offsetHeight}px`;
  }

  function syncOfferStickyFields(scrollTop) {
    if (!dom.offerStickyShell || !dom.offerStickyFields) return;
    const currentScrollTop =
      typeof scrollTop === 'number' ? scrollTop : window.pageYOffset || document.documentElement.scrollTop || 0;
    const canFloat = window.innerWidth > 768;
    const shouldFloat = canFloat && currentScrollTop > state.offerStickyThreshold;

    if (shouldFloat) {
      const rect = dom.offerStickyShell.getBoundingClientRect();
      dom.offerStickyFields.style.setProperty('--offer-sticky-left', `${Math.max(rect.left, 0)}px`);
      dom.offerStickyFields.style.setProperty('--offer-sticky-width', `${rect.width}px`);
      dom.offerStickyFields.classList.add('is-floating');
    } else {
      dom.offerStickyFields.classList.remove('is-floating');
      dom.offerStickyFields.style.removeProperty('--offer-sticky-left');
      dom.offerStickyFields.style.removeProperty('--offer-sticky-width');
    }

    refreshOfferStickyLayout();
  }

  function updateFooterVisibility(scrollTop) {
    if (!dom.siteFooter) return;
    const footerRect = dom.siteFooter.getBoundingClientRect();
    const revealThreshold = window.innerHeight + FOOTER_REVEAL_DISTANCE;
    dom.siteFooter.classList.toggle('is-visible', footerRect.top <= revealThreshold);
  }

  function updateChecklistScrollState() {
    if (!dom.conditionList) return;
    const scrolled = dom.conditionList.scrollTop > 40;
    if (scrolled !== state.hasScrolledWithinChecklist) {
      state.hasScrolledWithinChecklist = scrolled;
      syncFloatVisibility();
    }
  }

  function normalizeInputValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function validateAddressForm() {
    const buildingCheck = validateRequiredText(
      dom.addressBuildingInput,
      dom.addressBuildingError,
      'Enter a building name or number.'
    );
    const streetCheck = validateRequiredText(dom.addressStreetInput, dom.addressStreetError, 'Enter the street name.');
    const postcodeCheck = validatePostcodeField(true);
    const isValid = buildingCheck.isValid && streetCheck.isValid && postcodeCheck.isValid;
    let invalidField = null;
    if (!buildingCheck.isValid) {
      invalidField = dom.addressBuildingInput;
    } else if (!streetCheck.isValid) {
      invalidField = dom.addressStreetInput;
    } else if (!postcodeCheck.isValid) {
      invalidField = dom.postcodeInput;
    }
    return {
      isValid,
      invalidField,
      values: {
        paon: buildingCheck.value,
        street: streetCheck.value,
        postcode: postcodeCheck.postcode
      }
    };
  }

  function validateRequiredText(input, errorElement, message) {
    const value = normalizeInputValue(input?.value);
    if (!value) {
      showFieldError(input, errorElement, message);
      return { isValid: false, value: '' };
    }
    clearFieldError(input, errorElement);
    return { isValid: true, value };
  }

  function showFieldError(input, errorElement, message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('is-hidden');
    }
    input?.classList.add('is-invalid');
  }

  function clearFieldError(input, errorElement) {
    errorElement?.classList.add('is-hidden');
    input?.classList.remove('is-invalid');
  }

  function setLandRegistryStatus(message, isError = false) {
    if (!dom.landRegistryModalStatus) return;
    if (!message) {
      dom.landRegistryModalStatus.textContent = '';
      dom.landRegistryModalStatus.classList.add('is-hidden');
      dom.landRegistryModalStatus.classList.remove('is-error');
      return;
    }
    dom.landRegistryModalStatus.textContent = message;
    dom.landRegistryModalStatus.classList.remove('is-hidden');
    dom.landRegistryModalStatus.classList.toggle('is-error', Boolean(isError));
  }

  async function fetchPropertyTransactions(values, signal) {
    const params = new URLSearchParams({
      paon: values.paon,
      street: values.street,
      postcode: values.postcode
    });
    console.log('[LandRegistry] Requesting transactions', Object.fromEntries(params));
    const response = await fetch(`/api/property-transactions?${params.toString()}`, { signal });
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
    if (!response.ok) {
      const errorMessage = payload?.error || 'Failed to fetch Land Registry data.';
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  async function loadLandRegistryTransactions(values) {
    if (!values || !dom.landRegistryModal) return;
    dom.landRegistryResults?.classList.add('is-hidden');
    setLandRegistryStatus('Fetching transaction history…');
    if (landRegistryRequestController) {
      landRegistryRequestController.abort();
    }
    landRegistryRequestController = new AbortController();
    try {
      const payload = await fetchPropertyTransactions(values, landRegistryRequestController.signal);
      if (!payload.address) {
        setLandRegistryStatus('No matching address found.', true);
        dom.landRegistryResults?.classList.add('is-hidden');
        return;
      }
      console.log('[LandRegistry] Transactions response', payload);
      renderLandRegistryResults(payload);
      if (!payload.transactions || payload.transactions.length === 0) {
        setLandRegistryStatus('No transaction history found for this address.');
        dom.landRegistryResults?.classList.remove('is-hidden');
        return;
      }
      setLandRegistryStatus('');
      dom.landRegistryResults?.classList.remove('is-hidden');
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      const isNotFound = error.status === 404;
      setLandRegistryStatus(
        error.message || 'Could not fetch Land Registry data. Please try again later.',
        !isNotFound
      );
      if (!isNotFound) {
        dom.landRegistryResults?.classList.add('is-hidden');
      }
    } finally {
      landRegistryRequestController = null;
    }
  }

  function renderLandRegistryResults(payload) {
    if (!payload) return;
    if (dom.landRegistryAddressLine) {
      dom.landRegistryAddressLine.textContent = payload.address?.line1 || 'Address unavailable';
    }
    if (dom.landRegistryAddressMeta) {
      const locality = payload.address?.town || payload.address?.locality;
      const locationParts = [locality, payload.address?.postcode].filter(Boolean);
      dom.landRegistryAddressMeta.textContent = locationParts.join(', ');
    }
    if (!dom.landRegistryHistoryBody) return;
    dom.landRegistryHistoryBody.innerHTML = '';
    const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
    if (!transactions.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = 'No transactions available for this property.';
      row.appendChild(cell);
      dom.landRegistryHistoryBody.appendChild(row);
      return;
    }
    const fragment = document.createDocumentFragment();
    transactions.forEach((entry) => {
      const row = document.createElement('tr');

      const typeCell = document.createElement('td');
      typeCell.className = 'lr-history__status';
      const badge = document.createElement('span');
      badge.className = 'lr-history__pill';
      badge.textContent = entry.statusCode || '—';
      if (entry.statusLabel) {
        badge.title = entry.statusLabel;
      }
      typeCell.appendChild(badge);

      const dateCell = document.createElement('td');
      const dateLabel = document.createElement('span');
      dateLabel.className = 'lr-history__date';
      dateLabel.textContent = entry.displayDate || entry.isoDate || '—';
      dateCell.appendChild(dateLabel);
      const meta = document.createElement('span');
      meta.className = 'lr-history__meta';
      const metaParts = [entry.estateType, entry.propertyType, entry.transactionCategory].filter(Boolean);
      meta.textContent = metaParts.join(' • ');
      dateCell.appendChild(meta);

      const priceCell = document.createElement('td');
      priceCell.className = 'lr-history__price';
      priceCell.textContent = formatCurrencyForDisplay(entry.pricePaid);

      row.append(typeCell, dateCell, priceCell);
      fragment.appendChild(row);
    });
    dom.landRegistryHistoryBody.appendChild(fragment);
    autoFillMarketFields(payload);
    updatePropertyFloat(transactions[0], payload.address);
    updateLastSoldCard(transactions[0], payload.transactions?.length || 0);
  }

  function autoFillMarketFields(payload) {
    if (!payload) return;
    const localAuthority = formatLocalAuthority(payload.address);
    const inferredRegion = inferRegionFromAddress(payload.address);
    if (dom.propertyTypeSelect) {
      const inferredPropertyType = inferPropertyTypeValue(payload.transactions);
      if (inferredPropertyType && dom.propertyTypeSelect.value !== inferredPropertyType) {
        dom.propertyTypeSelect.value = inferredPropertyType;
      }
    }
    if (dom.localAuthorityInput) {
      dom.localAuthorityInput.value = localAuthority || '';
    }
    if (dom.regionSelect && inferredRegion && dom.regionSelect.value !== inferredRegion) {
      dom.regionSelect.value = inferredRegion;
      dom.regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (inferredRegion) {
      loadRegion(inferredRegion);
    }
  }

  function inferRegionFromAddress(address) {
    if (!address) return null;
    const fields = [address.county, address.district, address.town, address.locality].filter(Boolean);
    for (const field of fields) {
      const normalized = field.toLowerCase();
      const match = Object.entries(REGION_KEYWORDS_MAP).find(([keyword]) => normalized.includes(keyword));
      if (match) return match[1];
    }
    if (address.postcode) {
      return inferRegionFromPostcode(address.postcode);
    }
    return null;
  }

  function inferRegionFromPostcode(postcode) {
    const area = getPostcodeArea(postcode);
    if (!area) return null;
    return POSTCODE_REGION_MAP[area] || POSTCODE_REGION_MAP[area[0]] || null;
  }

  function getPostcodeArea(postcode) {
    if (!postcode) return null;
    const match = String(postcode).toUpperCase().trim().match(/^([A-Z]{1,2})/);
    return match ? match[1] : null;
  }

  function inferPropertyTypeValue(transactions = []) {
    const entry = transactions.find((tx) => tx?.propertyType);
    if (!entry) return null;
    const normalized = String(entry.propertyType || '').toLowerCase();
    if (PROPERTY_TYPE_MAP[normalized]) {
      return PROPERTY_TYPE_MAP[normalized];
    }
    const fallback = Object.entries(PROPERTY_TYPE_MAP).find(([keyword]) => normalized.includes(keyword));
    return fallback ? fallback[1] : null;
  }

  function formatLocalAuthority(address) {
    if (!address) return '';
    const value = address.district || address.county || address.town || address.locality || '';
    return toTitleCase(value);
  }

  function toTitleCase(value) {
    if (!value) return '';
    return value
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function updatePropertyFloat(latestTransaction, address) {
    if (!dom.propertyFloatPanel || !dom.propertyFloatPrice || !dom.propertyFloatMeta) return;
    if (!latestTransaction) {
      propertyFloatHasData = false;
      dom.propertyFloatPanel.classList.remove('is-visible');
      dom.propertyFloatPrice.textContent = '—';
      dom.propertyFloatMeta.textContent = 'No transactions yet';
      syncFloatVisibility();
      return;
    }
    dom.propertyFloatPrice.textContent = formatCurrencyForDisplay(latestTransaction.pricePaid);
    const localAuthority = formatLocalAuthority(address);
    const dateLabel = latestTransaction.displayDate || latestTransaction.isoDate || latestTransaction.rawDate || '';
    dom.propertyFloatMeta.textContent = [dateLabel, localAuthority].filter(Boolean).join(' • ');
    propertyFloatHasData = true;
    syncFloatVisibility();
  }

  function updateLastSoldCard(latestTransaction, transactionCount = 0) {
    if (!dom.lastSoldCard || !dom.lastSoldValue || !dom.lastSoldMeta || !dom.lastSoldChip) return;
    if (!latestTransaction) {
      dom.lastSoldValue.textContent = '—';
      dom.lastSoldMeta.textContent = 'Run a property search to view the last transaction.';
      dom.lastSoldChip.textContent = '—';
      dom.lastSoldChip.className = 'metric-chip metric-chip--neutral';
      dom.lastSoldChip.setAttribute('aria-label', 'Awaiting last sold data');
      return;
    }
    dom.lastSoldValue.textContent = formatCurrencyForDisplay(latestTransaction.pricePaid);
    const dateLabel = latestTransaction.displayDate || latestTransaction.isoDate || latestTransaction.rawDate || '—';
    const metaParts = [dateLabel, latestTransaction.propertyType, latestTransaction.transactionCategory].filter(Boolean);
    dom.lastSoldMeta.textContent = metaParts.join(' • ');
    dom.lastSoldChip.textContent = transactionCount > 1 ? `${transactionCount} sales` : 'Latest sale';
    dom.lastSoldChip.className = 'metric-chip metric-chip--neutral';
    dom.lastSoldChip.setAttribute('aria-label', 'Latest recorded sale');
  }

  app.market = {
    init,
    setStatus,
    loadRegion,
    updateComparisons
  };
})(window);
