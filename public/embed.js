/**
 * SPZ Booking – iFrame Embed Script
 *
 * Nutzung:
 * <div id="spz-booking"></div>
 * <script src="https://booking.stadtparkzauber.de/embed.js"></script>
 *
 * Oder mit eigener Konfiguration:
 * <script>
 *   window.SPZ_BOOKING_URL = 'https://booking.stadtparkzauber.de';
 * </script>
 * <script src="https://booking.stadtparkzauber.de/embed.js"></script>
 */
(function () {
  var container = document.getElementById('spz-booking');
  if (!container) {
    console.warn('[SPZ Booking] Container #spz-booking nicht gefunden.');
    return;
  }

  var baseUrl = window.SPZ_BOOKING_URL || 'https://booking.stadtparkzauber.de';
  var iframe = document.createElement('iframe');

  iframe.src = baseUrl + '/buchen';
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '600px';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('title', 'StadtParkZauber Buchung');
  iframe.setAttribute('loading', 'lazy');

  container.appendChild(iframe);

  // Automatische Höhenanpassung
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'spz-booking-resize') return;
    if (event.data.height) {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
