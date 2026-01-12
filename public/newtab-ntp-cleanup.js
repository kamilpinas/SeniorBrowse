// Removes Chrome's native NTP attribution elements (extension name footer +
// "Customize Chrome" button) that Chrome injects into extension-overridden
// new tab pages. Runs before React mounts so there is no visible flash.
(function () {
  var TAGS = [
    'ntp-attribution',
    'customize-chrome-side-panel-button',
    'ntp-app',
  ];
  function sweep() {
    TAGS.forEach(function (tag) {
      document.querySelectorAll(tag).forEach(function (el) { el.remove(); });
    });
    var attr = document.getElementById('ntp-attribution');
    if (attr) attr.remove();
  }
  sweep();
  new MutationObserver(sweep).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
