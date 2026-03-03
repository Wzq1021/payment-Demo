import DropInSDK from '/node_modules/cil-dropin-components/dist/index.js';

let currentMerchantOrderID = null;
let currentCardInfo = null;

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

function showDropInModal(show) {
  const modal = document.getElementById('dropInModal');
  const body = document.body;
  modal.classList.toggle('show', show);
  body.classList.toggle('modal-open', show);
  if (!show) {
    document.getElementById('dropInApp').innerHTML = '';
  }
}

function showCardInfoModal(show) {
  const modal = document.getElementById('cardInfoModal');
  const body = document.body;
  modal.classList.toggle('show', show);
  body.classList.toggle('modal-open', show);
}

function handlePaymentCompleted(params) {
  const result = { type: 'payment_completed', ...params };
  showDropInModal(false);
  document.getElementById('item-image').classList.add('hidden');
  document.getElementById('payment-form-container').classList.add('hidden');
  document.getElementById('subscription-form-container').classList.add('hidden');
  const successContainer = document.getElementById('payment-success');
  successContainer.classList.remove('hidden');
  document.getElementById('success-message').textContent = params.merchantTransID || '无';
  document.getElementById('payment-method-display').textContent = params.paymentMethod?.card?.paymentBrand || params.paymentMethod?.type || '未知';
  document.getElementById('payment-time').textContent = new Date().toLocaleString();

  if (params.paymentMethod?.card?.paymentBrand === 'Visa') {
    currentCardInfo = {
      number: params.paymentMethod?.cardNumber || '4895330111111119',
      expiry: params.paymentMethod?.expiry || '12/31',
      cvv: params.paymentMethod?.cvv || '390'
    };
    document.getElementById('card-number').textContent = currentCardInfo.number;
    document.getElementById('card-expiry').textContent = currentCardInfo.expiry;
    document.getElementById('card-cvv').textContent = currentCardInfo.cvv;
    document.getElementById('copy-card-info').classList.remove('hidden');
  } else {
    document.getElementById('copy-card-info').classList.add('hidden');
  }

  if (currentMerchantOrderID) {
    fetch(`/dropin/query-payment/${currentMerchantOrderID}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Payment Query Result:', JSON.stringify(data, null, 2));
        if (data.result && data.result.paymentMethod?.token) {
          const token = data.result.paymentMethod.token.value;
          const userReference = data.result.userInfo?.reference || '1234abcde';
          const card = data.result.paymentMethod.card || {};
          const paymentMethod = data.result.paymentMethod.card?.paymentBrand || data.result.paymentMethod.type || data.result.paymentMethod.paymentMethodVariant || 'unknown';
          if (token && userReference) {
            return fetch('/dropin/save-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userReference, token, card, paymentMethod })
            })
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .then(saveResult => {
                console.log('Save token result:', saveResult);
              });
          } else {
            console.warn('未找到 token 或 userReference:', { token, userReference });
            showToast(translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].token_missing);
          }
        } else {
          console.warn('支付查询结果无效:', data);
          showToast(translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].invalid_query_result);
        }
      })
      .catch(err => {
        console.error('查询支付或保存 token 失败:', err);
        showToast(`${translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].query_failed}: ${err.message}`);
      });
  } else {
    console.warn('未找到 currentMerchantOrderID');
    showToast(translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].order_id_missing);
  }

  const payButton = document.getElementById('pay-button');
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  payButton.disabled = false;
  payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  return result;
}

function handlePaymentFailed(params) {
  const result = {
    type: 'payment_failed',
    ...params,
    code: params.code || params.errorCode || '未知错误码',
    message: params.message || params.errorMessage || '未知错误信息'
  };
  console.error('支付失败详细信息:', JSON.stringify(params, null, 2));
  showDropInModal(false);
  document.getElementById('payment-status').textContent = `${translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].payment_failed}: ${result.message}`;
  document.getElementById('dropInApp').innerHTML = '';
  const payButton = document.getElementById('pay-button');
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  payButton.disabled = false;
  payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  return result;
}

function handlePaymentNotPreformed(params) {
  const result = {
    type: 'payment_not_preformed',
    ...params,
    code: params.code || '响应码',
    message: params.message || '响应信息'
  };
  console.warn('支付未执行:', result);
  showDropInModal(false);
  document.getElementById('payment-status').textContent = translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].payment_incomplete;
  document.getElementById('dropInApp').innerHTML = '';
  const payButton = document.getElementById('pay-button');
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  payButton.disabled = false;
  payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  return result;
}

function handlePaymentCancelled(params) {
  const result = { type: 'payment_cancelled', ...params };
  console.log('支付取消:', result);
  showDropInModal(false);
  document.getElementById('payment-status').textContent = translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].payment_incomplete;
  document.getElementById('dropInApp').innerHTML = '';
  const payButton = document.getElementById('pay-button');
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  payButton.disabled = false;
  payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  return result;
}

async function checkToken(userReference) {
  try {
    const res = await fetch(`/dropin/check-token/${userReference}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    return data.hasToken;
  } catch (err) {
    console.error('检查 token 失败:', err);
    return false;
  }
}

document.getElementById('pay-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const paymentMethod = document.getElementById('payment-method').value;
  const payButton = document.getElementById('pay-button');
  const userReference = '1234abcde';
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';

  if (!paymentMethod) {
    document.getElementById('payment-status').textContent = translations[lang].select_payment;
    return;
  }

  payButton.disabled = true;
  payButton.textContent = translations && translations[lang] && translations[lang].processing ? translations[lang].processing : 'Processing...';
  document.getElementById('payment-status').textContent = '';

  try {
    const res = await fetch('/dropin/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100.00, paymentMethod, userReference })
    });
    const data = await res.json();

    if (res.ok && data.paymentLink) {
      currentMerchantOrderID = data.orderId;
      const sessionID = data.paymentLink.split('/').pop();
      document.getElementById('dropInApp').innerHTML = '';
      showDropInModal(true);
      try {
        const sdk = new DropInSDK({
          id: '#dropInApp',
          type: 'payment',
          sessionID: sessionID,
          locale: document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en-US',
          mode: 'embedded',
          environment: 'UAT',
          appearance: { colorBackground: '#fff' },
          payment_completed: handlePaymentCompleted,
          payment_failed: handlePaymentFailed,
          payment_not_preformed: handlePaymentNotPreformed,
          payment_cancelled: handlePaymentCancelled
        });
      } catch (err) {
        console.error('SDK 初始化失败:', err);
        showDropInModal(false);
        document.getElementById('payment-status').textContent = `${translations[lang].payment_failed}: ${err.message}`;
        document.getElementById('dropInApp').innerHTML = '';
        payButton.disabled = false;
        payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
      }
    } else {
      console.error('获取支付链接失败:', data);
      showDropInModal(false);
      document.getElementById('payment-status').textContent = `${translations[lang].payment_failed}: ${data.error || translations[lang].network_error}`;
      document.getElementById('dropInApp').innerHTML = '';
      payButton.disabled = false;
      payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
    }
  } catch (err) {
    console.error('网络请求失败:', err);
    showDropInModal(false);
    document.getElementById('payment-status').textContent = translations[lang].network_error;
    document.getElementById('dropInApp').innerHTML = '';
    payButton.disabled = false;
    payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  }
});

document.getElementById('subscription-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = document.getElementById('sub-amount').value.trim();
  const userReference = document.getElementById('user-reference').value.trim();
  const paymentMethod = document.getElementById('payment-method').value;
  const subButton = document.getElementById('sub-button');
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    document.getElementById('sub-status').textContent = translations[lang].invalid_amount;
    document.getElementById('sub-status').classList.add('status-failed');
    return;
  }

  if (!userReference) {
    document.getElementById('sub-status').textContent = translations[lang].invalid_user_reference;
    document.getElementById('sub-status').classList.add('status-failed');
    return;
  }

  if (!paymentMethod) {
    document.getElementById('sub-status').textContent = translations[lang].select_payment;
    document.getElementById('sub-status').classList.add('status-failed');
    return;
  }

  const hasToken = await checkToken(userReference);
  if (!hasToken) {
    document.getElementById('sub-status').textContent = translations[lang].token_required;
    document.getElementById('sub-status').classList.add('status-failed');
    return;
  }

  subButton.disabled = true;
  subButton.textContent = translations && translations[lang] && translations[lang].processing ? translations[lang].processing : 'Processing...';
  document.getElementById('sub-status').textContent = '';

  try {
    const requestBody = {
      amount: Number(amount).toFixed(2),
      userReference: userReference,
      currency: 'HKD',
      paymentMethod: paymentMethod
    };
    console.log('订阅支付请求:', JSON.stringify(requestBody, null, 2));

    const res = await fetch('/dropin/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await res.json();
    console.log('订阅支付响应:', JSON.stringify(data, null, 2));

    if (res.ok) {
      currentMerchantOrderID = data.orderId;
      if (data.status === 'captured') {
        showDropInModal(false);
        document.getElementById('item-image').classList.add('hidden');
        document.getElementById('subscription-form-container').classList.add('hidden');
        document.getElementById('payment-form-container').classList.add('hidden');
        const successContainer = document.getElementById('subscription-success');
        successContainer.classList.remove('hidden');
        successContainer.innerHTML = `
          <h2 class="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center justify-center">
            <i class="fas fa-check-circle text-green-500 mr-2"></i>
            <span data-i18n="subscription_success">订阅成功</span>
          </h2>
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
            <p class="text-gray-600 dark:text-gray-400 mb-4 text-lg" data-i18n="subscription_success_info">感谢您的订阅！请保存用户标识以便管理。</p>
            <div class="space-y-2">
              <p class="text-lg"><span data-i18n="user_reference">用户标识</span>: <span class="text-green-600 font-medium">${userReference}</span></p>
              <p class="text-lg"><span data-i18n="amount">金额</span>: HKD ${Number(amount).toFixed(2)}</p>
              <p class="text-lg"><span data-i18n="payment_method">支付方式</span>: ${data.paymentMethod || paymentMethod}</p>
              <p class="text-lg"><span data-i18n="subscription_time">订阅时间</span>: ${new Date().toLocaleString()}</p>
            </div>
            <div class="flex justify-center mt-4">
              <button id="copy-user-reference" class="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 px-3 py-1 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition transform hover:scale-105" data-i18n="copy_user_reference">复制用户标识</button>
            </div>
          </div>
          <div class="mt-8 space-x-4">
            <button id="new-subscription" class="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:shadow-lg transition transform hover:scale-105" data-i18n="new_subscription">新的订阅</button>
          </div>
        `;
        document.getElementById('copy-user-reference').addEventListener('click', () => {
          navigator.clipboard.write(userReference).then(() => {
            showToast(translations[lang].copied_user_reference);
          });
        });
        document.getElementById('new-subscription').addEventListener('click', () => {
          successContainer.classList.add('hidden');
          document.getElementById('item-image').classList.remove('hidden');
          document.getElementById('subscription-form-container').classList.remove('hidden');
          document.getElementById('sub-amount').value = '';
          document.getElementById('user-reference').value = '';
          document.getElementById('sub-status').textContent = '';
          document.getElementById('sub-status').classList.remove('status-success', 'status-failed');
        });
        subButton.disabled = false;
        subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
      } else if (data.paymentLink) {
        const sessionID = data.paymentLink.split('/').pop();
        document.getElementById('dropInApp').innerHTML = '';
        showDropInModal(true);
        try {
          const sdk = new DropInSDK({
            id: '#dropInApp',
            type: 'payment',
            sessionID: sessionID,
            locale: document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en-US',
            mode: 'embedded',
            environment: 'UAT',
            appearance: { colorBackground: '#fff' },
            payment_completed: (params) => {
              const result = { type: 'subscription_completed', ...params };
              showDropInModal(false);
              document.getElementById('item-image').classList.add('hidden');
              document.getElementById('subscription-form-container').classList.add('hidden');
              document.getElementById('payment-form-container').classList.add('hidden');
              const successContainer = document.getElementById('subscription-success');
              successContainer.classList.remove('hidden');
              successContainer.innerHTML = `
                <h2 class="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center justify-center">
                  <i class="fas fa-check-circle text-green-500 mr-2"></i>
                  <span data-i18n="subscription_success">订阅成功</span>
                </h2>
                <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <p class="text-gray-600 dark:text-gray-400 mb-4 text-lg" data-i18n="subscription_success_info">感谢您的订阅！请保存用户标识以便管理。</p>
                  <div class="space-y-2">
                    <p class="text-lg"><span data-i18n="user_reference">用户标识</span>: <span class="text-green-600 font-medium">${userReference}</span></p>
                    <p class="text-lg"><span data-i18n="amount">金额</span>: HKD ${Number(amount).toFixed(2)}</p>
                    <p class="text-lg"><span data-i18n="payment_method">支付方式</span>: ${params.paymentMethod?.card?.paymentBrand || params.paymentMethod?.type || data.paymentMethod || paymentMethod}</p>
                    <p class="text-lg"><span data-i18n="subscription_time">订阅时间</span>: ${new Date().toLocaleString()}</p>
                  </div>
                  <div class="flex justify-center mt-4">
                    <button id="copy-user-reference" class="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 px-3 py-1 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition transform hover:scale-105" data-i18n="copy_user_reference">复制用户标识</button>
                  </div>
                </div>
                <div class="mt-8 space-x-4">
                  <button id="new-subscription" class="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:shadow-lg transition transform hover:scale-105" data-i18n="new_subscription">新的订阅</button>
                </div>
              `;
              document.getElementById('copy-user-reference').addEventListener('click', () => {
                navigator.clipboard.write(userReference).then(() => {
                  showToast(translations[lang].copied_user_reference);
                });
              });
              document.getElementById('new-subscription').addEventListener('click', () => {
                successContainer.classList.add('hidden');
                document.getElementById('item-image').classList.remove('hidden');
                document.getElementById('subscription-form-container').classList.remove('hidden');
                document.getElementById('sub-amount').value = '';
                document.getElementById('user-reference').value = '';
                document.getElementById('sub-status').textContent = '';
                document.getElementById('sub-status').classList.remove('status-success', 'status-failed');
              });
              subButton.disabled = false;
              subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
              return result;
            },
            payment_failed: (params) => {
              const result = { type: 'subscription_failed', ...params };
              console.error('订阅支付失败:', JSON.stringify(params, null, 2));
              showDropInModal(false);
              let errorMessage = params.message || translations[lang].network_error;
              if (params.code === 'V0001' && params.message.includes('Missing field body.paymentMethod.card')) {
                errorMessage = translations[lang].card_payment_required;
              }
              document.getElementById('sub-status').textContent = translations[lang].subscription_failed.replace('{error}', errorMessage);
              document.getElementById('sub-status').classList.add('status-failed');
              document.getElementById('dropInApp').innerHTML = '';
              subButton.disabled = false;
              subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
              return result;
            },
            payment_not_preformed: (params) => {
              const result = { type: 'subscription_not_preformed', ...params };
              console.warn('订阅支付未执行:', result);
              showDropInModal(false);
              document.getElementById('sub-status').textContent = translations[lang].subscription_incomplete;
              document.getElementById('sub-status').classList.add('status-failed');
              document.getElementById('dropInApp').innerHTML = '';
              subButton.disabled = false;
              subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
              return result;
            },
            payment_cancelled: (params) => {
              const result = { type: 'subscription_cancelled', ...params };
              return result;
            }
          });
        } catch (err) {
          console.error('SDK 初始化失败:', err);
          showDropInModal(false);
          document.getElementById('sub-status').textContent = translations[lang].subscription_failed.replace('{error}', err.message);
          document.getElementById('sub-status').classList.add('status-failed');
          document.getElementById('dropInApp').innerHTML = '';
          subButton.disabled = false;
          subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
        }
      } else {
        console.error('获取订阅支付链接失败:', data);
        let errorMessage = data.error || translations[lang].network_error;
        if (data.error === '未找到与 userReference 关联的 token') {
          errorMessage = translations[lang].token_required;
        } else if (data.error.includes('支付方式不匹配')) {
          errorMessage = translations[lang].payment_method_mismatch.replace('{method}', data.error.split('为 ')[1]);
        } else if (data.details?.result?.code === 'V0001' && data.details?.result?.message.includes('Missing field body.paymentMethod.card')) {
          errorMessage = translations[lang].card_payment_required;
        }
        document.getElementById('sub-status').textContent = translations[lang].subscription_failed.replace('{error}', errorMessage);
        document.getElementById('sub-status').classList.add('status-failed');
        subButton.disabled = false;
        subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
      }
    } else {
      console.error('获取订阅支付链接失败:', data);
      let errorMessage = data.error || translations[lang].network_error;
      if (data.error === '未找到与 userReference 关联的 token') {
        errorMessage = translations[lang].token_required;
      } else if (data.error.includes('支付方式不匹配')) {
        errorMessage = translations[lang].payment_method_mismatch.replace('{method}', data.error.split('为 ')[1]);
      } else if (data.details?.result?.code === 'V0001' && data.details?.result?.message.includes('Missing field body.paymentMethod.card')) {
        errorMessage = translations[lang].card_payment_required;
      }
      document.getElementById('sub-status').textContent = translations[lang].subscription_failed.replace('{error}', errorMessage);
      document.getElementById('sub-status').classList.add('status-failed');
      subButton.disabled = false;
      subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
    }
  } catch (err) {
    console.error('订阅支付网络请求失败:', err);
    document.getElementById('sub-status').textContent = translations[lang].subscription_failed.replace('{error}', translations[lang].network_error);
    document.getElementById('sub-status').classList.add('status-failed');
    subButton.disabled = false;
    subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
  }
});

document.getElementById('copy-card-info').addEventListener('click', () => {
  showCardInfoModal(true);
});

document.getElementById('close-card-modal').addEventListener('click', () => {
  showCardInfoModal(false);
});

document.getElementById('copy-card-number').addEventListener('click', () => {
  if (currentCardInfo) {
    navigator.clipboard.write(currentCardInfo.number).then(() => {
      showToast(translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].copied);
    });
  }
});

document.getElementById('copy-order-id').addEventListener('click', () => {
  const orderId = document.getElementById('success-message').textContent;
  navigator.clipboard.write(orderId).then(() => {
    showToast(translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].copied);
  });
});

document.getElementById('new-payment').addEventListener('click', () => {
  document.getElementById('payment-success').classList.add('hidden');
  document.getElementById('item-image').classList.remove('hidden');
  document.getElementById('payment-form-container').classList.remove('hidden');
  document.getElementById('payment-status').textContent = '';
});

document.getElementById('close-modal').addEventListener('click', () => {
  showDropInModal(false);
  document.getElementById('payment-status').textContent = translations[document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'].payment_incomplete;
  document.getElementById('dropInApp').innerHTML = '';
  const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  const payButton = document.getElementById('pay-button');
  const subButton = document.getElementById('sub-button');
  if (payButton.disabled) {
    payButton.disabled = false;
    payButton.textContent = translations && translations[lang] && translations[lang].pay_now ? translations[lang].pay_now : 'Pay Now';
  }
  if (subButton.disabled) {
    subButton.disabled = false;
    subButton.textContent = translations && translations[lang] && translations[lang].start_subscription ? translations[lang].start_subscription : 'Start Subscription';
  }
});

document.getElementById('show-payment-form').addEventListener('click', () => {
  document.getElementById('payment-form-container').classList.remove('hidden');
  document.getElementById('subscription-form-container').classList.add('hidden');
  document.getElementById('subscription-success').classList.add('hidden');
  document.getElementById('payment-success').classList.add('hidden');
  document.getElementById('item-image').classList.remove('hidden');
  document.getElementById('show-payment-form').classList.add('bg-blue-600', 'text-white');
  document.getElementById('show-payment-form').classList.remove('bg-gray-200', 'text-gray-700', 'dark:bg-gray-600', 'dark:text-gray-300');
  document.getElementById('show-subscription-form').classList.add('bg-gray-200', 'text-gray-700', 'dark:bg-gray-600', 'dark:text-gray-300');
  document.getElementById('show-subscription-form').classList.remove('bg-blue-600', 'text-white');
});

document.getElementById('show-subscription-form').addEventListener('click', () => {
  document.getElementById('subscription-form-container').classList.remove('hidden');
  document.getElementById('payment-form-container').classList.add('hidden');
  document.getElementById('payment-success').classList.add('hidden');
  document.getElementById('subscription-success').classList.add('hidden');
  document.getElementById('item-image').classList.remove('hidden');
  document.getElementById('show-subscription-form').classList.add('bg-blue-600', 'text-white');
  document.getElementById('show-subscription-form').classList.remove('bg-gray-200', 'text-gray-700', 'dark:bg-gray-600', 'dark:text-gray-300');
  document.getElementById('show-payment-form').classList.add('bg-gray-200', 'text-gray-700', 'dark:bg-gray-600', 'dark:text-gray-300');
  document.getElementById('show-payment-form').classList.remove('bg-blue-600', 'text-white');
});

document.getElementById('selected-payment').addEventListener('click', () => {
  document.getElementById('payment-options').classList.toggle('hidden');
});

document.querySelectorAll('#payment-options .payment-option').forEach(option => {
  option.addEventListener('click', () => {
    const value = option.getAttribute('data-value');
    const imgSrc = option.querySelector('img').src;
    document.getElementById('payment-method').value = value;
    document.getElementById('selected-payment-text').textContent = value;
    document.getElementById('selected-payment-icon').src = imgSrc;
    document.getElementById('payment-options').classList.add('hidden');
    document.getElementById('payment-status').textContent = '';
    if (value === 'Visa') {
      document.getElementById('copy-card-info').classList.remove('hidden');
    } else {
      document.getElementById('copy-card-info').classList.add('hidden');
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('payment-method').value = 'Alipay';
  document.getElementById('selected-payment-text').textContent = 'Alipay';
  document.getElementById('selected-payment-icon').src = 'https://hk1rbd-prod-bucket.s3.ap-northeast-1.amazonaws.com/apilogo/Alipay.svg';
  document.getElementById('copy-card-info').classList.add('hidden');
});