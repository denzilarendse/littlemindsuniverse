package za.co.littlemindsuniverse;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.content.Context;
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

    private void assertWebViewIsLaidOut() {
        activityRule.getScenario().onActivity(activity -> {
            View content = activity.findViewById(android.R.id.content);
            WebView webView = findWebView(content);
            assertNotNull("Capacitor WebView must exist in the activity content", webView);
            assertTrue("WebView must be attached to the window", webView.isAttachedToWindow());
            assertTrue("WebView must be visible", webView.isShown());
            assertTrue("WebView must have a laid-out width", webView.getWidth() > 0);
            assertTrue("WebView must have a laid-out height", webView.getHeight() > 0);
        });
    }

    @Test
    public void mainActivityLaunchesAndDisplaysCapacitorWebView() {
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertWebViewIsLaidOut();
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
            activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)
        );
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertWebViewIsLaidOut();

        activityRule.getScenario().onActivity(activity ->
            activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
        );
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertWebViewIsLaidOut();
    }
}
