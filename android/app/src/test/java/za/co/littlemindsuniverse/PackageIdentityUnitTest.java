package za.co.littlemindsuniverse;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class PackageIdentityUnitTest {

    @Test
    public void testClassLivesUnderFrozenPackageIdentity() {
        assertEquals("za.co.littlemindsuniverse", PackageIdentityUnitTest.class.getPackageName());
    }
}
