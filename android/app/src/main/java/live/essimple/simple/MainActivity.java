package live.essimple.simple;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SimplePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Si el modo kiosco está activo, vuelve a ocultar las barras del sistema cada vez que se recupera el foco.
        if (hasFocus && SimplePlugin.kioskEnabled) {
            SimplePlugin.applyImmersive(this);
        }
    }
}
