package live.streetlocal.cityrider;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register in-app native plugins BEFORE super.onCreate so the
        // Bridge can wire them into the WebView during startup.
        registerPlugin(BatteryOptPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
