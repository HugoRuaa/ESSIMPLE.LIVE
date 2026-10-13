package live.essimple.simple;

import android.app.admin.DeviceAdminReceiver;

/**
 * Receptor de administración del dispositivo. Solo se usa si la familia configura el teléfono
 * como "propietario del dispositivo" (adb o código QR); sin eso la app funciona igual en modo básico.
 */
public class SimpleAdminReceiver extends DeviceAdminReceiver {}
