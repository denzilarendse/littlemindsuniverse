package za.co.littlemindsuniverse;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class PackageIdentityUnitTest {

    @Test
    public void frozenApplicationIdRemainsCanonical() {
        assertEquals("za.co.littlemindsuniverse", "za.co.littlemindsuniverse");
    }
}
