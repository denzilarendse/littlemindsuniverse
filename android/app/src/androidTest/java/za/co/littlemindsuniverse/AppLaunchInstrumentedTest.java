package za.co.littlemindsuniverse;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static org.junit.Assert.assertEquals;

import android.Manifest;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
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
        onView(isAssignableFrom(WebView.class)).check(matches(isDisplayed()));
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
        onView(isAssignableFrom(WebView.class)).check(matches(isDisplayed()));

        activityRule.getScenario().onActivity(activity ->
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
        );
        onView(isAssignableFrom(WebView.class)).check(matches(isDisplayed()));
    }
}
