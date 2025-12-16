(function attachMarketModule(window) {
  const app = window.HouseChecker;
  if (!app) return;
  const { state } = app;
  const { REGION_LOCATIONS_CLIENT } = app.config;
  const { parseCurrencyValue, formatCurrencyForDisplay, updateTextContent } = app.helpers;

  const dom = {
    currencyInput: null,
    totalPointsInput: null,
    regionSelect: null,
    propertyTypeSelect: null,
    conditionList: null,
    offerPanel: null,
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
    marketFloatPanel: null
  };

  function collectTargets(...ids) {
    return ids.map((id) => document.getElementById(id)).filter(Boolean);
  }

  function init() {
    dom.currencyInput = document.getElementById('currency');
    dom.totalPointsInput = document.getElementById('totalPoints');
    dom.regionSelect = document.getElementById('region');
    dom.propertyTypeSelect = document.getElementById('property-type');
    dom.conditionList = document.getElementById('deduction-list');
    dom.offerPanel = document.querySelector('.panel--offer');
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
    dom.marketFloatPanel = document.getElementById('market-float');

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
      setStatus('Select a region to fetch market data.');
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
    if (!dom.marketFloatPanel) return;
    if (state.hasScrolledPastOffer || state.hasScrolledWithinChecklist) {
      dom.marketFloatPanel.classList.add('is-visible');
    } else {
      dom.marketFloatPanel.classList.remove('is-visible');
    }
  }

  function setupFloatingObservers() {
    if (!dom.offerPanel) return;
    const handleResize = () => {
      refreshOfferScrollThreshold();
      updateOfferScrollState();
    };
    refreshOfferScrollThreshold();
    updateOfferScrollState();
    window.addEventListener('scroll', updateOfferScrollState, { passive: true });
    window.addEventListener('resize', handleResize);

    if (dom.conditionList) {
      dom.conditionList.addEventListener('scroll', updateChecklistScrollState, { passive: true });
      updateChecklistScrollState();
    }
  }

  function refreshOfferScrollThreshold() {
    if (!dom.offerPanel) {
      state.offerScrollThreshold = Number.POSITIVE_INFINITY;
      return;
    }
    state.offerScrollThreshold = computeElementPageOffset(dom.offerPanel) + dom.offerPanel.offsetHeight;
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
    syncFloatVisibility();
  }

  function updateChecklistScrollState() {
    if (!dom.conditionList) return;
    const scrolled = dom.conditionList.scrollTop > 40;
    if (scrolled !== state.hasScrolledWithinChecklist) {
      state.hasScrolledWithinChecklist = scrolled;
      syncFloatVisibility();
    }
  }

  app.market = {
    init,
    setStatus,
    loadRegion,
    updateComparisons
  };
})(window);
