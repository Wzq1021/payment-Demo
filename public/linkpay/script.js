const orderState = {
  orders: JSON.parse(localStorage.getItem('orderState')) || {},
  save(orderId, totalAmount, refundedAmount = 0, status = 'pending', paymentMethod = '', paymentTime = '') {
    this.orders[orderId] = { totalAmount, refundedAmount, status, paymentMethod, paymentTime };
    localStorage.setItem('orderState', JSON.stringify(this.orders));
    console.log('[orderState.save]', { orderId, totalAmount, refundedAmount, status, paymentMethod, paymentTime });
  },
  get(orderId) {
    const order = this.orders[orderId] || null;
    console.log('[orderState.get]', { orderId, order });
    return order;
  },
  updateRefundedAmount(orderId, amount) {
    if (this.orders[orderId]) {
      this.orders[orderId].refundedAmount += Number(amount);
      localStorage.setItem('orderState', JSON.stringify(this.orders));
      console.log('[orderState.updateRefundedAmount]', { orderId, amount, newRefundedAmount: this.orders[orderId].refundedAmount });
    }
  },
  updateStatus(orderId, status) {
    if (this.orders[orderId]) {
      this.orders[orderId].status = status;
      localStorage.setItem('orderState', JSON.stringify(this.orders));
      console.log('[orderState.updateStatus]', { orderId, status });
    }
  },
  clear(orderId) {
    delete this.orders[orderId];
    localStorage.setItem('orderState', JSON.stringify(this.orders));
    console.log('[orderState.clear]', { orderId });
  }
};

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.classList.remove('hidden', 'translate-y-[-100%]');
  setTimeout(() => {
    toast.classList.add('translate-y-[-100%]');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

function toggleLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

function showCardInfoModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">卡信息</h3>
      <div class="space-y-2">
        <p class="text-gray-700 dark:text-gray-300">Card Number: 4895330111111119</p>
        <p class="text-gray-700 dark:text-gray-300">Expiration Date: 12/31</p>
        <p class="text-gray-700 dark:text-gray-300">CVV2: 390</p>
      </div>
      <button id="close-modal" class="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">关闭</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

if (document.getElementById('pay-form')) {
  const paymentMethodSelect = document.getElementById('payment-method');
  const selectedPayment = document.getElementById('selected-payment');
  const selectedPaymentText = document.getElementById('selected-payment-text');
  const selectedPaymentIcon = document.getElementById('selected-payment-icon');
  const paymentOptions = document.getElementById('payment-options');
  const copyCardInfo = document.getElementById('copy-card-info');

  function toggleVisaInfo() {
    copyCardInfo.classList.toggle('hidden', paymentMethodSelect.value !== 'Visa');
  }

  function updateSelectedPayment() {
    const selectedOption = paymentMethodSelect.options[paymentMethodSelect.selectedIndex];
    selectedPaymentText.textContent = selectedOption.text;
    selectedPaymentIcon.src = selectedOption.dataset.icon;
    selectedPaymentIcon.alt = selectedOption.text;
    toggleVisaInfo();
    console.log('[updateSelectedPayment]', { value: paymentMethodSelect.value, text: selectedOption.text });
  }

  updateSelectedPayment();

  selectedPayment.addEventListener('click', () => {
    paymentOptions.classList.toggle('show');
  });

  paymentOptions.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', () => {
      paymentMethodSelect.value = option.dataset.value;
      updateSelectedPayment();
      paymentOptions.classList.remove('show');
      paymentMethodSelect.dispatchEvent(new Event('change'));
    });
  });

  document.addEventListener('click', (e) => {
    if (!selectedPayment.contains(e.target) && !paymentOptions.contains(e.target)) {
      paymentOptions.classList.remove('show');
    }
  });

  paymentMethodSelect.addEventListener('change', updateSelectedPayment);
  toggleVisaInfo();

  copyCardInfo.addEventListener('click', () => {
    showCardInfoModal();
  });

  document.getElementById('pay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const paymentMethod = paymentMethodSelect.value;
    const amount = 100.00;
    const button = document.getElementById('pay-button');
    const statusEl = document.getElementById('payment-status');
    const lang = document.getElementById('language-switch').value;

    button.disabled = true;
    button.textContent = lang === 'zh' ? '处理中...' : 'Processing...';
    toggleLoading(true);

    try {
      console.log('[Pay Form Submit]', { paymentMethod, amount });
      const res = await fetch('/linkpay/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          enabledPaymentMethod: [paymentMethod]
        })
      });

      const data = await res.json();
      console.log('[Create Payment Response]', data);

      if (res.ok && data.paymentLink) {
        const paymentTime = new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
        orderState.save(data.orderId, Number(amount), 0, 'pending', paymentMethod, paymentTime);
        localStorage.setItem('lastOrderId', data.orderId);
        window.location.href = data.paymentLink;
      } else {
        statusEl.innerHTML = `<div class="status-failed">${data.error || translations[lang].payment_failed}</div>`;
        showToast(translations[lang].payment_failed);
        button.disabled = false;
        button.textContent = translations[lang].pay_now;
      }
    } catch (err) {
      console.error('[Pay Form Error]', err);
      statusEl.innerHTML = `<div class="status-failed">${translations[lang].network_error}</div>`;
      showToast(translations[lang].network_error);
      button.disabled = false;
      button.textContent = translations[lang].pay_now;
    } finally {
      toggleLoading(false);
    }
  });
}

if (document.getElementById('payment-success')) {
  document.getElementById('new-payment').addEventListener('click', () => {
    const orderId = document.getElementById('success-message').dataset.orderId;
    orderState.clear(orderId);
    localStorage.removeItem('lastOrderId');
    document.getElementById('payment-success').classList.add('hidden');
    document.getElementById('payment-form-container').classList.remove('hidden');
    document.getElementById('payment-status').innerHTML = '';
    document.getElementById('item-image').classList.remove('hide-image');
    document.querySelector('.section').classList.remove('payment-success');
    setLanguage(document.getElementById('language-switch').value);
  });

  window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const result = urlParams.get('result');
    let lastOrderId = urlParams.get('merchantOrderID') || localStorage.getItem('lastOrderId');
    const lang = document.getElementById('language-switch').value;
    const order = lastOrderId ? orderState.get(lastOrderId) : null;

    const statusEl = document.getElementById('payment-status');
    const formContainer = document.getElementById('payment-form-container');
    const successEl = document.getElementById('payment-success');
    const successMessage = document.getElementById('success-message');
    const itemImage = document.getElementById('item-image');
    const section = document.querySelector('.section');
    const paymentMethodEl = document.getElementById('payment-method-display');
    const paymentTimeEl = document.getElementById('payment-time');

    console.log('[window.onload]', { lastOrderId, order, result, lang });

    if (lastOrderId && (result === 'success' || order?.status === 'success')) {
      localStorage.setItem('lastOrderId', lastOrderId);
      formContainer.classList.add('hidden');
      successEl.classList.remove('hidden');
      itemImage.classList.add('hide-image');
      section.classList.add('payment-success');
      successMessage.dataset.orderId = lastOrderId;
      successMessage.textContent = lastOrderId;
      paymentTimeEl.textContent = order?.paymentTime || '';
      paymentMethodEl.textContent = translations[lang][`payment_method_${(order?.paymentMethod || '').toLowerCase()}`] || order?.paymentMethod || 'Unknown';
      setLanguage(lang);

      if (result === 'success' && (!order || order?.status !== 'success')) {
        statusEl.innerHTML = `<div class="status-pending">${translations[lang].payment_verifying}</div>`;
        toggleLoading(true);

        let attempts = 0;
        const maxAttempts = 5;
        const pollInterval = 5000;

        const poll = async () => {
          try {
            console.log(`[Poll] Checking payment status for order ${lastOrderId}, attempt ${attempts + 1}`);
            const res = await fetch(`/linkpay/check-payment/${lastOrderId}`);
            const data = await res.json();
            console.log('[Poll Response]', data);

            if (res.ok) {
              if (data.status === 'Paid') {
                const paymentTime = order?.paymentTime || new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
                const paymentMethod = order?.paymentMethod || document.getElementById('payment-method')?.value || 'Unknown';
                orderState.save(lastOrderId, order?.totalAmount || 100.00, order?.refundedAmount || 0, 'success', paymentMethod, paymentTime);
                statusEl.innerHTML = '';
                successMessage.dataset.orderId = lastOrderId;
                successMessage.textContent = lastOrderId;
                paymentTimeEl.textContent = paymentTime;
                paymentMethodEl.textContent = translations[lang][`payment_method_${paymentMethod.toLowerCase()}`] || paymentMethod;
                setLanguage(lang);
                showToast(translations[lang].payment_success);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, pollInterval);
              } else {
                statusEl.innerHTML = `<div class="status-failed">${translations[lang].payment_incomplete}</div>`;
                showToast(translations[lang].payment_incomplete);
                successEl.classList.add('hidden');
                formContainer.classList.remove('hidden');
                itemImage.classList.remove('hide-image');
                section.classList.remove('payment-success');
                orderState.clear(lastOrderId);
                localStorage.removeItem('lastOrderId');
              }
            } else {
              console.error('[Poll Error]', data);
              statusEl.innerHTML = `<div class="status-failed">${translations[lang].query_failed.replace('{error}', data.error || translations[lang].unknown_error)}</div>`;
              showToast(translations[lang].query_failed);
              successEl.classList.add('hidden');
              formContainer.classList.remove('hidden');
              itemImage.classList.remove('hide-image');
              section.classList.remove('payment-success');
              orderState.clear(lastOrderId);
              localStorage.removeItem('lastOrderId');
            }
          } catch (err) {
            console.error('[Poll Network Error]', err);
            statusEl.innerHTML = `<div class="status-failed">${translations[lang].network_error}</div>`;
            showToast(translations[lang].network_error);
            successEl.classList.add('hidden');
            formContainer.classList.remove('hidden');
            itemImage.classList.remove('hide-image');
            section.classList.remove('payment-success');
            orderState.clear(lastOrderId);
            localStorage.removeItem('lastOrderId');
          } finally {
            toggleLoading(false);
          }
        };

        poll();
      }
    } else {
      console.log('[window.onload] No valid order, resetting UI');
      localStorage.removeItem('lastOrderId');
      formContainer.classList.remove('hidden');
      successEl.classList.add('hidden');
      itemImage.classList.remove('hide-image');
      section.classList.remove('payment-success');
    }
  };

  document.getElementById('copy-order-id').addEventListener('click', () => {
    const orderId = document.getElementById('success-message').dataset.orderId;
    navigator.clipboard.writeText(orderId).then(() => {
      const lang = document.getElementById('language-switch').value;
      showToast(translations[lang].copied);
    });
  });
}

if (document.getElementById('refund-btn')) {
  document.getElementById('refund-order-id').addEventListener('input', (e) => {
    const orderId = e.target.value.trim();
    const errorEl = document.getElementById('order-id-error');
    const lang = document.getElementById('language-switch').value;
    if (orderId && !orderId.startsWith('DEMO_')) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = translations[lang].invalid_order_id;
    } else {
      errorEl.classList.add('hidden');
    }
  });

  document.getElementById('check-refund-id').addEventListener('input', (e) => {
    const transId = e.target.value.trim();
    const errorEl = document.getElementById('trans-id-error');
    const lang = document.getElementById('language-switch').value;
    if (transId && !transId.startsWith('REF_') && !transId.startsWith('REFUND_')) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = translations[lang].invalid_trans_id;
    } else {
      errorEl.classList.add('hidden');
    }
  });

  document.getElementById('refund-btn').addEventListener('click', async () => {
    const orderId = document.getElementById('refund-order-id').value.trim();
    const amount = document.getElementById('refund-amount').value.trim();
    const resultDiv = document.getElementById('refund-result');
    const transIdDiv = document.getElementById('refund-trans-id');
    const transIdText = document.getElementById('trans-id-text');
    const modal = document.getElementById('refund-modal');
    const modalTransId = document.getElementById('modal-trans-id');
    const lang = document.getElementById('language-switch').value;
    resultDiv.innerHTML = '';
    transIdDiv.classList.add('hidden');
    resultDiv.dataset.status = '';
    resultDiv.dataset.error = '';
    resultDiv.dataset.errorValue = '';

    if (!orderId || !amount) {
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].missing_fields}</div>`;
      showToast(translations[lang].missing_fields);
      return;
    }

    if (!orderId.startsWith('DEMO_')) {
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].invalid_order_id}</div>`;
      showToast(translations[lang].invalid_order_id);
      return;
    }

    const order = orderState.get(orderId);
    if (order) {
      const remaining = order.totalAmount - order.refundedAmount;
      if (Number(amount) > remaining) {
        resultDiv.innerHTML = `<div class="status-failed">${translations[lang].refund_exceed}</div>`;
        showToast(translations[lang].refund_exceed);
        return;
      }
    }

    resultDiv.innerHTML = `<div class="status-pending">${translations[lang].refund_pending}</div>`;
    toggleLoading(true);

    try {
      console.log('[Refund Request]', { orderId, refundAmount: amount });
      const res = await fetch(`/linkpa/refund-payment/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await res.json();
      console.log('[Refund Response]', data);

      if (res.ok && data.result?.code === 'S0000') {
        resultDiv.innerHTML = `<div class="status-success">${translations[lang].refund_success}</div>`;
        if (data.refund?.merchantTransInfo?.merchantTransID) {
          transIdText.textContent = data.refund.merchantTransInfo.merchantTransID;
          modalTransId.textContent = data.refund.merchantTransInfo.merchantTransID;
          transIdDiv.classList.remove('hidden');
          document.getElementById('copy-trans-id').classList.remove('hidden');
          modal.classList.remove('hidden');
          if (order) {
            orderState.updateRefundedAmount(orderId, amount);
            orderState.updateStatus(orderId, 'partial refunded');
          }
        } else {
          console.warn('[Refund Warning] No merchantTransID in response');
          transIdText.textContent = translations[lang].no_trans_id;
          modalTransId.textContent = translations[lang].no_trans_id;
          transIdDiv.classList.remove('hidden');
          document.getElementById('copy-trans-id').classList.add('hidden');
          modal.classList.remove('hidden');
        }
      } else {
        const errorMsg = data.result?.code === 'B0014' ? translations[lang].refund_invalid_status : translations[lang].refund_failed;
        resultDiv.innerHTML = `<div class="status-failed">${errorMsg}</div>`;
        showToast(errorMsg);
        console.log('退款失败:', data);
      }
    } catch (err) {
      console.error('Refund error:', err);
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].refund_error}</div>`;
      showToast(translations[lang].refund_error);
    } finally {
      toggleLoading(false);
    }
  });

  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('refund-modal').classList.add('hidden');
  });

  document.getElementById('copy-modal-trans-id').addEventListener('click', () => {
    const transId = document.getElementById('modal-trans-id').textContent;
    if (transId && !transId.includes(translations[document.getElementById('language-switch').value].no_trans_id)) {
      navigator.clipboard.writeText(transId).then(() => {
        const lang = document.getElementById('language-switch').value;
        showToast(translations[lang].copied);
      });
    }
  });

  document.getElementById('copy-trans-id').addEventListener('click', () => {
    const transIdText = document.getElementById('trans-id-text').textContent;
    if (transIdText && !transIdText.includes(translations[document.getElementById('language-switch').value].no_trans_id)) {
      navigator.clipboard.writeText(transIdText).then(() => {
        const lang = document.getElementById('language-switch').value;
        showToast(translations[lang].copied);
      });
    }
  });
}

if (document.getElementById('check-refund-btn')) {
  document.getElementById('check-refund-btn').addEventListener('click', async () => {
    const transId = document.getElementById('check-refund-id').value.trim();
    const resultDiv = document.getElementById('check-refund-result');
    const errorEl = document.getElementById('trans-id-error');
    const lang = document.getElementById('language-switch').value;
    resultDiv.innerHTML = '';
    errorEl.classList.add('hidden');

    if (!transId) {
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].missing_trans_id}</div>`;
      showToast(translations[lang].missing_trans_id);
      return;
    }

    if (!transId.startsWith('REF_') && !transId.startsWith('REFUND_')) {
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].invalid_trans_id}</div>`;
      showToast(translations[lang].invalid_trans_id);
      return;
    }

    resultDiv.innerHTML = `<div class="status-pending">${translations[lang].check_refund_pending}</div>`;
    toggleLoading(true);

    try {
      const res = await fetch(`/linkpa/refund-result/${transId}`);
      const data = await res.json();
      console.log('[Refund Query Response]', data);

      if (res.ok && data.result?.code === 'S0000') {
        const status = data.merchantOrderInfo?.status || translations[lang].unknown_status;
        resultDiv.innerHTML = `<div class="status-success">${translations[lang].refund_status.replace('{status}', status)}</div>`;
        showToast(translations[lang].query_success);
        const orderId = data.merchantOrderInfo?.merchantOrderID;
        if (orderId && data.refund?.transAmount?.value) {
          orderState.updateRefundedAmount(orderId, Number(data.refund.transAmount.value));
          orderState.updateStatus(orderId, status.toLowerCase());
        }
      } else {
        resultDiv.innerHTML = `<div class="status-failed">${translations[lang].check_refund_failed}</div>`;
        showToast(translations[lang].check_refund_failed);
      }
    } catch (err) {
      console.error('Refund query error:', err);
      resultDiv.innerHTML = `<div class="status-failed">${translations[lang].check_refund_failed}</div>`;
      showToast(translations[lang].check_refund_failed);
    } finally {
      toggleLoading(false);
    }
  });
}