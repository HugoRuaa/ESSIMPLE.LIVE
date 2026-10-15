package live.essimple;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Reinicia el seguimiento al encender el celular o al actualizar la app, si estaba activado. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        boolean enabled = context.getSharedPreferences(TrackingService.PREFS, Context.MODE_PRIVATE)
            .getBoolean(TrackingService.KEY_ENABLED, false);
        if (!enabled) return;
        try {
            Intent service = new Intent(context, TrackingService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(service);
            } else {
                context.startService(service);
            }
        } catch (Exception ignored) {
            // Android puede negar el inicio desde segundo plano; la app lo reactiva al abrirse.
        }
    }
}
