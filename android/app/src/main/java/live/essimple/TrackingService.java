package live.essimple;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.telephony.SmsManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio en primer plano (con notificación fija): mientras corre, Android no lo pausa aunque la pantalla esté apagada.
 * Cada pocos minutos sube a Supabase la batería y la última ubicación conocida (una sola fila por familia, sin historial)
 * y revisa dos avisos por SMS a los contactos marcados: salida/regreso de la zona segura y batería baja.
 */
public class TrackingService extends Service {

    public static final String PREFS = "simple_prefs";
    public static final String KEY_ENABLED = "track_enabled";
    public static final String KEY_CONFIG = "track_config";
    private static final String KEY_ZONE_STATE = "track_zone_state";      // inside | outside
    private static final String KEY_BATTERY_ALERTED = "track_battery_alerted";

    private static final String CHANNEL_ID = "essimple_tracking";
    private static final int NOTIFICATION_ID = 4101;
    private static final long HEARTBEAT_MS = 5 * 60 * 1000L;
    private static final long MIN_UPLOAD_GAP_MS = 60 * 1000L;
    private static final float MOVE_UPLOAD_METERS = 50f;
    private static final int LOW_BATTERY = 20;
    private static final int BATTERY_RESET = 30;
    private static final float MAX_ACCURACY_FOR_ZONE = 150f;

    public static volatile boolean running = false;
    public static volatile long lastUploadAt = 0;
    public static volatile boolean lastUploadOk = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private Location lastFix;
    private Location lastUploadedFix;
    private long lastUploadTime = 0;
    private int outsideStreak = 0;
    private int insideStreak = 0;

    private final LocationListener listener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (location == null) return;
            if (lastFix == null || location.getAccuracy() <= lastFix.getAccuracy() + 50f
                || location.getTime() - lastFix.getTime() > 120000L) {
                lastFix = location;
            }
            evaluateZone(location);
            long now = System.currentTimeMillis();
            boolean moved = lastUploadedFix == null || location.distanceTo(lastUploadedFix) >= MOVE_UPLOAD_METERS;
            if (moved && now - lastUploadTime >= MIN_UPLOAD_GAP_MS) {
                report();
            }
        }

        @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
        @Override public void onProviderEnabled(String provider) { }
        @Override public void onProviderDisabled(String provider) { }
    };

    private final Runnable heartbeat = new Runnable() {
        @Override
        public void run() {
            report();
            handler.postDelayed(this, HEARTBEAT_MS);
        }
    };

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private JSONObject config() {
        try {
            String raw = prefs().getString(KEY_CONFIG, null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!startAsForeground()) {
            // Android negó el modo en primer plano (por ejemplo, sin permiso de ubicación): no se queda a medias.
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            running = true;
            startLocationUpdates();
            handler.removeCallbacks(heartbeat);
            handler.post(heartbeat);
        }
        return START_STICKY;
    }

    private boolean startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Cuidado de la familia", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Muestra que essimple.live comparte la ubicación y la batería con tu familia.");
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }

        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, piFlags);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setContentTitle("essimple.live está cuidando")
            .setContentText("Tu familia puede ver tu ubicación y la batería de este celular.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pi)
            .setOngoing(true);

        Notification notification = builder.build();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startLocationUpdates() {
        if (!hasLocationPermission()) return;
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 60000L, 30f, listener, Looper.getMainLooper());
                Location last = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (last != null) lastFix = last;
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 60000L, 30f, listener, Looper.getMainLooper());
                if (lastFix == null) {
                    Location last = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (last != null) lastFix = last;
                }
            }
        } catch (SecurityException ignored) {
            // Sin permiso de ubicación: el servicio igual reporta la batería.
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(heartbeat);
        try {
            if (locationManager != null) locationManager.removeUpdates(listener);
        } catch (Exception ignored) {
        }
        io.shutdown();
        super.onDestroy();
    }

    // ------------------------------------------------------------------
    // Batería y envío a Supabase
    // ------------------------------------------------------------------

    private int[] readBattery() {
        try {
            Intent b = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (b != null) {
                int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING
                    || status == BatteryManager.BATTERY_STATUS_FULL;
                int pct = scale > 0 && level >= 0 ? Math.round(level * 100f / scale) : -1;
                return new int[] { pct, charging ? 1 : 0 };
            }
        } catch (Exception ignored) {
        }
        return new int[] { -1, 0 };
    }

    private static String iso(long millis) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(millis));
    }

    private void report() {
        final JSONObject cfg = config();
        final int[] battery = readBattery();
        final Location fix = lastFix;
        lastUploadTime = System.currentTimeMillis();
        if (fix != null) lastUploadedFix = fix;

        evaluateBattery(battery[0], battery[1] == 1, fix);

        if (cfg == null) return;
        io.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("familia_id", cfg.getString("familiaId"));
                body.put("is_online", true);
                body.put("last_reported_at", iso(System.currentTimeMillis()));
                if (battery[0] >= 0) {
                    body.put("battery_level", Math.max(0, Math.min(100, battery[0])));
                    body.put("is_charging", battery[1] == 1);
                }
                if (fix != null) {
                    body.put("last_lat", fix.getLatitude());
                    body.put("last_lng", fix.getLongitude());
                    body.put("last_accuracy", Math.round(fix.getAccuracy()));
                    body.put("last_location_at", iso(fix.getTime() > 0 ? fix.getTime() : System.currentTimeMillis()));
                }
                boolean ok = post(cfg, "estado_telefono?on_conflict=familia_id", body, "resolution=merge-duplicates,return=minimal");
                lastUploadOk = ok;
                lastUploadAt = System.currentTimeMillis();
            } catch (Exception e) {
                lastUploadOk = false;
            }
        });
    }

    private boolean post(JSONObject cfg, String path, JSONObject body, String prefer) {
        HttpURLConnection conn = null;
        try {
            String base = cfg.getString("url");
            if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
            URL url = new URL(base + "/rest/v1/" + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            String key = cfg.getString("key");
            conn.setRequestProperty("apikey", key);
            conn.setRequestProperty("Authorization", "Bearer " + key);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Content-Profile", cfg.optString("schema", "essimple"));
            conn.setRequestProperty("Prefer", prefer);
            byte[] data = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(data);
            }
            int code = conn.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    // ------------------------------------------------------------------
    // Avisos por SMS
    // ------------------------------------------------------------------

    private ArrayList<String> numbers(JSONObject cfg, String key) {
        ArrayList<String> list = new ArrayList<>();
        try {
            JSONArray arr = cfg.optJSONArray(key);
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    String n = arr.optString(i, "").replaceAll("[^\\d+]", "");
                    if (!n.isEmpty()) list.add(n);
                }
            }
        } catch (Exception ignored) {
        }
        return list;
    }

    private int sendSmsTo(ArrayList<String> targets, String text) {
        if (targets.isEmpty()) return 0;
        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) return 0;
        int sent = 0;
        try {
            SmsManager sms = Build.VERSION.SDK_INT >= 31
                ? getSystemService(SmsManager.class)
                : SmsManager.getDefault();
            for (String number : targets) {
                try {
                    ArrayList<String> parts = sms.divideMessage(text);
                    sms.sendMultipartTextMessage(number, null, parts, null, null);
                    sent++;
                } catch (Exception ignored) {
                    // Un número inválido no debe frenar a los demás.
                }
            }
        } catch (Exception ignored) {
        }
        return sent;
    }

    private void logEvent(JSONObject cfg, String type, String title, String detail, String level) {
        io.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("familia_id", cfg.getString("familiaId"));
                body.put("event_type", type);
                body.put("title", title);
                body.put("detail", detail);
                body.put("level", level);
                post(cfg, "eventos", body, "return=minimal");
            } catch (Exception ignored) {
            }
        });
    }

    private static String mapsLink(Location fix) {
        return fix == null ? "" : " Ubicación: https://maps.google.com/?q=" + fix.getLatitude() + "," + fix.getLongitude();
    }

    private void evaluateZone(Location fix) {
        JSONObject cfg = config();
        if (cfg == null || fix == null) return;
        try {
            JSONObject home = cfg.optJSONObject("home");
            if (home == null || !home.optBoolean("active", false)) return;
            if (fix.getAccuracy() > MAX_ACCURACY_FOR_ZONE) return;

            float[] result = new float[1];
            Location.distanceBetween(fix.getLatitude(), fix.getLongitude(), home.getDouble("lat"), home.getDouble("lng"), result);
            double radius = home.optDouble("radius", 300);
            boolean beyond = result[0] > radius;

            if (beyond) { outsideStreak++; insideStreak = 0; } else { insideStreak++; outsideStreak = 0; }

            String state = prefs().getString(KEY_ZONE_STATE, "");
            String name = cfg.optString("personName", "La persona");
            if (outsideStreak >= 2 && !"outside".equals(state)) {
                prefs().edit().putString(KEY_ZONE_STATE, "outside").apply();
                if ("inside".equals(state)) {
                    logEvent(cfg, "zona_salida", "Salió de su zona segura", "Registrado en el Panel Familiar", "warning");
                }
            } else if (insideStreak >= 2 && !"inside".equals(state)) {
                prefs().edit().putString(KEY_ZONE_STATE, "inside").apply();
                if ("outside".equals(state)) {
                    logEvent(cfg, "zona_entrada", "Volvió a su zona segura", "Registrado en el Panel Familiar", "normal");
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void evaluateBattery(int level, boolean charging, Location fix) {
        JSONObject cfg = config();
        if (cfg == null || level < 0) return;
        try {
            boolean alerted = prefs().getBoolean(KEY_BATTERY_ALERTED, false);
            if (charging || level >= BATTERY_RESET) {
                if (alerted) prefs().edit().putBoolean(KEY_BATTERY_ALERTED, false).apply();
                return;
            }
            if (level <= LOW_BATTERY && !alerted) {
                prefs().edit().putBoolean(KEY_BATTERY_ALERTED, true).apply();
                logEvent(cfg, "bateria_baja", "Batería baja", "Batería al " + level + " %. Registrado en el Panel Familiar", "warning");
            }
        } catch (Exception ignored) {
        }
    }
}
