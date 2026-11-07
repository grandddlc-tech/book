package tech.grandddlc.lumen;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

/**
 * Opens Lumen Reader (the claude.ai artifact) in a Chrome Custom Tab.
 * Chrome's own sign-in is used, so texts are written with the user's Claude
 * subscription and no API key is needed.
 */
public class MainActivity extends Activity {
    private static final Uri APP_URL = Uri.parse("https://claude.ai/artifact/WqR8encep5Bdj4cSUUSoAj");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CustomTabColorSchemeParams colors = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(0xFF0A0912)
                .setNavigationBarColor(0xFF08060F)
                .build();
        CustomTabsIntent tab = new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colors)
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();
        try {
            tab.launchUrl(this, APP_URL);
        } catch (ActivityNotFoundException e) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, APP_URL));
            } catch (ActivityNotFoundException ignored) { }
        }
        finish();
    }
}
