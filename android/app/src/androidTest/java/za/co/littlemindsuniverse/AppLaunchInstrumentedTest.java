package za.co.littlemindsuniverse;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppLaunchInstrumentedTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
        new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void mainActivityLaunchesAndDisplaysCapacitorWebView() {
        assertWebViewVisible();
    }

    @Test
    public void microphonePermissionStartsDeniedUntilTheUserExplicitlyGrantsIt() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals(
            PackageManager.PERMISSION_DENIED,
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
        );
    }

    @Test
    public void webViewRemainsDisplayedAcrossLandscapeAndPortraitChanges() {
        activityRule.getScenario().onActivity(activity ->
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)
        );
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertWebViewVisible();

        activityRule.getScenario().onActivity(activity ->
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
        );
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertWebViewVisible();
    }

    private void assertWebViewVisible() {
        activityRule.getScenario().onActivity(activity -> {
            WebView webView = findWebView(activity.getWindow().getDecorView());
            assertNotNull("Capacitor WebView must exist in the activity view tree", webView);
            assertTrue("Capacitor WebView must be attached to the window", webView.isAttachedToWindow());
            assertTrue("Capacitor WebView must be visible", webView.isShown());
        });
    }

    private WebView findWebView(View view) {
        if (view instanceof WebView) {
            return (WebView) view;
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int index = 0; index < group.getChildCount(); index++) {
                WebView found = findWebView(group.getChildAt(index));
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }
}
