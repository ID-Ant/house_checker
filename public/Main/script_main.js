// document.addEventListener('DOMContentLoaded', () => {
//   const form = document.getElementById('mortgage-form');
//   const resultBox = document.getElementById('result');
//   const statusBox = document.getElementById('mortgage-status');
//   const principalInput = document.getElementById('principal');
//
//   if (!form || !resultBox || !statusBox) return;
//
//   const sanitizeCurrency = (value) => value.replace(/,/g, '').replace(/[^0-9.]/g, '');
//
//   const handlePrincipalInput = (event) => {
//     const raw = sanitizeCurrency(event.target.value);
//     if (!raw) {
//      event.target.value = '';
//      return;
//     }
//     const numeric = Number(raw);
//     event.target.value = Number.isFinite(numeric) ? numeric.toLocaleString('en-GB') : '';
//   };
//
//   const clearStatus = () => {
//     statusBox.textContent = '';
//     statusBox.classList.add('is-hidden');
//     statusBox.classList.remove('alert--error', 'alert--success', 'alert--info');
//     statusBox.classList.add('alert--muted');
//   };
//
//   const setStatus = (message, tone = 'info') => {
//     statusBox.textContent = message;
//     statusBox.classList.remove('is-hidden', 'alert--muted', 'alert--error', 'alert--success', 'alert--info');
//     statusBox.classList.add(`alert--${tone}`);
//   };
//
//   const formatCurrency = (value) =>
//     Number(value || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
//
//   if (principalInput) {
//     principalInput.addEventListener('input', handlePrincipalInput);
//   }
//
//   form.addEventListener('submit', (event) => {
//     event.preventDefault();
//     clearStatus();
//
//     const rawPrincipal = sanitizeCurrency(document.getElementById('principal')?.value || '');
//     const rawInterest = document.getElementById('interestRate')?.value || '';
//     const rawTerm = document.getElementById('term')?.value || '';
//     const repaymentType = document.getElementById('repaymentType')?.value || 'repayment';
//
//     const principal = parseFloat(rawPrincipal);
//     const interestRate = parseFloat(rawInterest);
//     const termYears = parseInt(rawTerm, 10);
//
//     if (!Number.isFinite(principal) || principal <= 0) {
//       setStatus('Enter a valid mortgage amount greater than zero.', 'error');
//       resultBox.innerHTML = '';
//       return;
//     }
//
//     if (!Number.isFinite(interestRate) || interestRate < 0) {
//       setStatus('Enter a positive interest rate.', 'error');
//       resultBox.innerHTML = '';
//       return;
//     }
//
//     if (!Number.isFinite(termYears) || termYears <= 0) {
//       setStatus('Enter a valid mortgage term in years.', 'error');
//       resultBox.innerHTML = '';
//       return;
//     }
//
//     const monthlyInterestRate = interestRate / 100 / 12;
//     const numberOfPayments = termYears * 12;
//     const interestPayment = principal * monthlyInterestRate;
//
//     const isInterestOnly = repaymentType === 'interest-only';
//     let repaymentValue;
//
//     if (isInterestOnly) {
//       repaymentValue = interestPayment;
//     } else if (monthlyInterestRate === 0) {
//       repaymentValue = principal / numberOfPayments;
//     } else {
//       repaymentValue =
//         (principal * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
//     }
//
//     const cardLabel = isInterestOnly ? 'Interest only' : 'Repayment';
//     const metaText = isInterestOnly ? 'Monthly interest payment' : 'Monthly repayment (capital + interest)';
//
//     resultBox.innerHTML = `
//       <div class="result-card" role="status" aria-live="polite">
//         <p class="result-card__label">${cardLabel}</p>
//         <p class="result-card__value">${formatCurrency(repaymentValue)}</p>
//         <p class="result-card__meta">${metaText}</p>
//       </div>
//     `;
//     setStatus('Mortgage illustration updated.', 'success');
//   });
// });
