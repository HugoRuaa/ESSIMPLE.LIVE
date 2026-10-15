package live.essimple;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.app.admin.DevicePolicyManager;
import android.app.role.RoleManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.SharedPreferences;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.telephony.SmsManager;
import android.view.WindowManager;

import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Puente nativo de Simple: permisos reales, llamadas directas, SMS, modo kiosco
 * (inmersivo + pantalla de inicio + bloqueo de tarea cuando la app es propietaria del dispositivo).
 */
@CapacitorPlugin(
    name = "Simple",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS }),
        @Permission(alias = "calls", strings = { Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE }),
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        ),
        @Permission(alias = "backgroundLocation", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class SimplePlugin extends Plugin {

    /** Lo lee MainActivity para reaplicar el modo inmersivo al recuperar el foco. */
    public static volatile boolean kioskEnabled = false;

    private static final String HOME_ALIAS = "live.essimple.HomeAlias";
    private static final String PREFS = "simple_prefs";
    private static final String KEY_RELEASED = "home_released";
    private static final String KEY_WAS_HOME = "was_default_home";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void setHomeAliasEnabled(boolean enabled) {
        getContext().getPackageManager().setComponentEnabledSetting(
            new ComponentName(getContext().getPackageName(), HOME_ALIAS),
            enabled ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        );
    }

    private static final String[] RUNTIME_PERMISSIONS = new String[] {
        Manifest.permission.SEND_SMS,
        Manifest.permission.CALL_PHONE,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.RECORD_AUDIO
    };

    // ------------------------------------------------------------------
    // Permisos
    // ------------------------------------------------------------------

    private boolean isAutoGranted(String alias) {
        if ("notifications".equals(alias)) return Build.VERSION.SDK_INT < 33;
        if ("backgroundLocation".equals(alias)) return Build.VERSION.SDK_INT < 29;
        return false;
    }

    private boolean has(String permission) {
        return getContext().checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isGranted(String alias) {
        if (isAutoGranted(alias)) return true;
        return getPermissionState(alias) == PermissionState.GRANTED;
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String name = call.getString("name");
        if (name == null) {
            call.reject("Falta el nombre del permiso");
            return;
        }
        if (isGranted(name)) {
            call.resolve(granted(true));
            return;
        }
        if ("backgroundLocation".equals(name) && !isGranted("location")) {
            call.reject("Primero hay que dar el permiso de ubicación");
            return;
        }
        requestPermissionForAlias(name, call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        String name = call.getString("name");
        call.resolve(granted(name != null && isGranted(name)));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject out = new JSObject();
        out.put("sms", isGranted("sms"));
        out.put("calls", isGranted("calls"));
        out.put("location", isGranted("location"));
        out.put("backgroundLocation", isGranted("backgroundLocation"));
        out.put("microphone", isGranted("microphone"));
        out.put("notifications", isGranted("notifications"));
        out.put("batteryUnrestricted", isBatteryUnrestricted());
        out.put("fullScreenAlerts", canFullScreenIntent());
        out.put("homeLauncher", isDefaultHome());
        out.put("deviceOwner", isDeviceOwner());
        out.put("kiosk", kioskEnabled);
        out.put("homeReleased", prefs().getBoolean(KEY_RELEASED, false));
        call.resolve(out);
    }

    // ------------------------------------------------------------------
    // Ajustes del sistema (batería, alertas, pantalla de inicio)
    // ------------------------------------------------------------------

    private boolean isBatteryUnrestricted() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void requestBatteryUnrestricted(PluginCall call) {
        if (isBatteryUnrestricted()) {
            call.resolve(granted(true));
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        try {
            startActivityForResult(call, intent, "batteryResult");
        } catch (Exception e) {
            call.resolve(granted(false));
        }
    }

    @ActivityCallback
    private void batteryResult(PluginCall call, ActivityResult result) {
        call.resolve(granted(isBatteryUnrestricted()));
    }

    private boolean canFullScreenIntent() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.canUseFullScreenIntent();
    }

    @PluginMethod
    public void requestFullScreenAlerts(PluginCall call) {
        if (canFullScreenIntent()) {
            call.resolve(granted(true));
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        try {
            startActivityForResult(call, intent, "fullScreenResult");
        } catch (Exception e) {
            call.resolve(granted(false));
        }
    }

    @ActivityCallback
    private void fullScreenResult(PluginCall call, ActivityResult result) {
        call.resolve(granted(canFullScreenIntent()));
    }

    private boolean isDefaultHome() {
        Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        ResolveInfo info = getContext().getPackageManager().resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY);
        return info != null
            && info.activityInfo != null
            && getContext().getPackageName().equals(info.activityInfo.packageName);
    }

    @PluginMethod
    public void requestHomeLauncher(PluginCall call) {
        if (isDefaultHome()) {
            call.resolve(granted(true));
            return;
        }
        Intent intent = null;
        if (Build.VERSION.SDK_INT >= 29) {
            RoleManager rm = (RoleManager) getContext().getSystemService(Context.ROLE_SERVICE);
            if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME)) {
                intent = rm.createRequestRoleIntent(RoleManager.ROLE_HOME);
            }
        }
        if (intent == null) {
            intent = new Intent(Settings.ACTION_HOME_SETTINGS);
        }
        try {
            startActivityForResult(call, intent, "homeResult");
        } catch (Exception e) {
            call.resolve(granted(false));
        }
    }

    @ActivityCallback
    private void homeResult(PluginCall call, ActivityResult result) {
        call.resolve(granted(isDefaultHome()));
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openSystemSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // ------------------------------------------------------------------
    // Llamadas y SMS directos (sin pasos intermedios)
    // ------------------------------------------------------------------

    @PluginMethod
    public void callDirect(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.trim().isEmpty()) {
            call.reject("Falta el número");
            return;
        }
        String clean = number.replaceAll("[^\\d+*#]", "");
        Intent intent;
        if (has(Manifest.permission.CALL_PHONE)) {
            intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(clean)));
            // Con dos SIM Android muestra un cuadro para elegir la tarjeta. Se elige una por la persona para que la
            // llamada salga sola: la SIM predeterminada para llamadas o, si no hay, la primera disponible.
            try {
                if (has(Manifest.permission.READ_PHONE_STATE)) {
                    TelecomManager tm = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
                    if (tm != null) {
                        PhoneAccountHandle handle = tm.getDefaultOutgoingPhoneAccount(PhoneAccount.SCHEME_TEL);
                        if (handle == null) {
                            List<PhoneAccountHandle> accounts = tm.getCallCapablePhoneAccounts();
                            if (accounts != null && !accounts.isEmpty()) handle = accounts.get(0);
                        }
                        if (handle != null) intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle);
                    }
                }
            } catch (SecurityException ignored) {
                // Sin permiso para leer las SIM: Android mostrará su cuadro de selección.
            }
        } else {
            // Sin permiso: abre el marcador con el número escrito, que es lo mejor posible.
            intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(clean)));
        }
        try {
            getActivity().startActivity(intent);
            call.resolve(granted(true));
        } catch (Exception e) {
            call.reject("No se pudo iniciar la llamada: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String number = call.getString("number");
        String text = call.getString("text");
        if (number == null || text == null || number.trim().isEmpty()) {
            call.reject("Faltan el número o el texto");
            return;
        }
        if (!isGranted("sms")) {
            call.reject("Falta el permiso de SMS");
            return;
        }
        try {
            SmsManager sms = Build.VERSION.SDK_INT >= 31
                ? getContext().getSystemService(SmsManager.class)
                : SmsManager.getDefault();
            String clean = number.replaceAll("[^\\d+]", "");
            ArrayList<String> parts = sms.divideMessage(text);
            sms.sendMultipartTextMessage(clean, null, parts, null, null);
            call.resolve(granted(true));
        } catch (Exception e) {
            call.reject("No se pudo enviar el SMS: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Modo kiosco
    // ------------------------------------------------------------------

    private boolean isDeviceOwner() {
        DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        return dpm != null && dpm.isDeviceOwnerApp(getContext().getPackageName());
    }

    public static void applyImmersive(Activity activity) {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    /** Solo si la app es propietaria del dispositivo: concede permisos sin diálogos y fija la tarea. */
    private void applyOwnerPolicies(Activity activity) {
        DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(getContext(), SimpleAdminReceiver.class);
        String pkg = getContext().getPackageName();

        if (Build.VERSION.SDK_INT >= 23) {
            for (String permission : RUNTIME_PERMISSIONS) {
                try {
                    dpm.setPermissionGrantState(admin, pkg, permission, DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED);
                } catch (Exception ignored) {
                    // Permiso no aplicable en esta versión.
                }
            }
            if (Build.VERSION.SDK_INT >= 29) {
                try {
                    dpm.setPermissionGrantState(
                        admin, pkg, Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                        DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                    );
                } catch (Exception ignored) {
                }
            }
            if (Build.VERSION.SDK_INT >= 33) {
                try {
                    dpm.setPermissionGrantState(
                        admin, pkg, "android.permission.POST_NOTIFICATIONS",
                        DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                    );
                } catch (Exception ignored) {
                }
            }
        }

        // Paquetes permitidos dentro del bloqueo: Simple y el marcador por defecto (para las llamadas).
        List<String> allowed = new ArrayList<>();
        allowed.add(pkg);
        try {
            TelecomManager tm = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
            String dialer = tm != null ? tm.getDefaultDialerPackage() : null;
            if (dialer != null) allowed.add(dialer);
        } catch (Exception ignored) {
        }
        allowed.add("com.whatsapp");
        allowed.add("com.whatsapp.w4b");
        allowed.add("com.android.phone");
        allowed.add("com.android.server.telecom");
        allowed.add("com.android.incallui");
        dpm.setLockTaskPackages(admin, allowed.toArray(new String[0]));

        if (Build.VERSION.SDK_INT >= 28) {
            dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE);
        }
        activity.startLockTask();
    }

    @PluginMethod
    public void enterKiosk(PluginCall call) {
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            kioskEnabled = true;
            applyImmersive(activity);
            activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= 27) {
                activity.setShowWhenLocked(true);
                activity.setTurnScreenOn(true);
            }
            String level = isDefaultHome() ? "launcher" : "basic";
            if (isDeviceOwner()) {
                try {
                    applyOwnerPolicies(activity);
                    level = "owner";
                } catch (Exception ignored) {
                }
            }
            JSObject out = new JSObject();
            out.put("level", level);
            call.resolve(out);
        });
    }

    @PluginMethod
    public void exitKiosk(PluginCall call) {
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            kioskEnabled = false;
            try {
                activity.stopLockTask();
            } catch (Exception ignored) {
                // No estaba fijada.
            }
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
            controller.show(WindowInsetsCompat.Type.systemBars());
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    /**
     * "Volver al estado normal del celular": suelta el modo kiosco y la pantalla de inicio de Simple.
     * No revoca ningún permiso. La marca persistente permite recuperar el estado al reabrir la app.
     */
    @PluginMethod
    public void releaseHome(PluginCall call) {
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            boolean wasHome = isDefaultHome();
            kioskEnabled = false;
            try {
                activity.stopLockTask();
            } catch (Exception ignored) {
                // No estaba fijada.
            }
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
            controller.show(WindowInsetsCompat.Type.systemBars());
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= 27) {
                activity.setShowWhenLocked(false);
                activity.setTurnScreenOn(false);
            }

            prefs().edit().putBoolean(KEY_RELEASED, true).putBoolean(KEY_WAS_HOME, wasHome).apply();
            setHomeAliasEnabled(false);

            // Da un instante a Android para recalcular quién es la pantalla de inicio y luego abre el inicio normal.
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                boolean stillDefault = isDefaultHome();
                try {
                    Intent next = stillDefault
                        ? new Intent(Settings.ACTION_HOME_SETTINGS)
                        : new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
                    next.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(next);
                } catch (Exception ignored) {
                    // Sin pantalla de inicio alternativa disponible.
                }
                JSObject out = new JSObject();
                out.put("released", !stillDefault);
                call.resolve(out);
            }, 600);
        });
    }

    /** Vuelve a encender la pantalla de inicio de Simple. Devuelve si lo era antes de soltarla. */
    @PluginMethod
    public void restoreHome(PluginCall call) {
        boolean wasHome = prefs().getBoolean(KEY_WAS_HOME, false);
        setHomeAliasEnabled(true);
        prefs().edit().putBoolean(KEY_RELEASED, false).apply();
        JSObject out = new JSObject();
        out.put("wasDefaultHome", wasHome);
        call.resolve(out);
    }

    @PluginMethod
    public void minimize(PluginCall call) {
        getActivity().moveTaskToBack(true);
        call.resolve();
    }

    // ------------------------------------------------------------------
    // Mensaje de voz: grabación nativa (AAC/m4a, que WhatsApp reproduce) y envío del archivo por WhatsApp
    // ------------------------------------------------------------------

    private MediaRecorder recorder;
    private File voiceFile;
    private long voiceStartedAt = 0;

    private void releaseRecorder() {
        if (recorder != null) {
            try {
                recorder.release();
            } catch (Exception ignored) {
            }
            recorder = null;
        }
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (!has(Manifest.permission.RECORD_AUDIO)) {
            call.reject("Falta el permiso del micrófono");
            return;
        }
        releaseRecorder();
        try {
            File dir = new File(getContext().getCacheDir(), "voz");
            if (!dir.exists()) dir.mkdirs();
            voiceFile = new File(dir, "mensaje-de-voz.m4a");
            if (voiceFile.exists()) voiceFile.delete();

            recorder = Build.VERSION.SDK_INT >= 31 ? new MediaRecorder(getContext()) : new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioChannels(1);
            recorder.setAudioSamplingRate(44100);
            recorder.setAudioEncodingBitRate(64000);
            recorder.setMaxDuration(61000);
            recorder.setOutputFile(voiceFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            voiceStartedAt = System.currentTimeMillis();
            call.resolve(granted(true));
        } catch (Exception e) {
            releaseRecorder();
            call.reject("No se pudo grabar: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (recorder == null || voiceFile == null) {
            call.reject("No hay una grabación en curso");
            return;
        }
        try {
            try {
                recorder.stop();
            } catch (RuntimeException tooShort) {
                // Grabación demasiado corta: el archivo queda inválido.
                releaseRecorder();
                if (voiceFile.exists()) voiceFile.delete();
                call.reject("La grabación fue muy corta");
                return;
            }
            releaseRecorder();

            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (FileInputStream in = new FileInputStream(voiceFile)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) bytes.write(buffer, 0, read);
            }
            JSObject out = new JSObject();
            out.put("base64", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
            out.put("mime", "audio/mp4");
            out.put("seconds", Math.max(1, Math.round((System.currentTimeMillis() - voiceStartedAt) / 1000f)));
            call.resolve(out);
        } catch (Exception e) {
            releaseRecorder();
            call.reject("No se pudo guardar la grabación: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelRecording(PluginCall call) {
        if (recorder != null) {
            try {
                recorder.stop();
            } catch (Exception ignored) {
            }
            releaseRecorder();
        }
        if (voiceFile != null && voiceFile.exists()) voiceFile.delete();
        call.resolve();
    }

    /** Abre WhatsApp con el audio adjunto (y el chat del contacto si se conoce el número). La persona solo toca enviar. */
    @PluginMethod
    public void shareVoiceWhatsApp(PluginCall call) {
        if (voiceFile == null || !voiceFile.exists()) {
            call.reject("No hay un audio grabado");
            return;
        }
        String phone = call.getString("phone", "");
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", voiceFile
            );
            String[] packages = new String[] { "com.whatsapp", "com.whatsapp.w4b" };
            String used = null;
            for (String pkg : packages) {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("audio/mp4");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.setPackage(pkg);
                if (!digits.isEmpty()) intent.putExtra("jid", digits + "@s.whatsapp.net");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    getActivity().startActivity(intent);
                    used = pkg;
                    break;
                } catch (Exception notInstalled) {
                    // Probar con el siguiente (WhatsApp Business).
                }
            }
            if (used == null) {
                // Sin WhatsApp instalado: deja escoger otra app para compartir el audio.
                Intent generic = new Intent(Intent.ACTION_SEND);
                generic.setType("audio/mp4");
                generic.putExtra(Intent.EXTRA_STREAM, uri);
                generic.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(Intent.createChooser(generic, "Enviar mensaje de voz"));
            }
            JSObject out = new JSObject();
            out.put("granted", true);
            out.put("whatsapp", used != null);
            call.resolve(out);
        } catch (Exception e) {
            call.reject("No se pudo abrir WhatsApp: " + e.getMessage());
        }
    }

    private static JSObject granted(boolean value) {
        JSObject out = new JSObject();
        out.put("granted", value);
        return out;
    }
}
