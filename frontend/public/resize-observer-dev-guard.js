/*
 * Vinext 1.0.0-beta.8 forwards the browser's ResizeObserver loop notification
 * to its development error overlay as an unhandled script error.
 *
 * Installed before the dev client runs. Only suppress brief, error-less browser
 * notifications; repeated notifications and real thrown Errors remain visible.
 * Remove after upgrading to a Vinext release with the upstream overlay fix.
 */
(function () {
  'use strict';

  var messages = [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
  ];
  var windowStart = 0;
  var notificationCount = 0;
  var windowDurationMs = 2000;
  var maxTransientNotifications = 2;

  window.addEventListener('error', function (event) {
    if (event.error != null || messages.indexOf(event.message) === -1) return;

    var now = Date.now();
    if (now - windowStart > windowDurationMs) {
      windowStart = now;
      notificationCount = 0;
    }
    notificationCount += 1;
    if (notificationCount > maxTransientNotifications) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
