const notificationControl = document.querySelector('[data-notification-control]');

if (notificationControl) {
  const appId = notificationControl.dataset.onesignalAppId;
  const toggle = notificationControl.querySelector('[data-notification-toggle]');
  const panel = notificationControl.querySelector('[data-notification-panel]');
  const closeButton = notificationControl.querySelector('[data-notification-close]');
  const actionButton = notificationControl.querySelector('[data-notification-action]');
  const statusMessage = notificationControl.querySelector('[data-notification-status]');

  let oneSignal;
  let currentState = 'loading';
  let refreshState = () => {};

  const states = {
    loading: {
      message: 'בודקים אם ניתן להפעיל התראות במכשיר הזה…',
      action: 'טוען…',
      disabled: true,
    },
    unsubscribed: {
      message: 'קבלו התראה בכל פעם שמתפרסמת כתבה חדשה ב־GGNEWS.',
      action: 'הפעלת התראות',
      disabled: false,
    },
    subscribed: {
      message: 'ההתראות פעילות במכשיר הזה. נעדכן אתכם כשכתבה חדשה תתפרסם.',
      action: 'כיבוי התראות',
      disabled: false,
    },
    blocked: {
      message: 'ההתראות חסומות בדפדפן. אפשר לאפשר אותן דרך סמל המנעול שליד כתובת האתר.',
      action: 'ההתראות חסומות',
      disabled: true,
    },
    iosInstall: {
      message: 'באייפון או באייפד: הוסיפו את GGNEWS למסך הבית, פתחו אותו משם ואז הפעילו התראות.',
      action: 'נדרש להוסיף למסך הבית',
      disabled: true,
    },
    unsupported: {
      message: 'הדפדפן הזה אינו תומך בהתראות מהאתר. נסו Chrome, Edge, Firefox או Safari מעודכן.',
      action: 'לא נתמך בדפדפן הזה',
      disabled: true,
    },
    error: {
      message: 'לא הצלחנו לעדכן את ההתראות כרגע. נסו שוב בעוד רגע.',
      action: 'ניסיון נוסף',
      disabled: false,
    },
  };

  const setState = (state) => {
    const stateDetails = states[state] || states.error;
    currentState = state;
    notificationControl.dataset.notificationState = state;
    statusMessage.textContent = stateDetails.message;
    actionButton.textContent = stateDetails.action;
    actionButton.disabled = stateDetails.disabled;

    const isSubscribed = state === 'subscribed';
    toggle.classList.toggle('is-subscribed', isSubscribed);
    toggle.setAttribute('aria-pressed', String(isSubscribed));
    toggle.setAttribute(
      'aria-label',
      isSubscribed ? 'התראות GGNEWS פעילות — פתיחת הגדרות' : 'פתיחת הגדרות התראות',
    );
  };

  const openPanel = () => {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  };

  const closePanel = () => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeButton.addEventListener('click', () => {
    closePanel();
    toggle.focus();
  });

  document.addEventListener('click', (event) => {
    if (!panel.hidden && !notificationControl.contains(event.target)) closePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      closePanel();
      toggle.focus();
    }
  });

  actionButton.addEventListener('click', async () => {
    if (!oneSignal) return;

    if (currentState === 'blocked') {
      setState('blocked');
      return;
    }

    actionButton.disabled = true;

    try {
      if (currentState === 'subscribed') {
        await oneSignal.User.PushSubscription.optOut();
      } else {
        await oneSignal.User.PushSubscription.optIn();
      }

      await refreshState();
    } catch (error) {
      console.error('GGNEWS notification preference could not be updated.', error);
      setState('error');
    }
  });

  setState('loading');
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.init({
        appId,
        serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/onesignal/' },
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [{ type: 'push', autoPrompt: false }],
          },
        },
        welcomeNotification: { disable: true },
        autoResubscribe: true,
      });

      oneSignal = OneSignal;
      OneSignal.Notifications.setDefaultTitle('GGNEWS');
      OneSignal.Notifications.setDefaultUrl('https://ggnews.club');

      refreshState = async () => {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
          || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
          || window.navigator.standalone === true;

        if (isIos && !isStandalone) {
          setState('iosInstall');
          return;
        }

        if (!OneSignal.Notifications.isPushSupported()) {
          setState('unsupported');
          return;
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setState('blocked');
          return;
        }

        setState(OneSignal.User.PushSubscription.optedIn ? 'subscribed' : 'unsubscribed');
      };

      OneSignal.Notifications.addEventListener('permissionChange', refreshState);
      OneSignal.User.PushSubscription.addEventListener('change', refreshState);
      await refreshState();
    } catch (error) {
      console.error('GGNEWS notifications could not be initialized.', error);
      setState('error');
    }
  });
}
